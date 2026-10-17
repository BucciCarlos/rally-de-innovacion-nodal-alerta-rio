// Genera data/map.json: geografía FICTICIA y esquemática (no corresponde a ningún río real).
// Uso: node tools/gen-map.mjs   (reescribe data/map.json; luego correr `node tests/validate.mjs`)
import { writeFileSync } from 'node:fs';

const r5 = (n) => Math.round(n * 1e5) / 1e5;
const N = 72;
const A = [-31.905, -60.205];   // cabecera (NO)
const B = [-32.115, -59.875];   // desembocadura (SE)

// Eje del río + meandros (amplitud decreciente hacia el delta)
const path = [];
for (let i = 0; i < N; i++) {
  const s = i / (N - 1);
  const base = [A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s];
  const dx = B[1] - A[1], dy = B[0] - A[0];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;                       // normal (lng, lat) sobre el eje
  const amp = 0.02 * (1 - 0.35 * s) * Math.sin(Math.PI * Math.min(1, s * 1.15));
  const off = amp * Math.sin(2 * Math.PI * 2.6 * s + 0.6) + 0.004 * Math.sin(2 * Math.PI * 7 * s);
  path.push([r5(base[0] + ny * off), r5(base[1] + nx * off)]);
}

const stationIdx = [3, 16, 30, 43, 56, 68];
const stationIds = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'];

function normalAt(i) {
  const a = path[Math.max(0, i - 1)], b = path[Math.min(N - 1, i + 1)];
  const dy = b[0] - a[0], dx = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return { ny: dx / len, nx: -dy / len }; // componentes (lat, lng) de la normal izquierda
}
function offsetPoint(i, d) {
  const n = normalAt(i);
  return [path[i][0] + n.ny * d, path[i][1] + n.nx * d];
}
// Franja a un lado del río entre índices [i0,i1] y distancias [d0,d1] (en grados; signo = orilla)
function band(i0, i1, d0, d1) {
  const inner = [], outer = [];
  for (let i = i0; i <= i1; i++) { inner.push(offsetPoint(i, d0)); outer.push(offsetPoint(i, d1)); }
  return [...inner, ...outer.reverse()].map(([a, b]) => [r5(a), r5(b)]);
}

const segments = [{ id: 'S0', from: 0, to: stationIdx[0], stationIds: ['E1'] }];
for (let k = 0; k < stationIdx.length - 1; k++) {
  segments.push({ id: `S${k + 1}`, from: stationIdx[k], to: stationIdx[k + 1], stationIds: [stationIds[k], stationIds[k + 1]] });
}
segments.push({ id: `S${stationIdx.length}`, from: stationIdx[stationIdx.length - 1], to: N - 1, stationIds: ['E6'] });

const zones = [
  { id: 'Z1', name: 'Chacras de Paso Alto',   stationId: 'E1', bias: -1, kind: 'rural',  polygon: band(0, 8, 0.004, 0.015), note: 'Campos y viviendas dispersas cerca de la cabecera.' },
  { id: 'Z2', name: 'Los Sauces',             stationId: 'E3', bias: -1, kind: 'urbana', polygon: band(25, 36, -0.004, -0.014), note: 'Barrio residencial sobre terreno algo elevado.' },
  { id: 'Z3', name: 'Costanera Villa Serena', stationId: 'E4', bias: 0,  kind: 'urbana', polygon: band(38, 49, 0.004, 0.013), note: 'Barrio costero de baja altura junto al puente.' },
  { id: 'Z4', name: 'Loma Alta',              stationId: 'E4', bias: -1, kind: 'urbana', polygon: band(38, 49, 0.0135, 0.026), note: 'Zona alta de Villa Serena: refugio y servicios.' },
  { id: 'Z5', name: 'Barrio Molino',          stationId: 'E5', bias: 0,  kind: 'urbana', polygon: band(51, 62, -0.004, -0.014), note: 'Barrio bajo en el meandro, el primero en anegarse.' },
  { id: 'Z6', name: 'Puerto Nuevo',           stationId: 'E6', bias: 0,  kind: 'puerto', polygon: band(63, 71, 0.004, 0.015), note: 'Área portuaria cerca de la desembocadura.' }
];

function pointNear(i, d) { const [a, b] = offsetPoint(i, d); return [r5(a), r5(b)]; }
const landmarks = [
  { id: 'L1', kind: 'bridge',  name: 'Puente Viejo',                  latlng: path[30] },
  { id: 'L2', kind: 'bridge',  name: 'Puente de la Costanera',        latlng: path[43] },
  { id: 'L3', kind: 'school',  name: 'Escuela N.º 12 (ficticia)',     latlng: pointNear(44, 0.008) },
  { id: 'L4', kind: 'hospital',name: 'Hospital Regional (ficticio)',  latlng: pointNear(43, 0.019) },
  { id: 'L5', kind: 'shelter', name: 'Polideportivo (ficticio) — punto seguro',  latlng: pointNear(41, 0.022) },
  { id: 'L6', kind: 'fire',    name: 'Cuartel de Bomberos (ficticio)',latlng: pointNear(47, 0.021) },
  { id: 'L7', kind: 'shelter', name: 'Club Molino (ficticio) — punto seguro',    latlng: pointNear(57, -0.02) }
];

const lats = path.map((p) => p[0]), lngs = path.map((p) => p[1]);
const pad = 0.04;
const out = {
  _comment: 'Geografía FICTICIA y esquemática. Coordenadas [lat, lng] (orden de Leaflet). Generado por tools/gen-map.mjs.',
  center: [r5((Math.min(...lats) + Math.max(...lats)) / 2), r5((Math.min(...lngs) + Math.max(...lngs)) / 2)],
  zoom: 11,
  bounds: [[r5(Math.min(...lats) - pad), r5(Math.min(...lngs) - pad)], [r5(Math.max(...lats) + pad), r5(Math.max(...lngs) + pad)]],
  tiles: {
    enabled: false,
    note: 'Por defecto el mapa es esquemático y funciona sin Internet. Si se activa, la geografía ficticia no coincidirá con la cartografía real.',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO'
  },
  river: { name: 'Río Serena (ficticio)', flowsFrom: 'NO', flowsTo: 'SE', path, stationPathIndex: Object.fromEntries(stationIds.map((id, i) => [id, stationIdx[i]])), segments },
  zones,
  landmarks
};
writeFileSync(new URL('../site/data/map.json', import.meta.url), JSON.stringify(out, null, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]'));
console.log('map.json generado:', path.length, 'puntos,', zones.length, 'zonas');
