// Leyenda del mapa: cada nivel con su forma, icono y nombre (nunca sólo color) + lugares clave.
import { escapeHtml } from '../core/format.js';
import { icon, iconBody, STATUS_GLYPH, BADGE_SHAPE, BADGE_GLYPH_Y } from './icons.js';

export function buildLegend(root, sim) {
  const order = sim.data.levels.order;
  const mini = (s) => `<svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true"><path d="${BADGE_SHAPE[s]}"/>
    <svg x="14" y="${BADGE_GLYPH_Y[s]}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${iconBody(STATUS_GLYPH[s])}</svg></svg>`;
  root.innerHTML = `
    <h2 class="legend__title">Cómo leer el mapa</h2>
    <ul class="legend__levels">${order.map((s) => `<li data-status="${s}"><span class="legend__shape">${mini(s)}</span>${escapeHtml(sim.levels[s].label)}</li>`).join('')}</ul>
    <ul class="legend__places">
      <li><span class="legend__pin legend__pin--safe">${icon('home', { size: 15, stroke: 2.4 })}</span>Punto seguro</li>
      <li><span class="legend__pin">${icon('hospital', { size: 15, stroke: 2.6 })}</span>Hospital</li>
      <li><span class="legend__pin">${icon('fire', { size: 15 })}</span>Bomberos</li>
      <li><span class="legend__pin">${icon('bridge', { size: 15 })}</span>Puente</li>
    </ul>`;
}
