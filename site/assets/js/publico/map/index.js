// Mapa esquemático del río (Leaflet sin teselas). Se crea una sola vez y se actualiza de forma incremental.
import { addBase, addPatterns } from './base.js';
import { createRiver } from './river.js';
import { createZones } from './zones.js';
import { createStations } from './stations.js';
import { createLandmarks } from './landmarks.js';
import { nearestShelter } from '../geo.js';

const DESKTOP = '(min-width: 1024px)';

export function createRiverMap(el, sim, { onSelectZone, onSelectStation }) {
  const { data, levels } = sim;
  const mq = window.matchMedia(DESKTOP);
  const touch = window.matchMedia('(pointer: coarse)').matches;

  const map = L.map(el, {
    zoomControl: false, attributionControl: false, zoomSnap: 0.1, zoomDelta: 0.5,
    scrollWheelZoom: false, doubleClickZoom: true, boxZoom: false, tap: false,
    maxBounds: L.latLngBounds(data.map.bounds).pad(1), maxBoundsViscosity: 0.6,
    dragging: !touch, minZoom: 8, maxZoom: 15
  });

  addBase(map, data);
  const zones = createZones(map, data, levels, { onSelect: onSelectZone });
  const river = createRiver(map, data, levels);
  const landmarks = createLandmarks(map, data);
  const stations = createStations(map, data, levels, { onSelect: onSelectStation });
  addPatterns(map, zones.firstLayer, levels);

  const api = { map, onViewChange: null };
  // Encuadre: el río con un poco de aire (más tenso que data.map.bounds, que deja mucho vacío)
  const focusBounds = L.latLngBounds(data.map.river.path).pad(0.08);
  let userMoved = false;
  let baseZoom = 0;
  let route = null;

  const padding = () => (mq.matches
    ? { paddingTopLeft: [Math.min(500, window.innerWidth * 0.34) + 40, 40], paddingBottomRight: [70, 110] }
    : { paddingTopLeft: [28, 24], paddingBottomRight: [34, 36] });

  function fit(animate = false) {
    map.fitBounds(focusBounds, { ...padding(), animate });
    baseZoom = map.getZoom();
    userMoved = false;
    api.onViewChange?.(false);
  }

  map.on('dragstart', () => { userMoved = true; api.onViewChange?.(true); });
  map.on('zoomend', () => {
    if (map.getZoom() !== baseZoom) { userMoved = true; api.onViewChange?.(true); }
    if (touch) (map.getZoom() > baseZoom + 0.1 ? map.dragging.enable() : map.dragging.disable());
  });

  new ResizeObserver(() => {
    map.invalidateSize({ pan: false });
    if (!userMoved) fit(false);
  }).observe(el);
  fit(false);

  Object.assign(api, {
    update(snap) { river.update(snap); zones.update(snap); stations.update(snap); },
    selectZone(id) {
      zones.select(id);
      if (route) { route.remove(); route = null; }
      const z = data.map.zones.find((x) => x.id === id);
      const center = zones.centerOf(id);
      if (!z || !center) return;
      const near = nearestShelter(data.map.landmarks, center);
      if (near) {
        route = L.polyline([center, near.landmark.latlng], { className: 'm-route', interactive: false }).addTo(map);
        map.fitBounds(L.latLngBounds([center, near.landmark.latlng]).pad(1.1), { ...padding(), maxZoom: 13, animate: true });
        userMoved = true; api.onViewChange?.(true);
      }
    },
    showStation(id) {
      const ll = stations.latlngOf(id);
      if (ll) map.panTo(ll, { animate: true });
      stations.open(id);
    },
    showShelters() {
      const pts = landmarks.shelters();
      if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.6), { ...padding(), maxZoom: 12.5, animate: true });
      userMoved = true; api.onViewChange?.(true);
      landmarks.pulseShelters();
    },
    zoomIn: () => { userMoved = true; map.zoomIn(); },
    zoomOut: () => { userMoved = true; map.zoomOut(); },
    resetView() {
      if (route) { route.remove(); route = null; zones.select(null); }
      map.closePopup();
      fit(true);
    },
    highlightZone: (id) => zones.select(id),
    clearSelection() { zones.select(null); if (route) { route.remove(); route = null; } }
  });
  return api;
}
