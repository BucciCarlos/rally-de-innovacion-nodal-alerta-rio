import { escapeHtml } from '../core/format.js';
export const $ = (id) => document.getElementById(id);
export const esc = escapeHtml;
/** Escribe sólo si cambió (evita reflujos y relecturas de lectores de pantalla). */
export function setText(id, value) { const el = $(id); const v = String(value); if (el.textContent !== v) el.textContent = v; return el; }
export function setAttr(id, name, value) { const el = $(id); const v = String(value); if (el.getAttribute(name) !== v) el.setAttribute(name, v); return el; }
export function setHtml(id, markup) { const el = $(id); if (el._markup !== markup) { el.innerHTML = markup; el._markup = markup; } return el; }
export const STATUS_SYMBOL = { normal: '✓', vigilancia: '◉', naranja: '▲', roja: '◆' };
