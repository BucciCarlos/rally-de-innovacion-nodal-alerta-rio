# Desarrollo asistido por IA

Este documento explica cómo se construyó el prototipo de Nodal con agentes de inteligencia artificial y dónde encontrar el registro del proceso. No es publicidad de herramientas: describe un método de trabajo y sus límites.

## Herramientas y alcance

Se utilizaron **Claude Code** y **Codex CLI** como asistentes de programación. Trabajaron sobre un repositorio Git local, con dirección y revisión humanas. Las decisiones de alcance, nombre, diseño, publicación y qué funcionalidades descartar fueron humanas.

La IA se usó **como herramienta de desarrollo**. El prototipo **no incluye ningún modelo de IA predictiva entrenado**; esa sería, en todo caso, una capacidad futura de Nodal, con datos hidrológicos y meteorológicos reales (ver el [README](../README.md#estado-del-proyecto)).

## Cómo se organizó el trabajo

1. **Coordinación inicial.** Un agente coordinador definió la arquitectura mínima, el [contrato de simulación](CONTRATO-SIMULACION.md) (API y estructura de los datos), los datos sintéticos, el motor determinista y las pruebas. Con eso quedó una base ejecutable en `main`.
2. **Trabajo paralelo con Git worktrees.** Se crearon dos ramas, cada una en su propio worktree: `feat/publico` (portal ciudadano, desarrollado con Claude Code) y `feat/operadores` (centro de operaciones, desarrollado con Codex CLI). Cada agente recibió un brief con objetivos, criterios de aceptación y los archivos que podía modificar, de modo que no hubiera dos agentes sobre el mismo archivo.
3. **Coordinación por contrato.** Las vistas solo consumían la API pública del simulador. Si un agente necesitaba un cambio en el núcleo compartido, lo registraba como pedido en `docs/requests/` y trabajaba con una solución local mientras el coordinador lo resolvía. Una utilidad (`tests/check-ownership.mjs`) verificaba que cada rama tocara solo sus archivos.
4. **Integración y auditoría.** El coordinador integró ambas ramas en `main` con merges convencionales, ejecutó las pruebas automatizadas y auditó las vistas en un navegador real: sincronización entre pestañas, momentos clave del escenario (por ejemplo la predicción anticipada y la alerta roja), responsive y errores de consola. Esa auditoría encontró y corrigió defectos concretos (contraste, textos, favicon, entre otros).
5. **Ampliaciones posteriores.** Sobre la base integrada se incorporaron la marca Nodal, la tercera vista (Modo Nodo), la red LoRa y las sirenas simuladas en el centro de operaciones, una revisión de coherencia de distancias y propagación, una capa de escenografía cartográfica y refinamientos visuales. Cada etapa se planificó, se verificó con pruebas y se revisó antes de publicarse.

## Pruebas y revisión

- `tests/validate.mjs` comprueba datos, determinismo del motor, secuencia de alertas, anticipación de la predicción, sincronización (simulada), sintaxis y rutas.
- `tests/browser-smoke.mjs` abre las tres vistas en Chrome o Chromium sin interfaz y verifica que la simulación se sincronice.
- Las auditorías manuales con un navegador real complementan lo anterior; no sustituyen una validación independiente.

## Límites y transparencia

- Los agentes cometen errores; por eso se exigieron pruebas, mediciones en el navegador y revisión humana antes de dar cada etapa por terminada.
- El código generado no ha sido evaluado por terceros. Esto es un prototipo de demostración, no un sistema de alertas real.
- Las predicciones, mediciones y alertas son sintéticas, y los mecanismos de sensado y comunicación (magnetómetro, LoRa) son conceptuales.

## Documentación histórica del proceso

Se conserva como registro de una fase concluida. Los briefs y las instrucciones de arranque **no son pautas vigentes**; las reglas actuales están en [AGENTS.md](../AGENTS.md).

- [`docs/agents/`](agents/): briefs de cada vista e instrucciones de arranque de los agentes.
- [`docs/requests/`](requests/): informes de cada agente y pedidos al núcleo.
- [`docs/INTEGRACION.md`](INTEGRACION.md): registro de la integración, las auditorías y las correcciones.
