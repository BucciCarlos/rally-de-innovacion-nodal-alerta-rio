// Fondo esquemático del mapa (sin teselas): tierra, retícula, estuario y patrones de relleno por nivel.
import { levelColor } from '../../core/format.js';

const GRID_STEP = 0.05;

export function addBase(map, data) {
  const { bounds, river } = data.map;
  const wide = L.latLngBounds(bounds).pad(0.7);

  L.rectangle(wide, { className: 'm-land', interactive: false }).addTo(map);

  const grid = [];
  const s = wide.getSouth(), n = wide.getNorth(), w = wide.getWest(), e = wide.getEast();
  for (let lat = Math.ceil(s / GRID_STEP) * GRID_STEP; lat < n; lat += GRID_STEP) grid.push([[lat, w], [lat, e]]);
  for (let lng = Math.ceil(w / GRID_STEP) * GRID_STEP; lng < e; lng += GRID_STEP) grid.push([[s, lng], [n, lng]]);
  L.polyline(grid, { className: 'm-grid', interactive: false }).addTo(map);

  // Estuario donde desemboca el río (decorativo, ficticio)
  const mouth = river.path[river.path.length - 1];
  L.circle(mouth, { radius: 5200, className: 'm-estuary', interactive: false }).addTo(map);
  L.circle(mouth, { radius: 3000, className: 'm-estuary m-estuary--core', interactive: false }).addTo(map);
}

/** Patrones SVG por nivel: refuerzan el color con una textura distinta (no depender sólo del color). */
export function addPatterns(map, anyLayer, levels) {
  const svg = map.getRenderer(anyLayer)?._container;
  if (!svg || svg.querySelector('#ar-pat-vigilancia')) return;
  const c = (st) => levelColor(levels, st);
  const defs = `<defs>
    <pattern id="ar-pat-vigilancia" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" fill="${c('vigilancia')}"/><circle cx="9" cy="9" r="1.6" fill="${c('vigilancia')}"/></pattern>
    <pattern id="ar-pat-naranja" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="10" fill="${c('naranja')}"/></pattern>
    <pattern id="ar-pat-roja" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="9" fill="${c('roja')}"/><rect width="9" height="3" fill="${c('roja')}"/></pattern>
  </defs>`;
  svg.insertAdjacentHTML('afterbegin', defs);
}
