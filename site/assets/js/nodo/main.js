// Nodal · Modo Nodo — punto de entrada. Reutiliza la simulación compartida (sin lógica propia del motor).
import { createSimulation } from '../core/simulation.js';
import { mountSimControls } from '../core/sim-controls.js';
import { $, esc, setText } from './ui.js';
import { renderNode, renderStatusBar, renderLevel, renderMotion, renderPower, renderLora } from './render.js';

const DEFAULT_STATION = 'E4';   // Costanera Villa Serena: estación crítica del escenario

try {
  const sim = await createSimulation();
  const first = sim.getSnapshot();
  const ids = first.stations.map((s) => s.id);
  const stationData = Object.fromEntries(sim.data.stations.stations.map((s) => [s.id, s]));
  let selected = ids.includes(location.hash.slice(1)) ? location.hash.slice(1) : DEFAULT_STATION;
  let latest = first;

  const select = $('station-select');
  select.innerHTML = first.stations.map((s) => `<option value="${esc(s.id)}">${esc(s.id)} · ${esc(s.short)}</option>`).join('');
  select.value = selected;
  const choose = (id) => {
    if (!ids.includes(id)) return;
    selected = id; select.value = id;
    if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
    render(latest);
  };
  select.addEventListener('change', () => choose(select.value));
  window.addEventListener('hashchange', () => choose(location.hash.slice(1)));

  mountSimControls($('sim-slot'), sim, { variant: 'dock' });

  function render(snap) {
    latest = snap;
    const st = snap.stations.find((s) => s.id === selected), sd = stationData[selected];
    renderStatusBar(snap, st);
    renderNode(snap, st, sd, sim.levels);
    renderLevel(snap, st, sd);
    renderMotion(snap, st);
    renderPower(snap, st, sd);
    renderLora(snap, st);
    setText('sim-mode', `Escenario simulado · ${snap.sim.playing ? 'en reproducción' : snap.sim.ended ? 'finalizado' : 'en pausa'} · ${snap.clock} (hora simulada)`);
    setText('nd-disclaimer', snap.disclaimer);
  }
  sim.subscribe(render);
  window.addEventListener('pagehide', (e) => { if (!e.persisted) sim.destroy(); });
} catch (error) {
  console.error('[nodo]', error);
  document.getElementById('scroll').innerHTML = '<p class="load-error" role="alert">No se pudo cargar la simulación. Abrí la página desde un servidor local (ver README) y recargá.</p>';
}
