// Biblioteca de iconos de la vista pública (trazos de 24×24, heredan `currentColor`).
// Los iconos acompañan siempre a un texto: el estado nunca se comunica sólo con color.

const P = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  warning: '<path d="M12 5v9"/><circle cx="12" cy="18.6" r="1.1" fill="currentColor"/>',
  alert: '<path d="M12 4.5v10" stroke-width="3"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>',
  rising: '<path d="M6 17.5L17.5 6M9 6h8.5v8.5"/>',
  falling: '<path d="M6 6l11.5 11.5M17.5 9v8.5H9"/>',
  steady: '<path d="M4.5 12h15M14 6.5l5.5 5.5-5.5 5.5"/>',
  rain: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 14v6M8 14v6M12 16v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  signal: '<path d="M4.5 10.5a11 11 0 0 1 15 0M7.8 14a6.3 6.3 0 0 1 8.4 0"/><circle cx="12" cy="18" r="1.2" fill="currentColor"/>',
  drop: '<path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11z"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
  bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  backpack: '<path d="M8 21V10a4 4 0 0 1 8 0v11z"/><path d="M9.5 6V4.5h5V6M8 14h8M10.5 18h3"/>',
  car: '<path d="M4 16v-4l2.2-5h11.6L20 12v4z"/><path d="M4 12h16"/><circle cx="8" cy="16.5" r="1.3"/><circle cx="16" cy="16.5" r="1.3"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.3a3 3 0 0 1 0 5.6M18 14.2a5 5 0 0 1 3 4.8"/>',
  exit: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  megaphone: '<path d="M4 10v4h3l7 4V6l-7 4z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  home: '<path d="M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  bridge: '<path d="M2.5 17h19"/><path d="M4.5 17c0-5 3.3-8.5 7.5-8.500S19.5 12 19.5 17"/><path d="M12 8.500V17M8 10v7M16 10v7"/>',
  hospital: '<path d="M12 6.5v11M6.5 12h11"/>',
  fire: '<path d="M12 21c4 0 6-2.7 6-6 0-3-2-4.5-3-7-1.5 1.5-1.8 3-2.3 3.800C12.5 10 11 8 11.5 4 8 6.5 6 10 6 14.500c0 3.8 2.3 6.5 6 6.500z"/>',
  school: '<path d="M2.5 9L12 4.5 21.5 9 12 13.500z"/><path d="M6 11.500V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  target: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2.500v3M12 18.500v3M2.5 12h3M18.5 12h3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  radar: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7.500A4.5 4.5 0 1 0 16.5 12"/><path d="M12 12l6.5-6.5"/>',
  wifioff: '<path d="M3 3l18 18M8.5 16.500a5 5 0 0 1 7 0M5 12.500a10 10 0 0 1 3-2M12 7.500a14 14 0 0 1 7 3"/><circle cx="12" cy="20" r="1" fill="currentColor"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.500V21"/>',
  gauge: '<path d="M4 17a8.5 8.5 0 1 1 16 0"/><path d="M12 17l4-5"/>'
};

/** SVG inline de un icono. `size` en px (por defecto 24). */
export function icon(name, { size = 24, stroke = 2, cls = '' } = {}) {
  const body = P[name] ?? '';
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Cuerpo del icono (para anidar dentro de otro <svg>). */
export const iconBody = (name) => P[name] ?? '';

/** Icono de cada nivel: `icon` de levels.json → glifo propio. */
export const LEVEL_GLYPH = { check: 'check', eye: 'eye', warning: 'warning', alert: 'alert' };
export const STATUS_GLYPH = { normal: 'check', vigilancia: 'eye', naranja: 'warning', roja: 'alert' };

/** Iconos de las 3 recomendaciones de cada nivel (mismo orden que levels.json). */
export const ADVICE_ICONS = {
  normal: ['check', 'bell', 'route'],
  vigilancia: ['ban', 'backpack', 'clock'],
  naranja: ['car', 'backpack', 'people'],
  roja: ['exit', 'ban', 'megaphone']
};

/** Silueta de la insignia de estación según nivel (viewBox 48×48): la forma también distingue el estado. */
export const BADGE_SHAPE = {
  normal: 'M24 4a20 20 0 1 0 0 40a20 20 0 1 0 0-40z',
  vigilancia: 'M24 3L45 24L24 45L3 24z',
  naranja: 'M24 4L45 41H3z',
  roja: 'M16 4h16l12 12v16l-12 12H16L4 32V16z'
};
/** Posición vertical del glifo dentro de cada silueta. */
export const BADGE_GLYPH_Y = { normal: 14, vigilancia: 14, naranja: 17, roja: 14 };
