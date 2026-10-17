// "Tu zona": selector simple de barrios + detalle en lenguaje claro (estado, nivel del río, punto seguro más cercano).
import { escapeHtml, fmtLevel, fmtNumber, levelColor } from '../core/format.js';
import { $, setText, setHtml } from './dom.js';
import { icon, STATUS_GLYPH } from './icons.js';
import { centroid, nearestShelter } from './geo.js';
import { ZONE_SAY, TREND_SAY } from './texts.js';

export function createZoneList(root, sim, { onSelect, onShowOnMap }) {
  const { zones, landmarks } = sim.data.map;
  const levels = sim.levels;
  const list = $('.zl__list', root);
  const detail = $('.zd', root);
  let selected = zones.find((z) => z.id === 'Z3')?.id ?? zones[0].id;
  let snap = null;

  const rows = zones.map((z) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="zl__btn" aria-pressed="false">
      <span class="zl__name">${escapeHtml(z.name)}</span>
      <span class="zl__kind">${escapeHtml(z.kind)}</span>
      <span class="zl__chip"><span class="zl__ico"></span><span class="zl__txt"></span></span></button>`;
    list.appendChild(li);
    const btn = li.firstChild;
    btn.addEventListener('click', () => onSelect(z.id));
    return { z, btn, ico: $('.zl__ico', li), txt: $('.zl__txt', li), status: null };
  });

  const shelterFor = (z) => nearestShelter(landmarks, centroid(z.polygon));

  function renderDetail() {
    if (!snap) return;
    const z = zones.find((x) => x.id === selected);
    const zs = snap.zones.find((x) => x.id === selected);
    const st = snap.stations.find((x) => x.id === z.stationId);
    const lvl = levels[zs.status];
    detail.dataset.status = zs.status;
    const near = shelterFor(z);
    const max = Math.max(st.thresholds.roja * 1.2, st.level * 1.04);
    const pos = (v) => `${Math.min(100, (v / max) * 100).toFixed(2)}%`;
    const c = (s) => levelColor(levels, s);
    const track = `linear-gradient(90deg, ${c('normal')} 0 ${pos(st.thresholds.vigilancia)}, ${c('vigilancia')} 0 ${pos(st.thresholds.naranja)}, ${c('naranja')} 0 ${pos(st.thresholds.roja)}, ${c('roja')} 0 100%)`;
    setHtml(detail, `
      <div class="zd__head">
        <h3 class="zd__title">${escapeHtml(z.name)}</h3>
        <p class="zd__state"><span class="zd__ico">${icon(STATUS_GLYPH[zs.status], { size: 22, stroke: 2.4 })}</span>${escapeHtml(lvl.label)}</p>
      </div>
      <p class="zd__say">${escapeHtml(ZONE_SAY[zs.status])}</p>
      <div class="zd__gauge" role="img" aria-label="El río en ${escapeHtml(st.short)} marca ${fmtLevel(st.level)}. Alerta naranja desde ${fmtLevel(st.thresholds.naranja)} y roja desde ${fmtLevel(st.thresholds.roja)}.">
        <div class="zd__track" style="background:${track}"><i class="zd__needle" style="left:${pos(st.level)}"></i></div>
        <div class="zd__ticks"><span style="left:${pos(st.thresholds.vigilancia)}">Atención</span><span style="left:${pos(st.thresholds.naranja)}">Naranja</span><span style="left:${pos(st.thresholds.roja)}">Roja</span></div>
      </div>
      <p class="zd__river">Río en ${escapeHtml(st.short)}: <strong>${fmtLevel(st.level)}</strong> · ${escapeHtml(TREND_SAY[st.trend])}${st.stale ? ' · <em>sin conexión, última lectura</em>' : ''}</p>
      ${near ? `<div class="zd__safe">${icon('home', { size: 24 })}<p>Punto seguro de ejemplo más cercano:<br><strong>${escapeHtml(near.landmark.name.replace(/\s*—\s*punto seguro/i, ''))}</strong>, a unos ${fmtNumber(near.km, 1)} km en línea recta.<br><small>Mapa y lugares ficticios: no es una indicación real de evacuación.</small></p>
        <button type="button" class="zd__map">Ver en el mapa</button></div>` : ''}
      <p class="zd__note">${escapeHtml(z.note)}</p>`);
    const btn = $('.zd__map', detail);
    if (btn) btn.onclick = () => onShowOnMap(selected);
  }

  return {
    get selected() { return selected; },
    select(id) {
      selected = id;
      rows.forEach((r) => r.btn.setAttribute('aria-pressed', String(r.z.id === id)));
      renderDetail();
    },
    update(s) {
      snap = s;
      rows.forEach((r) => {
        const zs = s.zones.find((x) => x.id === r.z.id);
        if (r.status !== zs.status) {
          r.status = zs.status;
          r.btn.dataset.status = zs.status;
          r.ico.innerHTML = icon(STATUS_GLYPH[zs.status], { size: 16, stroke: 2.6 });
          setText(r.txt, levels[zs.status].label);
        }
        r.btn.setAttribute('aria-pressed', String(r.z.id === selected));
      });
      renderDetail();
    }
  };
}
