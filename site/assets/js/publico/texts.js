// Textos ciudadanos de la vista pública (lenguaje simple, sin jerga). Los datos numéricos siempre vienen de la simulación.

/** Qué significa el nivel para una zona concreta. */
export const ZONE_SAY = {
  normal: 'Sin riesgo por el río en este momento.',
  vigilancia: 'El río sube cerca de esta zona. Mantenete informado y evitá la costa.',
  naranja: 'Pueden inundarse las calles bajas. Preparate para salir.',
  roja: 'Hay riesgo para las personas. Andá ya al punto seguro.'
};

export const TREND_SAY = {
  rising: 'El río está subiendo',
  steady: 'El río está estable',
  falling: 'El río está bajando'
};

/** Frase corta para anunciar un cambio de nivel a lectores de pantalla. */
export const ANNOUNCE = {
  normal: 'El nivel del río volvió a la normalidad.',
  vigilancia: 'Atención: el río está subiendo. Nivel de vigilancia.',
  naranja: 'Alerta naranja: prepará tu salida.',
  roja: 'Alerta roja: evacuá las zonas bajas.'
};
