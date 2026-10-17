import { escapeHtml, fmtNumber } from '../core/format.js';
export const $ = (id) => document.getElementById(id);
export const esc = escapeHtml;
export const number = fmtNumber;
export const symbols = { normal: '✓', vigilancia: '◉', naranja: '▲', roja: '◆' };
export const types = { level: 'Nivel', forecast: 'Predicción simulada', device: 'Dispositivo', weather: 'Meteorología', system: 'Sistema', operator: 'Operación' };
export function text(id, value) { const el = $(id); if (el.textContent !== String(value)) el.textContent = value; }
export function html(el, value) { if (el._markup !== value) { el.innerHTML = value; el._markup = value; } }
export function status(el, value, levels) {
  if (el.dataset.status && el.dataset.status !== value) {
    el.classList.remove('status-change');
    requestAnimationFrame(() => el.classList.add('status-change'));
  }
  el.dataset.status = value;
  el.textContent = `${symbols[value]} ${levels[value].label}`;
}
export function clockAt(t, timeline) {
  if (t == null || !Number.isFinite(t)) return 'Hora no informada';
  const [h, m] = timeline.startClock.split(':').map(Number);
  const total = Math.round(h * 60 + m + t);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}${total >= 1440 ? ' · J+1' : ''}`;
}
