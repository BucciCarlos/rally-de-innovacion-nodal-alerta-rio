@AGENTS.md

# Notas específicas para Claude Code

- Las reglas del proyecto están en `AGENTS.md` (importado arriba); el contrato de simulación, en `docs/CONTRATO-SIMULACION.md`.
- Explorá antes de editar: leé los archivos reales (por ejemplo `site/assets/js/core/simulation.js`) en lugar de suponer cómo funciona el contrato. Usá las herramientas dedicadas de lectura y edición en vez de comandos de shell equivalentes.
- Para cambios que toquen módulos compartidos (`core/`, `data/`, `base.css`, `sim-controls.css`) planificá primero el impacto en las tres vistas y en la sincronización.
- Para ver el resultado en el navegador servís el sitio con `python3 -m http.server 8000 --directory site` (o `npm run serve`) y verificás a 360, 768 y 1440 px. La skill `run` puede ayudar a lanzar y comprobar la aplicación.
- Antes de cerrar una tarea corré `node tests/validate.mjs` y `node tests/browser-smoke.mjs` e informá los resultados tal cual, incluidos los fallos.
- No hagas `push`, force push ni cambios destructivos salvo petición explícita. No presentes capacidades inexistentes (red LoRa física, modelo de IA entrenado, calibración validada).
