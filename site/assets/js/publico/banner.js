// Banner de estado: ¿hay peligro?, ¿qué tan grave?, ¿qué viene? — textos de la simulación, sin jerga.
import { fmtEta, fmtNumber } from '../core/format.js';
import { $, setText, setAttr, replay } from './dom.js';
import { icon, iconBody, STATUS_GLYPH, BADGE_SHAPE } from './icons.js';
import { TREND_SAY } from './texts.js';

const MIN_CALM = 'La situación ya está en curso: seguí las recomendaciones.';

export function createBanner(root, { onStart }) {
  const el = {
    badge: $('#status-badge', root), label: $('#status-label', root), headline: $('#status-title', root),
    citizen: $('#status-citizen', root), trend: $('#chip-trend', root), rain: $('#chip-rain', root), clock: $('#status-clock', root),
    outlook: $('#outlook', root), msg: $('#outlook-msg', root), conf: $('#outlook-conf', root), eta: $('#outlook-eta', root),
    etaVal: $('#eta-val', root), etaFill: $('#eta-fill', root), etaMark: $('#eta-mark', root), hint: $('#status-hint', root)
  };
  $('#hint-start', root).addEventListener('click', onStart);
  const last = { status: null, trend: null, rain: null, outKey: null };

  function badge(status) {
    el.badge.innerHTML = `<svg viewBox="0 0 48 48" width="64" height="64" aria-hidden="true"><path class="badge__bg" d="${BADGE_SHAPE[status]}"/>
      <svg class="badge__glyph" x="11" y="${status === 'naranja' ? 15 : 11}" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${iconBody(STATUS_GLYPH[status])}</svg></svg>`;
  }

  return {
    update(snap) {
      const { system, weather } = snap;
      const lvl = system.level;
      if (last.status !== system.status) {
        last.status = system.status;
        root.dataset.status = system.status;
        badge(system.status);
        replay(el.headline);
        replay(el.citizen);
      }
      setText(el.label, lvl.label);
      setText(el.headline, lvl.headline);
      setText(el.citizen, lvl.citizen);

      if (last.trend !== system.trend) {
        last.trend = system.trend;
        el.trend.innerHTML = `${icon(system.trend, { size: 18 })}<span></span>`;
        el.trend.dataset.trend = system.trend;
      }
      setText(el.trend.lastElementChild, TREND_SAY[system.trend]);

      const rainTxt = weather.rainMmH >= 0.5 ? `${weather.condition} · ${fmtNumber(weather.rainMmH)} mm/h` : weather.condition;
      if (!last.rain) el.rain.innerHTML = `${icon('rain', { size: 18 })}<span></span>`;
      last.rain = true;
      setText(el.rain.lastElementChild, rainTxt);
      setText(el.clock, snap.mode === 'baseline' ? `· ejemplo` : `· ${snap.clock}`);

      el.hint.hidden = snap.mode !== 'baseline';
      this.outlook(snap);
    },

    outlook(snap) {
      const { outlook: o, severity } = snap.system;
      const pre = o.preAlert && o.etaMin != null;
      const ongoing = !o.preAlert && o.severity > 0 && severity >= o.severity;
      el.outlook.dataset.pre = String(pre);
      if (o.status !== el.outlook.dataset.status) el.outlook.dataset.status = o.status;
      if (last.outKey !== `${o.key}${pre}`) { last.outKey = `${o.key}${pre}`; replay(el.outlook, 'swap'); }
      setText(el.msg, ongoing ? MIN_CALM : o.message);
      setText(el.conf, o.confidenceLabel && o.severity > 0 ? `Confianza ${o.confidenceLabel}` : '');
      el.conf.hidden = !el.conf.textContent;
      el.eta.hidden = !pre;
      if (pre) {
        setText(el.etaVal, fmtEta(o.etaMin));
        const pct = Math.max(2, Math.min(100, (o.etaMin / o.windowMin) * 100));
        el.etaFill.style.width = `${(100 - pct).toFixed(1)}%`;
        setAttr(el.etaMark, 'style', `left:${(100 - pct).toFixed(1)}%`);
      }
    }
  };
}
