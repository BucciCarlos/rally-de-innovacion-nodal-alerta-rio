// Validación del núcleo: datos, motor determinista, sincronización entre "pestañas", rutas y colores.
// Uso: node tests/validate.mjs   (Node ≥ 18, sin dependencias)
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildModel, snapshotAt, STATUS_ORDER } from '../site/assets/js/core/engine.js';
import { createController, STORAGE_KEY } from '../site/assets/js/core/controller.js';
import { buildScenery } from '../tools/gen-scenery.mjs';
import { loraLink, networkSummary, sirens } from '../site/assets/js/core/derived.js';
import * as telemetry from '../site/assets/js/nodo/telemetry.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(rd(p));
let passed = 0, failed = 0;
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); } else { failed++; console.log(`  ✗ ${name} ${extra}`); }
}
const section = (t) => console.log(`\n${t}`);

/* ---------------------------------------------------------------- datos */
section('Datos');
const data = { scenario: json('site/data/scenario.json'), stations: json('site/data/stations.json'), levels: json('site/data/levels.json'), map: json('site/data/map.json') };
const model = buildModel(data);
const ids = data.stations.stations.map((s) => s.id);
check('6 estaciones con ids únicos', ids.length === 6 && new Set(ids).size === 6);
check('umbrales crecientes por estación', data.stations.stations.every((s) => s.base < s.thresholds.vigilancia && s.thresholds.vigilancia < s.thresholds.naranja && s.thresholds.naranja < s.thresholds.roja));
check('cada estación está anclada al trazado del río', ids.every((id) => Number.isInteger(data.map.river.stationPathIndex[id])));
check('segmentos del río referencian estaciones válidas', data.map.river.segments.every((sg) => sg.stationIds.every((id) => ids.includes(id)) && sg.to < data.map.river.path.length));
check('zonas referencian estaciones válidas', data.map.zones.every((z) => ids.includes(z.stationId) && z.polygon.length >= 4));
check('todo dato rotulado como simulado', /sint[eé]tic/i.test(data.levels.disclaimer) && data.scenario.forecast.note.includes('SIMULADA'));

/* ---------------------------------------------------------------- colores CSS ↔ JSON */
section('Identidad visual');
const css = rd('site/assets/css/base.css');
for (const k of STATUS_ORDER) {
  const lv = data.levels.levels[k];
  check(`color de nivel "${k}" coincide en base.css y levels.json`, css.includes(`--lvl-${k}: ${lv.color};`) && css.includes(`--lvl-${k}-ink: ${lv.ink};`));
}

/* ---------------------------------------------------------------- motor */
section('Motor de simulación');
const snaps = [];
for (let t = 0; t <= 360; t++) snaps.push(snapshotAt(model, t));
check('determinista: mismo t → mismo snapshot', JSON.stringify(snapshotAt(model, 137)) === JSON.stringify(snapshotAt(buildModel(data), 137)));
check('snapshot declara que es simulado', snaps.every((s) => s.simulated === true && s.disclaimer && s.stations.every((x) => x.forecast.simulated)));

const sev = (t) => snaps[t].system.severity;
const firstAt = (n) => snaps.findIndex((s) => s.system.severity >= n);
check('arranca en normal', sev(0) === 0 && snapshotAt(model, data.scenario.baselineT).system.status === 'normal');
check('secuencia normal → vigilancia → naranja → roja', firstAt(1) > 0 && firstAt(2) > firstAt(1) && firstAt(3) > firstAt(2), `(${firstAt(1)}, ${firstAt(2)}, ${firstAt(3)})`);
check('termina en alerta roja', sev(360) === 3);
let monotone = true, flaps = '';
for (const id of ids) for (let t = 1; t <= 360; t++) {
  const a = snaps[t - 1].stations.find((s) => s.id === id), b = snaps[t].stations.find((s) => s.id === id);
  if (b.severity < a.severity) { monotone = false; flaps += ` ${id}@${t}`; }
}
check('la severidad por estación nunca retrocede (sin parpadeos)', monotone, flaps);
check('niveles del río crecientes salvo el paso de cresta aguas arriba (caída ≤2 cm por minuto, sin parpadeos)', ids.every((id) => snaps.every((s, t) => t === 0 || s.stations.find((x) => x.id === id).stale || s.stations.find((x) => x.id === id).level >= snaps[t - 1].stations.find((x) => x.id === id).level - 0.02)));

const redT = firstAt(3);
const preCrit = snaps.findIndex((s) => s.system.outlook.preAlert && s.system.outlook.key === 'critical');
check('la predicción de nivel crítico se emite ANTES de la alerta roja', preCrit >= 0 && preCrit < redT, `(pre=${preCrit}, roja=${redT})`);
check('anticipación ≥ 60 min', redT - preCrit >= 60, `(${redT - preCrit} min)`);
check('la predicción apunta a la estación que luego se pone roja', snaps[preCrit].system.outlook.stationId === snaps[redT].stations.find((s) => s.severity === 3).id);
const e = snaps[preCrit].system.outlook.etaMin;
check('ETA prevista coherente con el cruce real (±45 min)', Math.abs((preCrit + e) - redT) <= 45, `(pronóstico ${preCrit + e} vs real ${redT})`);
check('tras el cruce crítico el mensaje deja de ser prospectivo', snaps[300].system.outlook.ongoing === true && /ya fue alcanzado/.test(snaps[300].system.outlook.message) && !snaps[preCrit].system.outlook.ongoing);
check('toda alerta activa informa su hora de inicio (sinceT)', snaps.every((s) => s.alerts.every((a) => Number.isFinite(a.sinceT) && a.sinceT <= s.t)), JSON.stringify(snaps.flatMap((s) => s.alerts.filter((a) => !Number.isFinite(a.sinceT) || a.sinceT > s.t).map((a) => `${s.t}:${a.id}:${a.sinceT}`)).slice(0, 4)));
check('sin alerta de predicción en el estado base', !snapshotAt(model, data.scenario.baselineT).system.outlook.preAlert);

const fc = snaps[200].stations[3].forecast;
check('pronóstico: 13 puntos, banda coherente', fc.points.length === 13 && fc.points.every((p) => p.low <= p.level && p.level <= p.high));
check('hay offline simulado con lectura congelada', (() => { const a = snapshotAt(model, 215).stations.find((s) => s.id === 'E5'); const b = snapshotAt(model, 201).stations.find((s) => s.id === 'E5'); return a.stale && a.device.connectivity === 'offline' && a.level === b.level; })());
check('historial con hueco durante el corte', snapshotAt(model, 215).stations.find((s) => s.id === 'E5').history.some((h) => h.level === null));
check('eventos ordenados y con id único', model.events.every((ev, i) => i === 0 || model.events[i - 1].t <= ev.t) && new Set(model.events.map((x) => x.id)).size === model.events.length);
check('el registro de eventos crece con t', snaps[0].events.length < snaps[200].events.length && snaps[200].events.length < snaps[360].events.length);
check('alertas activas coherentes con el sistema', snaps[360].alerts[0].severity === 3 && snaps[0].alerts.length === 0);
check('sin NaN/undefined en snapshots', !snaps.some((s) => /NaN|undefined/.test(JSON.stringify(s))));
check('marcadores de línea temporal presentes', model.markers.length >= 5 && model.markers.some((m) => m.kind === 'forecast'));



/* ---------------------------------------------------------------- coherencia espacial / propagación */
section('Coherencia geográfica y propagación (conceptual)');
{
  const R = 6371, rad = Math.PI / 180;
  const dist = (a, b) => Math.hypot((b[1] - a[1]) * rad * Math.cos((a[0] + b[0]) / 2 * rad), (b[0] - a[0]) * rad) * R;
  const path = data.map.river.path, cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + dist(path[i - 1], path[i]));
  const sts = data.stations.stations;
  const kmOf = (s) => cum[data.map.river.stationPathIndex[s.id]] - cum[data.map.river.stationPathIndex[sts[0].id]];
  check('riverKm coincide con la distancia acumulada de la geometría (±0,2 km)', sts.every((s) => Math.abs(s.riverKm - kmOf(s)) <= 0.2), JSON.stringify(sts.map((s) => [s.riverKm, +kmOf(s).toFixed(1)])));
  check('lagMin crece aguas abajo (la onda llega antes a las estaciones de arriba)', sts.every((s, i) => i === 0 || s.lagMin > sts[i - 1].lagMin));
  const speeds = sts.slice(1).map((s, i) => ((s.riverKm - sts[i].riverKm) * 1000) / ((s.lagMin - sts[i].lagMin) * 60));
  check('celeridad conceptual implícita uniforme entre estaciones (3,5–4,7 m/s)', speeds.every((v) => v >= 3.5 && v <= 4.7), JSON.stringify(speeds.map((v) => +v.toFixed(2))));
  check('estado base estable: todas las tendencias en "steady" y sistema normal', (() => { const b = snapshotAt(model, data.scenario.baselineT); return b.stations.every((x) => x.trend === 'steady') && b.system.status === 'normal'; })());
}


/* ---------------------------------------------------------------- escenografía territorial */
section('Escenografía cartográfica (capas visuales compartidas)');
{
  const scen = json('site/data/scenery.json');
  check('scenery.json está al día y es determinista (coincide con tools/gen-scenery.mjs)', JSON.stringify(buildScenery(data.map)) === JSON.stringify(scen));
  const coords = []; const walk2 = (o) => { if (Array.isArray(o) && o.length === 2 && typeof o[0] === 'number') coords.push(o); else if (Array.isArray(o)) o.forEach(walk2); else if (o && typeof o === 'object') Object.values(o).forEach(walk2); };
  walk2({ lc: scen.landcover, p: scen.parks, r: scen.roads, b: scen.bridges });
  const [[s0, w0], [n0, e0]] = data.map.bounds;
  check('todas las coordenadas caen dentro de los límites del mapa', coords.every(([la, lo]) => la >= s0 && la <= n0 && lo >= w0 && lo <= e0));
  check(`presupuesto ligero: ${coords.length} vértices (≤ 2500) y pocos objetos`, coords.length <= 2500 && scen.landcover.forest.length <= 12 && scen.landcover.farmland.length <= 14 && scen.roads.streets.length <= 70);
  const pip = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [yi, xi] = poly[i], [yj, xj] = poly[j]; if ((xi > pt[1]) !== (xj > pt[1]) && pt[0] < ((yj - yi) * (pt[1] - xi)) / (xj - xi) + yi) c = !c; } return c; };
  const keyPts = [...Object.values(data.map.river.stationPathIndex).map((i) => data.map.river.path[i]), ...data.map.landmarks.map((l) => l.latlng)];
  const natural = [...scen.landcover.forest, ...scen.landcover.farmland.map((f) => f.polygon), ...scen.landcover.riparian, ...scen.parks.map((k) => k.polygon)];
  check('vegetación, campos y parques no cubren estaciones ni puntos de referencia', natural.every((poly) => keyPts.every((k) => !pip(k, poly))));
  check('bosques y campos quedan fuera de las zonas de riesgo', [...scen.landcover.forest, ...scen.landcover.farmland.map((f) => f.polygon)].every((poly) => poly.every((q) => data.map.zones.every((z) => !pip(q, z.polygon)))));
  const segX = (a, b, c, d) => { const o = (p, q, r) => (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]); return o(a, b, c) * o(a, b, d) <= 0 && o(c, d, a) * o(c, d, b) <= 0; };
  const path = data.map.river.path;
  const crosses = (line) => path.some((_, i) => i > 0 && segX(line[0], line[1], path[i - 1], path[i]));
  check('los 4 puentes cruzan el cauce', scen.bridges.length === 4 && scen.bridges.every((b) => crosses(b.line)));
  check('E3 y E4 siguen sobre sus puentes (tablero centrado en la estación, sin mover marcadores)', ['E3', 'E4'].every((id) => { const b = scen.bridges.find((x) => x.stationId === id); const st = path[data.map.river.stationPathIndex[id]]; const mid = [(b.line[0][0] + b.line[1][0]) / 2, (b.line[0][1] + b.line[1][1]) / 2]; return Math.hypot(mid[0] - st[0], mid[1] - st[1]) < 0.0006; }));
  check('la capa de escenografía no importa módulos ni toca el simulador', !/^\s*import /m.test(rd('site/assets/js/core/scenery.js')));
}

/* ---------------------------------------------------------------- derivados: LoRa, sirenas, telemetría del nodo */
section('Derivados (LoRa, sirenas) y telemetría del Modo Nodo');
const sirenAt = (t, zone) => sirens(snaps[t], data.map).find((x) => x.zoneId === zone).state;
check('sirena de Costanera: reposo → advertencia → activa según el escenario', sirenAt(100, 'Z3') === 'reposo' && sirenAt(200, 'Z3') === 'advertencia' && sirenAt(260, 'Z3') === 'activa');
check('sirena activa sólo con alerta roja de la zona', snaps.every((s) => sirens(s, data.map).every((x) => (x.state === 'activa') === (s.zones.find((z) => z.id === x.zoneId).severity >= 3))));
check('sólo zonas urbanas bajas tienen sirena (3)', sirens(snaps[0], data.map).length === 3);
check('LoRa: E5 sin enlace durante el corte y activo después', loraLink(snaps[215].stations.find((s) => s.id === 'E5')).state === 'sin-enlace' && loraLink(snaps[240].stations.find((s) => s.id === 'E5')).state === 'activo' && loraLink(snaps[170].stations.find((s) => s.id === 'E5')).state === 'debil');
check('resumen de red: degradada durante el corte, operativa en reposo', networkSummary(snaps[215]).state === 'degradada' && networkSummary(snaps[0]).state === 'activa' && networkSummary(snaps[215]).down === 1);
const sd = (id) => data.stations.stations.find((x) => x.id === id);
const nodeAt = (t, id = 'E4') => { const sn = snapshotAt(model, t, { mode: 'simulation' }); const st = sn.stations.find((x) => x.id === id); return { sn, st, m: telemetry.magnet(st, sd(id), sn), mo: telemetry.motion(st, sn), p: telemetry.power(st, sd(id), sn), l: telemetry.lora(st, sn) }; };
check('telemetría del nodo: determinista (mismo t → mismos valores)', JSON.stringify(nodeAt(137)) === JSON.stringify(nodeAt(137)) && JSON.stringify(nodeAt(137).m) !== JSON.stringify(nodeAt(138).m));
check('telemetría sin NaN y en rangos plausibles', [0, 64, 130, 200, 249, 360].every((t) => { const n = nodeAt(t); return !/NaN|undefined/.test(JSON.stringify([n.m.uT, n.mo, n.p, n.l.seq, n.l.lastClock])) && n.m.uT > 40 && n.m.uT < 80 && Math.abs(n.mo.roll) < 4 && n.mo.quality.pct >= 0 && n.mo.quality.pct <= 100; }));
check('µT crece cualitativamente con la crecida (señal ilustrativa, no calibrada)', nodeAt(300).m.uT > nodeAt(0).m.uT + 8);
check('solar: carga de día, nada de noche', nodeAt(-60).p.solarW > 0 && nodeAt(120).p.solarW === 0);
check('batería de E2: aviso baja → crítica coherente con el motor', nodeAt(230, 'E2').p.state === 'baja' && nodeAt(355, 'E2').p.state === 'critica');
check('LoRa del nodo: paquetes en cola y lectura congelada durante el corte de E5', nodeAt(215, 'E5').l.queued >= 2 && nodeAt(215, 'E5').l.link.state === 'sin-enlace' && nodeAt(240, 'E5').l.queued === 0);
check('sacudidas por ráfagas se acumulan con el tiempo', nodeAt(50).mo.gusts.count === 0 && nodeAt(135).mo.gusts.count === 3 && nodeAt(300).mo.gusts.count === 5);
check('el nodo no usa Math.random', !/Math\.random/.test(rd('site/assets/js/nodo/telemetry.js')));

/* ---------------------------------------------------------------- marca Nodal */
section('Marca Nodal');
const pages = { '/': 'site/index.html', '/operadores/': 'site/operadores/index.html', '/nodo/': 'site/nodo/index.html' };
for (const [route, file] of Object.entries(pages)) {
  const h = rd(file);
  const title = /<title>([^<]*)<\/title>/.exec(h)?.[1] ?? '';
  check(`${route}: <title> con marca Nodal y sin denominaciones anteriores`, /^Nodal/.test(title) && !/Alerta R[ií]o/i.test(h), `(${title})`);
}

/* ---------------------------------------------------------------- sincronización */
section('Sincronización entre pestañas (storage + BroadcastChannel simulados)');
function makeWorld() {
  let wall = 1_000_000; const store = new Map(); const storageSubs = new Set(); const chans = new Set();
  const advance = (ms) => { wall += ms; };
  const mk = (origin) => {
    const timers = [];
    const storage = {
      read: () => store.get(STORAGE_KEY) ?? null,
      write: (s) => { store.set(STORAGE_KEY, s); storageSubs.forEach((f) => f.origin !== origin && f.cb(s)); },
      subscribe: (cb) => { const o = { origin, cb }; storageSubs.add(o); return () => storageSubs.delete(o); }
    };
    const channelFactory = () => { const c = { onmessage: null, postMessage(m) { chans.forEach((o) => o !== c && o.onmessage && o.onmessage({ data: JSON.parse(JSON.stringify(m)) })); }, close() { chans.delete(c); } }; chans.add(c); return c; };
    const ctrl = createController({ duration: 360, baselineT: -60, speeds: [1, 2, 4, 8], defaultSpeed: 2, stepMin: 10 },
      { storage, channelFactory, now: () => wall, origin, setInterval: (f) => { timers.push(f); return timers.length; }, clearInterval: () => {} });
    return ctrl;
  };
  return { mk, advance };
}
{
  const w = makeWorld();
  const A = w.mk('A'); const B = w.mk('B');
  check('ambas pestañas arrancan apagadas en t base', !A.getState().enabled && A.getState().t === -60 && B.getState().t === -60);
  A.enable();
  check('activar en A activa B', B.getState().enabled && B.getState().t === 0);
  A.play(); w.advance(10_000);
  check('reproducción: ambas calculan el mismo t (2 min/s × 10 s = 20)', Math.abs(A.getState().t - 20) < 1e-9 && Math.abs(B.getState().t - 20) < 1e-9);
  B.pause(); w.advance(30_000);
  check('pausar en B pausa A y congela t', !A.getState().playing && A.getState().t === 20 && B.getState().t === 20);
  A.seek(200);
  check('seek en A mueve B', B.getState().t === 200);
  B.stepBack(); B.stepBack();
  check('retroceder en B (×2 pasos de 10)', A.getState().t === 180);
  A.setSpeed(8); A.play(); w.advance(30_000);
  check('el tiempo se detiene al final (360) y se marca ended', A.getState().t === 360 && A.getState().ended && !A.getState().playing && B.getState().ended);
  B.play();
  check('reproducir al final reinicia desde 0', B.getState().t === 0 && B.getState().playing);
  A.reset();
  check('reiniciar vuelve a 0 y pausa en ambas', A.getState().t === 0 && !B.getState().playing && B.getState().t === 0);
  A.disable();
  check('apagar vuelve al estado base en ambas', !B.getState().enabled && B.getState().t === -60);
  const C = w.mk('C');
  check('una pestaña nueva hidrata el estado guardado', C.getState().enabled === false && C.getState().rev === A.getState().rev);
  A.enable(); A.seek(90);
  const D = w.mk('D');
  check('pestaña nueva en medio de la simulación se alinea', D.getState().enabled && D.getState().t === 90);
}
{
  // Conflicto: gana la rev mayor
  const w = makeWorld(); const A = w.mk('A'); const B = w.mk('B');
  A.enable(); B.seek(50); A.seek(70);
  check('conflicto de escritura converge en ambas pestañas', A.getState().t === B.getState().t && A.getState().rev === B.getState().rev);
  // storage corrupto no rompe
  const store = new Map([[STORAGE_KEY, '{not json']]);
  let ok = true; try { createController({ duration: 360, baselineT: -60, speeds: [1], defaultSpeed: 1, stepMin: 10 }, { storage: { read: () => store.get(STORAGE_KEY), write() {}, subscribe: () => () => {} }, channelFactory: () => null }); } catch { ok = false; }
  check('estado corrupto en localStorage se ignora', ok);
}

/* ---------------------------------------------------------------- sintaxis JS + rutas */
section('Sintaxis y rutas');
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (['.git', 'node_modules', 'vendor'].includes(n)) continue;
    const p = join(dir, n); const st = statSync(p);
    st.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const files = walk(ROOT);
const jsFiles = files.filter((f) => /\.(m?js)$/.test(f));
let syntaxOk = true;
for (const f of jsFiles) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) { syntaxOk = false; console.log(`    sintaxis: ${relative(ROOT, f)}\n${r.stderr}`); }
}
check(`sintaxis válida en ${jsFiles.length} archivos JS`, syntaxOk);
let jsonOk = true;
for (const f of files.filter((x) => x.endsWith('.json'))) { try { JSON.parse(readFileSync(f, 'utf8')); } catch { jsonOk = false; console.log('    JSON inválido:', relative(ROOT, f)); } }
check('todos los JSON parsean', jsonOk);

// Rutas locales referenciadas desde HTML, CSS y JS (import estático)
const missing = [];
const refRe = {
  html: /(?:src|href)="([^"#?]+)"/g,
  css: /url\(\s*['"]?([^'")#?]+)/g,
  js: /(?:from\s+|import\s*\()\s*['"](\.{1,2}\/[^'"]+)['"]/g
};
for (const f of files) {
  const ext = f.split('.').pop();
  if (!refRe[ext] || f.includes('/assets/vendor/')) continue;
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(refRe[ext])) {
    const ref = m[1];
    if (/^(https?:|data:|mailto:|\/\/)/.test(ref)) continue;
    const target = ref.startsWith('/') ? join(ROOT, ref) : resolve(dirname(f), ref);
    const t = (existsSync(target) && statSync(target).isDirectory()) ? join(target, 'index.html') : target;
    if (!existsSync(t)) missing.push(`${relative(ROOT, f)} → ${ref}`);
  }
}
check('todas las rutas locales (HTML/CSS/JS) existen', missing.length === 0, '\n    ' + missing.join('\n    '));
check('sin dependencias remotas en HTML (CDN)', !files.filter((f) => f.endsWith('.html')).some((f) => /(src|href)="https?:/.test(readFileSync(f, 'utf8'))));

console.log(`\n${failed === 0 ? '✔' : '✘'} ${passed} correctas, ${failed} con fallos`);
process.exit(failed === 0 ? 0 : 1);
