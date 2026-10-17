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

/**
 * Ancla de la etiqueta de un barrio (sólo presentación): entre los vértices y puntos medios del polígono elige el más alejado de
 * estaciones y puntos de referencia (`avoid`), evitando además quedar pegado al cauce. Sin `avoid` usa el punto más alejado del río.
 */
export function labelAnchor(poly, riverPath, avoid = []) {
  const near = (pt, pts) => pts.reduce((m, r) => Math.min(m, Math.hypot(pt[0] - r[0], pt[1] - r[1])), Infinity);
  const cands = [...poly];
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; cands.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); }
  const c = centroid(poly);
  cands.push(c);
  let best = c, bestScore = -Infinity;
  for (const v of cands) {
    const river = near(v, riverPath);
    const score = (avoid.length ? near(v, avoid) : 0) + Math.min(river, 0.012) * 2 - (river < 0.005 ? 1 : 0);
    if (score > bestScore) { bestScore = score; best = v; }
  }
  // un pequeño paso hacia el centro mantiene la etiqueta dentro del barrio
  return [best[0] + (c[0] - best[0]) * 0.15, best[1] + (c[1] - best[1]) * 0.15];
}
