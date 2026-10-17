// Utilidades mínimas de DOM para actualizar de forma incremental (sin reconstruir nodos en cada tick).

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Cambia el texto sólo si es distinto. Devuelve true si cambió. */
export function setText(el, value) {
  const v = String(value ?? '');
  if (el.textContent === v) return false;
  el.textContent = v;
  return true;
}

/** Cambia un atributo sólo si es distinto. */
export function setAttr(el, name, value) {
  const v = String(value);
  if (el.getAttribute(name) !== v) el.setAttribute(name, v);
}

/** Cambia innerHTML sólo si es distinto (usar únicamente con HTML ya escapado). */
const htmlCache = new WeakMap();
export function setHtml(el, html) {
  if (htmlCache.get(el) === html) return false;
  htmlCache.set(el, html);
  el.innerHTML = html;
  return true;
}

/** Reinicia una animación CSS declarada con la clase `cls` (p. ej. un fundido al cambiar de texto). */
export function replay(el, cls = 'swap') {
  el.classList.remove(cls);
  void el.offsetWidth; // fuerza reflow para reiniciar la animación
  el.classList.add(cls);
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
