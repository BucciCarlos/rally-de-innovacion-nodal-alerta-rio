import { CONNECTIVITY, DEVICE_HEALTH, BATTERY } from '../core/format.js';
import { $, esc, html, text, number } from './ui.js';
const stateLabels = { ok: 'Operativo', degraded: 'Degradado', offline: 'Sin conexión' };

export function createDevices(sim, select) {
  const rows = new Map();
  for (const st of sim.getSnapshot().stations) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'device-card';
    button.innerHTML = `<span class="device-title"><strong>${esc(st.id)} <span>${esc(st.short)}</span></strong><small></small></span><span class="device-connectivity"></span><span class="battery-line"><span class="battery"><i></i></span><span class="battery-value"></span></span>`;
    button.addEventListener('click', () => select(st.id));
    rows.set(st.id, button); $('device-list').append(button);
  }
  return (snap, selected) => {
    text('device-count', `${snap.stations.filter((s) => s.device.connectivity === 'online').length}/${snap.stations.length} en línea`);
    for (const st of snap.stations) {
      const row = rows.get(st.id), d = st.device;
      row.dataset.health = d.health; row.dataset.battery = d.batteryState;
      row.setAttribute('aria-pressed', String(selected === st.id));
      row.querySelector('.device-title small').textContent = `${d.health === 'ok' ? '✓' : '⚠'} ${DEVICE_HEALTH[d.health].label}`;
      row.querySelector('.device-connectivity').textContent = `${CONNECTIVITY[d.connectivity].label} · ${d.signalDbm == null ? 'sin señal' : `${number(d.signalDbm)} dBm`}`;
      row.querySelector('.battery i').style.width = `${d.battery}%`;
      row.querySelector('.battery-value').textContent = `${number(d.battery)} % · ${BATTERY[d.batteryState].label}`;
    }
    const st = snap.stations.find((s) => s.id === selected), d = st.device;
    html($('sensor-detail'), `<div><strong>${esc(st.id)} · ${esc(d.model)}</strong><span>Última lectura hace ${number(d.lastSeenMin)} min · dispositivo simulado</span></div><ul>${d.sensors.map((s) => `<li data-sensor="${s.status}"><span>${s.status === 'ok' ? '✓' : '⚠'} ${esc(s.label)}</span><strong>${esc(stateLabels[s.status])}</strong><small>${esc(s.note)}</small></li>`).join('')}</ul>`);
  };
}
