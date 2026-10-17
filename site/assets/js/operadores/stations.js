import { fmtLevel, fmtRate, fmtEta, TREND } from '../core/format.js';
import { $, esc, html, text, status, symbols, number } from './ui.js';

export function createStations(sim, select) {
  const rows = new Map();
  for (const st of sim.getSnapshot().stations) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'station-row'; button.dataset.station = st.id;
    button.innerHTML = `<span class="station-code">${esc(st.id)}</span><span class="station-info"><strong>${esc(st.short)}</strong><small class="station-state"></small><span class="station-track"><i></i></span></span><span class="station-values"><strong></strong><small></small></span>`;
    button.addEventListener('click', () => select(st.id));
    rows.set(st.id, button); $('station-list').append(button);
  }
  $('station-list').addEventListener('keydown', (event) => {
    const buttons = [...rows.values()], index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    let next = index;
    if (event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else return;
    event.preventDefault(); buttons[next].focus(); select(buttons[next].dataset.station);
  });
  return (snap, selected) => {
    text('station-total', `${snap.stations.length} estaciones`);
    for (const st of snap.stations) {
      const row = rows.get(st.id);
      row.setAttribute('aria-pressed', String(st.id === selected));
      if (row.dataset.status && row.dataset.status !== st.status) {
        row.classList.remove('status-change');
        requestAnimationFrame(() => row.classList.add('status-change'));
      }
      row.dataset.status = st.status; row.classList.toggle('stale', st.stale);
      row.querySelector('.station-state').textContent = `${symbols[st.status]} ${sim.levels[st.status].label}${st.stale ? ' · Sin conexión' : ''}`;
      row.querySelector('.station-values strong').textContent = fmtLevel(st.level);
      row.querySelector('.station-values small').textContent = `${TREND[st.trend].arrow} ${fmtRate(st.rateCmH)}`;
      row.querySelector('.station-track i').style.width = `${Math.max(0, Math.min(st.fill, 1)) * 100}%`;
    }
    const st = snap.stations.find((s) => s.id === selected);
    text('detail-id', `${st.id} · ESTACIÓN SELECCIONADA`); text('detail-title', st.name);
    status($('detail-status'), st.status, sim.levels);
    html($('station-detail'), `<div class="level-display ${st.stale ? 'stale' : ''}"><span>Nivel observado</span><strong>${esc(fmtLevel(st.level))}</strong><span>${esc(TREND[st.trend].label)} · ${esc(fmtRate(st.rateCmH))}</span></div>
      <p class="reading-note ${st.stale ? 'device-warning' : ''}">${st.stale ? `◷ Última lectura hace ${number(st.device.lastSeenMin)} min · valor congelado` : '● Lectura disponible en el escenario'}</p>
      <dl class="detail-facts"><div><dt>Lluvia local</dt><dd>${number(st.rainMmH, 1)} mm/h</dd></div><div><dt>Tramo de la cuenca</dt><dd>${esc(st.role)}</dd></div></dl>
      <h3 class="section-label">Umbrales y llegada estimada</h3><div class="thresholds">${['vigilancia', 'naranja', 'roja'].map((key) => `<div data-status="${key}"><span class="threshold-symbol">${symbols[key]}</span><span>${esc(sim.levels[key].label)}<small>${esc(fmtLevel(st.thresholds[key]))}</small></span><strong>${esc(fmtEta(st.forecast.etaMin[key]))}</strong></div>`).join('')}</div>
      <div class="station-forecast" data-status="${st.forecast.predictedStatus}"><span class="eyebrow">PRONÓSTICO SIMULADO</span><strong>${symbols[st.forecast.predictedStatus]} ${esc(sim.levels[st.forecast.predictedStatus].label)}</strong><p>Pico estimado: ${esc(fmtLevel(st.forecast.peakLevel))} · horizonte ${number(st.forecast.horizonMin)} min.</p><span>Confianza ${esc(st.forecast.confidenceLabel)} · ${number(st.forecast.confidence * 100)} %</span></div>`);
    html($('zone-list'), snap.zones.map((z) => `<button type="button" class="zone-row" data-zone="${esc(z.stationId)}" data-status="${z.status}"><span>${esc(z.name)}</span><small>${symbols[z.status]} ${esc(sim.levels[z.status].shortLabel || sim.levels[z.status].label)}</small></button>`).join(''));
  };
}
