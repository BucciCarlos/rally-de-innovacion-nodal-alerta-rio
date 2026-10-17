// Vista pública de Alerta Río — punto de entrada. Crea la simulación, el mapa y los componentes, y los mantiene sincronizados.
import { createSimulation } from '../core/simulation.js';
import { mountSimControls } from '../core/sim-controls.js';
import { $, setText } from './dom.js';
import { icon } from './icons.js';
import { createRiverMap } from './map/index.js';
import { createBanner } from './banner.js';
import { createAdvice } from './advice.js';
import { createScrollHint } from './scrollhint.js';
import { createFacts } from './facts.js';
import { createZoneList } from './zonelist.js';
import { buildLegend } from './legend.js';
import { ANNOUNCE } from './texts.js';
import { prefersReducedMotion } from './dom.js';

const hero = $('#estado');

async function start() {
  const sim = await createSimulation();
  mountSimControls($('#sim-slot'), sim, { variant: 'dock' });
  buildLegend($('#legend'), sim);

  const zonesData = sim.data.map.zones;
  const zoneOfStation = (id) => zonesData.find((z) => z.stationId === id)?.id;

  // Selección de zona compartida entre mapa y lista
  const select = (id, { focus = true } = {}) => {
    zonelist.select(id);
    if (focus) riverMap.selectZone(id); else riverMap.highlightZone(id);
  };

  const riverMap = createRiverMap($('#map'), sim, {
    onSelectZone: (id) => select(id),
    onSelectStation: (id) => { const z = zoneOfStation(id); if (z) select(z, { focus: false }); }
  });
  const banner = createBanner($('#status'), { onStart: () => sim.enable() });
  const advice = createAdvice($('#advice'));
  createScrollHint($('.hero__panel'), $('#advice'), $('#scroll-hint'));
  const facts = createFacts($('#facts'));
  const zonelist = createZoneList($('#tu-zona'), sim, {
    onSelect: (id) => select(id),
    onShowOnMap: (id) => {
      select(id);
      hero.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  });
  zonelist.select(zonelist.selected);
  riverMap.highlightZone(zonelist.selected);

  // Herramientas del mapa
  const tools = $('#map-tools');
  tools.innerHTML = `
    <button type="button" class="map__safe" data-tool="safe">${icon('home', { size: 20 })}<span>Puntos seguros</span></button>
    <button type="button" data-tool="in" aria-label="Acercar el mapa" title="Acercar">${icon('plus', { size: 20 })}</button>
    <button type="button" data-tool="out" aria-label="Alejar el mapa" title="Alejar">${icon('minus', { size: 20 })}</button>
    <button type="button" data-tool="reset" aria-label="Volver a la vista completa del mapa" title="Vista completa" hidden>${icon('target', { size: 20 })}</button>`;
  tools.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-tool]')?.dataset.tool;
    if (t === 'safe') riverMap.showShelters(); else if (t === 'in') riverMap.zoomIn(); else if (t === 'out') riverMap.zoomOut(); else if (t === 'reset') riverMap.resetView();
  });
  riverMap.onViewChange = (moved) => { $('[data-tool="reset"]', tools).hidden = !moved; };

  // Anuncios para lector de pantalla: sólo cuando cambia el nivel o aparece una predicción (no en cada tick)
  const live = $('#live');
  const seen = { status: null, pre: false };
  const announce = (snap) => {
    const { status, outlook } = snap.system;
    const pre = outlook.preAlert;
    if (seen.status !== null && snap.mode === 'simulation') {
      if (status !== seen.status) setText(live, `${ANNOUNCE[status]} Datos simulados.`);
      else if (pre && !seen.pre) setText(live, `${outlook.message}`);
    }
    seen.status = status; seen.pre = pre;
  };

  let rainBucket = -1;
  let first = true;
  sim.subscribe((snap) => {
    hero.dataset.status = snap.system.status;
    hero.dataset.mode = snap.mode;
    hero.dataset.pre = String(snap.system.outlook.preAlert);
    const bucket = Math.round(Math.min(1, snap.weather.rainMmH / 20) * 20);
    if (bucket !== rainBucket) { rainBucket = bucket; hero.style.setProperty('--rain', (bucket / 20).toFixed(2)); }
    banner.update(snap);
    advice.update(snap);
    facts.update(snap);
    zonelist.update(snap);
    riverMap.update(snap);
    announce(snap);
    if (first) { first = false; document.documentElement.classList.add('is-ready'); }
  });
}

start().catch((err) => {
  console.error(err);
  $('#load-error').hidden = false;
  document.documentElement.classList.add('is-error');
});
