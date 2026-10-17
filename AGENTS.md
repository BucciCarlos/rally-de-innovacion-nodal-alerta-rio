# Nodal — reglas para agentes (Codex CLI / Claude Code)

Mockup web **conceptual** (marca: **Nodal**) para el Rally Latinoamericano de Innovación 2026: celulares en desuso como estaciones de monitoreo
hídrico. **Todos los datos y predicciones son sintéticos y deben verse rotulados como simulados.** No es un sistema de alertas real.

## Antes de tocar nada
1. Identificá tu rol por la rama: `git branch --show-current` → `feat/publico` o `feat/operadores`.
2. Leé, en este orden: `docs/CONTRATO-SIMULACION.md` y `docs/agents/<tu-rol>.md` (tu brief, criterios de aceptación y diseño).
3. Corré el sitio: `python3 -m http.server 8000 --directory site` (Windows: `py -m http.server 8000 --directory site`) → http://localhost:8000

## Territorio exclusivo (nadie más edita tus archivos; vos no editás los ajenos)
| Dueño | Archivos |
|---|---|
| **Núcleo** (coordinador, rama `main`) | `site/assets/js/core/**` (incluye `derived.js`), `site/assets/css/{base,fonts,sim-controls}.css`, `site/data/**`, `site/assets/{vendor,fonts}/**`, `site/assets/img/favicon.svg`, `tests/**`, `tools/**`, `docs/**` (salvo `docs/requests/*`), `netlify.toml`, `package.json`, `README.md`, `AGENTS.md`, `CLAUDE.md` |
| **`feat/publico`** | `site/index.html`, `site/assets/css/publico.css`, `site/assets/js/publico/**`, `site/assets/img/publico/**`, `docs/requests/publico.md` |
| **Modo Nodo** (`site/nodo/`) | `site/nodo/**`, `site/assets/css/nodo.css`, `site/assets/js/nodo/**`, `site/assets/img/nodo/**`, `docs/requests/nodo.md` |
| **`feat/operadores`** | `site/operadores/**`, `site/assets/css/operadores.css`, `site/assets/js/operadores/**`, `site/assets/img/operadores/**`, `docs/requests/operadores.md` |

Podés crear archivos nuevos **dentro** de tu territorio. Verificalo con `node tests/check-ownership.mjs <publico|operadores>`.
Si necesitás un cambio en el núcleo (un campo del snapshot, un token de color, un bug): anotalo en tu `docs/requests/<rol>.md`
y usá un workaround local. No edites el núcleo, ni siquiera "un poquito": rompe la integración sin conflictos de merge visibles.

## Reglas innegociables
- Sin backend, sin base de datos, sin autenticación real, sin ML real. No afirmar que existe una IA entrenada: la predicción es una **estimación simulada**.
- Sin CDN ni servicios externos: Leaflet, Chart.js y fuentes ya están en `site/assets/vendor` y `site/assets/fonts`. Sin frameworks (React, Vue…), sin build step.
- Sin notificaciones reales, `Notification`, vibración, sirenas ni llamadas a APIs de terceros. Las alertas son sólo elementos visuales.
- Datos únicamente desde la simulación (`createSimulation()`); no inventes números en tu vista ni dupliques lógica del motor.
- Siempre visible que los datos son simulados (`<span class="sim-badge">Datos simulados</span>` y/o `snap.disclaimer`).
- Colores de nivel siempre desde tokens (`var(--lvl-*)`, `[data-status]`) o `levels[status].color`; nunca hardcodeados. Nunca comuniques el estado sólo con color (texto + icono + forma).
- Español (es-AR) en toda la interfaz. HTML semántico, foco visible, contraste AA, `prefers-reduced-motion`, responsive desde 360 px.
- JavaScript ES modules, legible y modular (archivos de < ~300 líneas, uno por componente). Sin `eval`, sin `innerHTML` con texto no escapado (`escapeHtml`).
- Rutas **relativas** (el sitio puede servirse desde una subruta).

## Flujo de trabajo y Git
- Trabajá solo en tu worktree y tu rama. Commits chicos y frecuentes con mensajes claros (`feat(publico): …`).
- Antes de cada commit importante: `node tests/validate.mjs && node tests/browser-smoke.mjs && node tests/check-ownership.mjs <rol>`.
- Mirá la consola del navegador: cero errores y cero 404 (Network) con la simulación apagada, encendida y en reproducción.
- **No** hagas `merge` a `main`, `push`, ni cambios de rama ajenos. La integración la hace el coordinador. Si `main` avanzó con cambios del núcleo, podés traerlos con `git merge main`.
- Terminá con un commit limpio y escribí en `docs/requests/<rol>.md` un resumen: qué hiciste, qué falta, qué pediste al núcleo.
