// Geometría auxiliar sobre la geografía ficticia del mapa (sólo presentación; no genera datos de la simulación).

const R = 6371; // km

export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Centro aproximado de un polígono [[lat,lng]…] (promedio de vértices; suficiente para etiquetas). */
export function centroid(poly) {
  const n = poly.length;
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
}

/** Punto seguro (landmark kind 'shelter') más cercano a un punto. */
export function nearestShelter(landmarks, point) {
  let best = null;
  for (const lm of landmarks) {
    if (lm.kind !== 'shelter') continue;
    const d = distanceKm(point, lm.latlng);
    if (!best || d < best.km) best = { landmark: lm, km: d };
  }
  return best;
}

/** Punto de un polígono más alejado del río (sirve para ubicar la etiqueta del barrio sin tapar las estaciones). */
export function labelAnchor(poly, riverPath) {
  const c = centroid(poly);
  let best = c, bestD = -1;
  for (const v of poly) {
    let d = Infinity;
    for (const r of riverPath) d = Math.min(d, (v[0] - r[0]) ** 2 + (v[1] - r[1]) ** 2);
    if (d > bestD) { bestD = d; best = v; }
  }
  return [c[0] + (best[0] - c[0]) * 1.15, c[1] + (best[1] - c[1]) * 1.15];
}
