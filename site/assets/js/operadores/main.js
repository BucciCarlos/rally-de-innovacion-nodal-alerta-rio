import { createSimulation } from '../core/simulation.js';
import { mountSimControls } from '../core/sim-controls.js';
import { fmtRate, TREND } from '../core/format.js';
import { $, esc, text, html, status, symbols, number } from './ui.js';
import { createMap } from './map.js';
import { createStations } from './stations.js';
import { createCharts } from './charts.js';
import { createAlerts } from './alerts.js';
import { createDevices } from './devices.js';
import { createEventLog } from './eventlog.js';

try {
  const sim = await createSimulation();
  const ids = sim.getSnapshot().stations.map((s) => s.id);
  let selected = ids.includes(location.hash.slice(1)) ? location.hash.slice(1) : sim.getSnapshot().system.focusStationId;
  let latest = sim.getSnapshot();
  const select = (id) => {
    if (!ids.includes(id)) return;
    selected = id;
    if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
    render(latest);
  };
  const renderStations = createStations(sim, select), renderDevices = createDevices(sim, select);
  const renderEvents = createEventLog(sim), renderAlerts = createAlerts(sim);
  $('dashboard').hidden = false;
  const map = createMap(sim, select), charts = createCharts(sim);
  mountSimControls($('sim-slot'), sim, { variant: 'inline' });
  $('load-error').hidden = true;
  function render(snap) {
    latest = snap;
    status($('global-status'), snap.system.status, sim.levels);
    status($('mobile-global-status'), snap.system.status, sim.levels);
    text('mode-label', snap.mode === 'baseline' ? 'Estado base — activá la simulación' : `Escenario simulado · ${snap.sim.playing ? 'en reproducción' : snap.sim.ended ? 'finalizado' : 'en pausa'}`);
    text('global-trend', `${TREND[snap.system.trend].arrow} ${TREND[snap.system.trend].label} · ${fmtRate(snap.system.rateCmH)}`);
    text('clock', `${snap.clock}${snap.dayOffset ? ' +1 día' : ''}`);
    text('elapsed', snap.mode === 'baseline' ? 'Previo a la lluvia' : snap.elapsedLabel);
    html($('counts'), Object.entries(snap.system.counts).map(([key, count]) => `<div data-status="${key}"><strong>${number(count)}</strong><span>${symbols[key]} ${esc(sim.levels[key].shortLabel || sim.levels[key].label)}</span></div>`).join(''));
    text('weather-condition', snap.weather.condition);
    html($('weather'), [['Lluvia actual', `${number(snap.weather.rainMmH, 1)} mm/h`], ['Acumulada · 3 h', `${number(snap.weather.rain3hMm, 1)} mm`], ['Prevista · 6 h', `${number(snap.weather.rainNext6hMm, 1)} mm`], ['Viento', `${number(snap.weather.windKmh)} km/h`], ['Presión', `${number(snap.weather.pressureHpa)} hPa`], ['Temperatura', `${number(snap.weather.tempC, 1)} °C`]].map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join(''));
    renderStations(snap, selected); map.render(snap, selected); charts.render(snap, selected);
    renderAlerts(snap); renderDevices(snap, selected); renderEvents(snap);
    text('disclaimer', snap.disclaimer);
  }
  sim.subscribe(render);
  select(selected);
  window.addEventListener('hashchange', () => select(location.hash.slice(1)));
  $('focus-outlook').addEventListener('click', () => { select(latest.system.outlook.stationId); showView('charts'); $('chart-title').scrollIntoView({ block: 'center' }); });
  $('zone-list').addEventListener('click', (e) => { const button = e.target.closest('[data-zone]'); if (button) select(button.dataset.zone); });
  $('alert-list').addEventListener('click', (e) => { const button = e.target.closest('[data-alert-station]'); if (button) { select(button.dataset.alertStation); showView('charts'); $('chart-title').scrollIntoView({ block: 'center' }); } });
  const workspace = document.querySelector('.workspace');
  function showView(view) {
    workspace.dataset.mobileView = view;
    document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    requestAnimationFrame(() => { map.refresh(); charts.resize(); });
  }
  document.querySelector('.mobile-tabs').addEventListener('click', (e) => { const button = e.target.closest('[data-view]'); if (button) showView(button.dataset.view); });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.target.closest('input, select, textarea, button, a, summary, [contenteditable]')) return;
    if (!sim.getState().enabled) return;
    e.preventDefault(); sim.togglePlay();
  });
  window.addEventListener('pagehide', (event) => { if (!event.persisted) sim.destroy(); });
} catch (error) {
  console.error('[operadores]', error);
  $('dashboard').hidden = true;
  $('load-error').hidden = false;
  $('load-error').textContent = 'No se pudo cargar el escenario simulado. Revisá los archivos locales y recargá la página desde un servidor HTTP.';
}
