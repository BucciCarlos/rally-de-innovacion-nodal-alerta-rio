// Nodal · Modo Nodo — actualización de la pantalla del celular a partir de un snapshot (sin recrear el DOM por tick).
import { fmtLevel, fmtNumber, CONNECTIVITY, DEVICE_HEALTH, BATTERY } from '../core/format.js';
import { networkSummary } from '../core/derived.js';
import { $, esc, setText, setAttr, setHtml, STATUS_SYMBOL } from './ui.js';
import { magnet, motion, power, lora, clockAgo, readingT } from './telemetry.js';

const SENSOR_NAME = { level: 'Magnetómetro', rain: 'Micrófono', pressure: 'Barómetro', motion: 'Acel. / giro' };
const SENSOR_STATE = { ok: ['✓', 'OK'], degraded: ['⚠', 'Degradado'], offline: ['◌', 'Sin envío'] };   // offline = el centro no recibe datos; el nodo sigue midiendo
const BATTERY_TONE = { ok: 'ok', media: 'info', baja: 'warn', critica: 'bad' };
const LORA_TONE = { activo: 'ok', debil: 'warn', 'sin-enlace': 'bad' };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const n1 = (v) => fmtNumber(v, 1);

const TUBE_BOTTOM = 186, SPAN = 100;      // escala vertical del esquema: fill 1 → 100 px sobre el fondo del tubo
const yOf = (fill) => TUBE_BOTTOM - clamp(fill, 0, 1.3) * SPAN;

export function renderNode(snap, st, sd, levels) {
  const d = st.device;
  setText('node-id', `Nodo ${st.id} · celular reutilizado`);
  setText('node-title', st.name);
  setText('node-role', st.role);
  const pill = setText('node-state', d.connectivity === 'offline' ? 'Sin enlace' : DEVICE_HEALTH[d.health].label);
  pill.dataset.health = d.health; $('card-node').dataset.health = d.health;
  setText('node-last', `${clockAgo(snap, d.lastSeenMin)} · ${d.lastSeenMin > 0 ? `hace ${d.lastSeenMin} min` : 'ahora'}`);
  const river = setText('node-river', `${STATUS_SYMBOL[st.status]} ${levels[st.status].label}`);
  river.dataset.status = st.status;
  setHtml('node-sensors', d.sensors.map((s) => {
    const [icon, label] = SENSOR_STATE[s.status];
    return `<li data-sensor="${s.status}"><span aria-hidden="true">${icon}</span>${esc(SENSOR_NAME[s.id] ?? s.id)}<small>${label}</small></li>`;
  }).join(''));

  const w = [];
  if (d.batteryState === 'baja' || d.batteryState === 'critica') w.push([d.batteryState === 'critica' ? 'bad' : 'warn', `Batería ${d.batteryState === 'critica' ? 'crítica' : 'baja'} (${d.battery} %): autonomía limitada.`]);
  if (d.connectivity === 'offline') w.push(['bad', `Sin enlace LoRa: el nodo sigue midiendo, pero el centro no recibe datos (${Math.floor(d.lastSeenMin / 5)} paquetes en cola).`]);
  if (d.connectivity === 'degraded') w.push(['warn', 'Enlace débil: pueden demorarse los paquetes.']);
  for (const s of d.sensors) if (s.status === 'degraded') w.push(['warn', `${SENSOR_NAME[s.id] ?? s.id}: lectura degradada.`]);
  const ul = setHtml('node-warnings', w.map(([tone, msg]) => `<li data-tone="${tone}">${esc(msg)}</li>`).join(''));
  ul.hidden = w.length === 0;
}

export function renderStatusBar(snap, st) {
  const d = st.device;
  setText('sb-clock', snap.clock);
  setText('sb-batt-pct', `${d.battery}%`);
  $('sb-batt-fill').style.width = `${d.battery}%`;
  $('card-node').closest('.screen').dataset.battery = d.batteryState;
  const bars = d.connectivity === 'offline' ? 0 : d.connectivity === 'degraded' ? 1 : d.signalDbm >= -90 ? 4 : 3;
  setAttr('sb-lora', 'data-bars', bars);
}

export function renderLevel(snap, st, sd) {
  const m = magnet(st, sd, snap);
  const waterY = yOf(m.fill);
  $('dg-water-tube').setAttribute('y', waterY); $('dg-water-tube').setAttribute('height', TUBE_BOTTOM - waterY);
  $('dg-water-river').setAttribute('y', waterY); $('dg-water-river').setAttribute('height', TUBE_BOTTOM + 2 - waterY);
  $('dg-float').setAttribute('transform', `translate(0 ${(waterY - 2).toFixed(1)})`);
  $('dg-field').style.opacity = (0.25 + 0.6 * clamp(m.fill / 1.25, 0, 1)).toFixed(2);
  const base = sd.base, red = st.thresholds.roja;
  for (const [id, key] of [['v', 'vigilancia'], ['n', 'naranja'], ['r', 'roja']]) {
    const y = yOf((st.thresholds[key] - base) / (red - base));
    setAttr(`dg-th-${id}`, 'y1', y); setAttr(`dg-th-${id}`, 'y2', y); setAttr(`dg-th-${id}-t`, 'y', y + 3);
  }
  setText('dg-level-t', `${fmtLevel(st.level)} · dato simulado`);
  setText('lv-level', fmtLevel(st.level));
  setText('lv-level-s', st.stale ? 'Último valor transmitido' : st.trend === 'rising' ? 'Subiendo' : st.trend === 'falling' ? 'Bajando' : 'Estable');
  setText('mg-ut', `${n1(m.uT)} µT`);
  const lo = 44, hi = 76;
  $('mg-line').setAttribute('points', m.series.map((v, i) => `${(i * 10).toFixed(1)},${(42 - clamp((v - lo) / (hi - lo), 0, 1) * 38).toFixed(1)}`).join(' '));
}

export function renderMotion(snap, st) {
  const mo = motion(st, snap);
  const pill = setText('mo-stability', mo.stability.label); pill.dataset.tone = mo.stability.key;
  setText('mo-tilt', `${n1(mo.pitch)}° / ${n1(mo.roll)}°`);
  setText('mo-vib', `${n1(mo.vib)} mg`);
  setText('mo-gyro', `${n1(mo.gyro)} °/s`);
  $('bb-dot').setAttribute('cx', (60 + clamp(mo.roll * 6, -26, 26)).toFixed(1));
  $('bb-dot').setAttribute('cy', (60 + clamp(mo.pitch * 6, -26, 26)).toFixed(1));
  $('mo-q-fill').style.width = `${mo.quality.pct}%`;
  $('mo-q-fill').dataset.q = mo.quality.label;
  setText('mo-q', `${mo.quality.label} · ${mo.quality.pct} %`);
  setText('mo-gusts', mo.gusts.count
    ? `${mo.gusts.count} sacudida${mo.gusts.count > 1 ? 's' : ''} leve${mo.gusts.count > 1 ? 's' : ''} por ráfagas detectada${mo.gusts.count > 1 ? 's' : ''} (última ${mo.gusts.last}). Se filtran y no alteran el nivel informado.`
    : 'Sin sacudidas ni alteraciones detectadas.');
}

export function renderPower(snap, st, sd) {
  const p = power(st, sd, snap);
  const pill = setText('pw-state', `Batería ${BATTERY[p.state].label.toLowerCase()}`); pill.dataset.tone = BATTERY_TONE[p.state];
  setText('pw-pct', `${p.battery} %`);
  const fill = $('pw-fill'); fill.style.width = `${p.battery}%`; fill.dataset.state = p.state;
  setText('pw-auto', `Autonomía estimada ≈ ${p.hoursLeft} h (simulada)`);
  setText('pw-solar', p.sun > 0 ? `${p.solar} · ${n1(p.solarW)} W` : p.solar);
  setText('pw-temp', `${n1(p.tempIn)} °C`);
  const warn = $('pw-warn');
  const low = p.state === 'baja' || p.state === 'critica';
  warn.hidden = !low;
  if (low) { warn.dataset.tone = p.state === 'critica' ? 'bad' : 'warn'; setText('pw-warn', p.state === 'critica' ? '⚠ Batería crítica: el nodo podría apagarse antes de que termine el evento.' : '⚠ Batería baja: sin aporte solar de noche, el nodo prioriza el envío de lo esencial.'); }
}

export function renderLora(snap, st) {
  const l = lora(st, snap), net = networkSummary(snap);
  const pill = setText('lr-state', l.link.label); pill.dataset.tone = LORA_TONE[l.link.state];
  $('lora-diagram').dataset.state = l.link.state;
  $('lora-diagram').dataset.gateway = net.gateway.state;
  setText('lk-t-node', `Nodo ${st.id}`);
  setText('lr-rssi', l.link.rssi == null ? '—' : `${l.link.rssi} dBm`);
  setText('lr-snr', l.link.snr == null ? '—' : `${n1(l.link.snr)} dB`);
  setText('lr-sf', l.link.sf == null ? '—' : `SF${l.link.sf}`);
  setText('lr-seq', `#${l.seq}`);
  setText('lr-body', [
    `nodo: ${st.id}   seq: ${l.seq}`,
    `hora: ${l.lastClock}   (hace ${l.agoMin} min)`,
    `nivel_sim: ${st.level.toFixed(2)} m`,
    `bat: ${st.device.battery} %   estado: ${st.status}`
  ].join('\n'));
  setText('lr-foot', l.link.state === 'sin-enlace'
    ? `${l.queued} paquete${l.queued === 1 ? '' : 's'} en cola sin enviar · ${CONNECTIVITY.offline.label.toLowerCase()}`
    : `${l.bytes} bytes · ${l.link.sf ? `SF${l.link.sf} · ` : ''}paquete simulado, no transmitido`);
  setText('lr-net', `${net.gateway.name} · ${net.linked}/${net.total} nodos con enlace · ${net.label.toLowerCase()}`);
}
