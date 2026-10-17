# Contrato de la simulación

Única fuente de verdad para las tres vistas (portal ciudadano, centro de operaciones y Modo Nodo). **Todo es sintético**: no hay datos reales, ni modelo de IA, ni notificaciones.
Implementación: `site/assets/js/core/` (módulos compartidos: modificarlos afecta a las tres vistas).

## 1. Cómo se usa (3 líneas)

```js
import { createSimulation } from '../core/simulation.js';      // ruta relativa a tu archivo
import { mountSimControls } from '../core/sim-controls.js';    // widget compartido (opcional pero recomendado)

const sim = await createSimulation();                          // carga site/data/*.json (ruta relativa al módulo)
mountSimControls(document.getElementById('sim-slot'), sim, { variant: 'dock' }); // o 'inline'
const off = sim.subscribe((snap, reason) => render(snap));     // se llama al instante (reason 'init') y en cada cambio
```

Requiere `<link rel="stylesheet" href=".../assets/css/base.css">` y `.../sim-controls.css`, y `<script type="module">`.
`await` en el nivel superior de un módulo funciona en todos los navegadores actuales.

## 2. Modos

| `snap.mode` | Cuándo | `snap.t` |
|---|---|---|
| `baseline` | Simulación apagada (estado inicial presentable: río normal, previo a la lluvia) | `timeline.baselineT` (−120) |
| `simulation` | Simulación activada | 0 … 360 (minutos del escenario) |

La simulación **siempre arranca apagada**. Al activarla se coloca en t=0 y en pausa. Al llegar a 360 se detiene (`sim.ended`);
`play()` desde el final reinicia en 0. Apagarla vuelve al estado `baseline` en ambas pestañas.

## 3. API de `createSimulation()`

| Miembro | Descripción |
|---|---|
| `getSnapshot()` | Snapshot del instante actual (§4). |
| `subscribe(fn, {immediate=true})` | `fn(snapshot, reason)` → devuelve `unsubscribe()`. `reason`: `init tick play pause seek step reset speed enable disable remote`. |
| `getState()` | `{enabled, playing, ended, speed, speeds, stepMin, t, min, max, baselineT, rev, origin}` |
| `enable() disable() toggleEnabled()` | Activa/desactiva el modo simulación. |
| `play() pause() togglePlay()` | Reproducción. |
| `seek(t, {pause=false})` | Salta al minuto `t` (0…360). |
| `step(dMin)` `stepForward()` `stepBack()` | Salta ±`stepMin` (10) y pausa. |
| `reset()` | t=0 y pausa. |
| `setSpeed(v)` | `v` ∈ `timeline.speeds` = `[1,2,4,8]` minutos de escenario por segundo real (por defecto 2 → el escenario dura 3 min). |
| `snapshotAt(t)` | Snapshot de un minuto cualquiera **sin** alterar el estado compartido (vistas previas, miniaturas). |
| `timeline` | `{min,max,stepMin,baselineT,speeds,defaultSpeed,startClock,markers[]}`; `markers`: `{t,kind:'status'|'forecast',severity,status,label}`. |
| `levels` | Contenido de `data/levels.json → levels` (etiquetas, colores, recomendaciones). |
| `data` | `{scenario, stations, levels, map}` JSON crudos (geometría del mapa en `data.map`). |
| `allEvents` | Todos los eventos del escenario (para depurar). |

`subscribe` se dispara cada ~200 ms mientras se reproduce. **Renderizá de forma incremental**: actualizá marcadores de Leaflet por id
(`marker.setStyle/setIcon`), usá `chart.update('none')` en Chart.js y evitá reconstruir el DOM entero en cada tick.

## 4. Snapshot (`snap`)

```
snap = {
  v: 1, simulated: true, disclaimer: "DEMOSTRACIÓN CONCEPTUAL…",
  mode: 'baseline'|'simulation',
  t,                       // minutos de escenario (puede ser < 0 en baseline)
  progress,                // 0..1 sobre 360 min
  clock: "20:10", dayOffset: 0|1, elapsedLabel: "+2 h 10 min",
  duration: 360,
  sim: { …getState() },

  system: {
    status: 'normal'|'vigilancia'|'naranja'|'roja', severity: 0..3,
    level: { label, headline, citizen, recommendations[], operator, color, ink, icon },   // levels.json
    focusStationId, focusStationName,   // estación más comprometida
    trend: 'rising'|'steady'|'falling', rateCmH,
    counts: { normal, vigilancia, naranja, roja },   // nº de estaciones por estado
    outlook: {                          // PREDICCIÓN SIMULADA a ≤120 min
      simulated: true, key: 'calm'|'rising'|'warning'|'critical', label, message,
      preAlert: bool,                   // true = se anticipa un riesgo ANTES de que ocurra
      severity, status, stationId|null, etaMin|null, confidence|null (0..1), confidenceLabel: 'baja'|'media'|'alta'|null, windowMin,
      ongoing: bool                      // true = el umbral ya se alcanzó; `message` deja de ser prospectivo
    }
  },

  weather: { simulated, condition, rainMmH, rain3hMm, rainNext6hMm, pressureHpa, windKmh, tempC },

  stations: [{
    id:'E1'…'E6', order, name, short, role, riverKm, lat, lng,
    status, severity, level (m), unit:'m', stale (sin conexión: última lectura),
    rateCmH, trend, rainMmH,
    thresholds: { vigilancia, naranja, roja },        // metros
    fill,                                              // 0..1 = base → umbral rojo (>1 si lo supera)
    history:  [{ t, level|null, rainMmH }],           // hasta 6 h hacia atrás, paso 10 min; level=null = hueco por corte
    forecast: { simulated, horizonMin:180, issuedAtT, evidence, points:[{dtMin,level,low,high}] (paso 15),
                etaMin:{vigilancia,naranja,roja} (min o null), peakLevel, predictedSeverity, predictedStatus,
                confidence, confidenceLabel },
    device: { simulated, model, battery (%), batteryState:'ok'|'media'|'baja'|'critica',
              connectivity:'online'|'degraded'|'offline', signalDbm|null, lastSeenMin,
              sensors:[{id,label,status:'ok'|'degraded'|'offline',note}], health:'ok'|'atencion'|'falla' }
  }],

  riverSegments: [{ id, from, to, stationIds, severity, status }],  // índices sobre data.map.river.path (slice(from,to+1))
  zones:  [{ id, name, kind, note, stationId, severity, status }],   // polígonos en data.map.zones[i].polygon
  alerts: [{ id, kind:'level'|'forecast'|'device', stationId, severity, status|null, sinceT (min en que empezó), title, detail }], // activas, más graves primero
  events: [{ id, t, clock, dayOffset, type:'level'|'forecast'|'device'|'weather'|'system'|'operator',
             stationId?, severity, status?, title, detail, simulated:true }]   // t ≤ ahora, el más nuevo primero
}
```

Reglas de consumo:

- **Colores**: usá `snap.system.level.color`, `snap.stations[i].status` + `levels[status].color` (para Leaflet/Chart.js) o `[data-status]` + `var(--st)` (CSS).
  No hardcodees colores de nivel: están en `base.css` y `levels.json` (validados por `tests/`).
- **Mapa**: `data.map` = `{center, zoom, bounds, tiles, river:{path[[lat,lng]…], segments}, zones, landmarks}`. Geografía ficticia y esquemática;
  `tiles.enabled=false` por defecto (funciona sin Internet). No actives teselas reales salvo como extra opcional claramente rotulado.
- **Etiquetado obligatorio**: toda pantalla debe mostrar de forma visible que los datos son simulados (`.sim-badge` de `base.css`
  y/o `snap.disclaimer`). Los textos de predicción deben decir "simulada"/"estimación simulada".
- **Cero efectos externos**: prohibido `fetch` a servicios externos, notificaciones del navegador, `navigator.vibrate`, sirenas reales, WebSockets, etc.
  Una "notificación" es sólo un elemento visual en la página.
- **Formato**: usá `core/format.js` (`fmtLevel`, `fmtRate`, `fmtEta`, `TREND`, `escapeHtml`, `levelColor`…). Escapá todo texto con `escapeHtml` si usás `innerHTML`.

## 5. Escenario (resumen de `site/data/scenario.json`)

Seis horas (360 min, reloj 18:00 → 00:00), lluvia creciente y río en ascenso progresivo. Estación crítica: **E4 Costanera Villa Serena**.

| Minuto | Hito |
|---|---|
| 0 | Normal. Lluvias iniciales en la cuenca |
| ~31 | Predicción simulada: riesgo de alerta naranja (sistema aún en normal) |
| ~64 | **Vigilancia** (E1 Paso Alto) |
| ~127 | **Predicción simulada: riesgo de nivel crítico en E4** (~2 h de anticipación) |
| ~141 | **Alerta naranja** (E1) · E4 naranja ~170 |
| 150–228 | E5 Molino: señal débil y luego corte de conectividad (lectura congelada) |
| ~249 | **Alerta roja** (E4) |
| ~335 | E5 también en rojo; E6 en naranja ~338 |

`node tests/validate.mjs` comprueba que la predicción llega ≥60 min antes de la alerta roja, que la severidad no parpadea y que el escenario es determinista.

## 6. Sincronización entre pestañas

Estado compartido (JSON) en `localStorage['alertaRio.sim.v1']` y mensajes por `BroadcastChannel('alerta-rio-sim')`:

```
{ v:1, rev, origin, updatedAt, enabled, playing, speed, t, anchorWall }
```

- El tiempo **no** se transmite por tick: cada pestaña calcula `t = t_ancla + (Date.now()-anchorWall)/1000·speed`. Sólo se escribe al actuar.
- `rev` creciente; gana la mayor (empate → `updatedAt` más reciente). Una pestaña nueva pide el estado (`hello`) y se alinea.
- `storage` event como respaldo si `BroadcastChannel` no existe. Con `localStorage` bloqueado cada pestaña funciona por separado (sin romper).
- Abrí la vista de operadores con `<a href="operadores/" target="_blank" rel="noopener">`: ambas comparten origen, así que se sincronizan.

## 7. Derivados conceptuales (`core/derived.js`)

Funciones puras sobre el snapshot (no tocan el motor): `loraLink(station)` → `{state:'activo'|'debil'|'sin-enlace', rssi, snr, sf}`,
`networkSummary(snap)` → nodos + gateway + estado de la red, `sirens(snap, data.map)` → sirenas barriales con estado `reposo|advertencia|activa`
(según la severidad de su zona: naranja → advertencia, roja → activación **conceptual**). Todo es visual: nada se envía ni se activa.
La telemetría adicional del Modo Nodo (µT, inclinación, vibración, solar, paquetes) vive en `site/assets/js/nodo/telemetry.js` y es determinista
(función del tiempo y del snapshot); ver `docs/NODO.md`.

## 8. Escenografía territorial (`data/scenery.json`, opcional)

Capa **solo visual** y ficticia, generada de forma determinista por `tools/gen-scenery.mjs` a partir de `data/map.json` (no altera río, estaciones ni zonas):
`landcover` (`urban`, `farmland`, `forest`, `riparian`), `parks`, `roads` (`main`, `secondary`, `coast`, `streets`, `tracks`) y `bridges` (4; E3 y E4 siguen sobre sus puentes).
Se carga como dato opcional (`sim.data.scenery`; si falta, los mapas funcionan igual) y se dibuja con `core/scenery.js → addScenery(L, map, scenery, {detail:'public'|'ops'})`
**antes** de crear río y zonas; cada vista le da su estilo por CSS (clases `sc-*`): pública clara y de bajo contraste, operadores apagada y con caminos rurales. Sin etiquetas ni interacción.

## 9. Cambios al contrato

Los módulos compartidos (`core/`, `data/`, `base.css`, `sim-controls.css`) son la base común de las tres vistas. Antes de cambiarlos:
evaluá el impacto en cada vista y en la sincronización entre pestañas, actualizá este documento y las pruebas (`tests/validate.mjs`),
y verificá las tres rutas en el navegador. Mantené la compatibilidad de la API y de los campos del snapshot salvo que el cambio sea deliberado y esté documentado.
