/**
 * Alerta Río — utilidades de formato compartidas (es-AR). Archivo del NÚCLEO.
 * Sólo funciones puras: seguras de importar desde cualquier vista.
 */
import { fmtMinutes } from './engine.js';

export { fmtMinutes };

const nf = (digits) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const nf2 = nf(2), nf1 = nf(1), nf0 = nf(0);

export const fmtLevel = (m) => (m == null ? '—' : `${nf2.format(m)} m`);
export const fmtNumber = (n, digits = 0) => (n == null ? '—' : (digits === 0 ? nf0 : digits === 1 ? nf1 : nf2).format(n));
export const fmtRate = (cmH) => (cmH == null ? '—' : `${cmH > 0 ? '+' : ''}${nf1.format(cmH)} cm/h`);
export const fmtPercent = (v) => `${nf0.format(v)} %`;

export const TREND = {
  rising:  { arrow: '↗', label: 'Subiendo' },
  steady:  { arrow: '→', label: 'Estable' },
  falling: { arrow: '↘', label: 'Bajando' }
};
export const CONNECTIVITY = {
  online:   { label: 'En línea' },
  degraded: { label: 'Señal débil' },
  offline:  { label: 'Sin conexión' }
};
export const BATTERY = {
  ok: { label: 'Buena' }, media: { label: 'Media' }, baja: { label: 'Baja' }, critica: { label: 'Crítica' }
};
export const DEVICE_HEALTH = {
  ok: { label: 'Operativa' }, atencion: { label: 'Atención' }, falla: { label: 'Falla' }
};

/** "en 1 h 20 min" / "ahora" a partir de minutos hacia el futuro. */
export function fmtEta(min) {
  if (min == null) return 'sin previsión';
  if (min <= 0) return 'ahora';
  return `en ${fmtMinutes(min)}`;
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Color CSS de un nivel desde data/levels.json (para Leaflet/Chart.js, que no leen variables CSS). */
export function levelColor(levels, status) { return levels[status]?.color ?? '#7d8b99'; }
export function levelInk(levels, status) { return levels[status]?.ink ?? '#ffffff'; }
