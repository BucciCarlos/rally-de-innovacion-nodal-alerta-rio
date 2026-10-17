// Río: lecho de agua, tramos coloreados por estado, halo de crecida y flujo animado.
import { levelColor } from '../../core/format.js';
import { paintOnChange } from './paint.js';

const WIDTH = { normal: 7, vigilancia: 9, naranja: 11, roja: 14 };
const HALO = { normal: 0, vigilancia: 16, naranja: 30, roja: 48 };
const HALO_OPACITY = { normal: 0, vigilancia: 0.16, naranja: 0.22, roja: 0.3 };
const FLOW_SECONDS = { normal: 2.6, vigilancia: 1.9, naranja: 1.3, roja: 0.9 };

export function createRiver(map, data, levels) {
  const { path, segments } = data.map.river;
  const bed = L.polyline(path, { className: 'm-bed', interactive: false, lineCap: 'round' }).addTo(map);
  const parts = segments.map((sg) => {
    const pts = path.slice(sg.from, sg.to + 1);
    return {
      halo: L.polyline(pts, { className: 'm-halo', interactive: false, lineCap: 'butt' }).addTo(map),
      seg: L.polyline(pts, { className: 'm-seg', interactive: false, lineCap: 'round' }).addTo(map)
    };
  });
  const flow = L.polyline(path, { className: 'm-flow', interactive: false, lineCap: 'round' }).addTo(map);

  const done = new Map();
  let flowStatus = null;

  return {
    bed,
    update(snap) {
      snap.riverSegments.forEach((rs, i) => {
        const { halo, seg } = parts[i];
        const color = levelColor(levels, rs.status);
        paintOnChange(done, `s${i}`, rs.status, seg, { stroke: color, strokeWidth: `${WIDTH[rs.status]}px` });
        paintOnChange(done, `h${i}`, rs.status, halo, {
          stroke: color, strokeWidth: `${HALO[rs.status]}px`, strokeOpacity: String(HALO_OPACITY[rs.status])
        });
      });
      const worst = snap.system.status;
      if (flowStatus !== worst) {
        flowStatus = worst;
        flow.getElement()?.style.setProperty('--flow-s', `${FLOW_SECONDS[worst]}s`);
      }
    }
  };
}
