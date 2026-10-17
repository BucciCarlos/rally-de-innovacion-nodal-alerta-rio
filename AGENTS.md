# Nodal — guía para agentes de IA

Instrucciones vigentes para quien continúe el desarrollo de Nodal con agentes (Codex CLI, Claude Code u otros). Complementa el [README](README.md); para el contexto del desarrollo original ver [docs/DESARROLLO-ASISTIDO-IA.md](docs/DESARROLLO-ASISTIDO-IA.md).

## El proyecto

Nodal es un **prototipo web conceptual** para el Rally Latinoamericano de Innovación 2026: celulares en desuso como nodos de una red de monitoreo hídrico para anticipar crecidas. Es una aplicación **estática** (HTML, CSS y JavaScript con ES Modules, sin build) publicada en Netlify desde la carpeta `site/`.

Tiene tres vistas que comparten el mismo simulador:

| Vista | Ruta | Archivos |
|---|---|---|
| Portal ciudadano | `/` | `site/index.html`, `site/assets/css/publico.css`, `site/assets/js/publico/` |
| Centro de operaciones | `/operadores/` | `site/operadores/`, `site/assets/css/operadores.css`, `site/assets/js/operadores/` |
| Modo Nodo (celular reutilizado) | `/nodo/` | `site/nodo/`, `site/assets/css/nodo.css`, `site/assets/js/nodo/` |

## Arquitectura y contrato compartido

```
site/data/*.json ─► core/engine.js (puro y determinista: snapshotAt(model, t)) ─► core/simulation.js ─► vistas
                                          core/controller.js: estado compartido y sincronización entre pestañas
                                          (localStorage + BroadcastChannel)
```

- Las vistas **solo** consumen la API pública `createSimulation()` de `site/assets/js/core/simulation.js`; no duplican lógica del motor ni inventan datos. El contrato completo está en [docs/CONTRATO-SIMULACION.md](docs/CONTRATO-SIMULACION.md).
- Código compartido: `site/assets/js/core/`, `site/assets/css/{base,fonts,sim-controls}.css` (tokens de identidad y colores de nivel), `site/data/` y `tools/` (generadores deterministas del mapa y la escenografía ficticia).
- Los colores de nivel viven en `base.css` y en `site/data/levels.json`; una prueba verifica que coincidan. No los dupliques ni los escribas a mano en otra parte.

**Antes de modificar un módulo compartido** (`core/`, `data/`, `base.css`, `sim-controls.css`) considerá su impacto en las **tres** vistas y en la sincronización entre pestañas, actualizá el contrato y las pruebas, y verificá cada vista en el navegador.

## Reglas que no deben romperse

- **Todos los datos son simulados** y deben verse rotulados como tales (`.sim-badge` y `snap.disclaimer`). Una predicción es una *estimación simulada*.
- **No atribuyas capacidades reales que no existen.** No hay sensores desplegados, red LoRa física, backend, base de datos, autenticación ni modelo de IA o *machine learning* entrenado. El magnetómetro + flotador + imán es experimental y sin calibración validada; el acelerómetro y el giroscopio no miden crecidas. No presentes los retardos de propagación como calibración hidrológica.
- **Sin efectos externos:** ninguna notificación real, `Notification`, vibración, sirena ni llamada a servicios de terceros. Las alertas y sirenas son solo elementos visuales.
- **Seguridad:** sin credenciales, tokens ni secretos en el repositorio; sin CDN (Leaflet, Chart.js y fuentes están en `site/assets/`); sin `eval`; escapá el texto dinámico (`escapeHtml`) antes de usar `innerHTML`.
- Sin frameworks, dependencias nuevas ni proceso de compilación salvo decisión explícita. Rutas **relativas** (el sitio puede servirse desde una subruta).
- Interfaz en español (es-AR), accesible (HTML semántico, foco visible, contraste AA, `prefers-reduced-motion`) y responsive desde 360 px. No comuniques un estado solo con color.
- Las zonas, puntos seguros y rutas del mapa son ficticios: no deben poder confundirse con indicaciones reales de evacuación.

## Cómo ejecutar y probar

```bash
python3 -m http.server 8000 --directory site   # Windows: py -m http.server 8000 --directory site
node tests/validate.mjs                        # datos, motor, sincronización simulada, sintaxis y rutas
node tests/browser-smoke.mjs                   # las tres vistas sincronizadas en Chrome/Chromium (CHROME_BIN opcional)
```

Los scripts de `package.json` (`npm run serve`, `test`, `test:browser`, `test:all`) hacen lo mismo. Si agregás comportamiento, agregá o ajustá la prueba correspondiente y **no modifiques una prueba solo para ocultar un fallo**. Antes de dar un cambio por terminado, revisá en el navegador a 360, 768 y 1440 px, con la simulación apagada, en reproducción, en t=130 (predicción anticipada) y t=249 (alerta roja), sin errores de consola ni recursos 404.

`tests/check-ownership.mjs` es una utilidad de la fase multiagente inicial (verifica que una rama solo toque los archivos de su vista); sigue disponible pero ya no es obligatoria.

## Cambios y commits

- Cambios acotados y coherentes con el estilo del código existente; módulos pequeños y legibles.
- Mensajes de commit claros, en el formato `tipo(ámbito): descripción` (por ejemplo `fix(publico): …`, `feat(mapas): …`, `docs: …`), explicando el motivo del cambio.
- Corré las pruebas antes de cada commit. No hagas `push` ni cambios destructivos (`reset --hard`, `push --force`, reescritura de historial) sin una instrucción explícita.
- Documentá los cambios relevantes en `docs/` y mantené el README fiel a lo implementado.

## Documentación histórica

`docs/agents/`, `docs/requests/` e `docs/INTEGRACION.md` conservan el registro de la fase de desarrollo multiagente (ramas `feat/publico` y `feat/operadores`, worktrees y briefs). Son material de consulta de una fase concluida, no instrucciones vigentes.
