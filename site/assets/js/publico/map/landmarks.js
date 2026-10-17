// Puntos de referencia: puentes, hospital, bomberos, escuela y, destacados, los puntos seguros ("dónde ir").
import { escapeHtml } from '../../core/format.js';
import { icon } from '../icons.js';

const GLYPH = { bridge: 'bridge', school: 'school', hospital: 'hospital', fire: 'fire', shelter: 'home' };
const KIND_LABEL = { bridge: 'Puente', school: 'Escuela', hospital: 'Hospital', fire: 'Bomberos', shelter: 'Punto seguro' };

export function createLandmarks(map, data) {
  let shelterN = 0;
  const markers = data.map.landmarks.map((lm) => {
    const safe = lm.kind === 'shelter';
    const size = safe ? 40 : 30;
    const marker = L.marker(lm.latlng, {
      zIndexOffset: safe ? 400 : 0,
      keyboard: safe,
      title: `${KIND_LABEL[lm.kind] ?? 'Lugar'}: ${lm.name}`,
      icon: L.divIcon({
        className: `lm lm--${lm.kind}`,
        html: `<span class="lm__badge">${icon(GLYPH[lm.kind] ?? 'pin', { size: safe ? 22 : 17, stroke: 2.2 })}</span>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2]
      })
    }).addTo(map);
    const below = safe && shelterN++ % 2 === 1;
    marker.bindTooltip(
      safe ? `<span class="tip-safe">Punto seguro</span> ${escapeHtml(lm.name.replace(/\s*—\s*punto seguro/i, ''))}` : escapeHtml(lm.name),
      { permanent: safe, direction: below || !safe ? (safe ? 'bottom' : 'top') : 'top', offset: safe ? [0, below ? 14 : -14] : [0, -10], className: safe ? 'm-tip m-tip--safe' : 'm-tip' }
    );
    marker.on('add', () => marker.getElement()?.setAttribute('aria-label', `${KIND_LABEL[lm.kind] ?? 'Lugar'}: ${lm.name}`));
    return { lm, marker };
  });

  return {
    shelters: () => markers.filter((m) => m.lm.kind === 'shelter').map((m) => m.lm.latlng),
    pulseShelters() {
      for (const { lm, marker } of markers) {
        if (lm.kind !== 'shelter') continue;
        const el = marker.getElement();
        el?.classList.add('is-pulse');
        setTimeout(() => el?.classList.remove('is-pulse'), 4200);
      }
    }
  };
}
