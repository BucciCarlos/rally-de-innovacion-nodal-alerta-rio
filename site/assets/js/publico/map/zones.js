// Barrios: relleno translúcido + textura por nivel, etiqueta y selección.
import { levelColor } from '../../core/format.js';
import { escapeHtml } from '../../core/format.js';
import { centroid, labelAnchor } from '../geo.js';
import { ZONE_SAY } from '../texts.js';
import { paint, paintOnChange } from './paint.js';

const OPACITY = { normal: 0.16, vigilancia: 0.2, naranja: 0.3, roja: 0.42 };

export function createZones(map, data, levels, { onSelect }) {
  const done = new Map();
  let snap = null;
  let selected = null;

  const items = data.map.zones.map((z) => {
    const poly = L.polygon(z.polygon, { className: 'm-zone', weight: 2, interactive: true, bubblingMouseEvents: false }).addTo(map);
    const pat = L.polygon(z.polygon, { className: 'm-zone-pat', interactive: false, stroke: false }).addTo(map);
    const center = centroid(z.polygon);
    poly.bindTooltip(() => {
      const zs = snap?.zones.find((x) => x.id === z.id);
      const st = zs ? levels[zs.status] : levels.normal;
      return `<strong>${escapeHtml(z.name)}</strong><br>${escapeHtml(st.label)} — ${escapeHtml(ZONE_SAY[zs?.status ?? 'normal'])}`;
    }, { sticky: true, className: 'm-tip', direction: 'top' });
    poly.on('click', () => onSelect(z.id));
    const label = L.marker(labelAnchor(z.polygon, data.map.river.path), {
      interactive: false, keyboard: false,
      icon: L.divIcon({ className: 'zlabel-wrap', html: `<span class="zlabel">${escapeHtml(z.name)}</span>`, iconSize: [0, 0] })
    }).addTo(map);
    return { z, poly, pat, center, label };
  });

  return {
    firstLayer: items[0].poly,
    centerOf: (id) => items.find((i) => i.z.id === id)?.center,
    update(s) {
      snap = s;
      s.zones.forEach((zs, i) => {
        const { poly, pat } = items[i];
        const color = levelColor(levels, zs.status);
        paintOnChange(done, zs.id, zs.status, poly, {
          fill: color, fillOpacity: String(OPACITY[zs.status]), stroke: color
        });
        paintOnChange(done, `${zs.id}p`, zs.status, pat, {
          fill: zs.status === 'normal' ? 'none' : `url(#ar-pat-${zs.status})`,
          fillOpacity: zs.status === 'roja' ? '0.5' : '0.4'
        });
      });
    },
    select(id) {
      selected = id;
      for (const { z, poly } of items) poly.getElement()?.classList.toggle('is-selected', z.id === id);
    },
    get selected() { return selected; }
  };
}
