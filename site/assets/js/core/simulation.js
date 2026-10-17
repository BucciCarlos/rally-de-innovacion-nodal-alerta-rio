/**
 * Alerta Río — API pública de la simulación (fachada). ESTE es el único módulo que las vistas deben importar.
 * Archivo del NÚCLEO: no editar desde feat/publico ni feat/operadores.
 *
 *   import { createSimulation } from '../core/simulation.js';
 *   const sim = await createSimulation();
 *   sim.subscribe((snapshot, reason) => render(snapshot));
 *
 * Contrato completo: docs/CONTRATO-SIMULACION.md
 */
import { buildModel, snapshotAt, STATUS_ORDER } from './engine.js';
import { createController } from './controller.js';

export { STATUS_ORDER };
export { fmtMinutes } from './engine.js';

const DATA_FILES = ['scenario', 'stations', 'levels', 'map'];
const OPTIONAL_FILES = ['scenery'];   // escenografía visual: si falta, los mapas funcionan igual

/** Carga los JSON de data/. Por defecto resuelve la ruta relativa a este módulo (funciona en cualquier subruta). */
export async function loadData(base = new URL('../../../data/', import.meta.url)) {
  const root = base instanceof URL ? base : new URL(base, document.baseURI);
  const entries = await Promise.all(DATA_FILES.map(async (name) => {
    const res = await fetch(new URL(`${name}.json`, root));
    if (!res.ok) throw new Error(`No se pudo cargar data/${name}.json (HTTP ${res.status})`);
    return [name, await res.json()];
  }));
  const data = Object.fromEntries(entries);
  for (const name of OPTIONAL_FILES) {
    try { const res = await fetch(new URL(`${name}.json`, root)); if (res.ok) data[name] = await res.json(); } catch { /* opcional */ }
  }
  return data;
}

/**
 * @param {{data?:object, dataBase?:string|URL, controllerDeps?:object}} [opts]
 */
export async function createSimulation(opts = {}) {
  const data = opts.data ?? await loadData(opts.dataBase);
  const model = buildModel(data);
  const sc = model.scenario;
  const ctrl = createController({
    duration: sc.durationMin, baselineT: sc.baselineT, speeds: sc.speeds,
    defaultSpeed: sc.defaultSpeed, stepMin: sc.stepMin
  }, opts.controllerDeps);

  const build = (view) => ({
    ...snapshotAt(model, view.t, { mode: 'simulation' }),
    sim: view
  });

  const subscribers = new Set();
  const dispatch = (view, reason) => {
    if (!subscribers.size) return;
    const snap = build(view);
    subscribers.forEach((fn) => { try { fn(snap, reason); } catch (e) { console.error('[alerta-rio] suscriptor falló', e); } });
  };
  ctrl.subscribe(dispatch, { immediate: false });

  return {
    /** JSON originales (scenario, stations, levels, map). Sólo lectura. */
    data,
    /** Metadatos de la línea temporal: { min, max, stepMin, baselineT, speeds, defaultSpeed, markers[] } */
    timeline: {
      min: 0, max: sc.durationMin, stepMin: sc.stepMin, baselineT: sc.baselineT,
      speeds: sc.speeds, defaultSpeed: sc.defaultSpeed, markers: model.markers, startClock: sc.startClock
    },
    levels: model.levels.levels,
    /** Eventos completos del escenario (todos, para depuración o línea temporal). */
    allEvents: model.events,
    /** Estado de control: { enabled, playing, ended, speed, speeds, stepMin, t, min, max, baselineT, rev, origin } */
    getState: () => ctrl.getState(),
    /** Snapshot del instante actual (ver contrato). */
    getSnapshot: () => build(ctrl.getState()),
    /** Snapshot de un minuto cualquiera, sin tocar el estado compartido (p. ej. para previsualizar). */
    snapshotAt: (t) => snapshotAt(model, t, { mode: 'simulation' }),
    /** Suscripción: fn(snapshot, reason). reason ∈ init|tick|play|pause|seek|step|reset|speed|enable|disable|remote|ended|restore */
    subscribe(fn, { immediate = true } = {}) {
      subscribers.add(fn);
      if (immediate) fn(build(ctrl.getState()), 'init');
      return () => subscribers.delete(fn);
    },
    enable: () => ctrl.enable(),
    disable: () => ctrl.disable(),
    toggleEnabled: () => ctrl.toggleEnabled(),
    play: () => ctrl.play(),
    pause: () => ctrl.pause(),
    togglePlay: () => ctrl.togglePlay(),
    seek: (t, o) => ctrl.seek(t, o),
    step: (d) => ctrl.step(d),
    stepForward: () => ctrl.stepForward(),
    stepBack: () => ctrl.stepBack(),
    reset: () => ctrl.reset(),
    setSpeed: (v) => ctrl.setSpeed(v),
    destroy: () => ctrl.destroy()
  };
}
