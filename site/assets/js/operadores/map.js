import { fmtLevel, fmtRate } from '../core/format.js';
import { $, esc, symbols } from './ui.js';

export function createMap(sim, select) {
  const L = window.L, data = sim.data.map;
  const map = L.map('river-map', { zoomControl: false, zoomSnap: .25, attributionControl: false, scrollWheelZoom: false }).setView(data.center, data.zoom);
  L.control.zoom({ position: 'bottomright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map);
  map.createPane('river'); map.getPane('river').style.zIndex = 410;
  L.polyline(data.river.path, { color: '#234857', weight: 24, opacity: .65, interactive: false }).addTo(map);
  L.polyline(data.river.path, { color: '#66bacb', weight: 12, opacity: .25, interactive: false }).addTo(map);
  const segments = new Map(data.river.segments.map((s) => [s.id, L.polyline(data.river.path.slice(s.from, s.to + 1), { pane: 'river', weight: 5 }).addTo(map)]));
  const zones = new Map(data.zones.map((z) => [z.id, L.polygon(z.polygon, { weight: 1, fillOpacity: .12 }).bindTooltip(esc(z.name)).on('click', () => select(z.stationId)).addTo(map)]));
  const landmarkIcons = { bridge: '═', school: 'E', hospital: '+', shelter: '⌂', fire: 'B' };
  for (const lm of data.landmarks) {
    L.marker(lm.latlng, { icon: L.divIcon({ className: 'landmark-icon', html: `<span>${landmarkIcons[lm.kind] || '⊕'}</span>`, iconSize: [22, 22] }), keyboard: false })
      .bindTooltip(esc(lm.name)).addTo(map);
  }
  const markers = new Map();
  for (const st of sim.getSnapshot().stations) {
    const marker = L.marker([st.lat, st.lng], { title: st.name, alt: `Seleccionar ${st.name}`, keyboard: true }).addTo(map).on('click', () => select(st.id));
    marker.bindTooltip('', { direction: 'top', offset: [0, -18] });
    markers.set(st.id, { marker, key: '' });
  }
  const fit = () => map.fitBounds(L.latLngBounds([...data.river.path, ...data.zones.flatMap((z) => z.polygon)]), { padding: [45, 45], animate: false });
  $('fit-map').addEventListener('click', fit);
  const resize = new ResizeObserver(() => { map.invalidateSize({ pan: false }); }); resize.observe($('river-map'));
  requestAnimationFrame(fit);
  return {
    refresh: () => { map.invalidateSize({ pan: false }); },
    render(snap, selected) {
      for (const seg of snap.riverSegments) segments.get(seg.id).setStyle({ color: sim.levels[seg.status].color });
      for (const zone of snap.zones) zones.get(zone.id).setStyle({ color: sim.levels[zone.status].color, fillColor: sim.levels[zone.status].color });
      for (const st of snap.stations) {
        const entry = markers.get(st.id);
        const predicted = st.forecast.predictedSeverity > st.severity;
        const key = `${st.status}|${st.forecast.predictedStatus}|${selected === st.id}|${st.stale}`;
        if (entry.key !== key) {
          entry.marker.setIcon(L.divIcon({ className: 'station-map-icon', iconSize: [40, 40], iconAnchor: [20, 20], html: `<span class="map-station ${selected === st.id ? 'selected' : ''} ${predicted ? 'predicted' : ''} ${st.stale ? 'stale' : ''}" data-status="${st.status}" style="--forecast:${sim.levels[st.forecast.predictedStatus].color}"><b>${esc(st.id)}</b><i>${symbols[st.status]}</i></span>` }));
          entry.marker.setZIndexOffset(selected === st.id ? 1000 : 100); entry.key = key;
        }
        entry.marker.setTooltipContent(`<strong>${esc(st.name)}</strong><br>${symbols[st.status]} ${esc(sim.levels[st.status].label)} · ${esc(fmtLevel(st.level))}<br>${esc(fmtRate(st.rateCmH))}${st.stale ? '<br>Última lectura · sin conexión' : ''}`);
      }
    }
  };
}
