// Genera site/data/scenery.json: escenografía territorial FICTICIA y determinista (uso del suelo, vegetación,
// calles, caminos, puentes, costanera y espacios verdes) a partir de la geometría de data/map.json.
// No altera el río, las estaciones ni las zonas: sólo se apoya en ellos. Semilla fija → misma salida siempre.
// Uso: node tools/gen-scenery.mjs   (reescribe site/data/scenery.json; tests/validate.mjs comprueba que esté al día)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const r5 = (n) => Math.round(n * 1e5) / 1e5;
const rp = (p) => [r5(p[0]), r5(p[1])];

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function buildScenery(map) {
  const rnd = mulberry32(20260);
  const path = map.river.path, N = path.length;
  const bounds = map.bounds;

  /* ------------------------------------------------ geometría base: marco local sobre el río */
  const frameAt = (k) => {
    const a = path[Math.max(0, k - 1)], b = path[Math.min(N - 1, k + 1)];
    const dy = b[0] - a[0], dx = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    return { ty: dy / len, tx: dx / len, ny: dx / len, nx: -dy / len };   // misma normal que tools/gen-map.mjs (+ = margen NE)
  };
  const at = (i) => {
    const k = Math.min(N - 2, Math.max(0, Math.floor(i))), f = Math.min(1, Math.max(0, i - k));
    const A = frameAt(k), B = frameAt(k + 1);
    const m = (u, v) => u + (v - u) * f;
    const ny = m(A.ny, B.ny), nx = m(A.nx, B.nx), l = Math.hypot(ny, nx) || 1;
    const ty = m(A.ty, B.ty), tx = m(A.tx, B.tx), lt = Math.hypot(ty, tx) || 1;
    return { p: [m(path[k][0], path[k + 1][0]), m(path[k][1], path[k + 1][1])], ny: ny / l, nx: nx / l, ty: ty / lt, tx: tx / lt };
  };
  const P = (i, d) => { const f = at(i); return [f.p[0] + f.ny * d, f.p[1] + f.nx * d]; };
  const wob = (i, s, a = 0.0022) => a * Math.sin(i * 0.9 + s) + a * 0.6 * Math.sin(i * 2.3 + 2 * s);

  /* ------------------------------------------------ utilidades geométricas */
  const pip = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [yi, xi] = poly[i], [yj, xj] = poly[j]; if ((xi > pt[1]) !== (xj > pt[1]) && pt[0] < ((yj - yi) * (pt[1] - xi)) / (xj - xi) + yi) c = !c; } return c; };
  const dSeg = (p, a, b) => { const vy = b[0] - a[0], vx = b[1] - a[1], l2 = vy * vy + vx * vx || 1e-12; let t = ((p[0] - a[0]) * vy + (p[1] - a[1]) * vx) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - (a[0] + t * vy), p[1] - (a[1] + t * vx)); };
  const dLine = (p, line) => { let m = Infinity; for (let i = 1; i < line.length; i++) m = Math.min(m, dSeg(p, line[i - 1], line[i])); return m; };
  const chaikin = (pts, it = 2) => { let q = pts; for (let n = 0; n < it; n++) { const o = [q[0]]; for (let i = 0; i < q.length - 1; i++) { const a = q[i], b = q[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(q[q.length - 1]); q = o; } return q; };
  const inside = (p, inset = 0.006) => p[0] > bounds[0][0] + inset && p[0] < bounds[1][0] - inset && p[1] > bounds[0][1] + inset && p[1] < bounds[1][1] - inset;
  const ctrl = (list) => list.map(([i, d]) => P(i, d));
  const circle = (c, rad, n = 14, jitter = 0.12) => Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2, r = rad * (1 + (rnd() - 0.5) * jitter); return [c[0] + Math.sin(a) * r, c[1] + Math.cos(a) * r * 1.15]; });

  const keep = [
    ...Object.keys(map.river.stationPathIndex).map((id) => path[map.river.stationPathIndex[id]]),
    ...map.landmarks.map((l) => l.latlng)
  ];
  const zones = map.zones.map((z) => z.polygon);

  /* ------------------------------------------------ puentes y carreteras (el resto se ubica evitándolos) */
  const BR = 0.0075;   // semilongitud del tablero (grados): cubre el cauce dibujado
  const bridgeDefs = [
    { id: 'B1', idx: 12, name: 'Puente rural' },
    { id: 'B2', idx: map.river.stationPathIndex.E3, name: 'Puente Viejo', stationId: 'E3' },
    { id: 'B3', idx: map.river.stationPathIndex.E4, name: 'Puente de la Costanera', stationId: 'E4' },
    { id: 'B4', idx: 61, name: 'Puente del Molino' }
  ];
  const bridges = bridgeDefs.map((b) => ({ ...b, line: [rp(P(b.idx, BR)), rp(P(b.idx, -BR))] }));

  const main = [
    chaikin(ctrl([[0, 0.036], [5, 0.042], [11, 0.044], [18, 0.042], [25, 0.04], [31, 0.038], [36, 0.036], [39, 0.029], [41.2, 0.019], [42.4, 0.0105], [43, 0.0055]]), 2),
    chaikin(ctrl([[43, -0.0055], [43.6, -0.012], [45, -0.026], [49, -0.034], [54, -0.034], [59, -0.033], [64, -0.03], [70, -0.03], [71.5, -0.03]]), 2)
  ];
  const secondary = [
    chaikin(ctrl([[2, -0.03], [8, -0.033], [14, -0.034], [20, -0.032], [27.5, -0.03], [33, -0.028], [39, -0.028], [45, -0.028]]), 2),   // camino de la ribera sur
    chaikin(ctrl([[31, 0.038], [30.6, 0.025], [30.2, 0.012], [30, 0.0055]]), 2),                                                              // acceso norte al Puente Viejo
    chaikin(ctrl([[30, -0.0055], [29.8, -0.012], [29.2, -0.022], [27.5, -0.03]]), 2),                                                           // acceso sur
    chaikin(ctrl([[11.6, 0.044], [12, 0.025], [12, 0.0055]]), 2),                                                                              // camino rural al puente B1
    chaikin(ctrl([[12, -0.0055], [12.2, -0.02], [13, -0.034]]), 2),
    chaikin(ctrl([[60, -0.031], [61, -0.0165], [61, -0.0055]]), 2),                                                                            // acceso a Puerto Nuevo
    chaikin(ctrl([[61, 0.0055], [61.6, 0.012], [63, 0.024], [66, 0.03], [70, 0.028]]), 2)
  ];
  const coast = [chaikin(ctrl([[38.5, 0.003], [41, 0.0032], [44, 0.0031], [47, 0.0032], [49, 0.003]]), 2)];
  const roads = [...main, ...secondary, ...coast];

  /* ------------------------------------------------ huellas urbanas (diferencian lo construido de lo natural) */
  const strip = (i0, i1, d0, dOuter, seed, step = 0.5) => {
    const a = [], b = [];
    for (let i = i0; i <= i1 + 1e-9; i += step) { a.push(P(i, d0)); b.push(P(i, (dOuter + wob(i, seed)))); }
    return [...a, ...b.reverse()];
  };
  const urban = [
    strip(35, 51, 0.002, 0.031, 1),        // Villa Serena (margen NE: Costanera + Loma Alta)
    strip(38, 50, -0.002, -0.017, 2),      // Villa Serena (margen SW, al otro lado del puente)
    strip(24, 38, -0.002, -0.019, 3),      // Los Sauces
    strip(50, 64, -0.002, -0.019, 4),      // Barrio Molino
    strip(62, 71, 0.002, 0.021, 5)         // Puerto Nuevo
  ].map((p) => p.map(rp));

  /* ------------------------------------------------ espacios verdes */
  const parks = [
    { id: 'PK0', kind: 'paseo', polygon: strip(39.5, 48.5, 0.0017, 0.0036, 6, 0.5) },
    { id: 'PK1', kind: 'plaza', polygon: circle(P(41.5, 0.0085), 0.0016) },
    { id: 'PK2', kind: 'parque', polygon: circle(P(45.6, 0.0175), 0.0032) },
    { id: 'PK3', kind: 'plaza', polygon: circle(P(57.5, -0.0085), 0.0016) },
    { id: 'PK4', kind: 'plaza', polygon: circle(P(32, -0.0095), 0.0016) },
    { id: 'PK5', kind: 'plaza', polygon: circle(P(66.5, 0.0085), 0.0015) }
  ].map((k) => ({ ...k, polygon: k.polygon.map(rp) }));

  /* ------------------------------------------------ vegetación ribereña (fuera de lo urbano y de los puentes) */
  const gaps = bridgeDefs.map((b) => b.idx);
  const ranges = (side, i0, i1) => {
    const cuts = [i0, ...gaps.filter((g) => g > i0 + 1.5 && g < i1 - 1.5).flatMap((g) => [g - 1.1, g + 1.1]), i1];
    const out = [];
    for (let k = 0; k < cuts.length; k += 2) if (cuts[k + 1] - cuts[k] > 1) out.push([cuts[k], cuts[k + 1]]);
    return out.map(([a, b]) => strip(a, b, side * 0.0028, side * (0.0092), side > 0 ? 7 : 8).map(rp));
  };
  const riparian = [...ranges(1, 9, 34), ...ranges(1, 52, 61), ...ranges(-1, 2, 23), ...ranges(-1, 65, 71)];

  /* ------------------------------------------------ calles urbanas (trama simple dentro de las huellas) */
  const longi = (i0, i1, d, step = 0.5) => { const l = []; for (let i = i0; i <= i1 + 1e-9; i += step) l.push(rp(P(i, d + wob(i, d * 900, 0.0003)))); return l; };
  const trans = (i, d0, d1) => [rp(P(i, d0)), rp(P(i, d1))];
  const streets = [];
  const grid = (i0, i1, ds, dEdge, pitch = 1.5) => {
    for (const d of ds) streets.push(longi(i0, i1, d));
    for (let i = i0 + 0.5; i < i1; i += pitch) streets.push(trans(i, ds[0], dEdge));
  };
  grid(36.5, 50, [0.0068, 0.0108, 0.0168, 0.0222], 0.027);       // Costanera Villa Serena + Loma Alta
  grid(39, 49.5, [-0.0065, -0.0115], -0.0155);                    // Villa Serena SW
  grid(25, 37.5, [-0.0065, -0.011, -0.0155], -0.0175);            // Los Sauces
  grid(51, 63.5, [-0.0065, -0.011, -0.0155], -0.0175);            // Molino
  grid(63.5, 70.5, [0.0065, 0.011], 0.0185);                      // Puerto Nuevo

  /* ------------------------------------------------ muestreo de campos y bosques (evitan lo construido, vías y puntos clave) */
  const cand = (iMin, iMax, dMin, dMax) => { const side = rnd() < 0.5 ? -1 : 1; return P(iMin + rnd() * (iMax - iMin), side * (dMin + rnd() * (dMax - dMin))); };
  const free = (pt, clearRoads = 0.006) => inside(pt) && !zones.some((z) => pip(pt, z)) && !urban.some((u) => pip(pt, u))
    && roads.every((r) => dLine(pt, r) > clearRoads) && keep.every((k) => Math.hypot(pt[0] - k[0], pt[1] - k[1]) > 0.008);
  const placed = [];
  const clear = (pt, r) => placed.every((q) => Math.hypot(pt[0] - q.c[0], pt[1] - q.c[1]) > r + q.r);

  const fields = [];
  for (let n = 0, tries = 0; n < 11 && tries < 800; tries++) {
    const c = cand(0, 30, 0.016, 0.066);
    const f = at(Math.round(0)); void f;
    const k = Math.min(N - 2, Math.max(0, Math.round((() => { let best = 0, bd = Infinity; for (let i = 0; i < N; i++) { const d = Math.hypot(c[0] - path[i][0], c[1] - path[i][1]); if (d < bd) { bd = d; best = i; } } return best; })())));
    const fr = frameAt(k); const rot = (rnd() - 0.5) * 0.28, cs = Math.cos(rot), sn = Math.sin(rot);
    const a = 0.0105 + rnd() * 0.004, b = 0.0062 + rnd() * 0.0025;
    const loc = (u, v) => { const tu = u * cs - v * sn, nv = u * sn + v * cs; return [c[0] + fr.ty * tu + fr.ny * nv, c[1] + fr.tx * tu + fr.nx * nv]; };
    const poly = [loc(-a, -b), loc(a, -b), loc(a, b), loc(-a, b)];
    if (!poly.every((q) => free(q, 0.0035)) || !free(c, 0.007) || !clear(c, 0.012)) continue;
    placed.push({ c, r: 0.012 }); fields.push({ cls: n % 2 ? 'b' : 'a', polygon: poly.map(rp) }); n++;
  }
  const forests = [];
  for (let n = 0, tries = 0; n < 9 && tries < 1200; tries++) {
    const c = cand(1, 70, 0.014, 0.07); const rad = 0.0055 + rnd() * 0.005;
    const poly = circle(c, rad, 11, 0.5);
    if (!poly.every((q) => free(q, 0.003)) || !free(c, 0.005) || !clear(c, rad + 0.002)) continue;
    placed.push({ c, r: rad + 0.002 }); forests.push(poly.map(rp)); n++;
  }

  /* ------------------------------------------------ caminos rurales: de cada campo a la vía más cercana */
  const tracks = [];
  for (const f of fields) {
    const c = f.polygon.reduce((s, q) => [s[0] + q[0] / 4, s[1] + q[1] / 4], [0, 0]);
    let best = null, bd = Infinity;
    for (const r of roads) for (let i = 1; i < r.length; i += 1) { const d = dSeg(c, r[i - 1], r[i]); if (d < bd) { bd = d; best = r[i]; } }
    if (best && bd < 0.05) { const m = [(c[0] + best[0]) / 2 + (rnd() - 0.5) * 0.004, (c[1] + best[1]) / 2 + (rnd() - 0.5) * 0.004]; tracks.push(chaikin([best, m, c], 2).map(rp)); }
  }

  const R = (list) => list.map((l) => l.map(rp));
  return {
    _comment: 'Escenografía FICTICIA y determinista (no cartografía real). Generado por tools/gen-scenery.mjs a partir de data/map.json; no altera río, estaciones ni zonas. Coordenadas [lat, lng].',
    version: 1,
    landcover: {
      urban,
      farmland: fields,
      forest: forests,
      riparian
    },
    parks,
    roads: { main: R(main), secondary: R(secondary), coast: R(coast), streets, tracks },
    bridges
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const map = JSON.parse(readFileSync(new URL('../site/data/map.json', import.meta.url), 'utf8'));
  const s = buildScenery(map);
  const txt = JSON.stringify(s, null, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]');
  writeFileSync(new URL('../site/data/scenery.json', import.meta.url), txt + '\n');
  const verts = (o) => JSON.stringify(o).match(/\[-?\d+\.\d+,-?\d+\.\d+\]/g)?.length ?? 0;
  console.log('scenery.json:', { urban: s.landcover.urban.length, farmland: s.landcover.farmland.length, forest: s.landcover.forest.length, riparian: s.landcover.riparian.length, parks: s.parks.length, streets: s.roads.streets.length, tracks: s.roads.tracks.length, main: s.roads.main.length, secondary: s.roads.secondary.length, bridges: s.bridges.length, vertices: verts(s) });
}
