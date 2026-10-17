/**
 * Alerta Río — motor de simulación (PURO y DETERMINISTA).
 * Archivo del NÚCLEO: no editar desde feat/publico ni feat/operadores.
 *
 * Sin DOM, sin red, sin aleatoriedad: snapshotAt(model, t) es una función pura del
 * minuto de escenario `t`. Todos los datos son SINTÉTICOS (ver data/*.json).
 * Se puede importar tanto en el navegador como en Node (tests/).
 *
 * Contrato completo: docs/CONTRATO-SIMULACION.md
 */

export const SNAPSHOT_VERSION = 1;
export const STATUS_ORDER = ['normal', 'vigilancia', 'naranja', 'roja'];
const TREND_CM_H = 5;          // |tasa| (cm/h) para considerar "subiendo/bajando"
const RATE_WINDOW_MIN = 15;    // ventana causal para la tasa de cambio
const HISTORY_STEP_MIN = 10;
const BATTERY_LOW = 25;
const BATTERY_CRITICAL = 12;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v, d = 2) => { const f = 10 ** d; return Math.round(v * f) / f; };
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ interpolación */

/** Interpolación cúbica monótona (Fritsch–Carlson / PCHIP): suave y sin sobreimpulsos. */
export function pchip(points) {
  const n = points.length;
  const x = points.map((p) => p[0]);
  const y = points.map((p) => p[1]);
  const h = [], d = [];
  for (let i = 0; i < n - 1; i++) { h[i] = x[i + 1] - x[i]; d[i] = (y[i + 1] - y[i]) / h[i]; }
  const m = new Array(n);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return (t) => {
    if (t <= x[0]) return y[0];
    if (t >= x[n - 1]) return y[n - 1];
    let i = 0;
    while (t > x[i + 1]) i++;
    const s = (t - x[i]) / h[i], s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h[i] * m[i]
      + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h[i] * m[i + 1];
  };
}

/* ------------------------------------------------------------------ modelo */

/**
 * Construye el modelo inmutable a partir de los JSON de data/.
 * @param {{scenario:object, stations:object, levels:object, map:object}} data
 */
export function buildModel(data) {
  const { scenario, levels, map } = data;
  const H = pchip(scenario.hydrograph.points);
  const rainFn = pchip(scenario.rain.points);
  const pressureFn = pchip(scenario.weather.pressureHpa);
  const windFn = pchip(scenario.weather.windKmh);
  const tempFn = pchip(scenario.weather.tempC);

  const stations = data.stations.stations.map((s, idx) => {
    const pathIdx = map.river.stationPathIndex[s.id];
    const [lat, lng] = map.river.path[pathIdx];
    return { ...s, lat, lng, pathIndex: pathIdx, phase: idx * 1.7 + 0.4 };
  });

  const model = {
    scenario, levels, map, stations,
    stationsById: Object.fromEntries(stations.map((s) => [s.id, s])),
    sensors: data.stations.sensors,
    unit: data.stations.unit || 'm',
    duration: scenario.durationMin,
    preroll: scenario.prerollMin,
    H, rainFn, pressureFn, windFn, tempFn,
    events: [], markers: [], transitions: {}
  };
  model.events = [];
  scanTimeline(model);
  return model;
}

/* ------------------------------------------------------------------ física sintética */

function ripple(st, t) {
  return 0.005 * Math.sin(TAU * t / 113 + st.phase) + 0.003 * Math.sin(TAU * t / 53 + 2 * st.phase);
}
/** Nivel "verdadero" del río (m) sin ruido de sensor. */
function smoothLevel(model, st, t) { return st.base + st.amp * model.H(t - st.lagMin); }
function trueLevel(model, st, t) { return smoothLevel(model, st, t) + ripple(st, t); }
function stationRain(model, st, t) { return Math.max(0, model.rainFn(t) * st.rainFactor); }

function severityOf(st, level) {
  const th = st.thresholds;
  return level >= th.roja ? 3 : level >= th.naranja ? 2 : level >= th.vigilancia ? 1 : 0;
}

function activeQuirk(st, t, type) {
  return st.device.quirks.find((q) => q.type === type && t >= q.fromMin && t < q.toMin) || null;
}

/** Instante de la última lectura recibida: congelado mientras la estación está sin conexión. */
function readingT(st, t) {
  const off = activeQuirk(st, t, 'offline');
  return off ? off.fromMin : t;
}

function rateCmH(model, st, rt) {
  return round(((trueLevel(model, st, rt) - trueLevel(model, st, rt - RATE_WINDOW_MIN)) / RATE_WINDOW_MIN) * 60 * 100, 1);
}
function trendOf(rate) { return rate > TREND_CM_H ? 'rising' : rate < -TREND_CM_H ? 'falling' : 'steady'; }

/* ------------------------------------------------------------------ predicción SIMULADA */

/**
 * Predicción sintética: el "modelo" ve la lluvia observada (evidencia k) y proyecta la curva
 * del escenario con un sesgo pequeño y una banda que se ensancha con el horizonte.
 * NO es aprendizaje automático: es una heurística determinista y está rotulada como simulada.
 */
function forecastFor(model, st, t) {
  const cfg = model.scenario.forecast;
  const rt = readingT(st, t);
  const k = clamp((stationRain(model, st, rt) - 2) / 6, 0, 1);
  const now = smoothLevel(model, st, rt);
  const points = [];
  for (let dt = 0; dt <= cfg.horizonMin; dt += cfg.stepMin) {
    const raw = smoothLevel(model, st, rt + dt);
    const bias = 0.05 * (dt / cfg.horizonMin) * Math.sin(rt / 37 + st.phase);
    const pred = now + (raw - now) * k + bias;
    const w = dt === 0 ? 0 : (0.02 + 0.00075 * dt) * (1.5 - 0.5 * k);
    points.push({ dtMin: dt, level: round(pred, 2), low: round(pred - w, 2), high: round(pred + w, 2) });
  }
  const observed = trueLevel(model, st, rt);
  points[0] = { dtMin: 0, level: round(observed, 2), low: round(observed, 2), high: round(observed, 2) };

  const etaMin = {};
  let peak = -Infinity;
  for (const p of points) peak = Math.max(peak, p.level);
  for (const key of ['vigilancia', 'naranja', 'roja']) {
    const thr = st.thresholds[key];
    let eta = null;
    if (points[0].level >= thr) eta = 0;
    else {
      for (let i = 1; i < points.length; i++) {
        if (points[i].level >= thr) {
          const a = points[i - 1], b = points[i];
          eta = Math.round(a.dtMin + ((thr - a.level) / (b.level - a.level)) * (b.dtMin - a.dtMin));
          break;
        }
      }
    }
    etaMin[key] = eta;
  }
  const predictedSeverity = severityOf(st, peak);
  const etaRef = etaMin.roja ?? etaMin.naranja ?? etaMin.vigilancia ?? 0;
  const confidence = round(clamp(0.4 + 0.5 * k - 0.25 * (etaRef / cfg.horizonMin), 0.2, 0.95), 2);
  return {
    simulated: true,
    horizonMin: cfg.horizonMin, issuedAtT: t, evidence: round(k, 2),
    points, etaMin,
    peakLevel: round(peak, 2),
    predictedSeverity, predictedStatus: STATUS_ORDER[predictedSeverity],
    confidence, confidenceLabel: confidence < 0.5 ? 'baja' : confidence < 0.75 ? 'media' : 'alta'
  };
}

/** Panorama del sistema: peor severidad prevista dentro de la ventana de pre-alerta. */
function outlookFor(model, stationStates) {
  const win = model.scenario.forecast.preAlertEtaMin;
  const cw = Math.max(...stationStates.map((s) => s.severity));
  let pw = 0, focus = null;
  for (const s of stationStates) {
    const f = s.forecast;
    let worst = s.severity, eta = 0;
    for (const [sev, key] of [[3, 'roja'], [2, 'naranja'], [1, 'vigilancia']]) {
      if (sev > worst && f.etaMin[key] !== null && f.etaMin[key] <= win) { worst = sev; eta = f.etaMin[key]; break; }
    }
    if (worst > pw || (worst === pw && focus && worst > cw && eta < focus.etaMin)) {
      pw = worst;
      focus = { stationId: s.id, etaMin: eta, confidence: f.confidence, confidenceLabel: f.confidenceLabel };
    }
  }
  const key = pw >= 3 ? 'critical' : pw === 2 ? 'warning' : pw === 1 ? 'rising' : 'calm';
  const text = model.levels.outlook[key];
  const preAlert = pw >= 2 && pw > cw;       // el peligro se anticipa ANTES de que ocurra
  const station = focus ? model.stationsById[focus.stationId] : null;
  let message = text.citizen;
  if (preAlert && focus && station) {
    const target = pw === 3 ? 'nivel crítico (alerta roja)' : 'alerta naranja';
    message = `Predicción simulada: posible ${target} en ${station.name} en aprox. ${fmtMinutes(focus.etaMin)} (confianza ${focus.confidenceLabel}).`;
  }
  return {
    simulated: true, key, label: text.label, message, preAlert,
    severity: pw, status: STATUS_ORDER[pw],
    stationId: focus ? focus.stationId : null,
    etaMin: focus ? focus.etaMin : null,
    confidence: focus ? focus.confidence : null,
    confidenceLabel: focus ? focus.confidenceLabel : null,
    windowMin: win
  };
}

/* ------------------------------------------------------------------ dispositivo */

function deviceFor(model, st, t) {
  const d = st.device;
  const battery = round(clamp(d.batteryStart - d.drainPerHour * (t / 60), 3, 100), 0);
  const batteryState = battery >= 50 ? 'ok' : battery >= BATTERY_LOW ? 'media' : battery >= BATTERY_CRITICAL ? 'baja' : 'critica';
  const off = activeQuirk(st, t, 'offline');
  const weak = activeQuirk(st, t, 'weak-signal');
  const connectivity = off ? 'offline' : weak ? 'degraded' : 'online';
  const signalDbm = off ? null : weak ? -112 : Math.round(d.signalBaseDbm + 3 * Math.sin(t / 29 + st.phase));
  const sensors = model.sensors.map((sd) => {
    let status = 'ok', note = 'Lectura normal';
    if (off) { status = 'offline'; note = 'Sin datos'; }
    else {
      const q = st.device.quirks.find((x) => x.type === 'sensor-degraded' && x.sensor === sd.id && t >= x.fromMin && t < x.toMin);
      if (q) { status = 'degraded'; note = 'Lectura con ruido'; }
    }
    return { id: sd.id, label: sd.label, status, note };
  });
  const health = off || batteryState === 'critica' ? 'falla'
    : (weak || batteryState === 'baja' || sensors.some((s) => s.status !== 'ok')) ? 'atencion' : 'ok';
  return {
    simulated: true, model: d.model, battery, batteryState, connectivity, signalDbm,
    lastSeenMin: off ? Math.round(t - off.fromMin) : 0,
    sensors, health
  };
}

/* ------------------------------------------------------------------ utilidades de formato (puras) */

export function fmtMinutes(min) {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
export function clockLabel(model, t) {
  const [hh, mm] = model.scenario.startClock.split(':').map(Number);
  const total = hh * 60 + mm + Math.round(t);
  const day = Math.floor(total / 1440);
  const mod = ((total % 1440) + 1440) % 1440;
  return { clock: `${String(Math.floor(mod / 60)).padStart(2, '0')}:${String(mod % 60).padStart(2, '0')}`, dayOffset: day };
}

/* ------------------------------------------------------------------ estaciones en un instante */

function stationState(model, st, t, { withHistory = true } = {}) {
  const rt = readingT(st, t);
  const stale = rt !== t;
  const level = trueLevel(model, st, rt);
  const severity = severityOf(st, level);
  const rate = rateCmH(model, st, rt);
  const th = st.thresholds;
  const forecast = forecastFor(model, st, t);
  const device = deviceFor(model, st, t);
  const out = {
    id: st.id, order: st.order, name: st.name, short: st.short, role: st.role, riverKm: st.riverKm,
    lat: st.lat, lng: st.lng,
    status: STATUS_ORDER[severity], severity,
    level: round(level, 2), unit: model.unit, stale,
    rateCmH: rate, trend: trendOf(rate),
    rainMmH: round(stationRain(model, st, rt), 1),
    thresholds: { ...th },
    fill: round(clamp((level - st.base) / (th.roja - st.base), 0, 1.25), 3),  // 0..1 = nivel base → umbral rojo
    forecast, device
  };
  if (withHistory) {
    const from = Math.max(-model.preroll, t - 360);
    const hist = [];
    const push = (tt) => {
      const o = activeQuirk(st, tt, 'offline');
      hist.push({ t: tt, level: o ? null : round(trueLevel(model, st, tt), 2), rainMmH: round(stationRain(model, st, tt), 1) });
    };
    for (let tt = Math.ceil(from / HISTORY_STEP_MIN) * HISTORY_STEP_MIN; tt < t; tt += HISTORY_STEP_MIN) push(tt);
    hist.push({ t, level: stale ? null : round(level, 2), rainMmH: out.rainMmH });
    out.history = hist;
  }
  return out;
}

/* ------------------------------------------------------------------ barrido del escenario → eventos y marcadores */

function scanTimeline(model) {
  const { scenario, stations } = model;
  const events = [];
  const add = (e) => events.push({ simulated: true, severity: 0, ...e });
  const prev = Object.fromEntries(stations.map((s) => [s.id, { sev: 0, batt: 'ok', conn: 'online', sensors: {} }]));
  const sinceByStation = Object.fromEntries(stations.map((s) => [s.id, {}]));
  let prevSys = 0, prevOutlook = 'calm';
  const seenOutlook = new Set();
  const markers = [];
  const sysSeen = new Set();
  const startT = -60;  // el barrido arranca antes de t=0 para tomar el estado inicial sin generar eventos
  for (let t = startT; t <= model.duration; t += 1) {
    const states = stations.map((s) => stationState(model, s, t, { withHistory: false }));
    for (const s of states) {
      const p = prev[s.id];
      if (s.severity !== p.sev) {
        sinceByStation[s.id][s.severity] = t;
        if (t >= 0) {
          const up = s.severity > p.sev;
          const lvl = model.levels.levels[s.status];
          add({
            t, type: 'level', stationId: s.id, severity: s.severity, status: s.status,
            title: up ? `${s.short}: ${lvl.label.toLowerCase()}` : `${s.short}: baja a ${lvl.label.toLowerCase()}`,
            detail: `Nivel ${s.level.toFixed(2)} ${model.unit} (umbral ${(up ? s.thresholds[STATUS_ORDER[s.severity]] : s.thresholds[STATUS_ORDER[p.sev]]).toFixed(2)} ${model.unit}). Dato simulado.`
          });
        }
        p.sev = s.severity;
      }
      // dispositivo
      const dev = s.device;
      if (dev.batteryState !== p.batt) {
        const worse = ['ok', 'media', 'baja', 'critica'].indexOf(dev.batteryState) > ['ok', 'media', 'baja', 'critica'].indexOf(p.batt);
        if (t >= 0 && worse && (dev.batteryState === 'baja' || dev.batteryState === 'critica')) {
          add({ t, type: 'device', stationId: s.id, severity: dev.batteryState === 'critica' ? 2 : 1, title: `${s.short}: batería ${dev.batteryState === 'critica' ? 'crítica' : 'baja'}`, detail: `La batería del dispositivo cayó a ${dev.battery} % (simulado).` });
        }
        p.batt = dev.batteryState;
      }
      if (dev.connectivity !== p.conn) {
        if (t >= 0) {
          if (dev.connectivity === 'offline') add({ t, type: 'device', stationId: s.id, severity: 2, title: `${s.short}: pérdida de conectividad`, detail: 'Sin enlace de datos; se muestra la última lectura recibida (simulado).' });
          else if (dev.connectivity === 'degraded') add({ t, type: 'device', stationId: s.id, severity: 1, title: `${s.short}: señal débil`, detail: 'Enlace inestable; posibles retrasos en las lecturas (simulado).' });
          else add({ t, type: 'device', stationId: s.id, severity: 0, title: `${s.short}: conectividad restablecida`, detail: 'Enlace recuperado y lecturas sincronizadas (simulado).' });
        }
        p.conn = dev.connectivity;
      }
      for (const sn of dev.sensors) {
        const was = p.sensors[sn.id] || 'ok';
        if (sn.status !== was && sn.status === 'degraded' && t >= 0) {
          add({ t, type: 'device', stationId: s.id, severity: 1, title: `${s.short}: sensor degradado`, detail: `${sn.label}: ${sn.note.toLowerCase()} (simulado).` });
        }
        p.sensors[sn.id] = sn.status;
      }
    }
    const sysSev = Math.max(...states.map((s) => s.severity));
    if (sysSev > prevSys) {
      for (let sv = prevSys + 1; sv <= sysSev; sv++) if (t >= 0 && !sysSeen.has(sv)) { sysSeen.add(sv); markers.push({ t, kind: 'status', severity: sv, status: STATUS_ORDER[sv], label: model.levels.levels[STATUS_ORDER[sv]].label }); }
    }
    prevSys = sysSev;
    const ol = outlookFor(model, states);
    if (t >= 0 && ol.key !== prevOutlook && ol.preAlert && !seenOutlook.has(ol.key)) {
      seenOutlook.add(ol.key);
      add({ t, type: 'forecast', stationId: ol.stationId, severity: ol.severity, status: ol.status, title: `Predicción simulada: ${ol.label.toLowerCase()}`, detail: ol.message });
      markers.push({ t, kind: 'forecast', severity: ol.severity, status: ol.status, label: `Predicción: ${ol.label.toLowerCase()}` });
    }
    prevOutlook = ol.key;
  }
  for (const e of scenario.events) add({ ...e });
  events.sort((a, b) => a.t - b.t);
  events.forEach((e, i) => { e.id = `ev-${String(e.t).padStart(3, '0')}-${i}`; Object.assign(e, clockLabel(model, e.t)); });
  markers.sort((a, b) => a.t - b.t);
  model.events = events;
  model.markers = markers;
  model.transitions = sinceByStation;
}

/* ------------------------------------------------------------------ snapshot */

/**
 * Estado derivado completo en el minuto `t` del escenario. Función pura.
 * @param {object} model resultado de buildModel
 * @param {number} t minutos de escenario (puede ser < 0: estado previo a la crecida)
 * @param {{mode?: 'baseline'|'simulation'}} [opts]
 */
export function snapshotAt(model, t, opts = {}) {
  const tt = clamp(t, -model.preroll, model.duration + model.scenario.postrollMin);
  const stationStates = model.stations.map((s) => stationState(model, s, tt));
  const outlook = outlookFor(model, stationStates);
  const levels = model.levels.levels;

  const worst = stationStates.reduce((a, s) => (s.severity > a.severity || (s.severity === a.severity && s.fill > a.fill) ? s : a), stationStates[0]);
  const sysSeverity = worst.severity;
  const sysStatus = STATUS_ORDER[sysSeverity];
  const lvl = levels[sysStatus];
  const counts = Object.fromEntries(STATUS_ORDER.map((k) => [k, 0]));
  stationStates.forEach((s) => { counts[s.status] += 1; });

  const rain = model.rainFn(tt);
  let rain3h = 0;
  for (let u = tt - 180; u < tt; u += 10) rain3h += model.rainFn(u) * (10 / 60);
  let rainNext6h = 0;
  for (let u = tt; u < tt + 360; u += 10) rainNext6h += model.rainFn(u) * (10 / 60);
  const condition = rain < 0.5 ? 'Nublado' : rain < 3 ? 'Lluvia débil' : rain < 10 ? 'Lluvia moderada' : rain < 16 ? 'Lluvia fuerte' : 'Lluvia muy intensa';
  const weather = {
    simulated: true, condition, rainMmH: round(rain, 1), rain3hMm: round(rain3h, 0), rainNext6hMm: round(rainNext6h, 0),
    pressureHpa: round(model.pressureFn(tt), 0), windKmh: round(model.windFn(tt), 0), tempC: round(model.tempFn(tt), 0)
  };

  const segStatus = (ids) => Math.max(...ids.map((id) => stationStates.find((s) => s.id === id).severity));
  const riverSegments = model.map.river.segments.map((sg) => {
    const sev = segStatus(sg.stationIds);
    return { id: sg.id, from: sg.from, to: sg.to, stationIds: sg.stationIds, severity: sev, status: STATUS_ORDER[sev] };
  });

  const zones = model.map.zones.map((z) => {
    const st = stationStates.find((s) => s.id === z.stationId);
    const sev = clamp(st.severity + z.bias, 0, 3);
    return { id: z.id, name: z.name, kind: z.kind, note: z.note, stationId: z.stationId, severity: sev, status: STATUS_ORDER[sev] };
  });

  // Alertas activas
  const alerts = [];
  for (const s of stationStates) {
    if (s.severity >= 1) {
      const since = model.transitions[s.id][s.severity];
      alerts.push({
        id: `lvl-${s.id}`, kind: 'level', stationId: s.id, severity: s.severity, status: s.status, sinceT: since ?? null,
        title: `${s.name}: ${levels[s.status].label}`,
        detail: `Nivel ${s.level.toFixed(2)} ${model.unit}. ${s.trend === 'rising' ? `Subiendo ${s.rateCmH} cm/h.` : s.trend === 'falling' ? 'Bajando.' : 'Estable.'}`
      });
    }
    if (s.device.connectivity === 'offline') alerts.push({ id: `dev-off-${s.id}`, kind: 'device', stationId: s.id, severity: 1, status: null, title: `${s.short}: sin conexión`, detail: `Última lectura hace ${s.device.lastSeenMin} min.` });
    if (s.device.batteryState === 'baja' || s.device.batteryState === 'critica') alerts.push({ id: `dev-bat-${s.id}`, kind: 'device', stationId: s.id, severity: s.device.batteryState === 'critica' ? 2 : 1, status: null, title: `${s.short}: batería ${s.device.batteryState === 'critica' ? 'crítica' : 'baja'}`, detail: `${s.device.battery} % restante.` });
  }
  if (outlook.preAlert) {
    alerts.push({ id: 'forecast', kind: 'forecast', stationId: outlook.stationId, severity: outlook.severity, status: outlook.status, sinceT: null, title: `Predicción simulada: ${outlook.label.toLowerCase()}`, detail: outlook.message });
  }
  const kindOrder = { forecast: 0, level: 1, device: 2 };
  alerts.sort((a, b) => b.severity - a.severity || kindOrder[a.kind] - kindOrder[b.kind] || a.id.localeCompare(b.id));

  const events = model.events.filter((e) => e.t <= tt && e.t >= 0).slice().reverse();
  const { clock, dayOffset } = clockLabel(model, tt);
  const elapsed = Math.max(0, tt);

  return {
    v: SNAPSHOT_VERSION,
    simulated: true,
    disclaimer: model.levels.disclaimer,
    mode: opts.mode || 'simulation',
    t: tt,
    progress: clamp(tt / model.duration, 0, 1),
    clock, dayOffset,
    elapsedLabel: tt < 0 ? 'Antes del escenario' : `+${fmtMinutes(elapsed)}`,
    duration: model.duration,
    system: {
      status: sysStatus, severity: sysSeverity, level: lvl,
      focusStationId: worst.id, focusStationName: worst.name,
      trend: worst.trend, rateCmH: worst.rateCmH,
      counts, outlook
    },
    weather,
    stations: stationStates,
    riverSegments,
    zones,
    alerts,
    events
  };
}
