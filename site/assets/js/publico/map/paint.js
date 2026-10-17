// Estilo de capas vectoriales de Leaflet vía style inline: así las transiciones CSS (.m-seg, .m-zone…) suavizan los cambios de color.

export function paint(layer, style) {
  const el = layer.getElement?.();
  if (!el) return;
  for (const [k, v] of Object.entries(style)) if (el.style[k] !== v) el.style[k] = v;
}

/** Aplica el estilo sólo cuando cambia el estado (evita trabajo en cada tick de 200 ms). */
export function paintOnChange(store, key, status, layer, style) {
  if (store.get(key) === status) return false;
  store.set(key, status);
  paint(layer, typeof style === 'function' ? style() : style);
  return true;
}
