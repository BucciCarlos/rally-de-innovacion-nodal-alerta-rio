import { $, esc, html, text, types, symbols } from './ui.js';

export function createEventLog(sim) {
  let latest;
  html($('event-station'), '<option value="all">Toda la cuenca</option>' + sim.getSnapshot().stations.map((s) => `<option value="${esc(s.id)}">${esc(s.id)} · ${esc(s.short)}</option>`).join(''));
  const render = (snap) => {
    latest = snap;
    const type = $('event-type').value, station = $('event-station').value;
    const events = snap.events.filter((e) => (type === 'all' || e.type === type) && (station === 'all' || e.stationId === station));
    text('event-count', `${events.length} de ${snap.events.length} eventos`);
    html($('event-list'), events.length ? events.map((e) => `<li data-status="${e.status || 'normal'}"><time>${esc(e.clock)}${e.dayOffset ? ' · J+1' : ''}</time><span class="event-dot" aria-hidden="true">${e.status ? symbols[e.status] : '·'}</span><div><span class="event-kind">${esc(types[e.type])}${e.stationId ? ` · ${esc(e.stationId)}` : ''} · gravedad ${e.severity}</span><h3>${esc(e.title)}</h3><p>${esc(e.detail)}</p></div></li>`).join('') : '<li class="empty-events">Sin eventos para este instante y estos filtros. Avanzá la simulación para explorar la cronología.</li>');
  };
  $('event-type').addEventListener('change', () => render(latest));
  $('event-station').addEventListener('change', () => render(latest));
  return render;
}
