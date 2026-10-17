# Pedidos al núcleo — vista pública

> **Documentación histórica.** Informe de un agente de la fase de desarrollo multiagente inicial (ya concluida), con los pedidos al núcleo y su resolución. No son instrucciones vigentes; ver [AGENTS.md](../../AGENTS.md) y [DESARROLLO-ASISTIDO-IA.md](../DESARROLLO-ASISTIDO-IA.md).

## Resumen del trabajo (feat/publico)
**Hecho:** portal ciudadano completo en `site/index.html` + `assets/css/publico.css` + `assets/js/publico/**`.
- Héroe: mapa Leaflet esquemático (río con tramos coloreados por estado, halo de crecida y flujo animado, barrios con relleno + textura por nivel, estaciones con forma/icono/texto, puntos seguros destacados, lluvia y viñeta de alerta) + tarjeta de estado (titular, tendencia, previsión simulada con cuenta regresiva) + "Qué hacer ahora".
- "Tu zona" (selector + detalle en lenguaje simple, medidor, punto seguro más cercano con ruta en el mapa), cifras (4), "Cómo funciona" (ilustraciones SVG propias), pie con `disclaimer`.
- Móvil: titular → previsión → mapa → dock de simulación pegajoso bajo el mapa (no lo tapa) → detalle.
- Accesibilidad: `aria-live` sólo ante cambio de nivel/predicción, foco visible, objetivos ≥ 44 px, `prefers-reduced-motion`.
- Enlace a operadores discreto arriba a la derecha (`target="_blank" rel="noopener"`).
- Mapa creado una sola vez; los marcadores/capas se actualizan por id y sólo cuando cambia el estado.

**Falta / límites:** el mapa del centro (Costanera, Loma Alta, Polideportivo) queda denso en pantallas chicas (se puede hacer zoom). Pruebas visuales hechas con Chrome headless (capturas a 360/768/1440 px); no hay pruebas automatizadas de la vista pública más allá de `tests/`.

## Pedidos al núcleo
1. `outlook.message` cuando el riesgo ya ocurrió (`preAlert=false`, `system.severity >= outlook.severity`) sigue diciendo "Se prevé que el río podría llegar al nivel crítico…". Workaround local: la vista muestra "La situación ya está en curso…". Sugerencia: otro texto en `levels.json → outlook` para ese caso.

## Resolución (integración en main)
- Pedido 1 (texto tras el cruce crítico): resuelto en el núcleo — `system.outlook.ongoing` y `levels.json → ongoing`; el mensaje del motor ya no es prospectivo.
- Se rotularon como ficticios los puntos seguros (`data/map.json`) y se añadió la nota "no es una indicación real de evacuación" en el detalle de "Tu zona".
