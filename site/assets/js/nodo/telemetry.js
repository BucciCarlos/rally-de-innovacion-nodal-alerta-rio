// Nodal · Modo Nodo — telemetría sintética DETERMINISTA derivada del snapshot.
// Sólo funciones puras del tiempo de escenario y de datos del motor: sin aleatoriedad, por lo que recargar o retroceder
// reproduce exactamente los mismos valores. Nada de esto es una medición real ni una relación física validada.
import { loraLink } from '../core/derived.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (v) => Math.round(v * 10) / 10;

/** Minutos absolutos desde las 00:00 del día 0 del escenario (incluye el cambio de día). */
export function clockMinutes(snap) {
  const [h, m] = snap.clock.split(':').map(Number);
  return h * 60 + m + 1440 * snap.dayOffset;
}
/** "HH:MM" de hace `minAgo` minutos respecto del reloj del snapshot. */
export function clockAgo(snap, minAgo) {
  const total = Math.round(clockMinutes(snap) - minAgo);
  const mod = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(mod / 60)).padStart(2, '0')}:${String(mod % 60).padStart(2, '0')}`;
}
/** Minuto del escenario al que corresponde la última lectura recibida (congelada si el nodo está sin enlace). */
export const readingT = (st, snap) => snap.t - st.device.lastSeenMin;

/* ------------------------------------------------------------- magnetómetro (concepto experimental) */
// Señal ILUSTRATIVA: deriva suave con la posición relativa del flotador (cualitativa, sin unidad de conversión a nivel)
// más una oscilación determinista. No es una calibración: no existe una relación µT ↔ cm validada.
const ut = (fill, t) => 47 + 20 * clamp(fill, 0, 1.25) + 0.45 * Math.sin(t * 0.9) + 0.25 * Math.sin(t * 2.3 + 1);

export function magnet(st, stationData, snap) {
  const base = stationData.base, red = st.thresholds.roja;
  const fillAt = (level) => clamp((level - base) / (red - base), 0, 1.25);
  const rt = readingT(st, snap);
  const hist = st.history.filter((p) => p.level != null);
  const levelAt = (tau) => {
    if (!hist.length) return st.level;
    if (tau >= hist[hist.length - 1].t) return hist[hist.length - 1].level;
    if (tau <= hist[0].t) return hist[0].level;
    const i = hist.findIndex((p) => p.t >= tau);
    const a = hist[i - 1], b = hist[i];
    return a.level + ((b.level - a.level) * (tau - a.t)) / (b.t - a.t);
  };
  const series = [];
  for (let k = 24; k >= 0; k--) { const tau = rt - k * 2.5; series.push(ut(fillAt(levelAt(tau)), tau)); }
  return { uT: r1(series[series.length - 1]), series, fill: st.fill, calibration: 'pendiente' };
}

/* ------------------------------------------------------------- acelerómetro y giroscopio */
const GUST_TIMES = [96, 118, 131, 177, 205];   // ráfagas conceptuales del escenario (coinciden con el viento fuerte)

export function motion(st, snap) {
  const t = snap.t, wind = snap.weather.windKmh;
  const amp = 0.25 + wind / 40;
  const roll = r1(0.3 * Math.sin(t / 9) + amp * 0.9 * Math.sin(t * 1.3));
  const pitch = r1(0.25 * Math.sin(t / 11 + 1) + amp * 0.7 * Math.sin(t * 1.1 + 2));
  const vib = r1(6 + 0.9 * wind + 3 * Math.sin(t * 1.7));
  const gyro = r1(0.4 + wind * 0.05 + 0.3 * Math.sin(t * 2.1));
  const sensor = st.device.sensors.find((s) => s.id === 'motion');
  let stability = { key: 'ok', label: 'Estable' };
  // Con el enlace caído el nodo sigue midiendo localmente (el motor lo marca «offline» desde la óptica del centro de operaciones).
  if (sensor.status === 'degraded') stability = { key: 'warn', label: 'Alteración' };
  else if (wind >= 30) stability = { key: 'info', label: 'Vibración leve' };
  const penalty = sensor.status === 'degraded' ? 30 : 0;
  const pct = Math.round(clamp(100 - (vib - 8) * 0.9 - penalty, 0, 100));
  const quality = { pct, label: pct >= 85 ? 'Alta' : pct >= 60 ? 'Media' : pct > 0 ? 'Baja' : 'Sin datos' };
  const past = GUST_TIMES.filter((g) => g <= t);
  return { pitch, roll, vib, gyro, stability, quality, gusts: { count: past.length, last: past.length ? clockAgo(snap, t - past[past.length - 1]) : null } };
}

/* ------------------------------------------------------------- energía */
export function power(st, stationData, snap) {
  const d = st.device;
  const hoursLeft = Math.round(d.battery / stationData.device.drainPerHour);
  // Panel solar conceptual de 5 W: atardecer ficticio hacia las 19:30 → de noche no aporta.
  const sun = clamp((19 * 60 + 30 - clockMinutes(snap)) / 90, 0, 1);
  const solarW = r1(5 * sun);
  const solar = sun >= 0.66 ? 'Cargando (luz de día)' : sun > 0 ? 'Penumbra · aporte bajo' : 'Sin carga (noche)';
  const tempIn = r1(snap.weather.tempC + 6 + 1.2 * Math.sin(snap.t / 23));
  return { battery: d.battery, state: d.batteryState, hoursLeft, sun, solarW, solar, tempIn };
}

/* ------------------------------------------------------------- LoRa (concepto) */
export function lora(st, snap) {
  const link = loraLink(st);
  const rt = readingT(st, snap);
  const lastT = Math.floor(rt / 5) * 5;                 // un paquete cada 5 min de escenario
  const seq = 1000 + Math.floor((lastT + 180) / 5);
  const queued = Math.floor(st.device.lastSeenMin / 5);
  return {
    link, seq, queued,
    lastClock: clockAgo(snap, snap.t - lastT),
    agoMin: Math.round(snap.t - lastT),
    bytes: 18
  };
}
