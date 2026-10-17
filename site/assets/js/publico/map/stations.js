// Estaciones (celulares reutilizados): insignia grande con forma + icono + texto, pulso si hay alerta.
import { escapeHtml, fmtLevel, fmtRate } from '../../core/format.js';
import { iconBody, STATUS_GLYPH, BADGE_SHAPE, BADGE_GLYPH_Y } from '../icons.js';
import { TREND_SAY } from '../texts.js';

const html = (s) => `
  <div class="stn" data-status="${s.status}" data-stale="false">
    <span class="stn__pulse"></span>
    <svg class="stn__shape" viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
      <path class="stn__bg" d="${BADGE_SHAPE[s.status]}"/>
      <svg class="stn__glyph" x="14" y="${BADGE_GLYPH_Y[s.status]}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${iconBody(STATUS_GLYPH[s.status])}</svg>
    </svg>
    <span class="stn__label"><b>${escapeHtml(s.short)}</b><i class="stn__status"></i></span>
  </div>`;

export function createStations(map, data, levels, { onSelect }) {
  let snap = null;
  const popupHtml = (id) => {
    const s = snap?.stations.find((x) => x.id === id);
    if (!s) return '';
    const lv = levels[s.status];
    const body = s.stale
      ? 'Sin conexión: se muestra la última lectura recibida.'
      : `${TREND_SAY[s.trend] ?? ''} (${fmtRate(s.rateCmH)}).`;
    return `<div class="pop" data-status="${s.status}">
      <p class="pop__kicker">Estación simulada · ${escapeHtml(s.role)}</p>
      <h3>${escapeHtml(s.name)}</h3>
      <p class="pop__state"><span class="pop__dot"></span>${escapeHtml(lv.label)}</p>
      <p>El río marca <strong>${fmtLevel(s.level)}</strong>. ${escapeHtml(body)}</p>
      <p class="pop__thr">Alerta naranja desde ${fmtLevel(s.thresholds.naranja)} · roja desde ${fmtLevel(s.thresholds.roja)}.</p>
    </div>`;
  };

  const first = data.stations.stations;
  const items = first.map((st) => {
    const [lat, lng] = data.map.river.path[data.map.river.stationPathIndex[st.id]];
    const marker = L.marker([lat, lng], {
      riseOnHover: true,
      title: st.name,
      icon: L.divIcon({ className: 'stn-wrap', html: html({ ...st, status: 'normal' }), iconSize: [46, 46], iconAnchor: [23, 23] })
    }).addTo(map);
    marker.bindPopup(() => popupHtml(st.id), { className: 'm-popup', maxWidth: 280, closeButton: true, autoPanPadding: [24, 90] });
    marker.on('click', () => onSelect(st.id));
    marker.on('popupopen', (e) => e.popup.setContent(popupHtml(st.id)));
    return { st, marker, status: null, stale: null };
  });

  return {
    update(s) {
      snap = s;
      for (const it of items) {
        const ss = s.stations.find((x) => x.id === it.st.id);
        const el = it.marker.getElement();
        if (!el || !ss) continue;
        const root = el.querySelector('.stn');
        if (it.status !== ss.status) {
          it.status = ss.status;
          root.dataset.status = ss.status;
          root.querySelector('.stn__bg').setAttribute('d', BADGE_SHAPE[ss.status]);
          const g = root.querySelector('.stn__glyph');
          g.setAttribute('y', BADGE_GLYPH_Y[ss.status]);
          g.innerHTML = iconBody(STATUS_GLYPH[ss.status]);
          root.querySelector('.stn__status').textContent = levels[ss.status].shortLabel;
          it.marker.setZIndexOffset(ss.severity * 100);
          el.setAttribute('aria-label', `${it.st.name}: ${levels[ss.status].label}${ss.stale ? ' (sin conexión)' : ''}`);
        }
        if (it.stale !== ss.stale) {
          it.stale = ss.stale;
          root.dataset.stale = String(ss.stale);
          el.setAttribute('aria-label', `${it.st.name}: ${levels[ss.status].label}${ss.stale ? ' (sin conexión)' : ''}`);
          root.querySelector('.stn__status').textContent = ss.stale ? `${levels[ss.status].shortLabel} · sin señal` : levels[ss.status].shortLabel;
        }
        if (it.marker.isPopupOpen()) {
          const next = popupHtml(it.st.id);
          const pop = it.marker.getPopup();
          if (pop.getContent() !== next) pop.setContent(next);
        }
      }
    },
    open(id) { items.find((i) => i.st.id === id)?.marker.openPopup(); },
    latlngOf: (id) => items.find((i) => i.st.id === id)?.marker.getLatLng()
  };
}
