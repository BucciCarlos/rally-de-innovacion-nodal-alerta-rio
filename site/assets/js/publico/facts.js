// "Estado actual en pocas cifras": nivel, lluvia, estaciones y última actualización.
import { fmtLevel, fmtRate } from '../core/format.js';
import { $, setText } from './dom.js';
import { TREND_SAY } from './texts.js';

export function createFacts(root) {
  const q = (id) => ({ v: $(`#${id}-v`, root), s: $(`#${id}-s`, root), l: $(`#${id}-l`, root) });
  const f = { level: q('fact-level'), rain: q('fact-rain'), net: q('fact-net'), time: q('fact-time') };
  return {
    update(snap) {
      const focus = snap.stations.find((s) => s.id === snap.system.focusStationId) ?? snap.stations[0];
      setText(f.level.l, `Río en ${focus.short}`);
      setText(f.level.v, fmtLevel(focus.level));
      setText(f.level.s, `${TREND_SAY[focus.trend]} · ${fmtRate(focus.rateCmH)}`);
      setText(f.rain.v, snap.weather.condition);
      setText(f.rain.s, `${snap.weather.rainMmH.toLocaleString('es-AR', { maximumFractionDigits: 1 })} mm/h · ${snap.weather.rain3hMm} mm en 3 h`);
      const offline = snap.stations.filter((s) => s.stale).length;
      setText(f.net.v, `${snap.stations.length - offline} de ${snap.stations.length}`);
      setText(f.net.s, offline ? `${offline} sin conexión: se usa su última lectura` : 'Todas transmitiendo');
      setText(f.time.v, snap.clock);
      setText(f.time.s, snap.mode === 'baseline' ? 'Estado previo a la lluvia' : `Escenario simulado · ${snap.elapsedLabel}`);
    }
  };
}
