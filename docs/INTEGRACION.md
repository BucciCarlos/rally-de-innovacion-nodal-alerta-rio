# Integración y auditoría final

> **Documentación histórica.** Registro de las integraciones, auditorías y correcciones realizadas durante el desarrollo, en orden cronológico. Los nombres de ramas y commits corresponden a ese proceso; el estado vigente del proyecto está en el [README](../README.md) y en [AGENTS.md](../AGENTS.md). Contexto: [DESARROLLO-ASISTIDO-IA.md](DESARROLLO-ASISTIDO-IA.md).

Merges en `main` (historial preservado): `feat/publico` (86f07fe) y `feat/operadores` (2cf0855) sobre la base 71df203. Territorios disjuntos: sin conflictos.

## Auditoría con navegador real (Chrome, dos pestañas del mismo contexto/origen)
- Control compartido: activar/desactivar, play/pausa, ±10 min, slider (ratón y teclado Home/End), velocidad, reinicio — bidireccional pública ↔ operadores, 0 desajustes de reloj.
- Persistencia al recargar cualquiera de las dos pestañas; reproducción completa a ×8 hasta 00:00 con estados NORMAL → VIGILANCIA → ALERTA NARANJA → ALERTA ROJA; marcadores y capas Leaflet estables (sin fugas).
- Minutos recorridos: 0, 64, 127, 130, 141, 200, 228, 249, 360. En t=130 ambas vistas muestran "posible nivel crítico … en aprox. 1 h 58 min (estimación simulada)" con el estado aún en vigilancia; en t=249 ambas muestran alerta roja.
- Dispositivos: E2 batería media→baja→crítica; E5 señal débil (150) → sin conexión (200–228) → restablecida; E6 sensor degradado.
- Consola: 0 errores/avisos, 0 recursos 404, enlace a operadores `target=_blank rel=noopener`. Verificado también servido desde una subruta (`/sub/`).
- 360 / 768 / 1440 px: sin desbordes horizontales; capturas revisadas en base, t=130 y t=249.

## Defectos corregidos
Texto prospectivo tras el cruce crítico · `sinceT` nulo en alertas de predicción/dispositivo · contraste del verde de nivel normal (3,45 → 4,69:1) · favicon.ico 404 · ticks solapados del gráfico · puntos seguros sin rotular como ficticios.

## Pendientes menores
- Mapa público denso alrededor de Costanera/Loma Alta (etiquetas de zona parcialmente tapadas por marcadores).
- Operadores selecciona E1 por defecto (no la estación crítica) hasta que el usuario elige otra.

---

# Fase Nodal: marca + Modo Nodo (tercera vista)

- **Marca:** «Nodal» en títulos, cabeceras, pie y metadatos de las tres vistas (nuevo isotipo de red de nodos en SVG, favicon actualizado). Se conservaron claves internas (`alertaRio.sim.v1`, `alerta-rio-sim`), rutas, carpetas, worktrees e historial.
- **Modo Nodo (`/nodo/`)**: pantalla de celular Android reutilizado (marco centrado en escritorio, a pantalla completa en móvil) con identidad/estado, nivel + magnetómetro (experimental, sin calibración), acelerómetro/giroscopio, energía y transmisión LoRa (conceptual). Usa `createSimulation()` y el widget compartido; telemetría extra determinista en `js/nodo/telemetry.js`.
- **Núcleo:** `core/derived.js` (enlace LoRa, red, sirenas conceptuales). El motor no se modificó en esta fase. Etiquetas de sensores actualizadas en `data/stations.json` (nivel = flotador + imán/magnetómetro; movimiento = acelerómetro y giroscopio).
- **Operadores:** «Ver nodo ↗» (otra pestaña) y bloque compacto «Red LoRa · Gateway» + «Sirenas barriales simuladas» dentro de «Salud de la red».
- **Pública:** sólo marca y un enlace secundario al Modo Nodo en «Cómo funciona». Sin paneles técnicos.
- **Pruebas:** `validate.mjs` 66/66 (derivados, telemetría determinista, marca); `browser-smoke.mjs` 13/13 con tres vistas sincronizadas; auditoría con tres pestañas reales de Chrome (activar/play/pausa/retroceso/slider/velocidad/recarga, minutos 0–360, E5 sin enlace, E2 batería crítica, sirena activa a t=260), sin errores de consola ni 404, sin desbordes a 360/768/1440 px.

---

# Fase de coherencia y cartografía

- **Propagación (datos):** `riverKm` = distancia acumulada sobre la geometría (0; 8,0; 16,4; 24,9; 32,7; 39,6 km); `lagMin` E1/E2/E3 = −100/−70/−35; umbrales de vigilancia/naranja de E1–E3 recalibrados para conservar los tiempos de alerta; `baselineT` = −120. Celeridad conceptual ≈ 3,8–4,4 m/s entre estaciones (no es una calibración; ver `docs/PROPAGACION.md`). Predicción en t≈127 y alerta roja de E4 en t≈249 sin cambios; motor intacto.
- **Cartografía:** `data/scenery.json` + `core/scenery.js`: uso del suelo (campos, monte, huellas urbanas), vegetación ribereña, calles, rutas, caminos rurales (sólo operadores), costanera, plazas/parques y 4 puentes (E3 y E4 sobre los suyos). ≈ 25 elementos SVG; sin cambios en río, zonas, estaciones ni simulador.
- **Pruebas:** `validate.mjs` 78/78 (incluye propagación, escenografía al día, límites, presupuesto, puentes, y que nada cubra estaciones/zonas).
