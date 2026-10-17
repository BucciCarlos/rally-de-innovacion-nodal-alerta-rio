/**
 * Nodal — capa de escenografía territorial (FICTICIA) compartida por el mapa público y el de operadores. Archivo del NÚCLEO.
 *
 * Dibuja, bajo el río, las zonas y las estaciones: uso del suelo, vegetación, calles, caminos, puentes, costanera y espacios verdes
 * a partir de data/scenery.json. Sólo visual: no interviene en el simulador ni en las alertas. Todo es no interactivo
 * y se agrupa en pocas geometrías multiparte (≈ 25 elementos SVG). El aspecto lo define cada vista por CSS (clases `sc-*`).
 *
 *   addScenery(L, map, sim.data.scenery, { detail: 'public' | 'ops' });   // llamar ANTES de crear río y zonas
 */
export function addScenery(L, map, scenery, { detail = 'public' } = {}) {
  if (!scenery) return null;
  const group = [];
  const base = { interactive: false, bubblingMouseEvents: false };
  const polys = (rings, cls) => { if (rings.length) group.push(L.polygon(rings.map((r) => [r]), { ...base, className: cls }).addTo(map)); };
  const lines = (ls, cls) => { if (ls.length) group.push(L.polyline(ls, { ...base, className: cls, lineCap: 'round', lineJoin: 'round' }).addTo(map)); };
  const { landcover: lc, roads, parks, bridges } = scenery;

  // Suelo (de abajo hacia arriba)
  polys(lc.farmland.filter((f) => f.cls === 'a').map((f) => f.polygon), 'sc-farm sc-farm--a');
  polys(lc.farmland.filter((f) => f.cls === 'b').map((f) => f.polygon), 'sc-farm sc-farm--b');
  polys(lc.forest, 'sc-forest');
  polys(lc.urban, 'sc-urban');
  polys(lc.riparian, 'sc-riparian');
  polys(parks.filter((k) => k.kind !== 'paseo').map((k) => k.polygon), 'sc-park');
  polys(parks.filter((k) => k.kind === 'paseo').map((k) => k.polygon), 'sc-park sc-park--paseo');

  // Vías: trama urbana, caminos rurales (sólo detalle técnico), carreteras con borde y costanera
  lines(roads.streets, 'sc-street');
  if (detail === 'ops') lines(roads.tracks, 'sc-track');
  lines(roads.secondary, 'sc-road-casing sc-road-casing--sec');
  lines(roads.main, 'sc-road-casing sc-road-casing--main');
  lines(roads.secondary, 'sc-road sc-road--sec');
  lines(roads.main, 'sc-road sc-road--main');
  lines(roads.coast, 'sc-coast');

  // Puentes: tablero con borde, orientado perpendicular al cauce
  lines(bridges.map((b) => b.line), 'sc-bridge-casing');
  lines(bridges.map((b) => b.line), 'sc-bridge');

  return { layers: group, remove: () => group.forEach((l) => l.remove()) };
}
