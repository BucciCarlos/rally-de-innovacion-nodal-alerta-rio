# Brief — Vista pública (`feat/publico`)

> **Documentación histórica.** Corresponde a la fase de desarrollo multiagente inicial (ya concluida): las ramas, los worktrees y las rutas locales que se mencionan fueron propios de ese proceso. No son instrucciones vigentes; las reglas actuales están en [AGENTS.md](../../AGENTS.md) y el contexto en [DESARROLLO-ASISTIDO-IA.md](../DESARROLLO-ASISTIDO-IA.md).

Leé primero `AGENTS.md` y `docs/CONTRATO-SIMULACION.md`. Ya existe una base ejecutable con un **placeholder** que debés reemplazar.

## Tu territorio
`site/index.html` · `site/assets/css/publico.css` · `site/assets/js/publico/**` · `site/assets/img/publico/**` · `docs/requests/publico.md`

Podés dividir el JS en módulos (`map.js`, `banner.js`, `advice.js`, …) dentro de `site/assets/js/publico/`. Punto de entrada: `main.js` (ya referenciado por `index.html`).

## Qué construir
La **pantalla principal** del proyecto: un portal ciudadano moderno, limpio, accesible y responsive. Protagonistas: **el mapa del río** y **las alertas**.
Un ciudadano sin conocimientos técnicos debe entender en 3 segundos: *¿hay peligro?, ¿qué tan grave?, ¿qué hago?*

### Contenido
1. **Mapa protagonista** (Leaflet, `site/assets/vendor/leaflet`): ocupa la mayor parte del primer pantallazo (full-bleed o casi).
   - Río dibujado con `data.map.river.path`; cada tramo (`snap.riverSegments`) coloreado por su estado (slice `path.slice(from, to+1)`).
   - Zonas de barrios (`data.map.zones[i].polygon` + `snap.zones[i].status`) como relleno translúcido que cambia con el estado.
   - Estaciones como indicadores de color grandes y legibles (nombre corto, estado con texto/icono además del color); las alertadas con pulso sutil.
   - Puntos de referencia (`data.map.landmarks`): puentes, hospital, bomberos y **puntos seguros** (resaltalos: "dónde ir").
   - Mapa esquemático sin teselas (el fondo es tuyo: agua, tierra, retícula sutil). `map.fitBounds(data.map.bounds)`; sin controles de zoom invasivos en móvil.
2. **Banner de estado** superpuesto o contiguo al mapa: nivel actual enorme (`snap.system.level.headline`, etiqueta, icono, color), tendencia ("El río está subiendo / estable / bajando"),
   y la **previsión** (`snap.system.outlook.message`; si `preAlert` es true, hacela inconfundible: "Predicción simulada: …").
3. **Recomendaciones** (`snap.system.level.recommendations`): 3 acciones claras, con iconos, que cambian con el nivel.
4. **Tu zona**: lista/selector simple de zonas con su estado ("Costanera Villa Serena — Alerta naranja"). Opcional: clic en una zona/estación → panel con nivel actual en lenguaje simple, sin jerga.
5. **Estado actual en pocas cifras** (máx. 3–4): nivel del río en la estación crítica, tendencia, lluvia (`weather.condition`), hora de la última actualización (`snap.clock`).
   No saturar con métricas técnicas: eso es de la vista de operadores.
6. **Cómo funciona** (breve, bajo el pliegue): celulares reutilizados → estaciones → centro de análisis → alerta. Una ilustración simple (SVG propio).
7. **Pie**: `snap.disclaimer` visible + sello "Datos simulados" en la cabecera.
8. **Acceso a operadores**: enlace **discreto** arriba a la derecha: `<a href="operadores/" target="_blank" rel="noopener">`. Nunca en el cuerpo principal.
9. **Control de simulación**: montá `mountSimControls(el, sim, {variant:'dock'|'inline'})` (pequeño y discreto; ya implementado). Podés cambiar su ubicación y ajustar sus variables `--simctl-*` en tu CSS.

### Estados a cuidar
- **Simulación apagada (`snap.mode === 'baseline'`)**: tiene que verse presentable y completa (río normal). Una pista sutil: "Activá la simulación para ver un escenario de crecida".
- **Transiciones** (normal → vigilancia → naranja → roja): animá suavemente colores y banner. En alerta roja el banner domina la pantalla (contraste fuerte, texto grande). `aria-live="polite"` para anunciar cambios de nivel (no en cada tick).
- **Predicción**: antes de la alerta roja el usuario debe ver la advertencia anticipada (~min 127).
- Sin JS / error de carga: mensaje claro (ya hay un patrón en el placeholder).

## Dirección de diseño
- Identidad compartida con operadores: tokens de `base.css` (azul noche `--ar-ink`, agua `--ar-water`, niveles `--lvl-*`), tipografías **Bricolage Grotesque** (titulares, carácter) + **Inter** (texto). No uses otras fuentes.
- Evitá el "dashboard de tarjetas": jerarquía fuerte, mucho aire, una sola idea dominante por pantalla, el mapa como héroe. Alertas grandes (mín. ~48 px de alto de línea en el titular en escritorio).
- Microinteracciones con propósito: pulso en estaciones alertadas, transición de color del río, contador de ETA, hover/focus en zonas. Todo respeta `prefers-reduced-motion`.
- Accesibilidad: contraste AA (el texto sobre `--st` usa `--st-ink`), no depender sólo del color (icono + texto + patrón), objetivos táctiles ≥ 44 px, foco visible, orden de lectura lógico, `lang="es"`.
- Responsive: probá 360, 768 y 1440 px. En móvil: mapa arriba (≈55 vh), banner debajo/encima sin tapar el mapa, dock de simulación compacto.

## Criterios de aceptación (definición de "hecho")
- [ ] Con simulación apagada: pantalla completa, atractiva, sin errores ni 404 en consola.
- [ ] Reproduciendo el escenario de 6 h: mapa, colores, banner, recomendaciones y previsión se actualizan sin parpadeos ni fugas (no recrear mapas/marcadores en cada tick).
- [ ] Se ve el sello de "datos simulados" y la advertencia anticipada de nivel crítico antes de la alerta roja.
- [ ] El enlace a operadores abre `operadores/` en otra pestaña y ambas se sincronizan (probalo: `node tests/browser-smoke.mjs`).
- [ ] Teclado completo, lector de pantalla razonable, 360 px sin scroll horizontal.
- [ ] `node tests/validate.mjs`, `node tests/browser-smoke.mjs` y `node tests/check-ownership.mjs publico` en verde.

## Receta rápida (Leaflet sin teselas)
```js
const map = L.map(el, { zoomControl: false, attributionControl: false, zoomSnap: 0.25, maxBounds: L.latLngBounds(data.map.bounds).pad(0.2) });
map.fitBounds(data.map.bounds);
const segLayers = data.map.river.segments.map(sg => L.polyline(data.map.river.path.slice(sg.from, sg.to + 1), { weight: 10, lineCap: 'round' }).addTo(map));
// en cada snapshot: segLayers[i].setStyle({ color: levels[snap.riverSegments[i].status].color });
```
`L` es global (cargá `assets/vendor/leaflet/leaflet.js` con un `<script>` clásico antes del módulo).
