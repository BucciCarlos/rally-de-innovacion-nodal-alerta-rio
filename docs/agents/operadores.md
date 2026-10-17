# Brief — Vista de operadores (`feat/operadores`)

Leé primero `AGENTS.md` y `docs/CONTRATO-SIMULACION.md`. Ya existe una base ejecutable con un **placeholder** que debés reemplazar.

## Tu territorio
`site/operadores/**` (empezando por `index.html`) · `site/assets/css/operadores.css` · `site/assets/js/operadores/**` · `site/assets/img/operadores/**` · `docs/requests/operadores.md`

Dividí el JS en módulos (`map.js`, `stations.js`, `charts.js`, `alerts.js`, `devices.js`, `eventlog.js`, …). Punto de entrada: `site/assets/js/operadores/main.js`.
Usá rutas relativas desde `site/operadores/`: `../assets/...` (así funciona en cualquier subruta y en Netlify).

## Qué construir
Dashboard técnico con estética de **centro de operaciones** (Defensa Civil, Bomberos, organismos especializados). Denso pero ordenado; el operador debe
detectar en un vistazo *qué está pasando, dónde, qué se espera y qué dispositivos fallan*. Se abre en **otra pestaña** desde la vista pública y comparte la simulación en vivo.

### Módulos
1. **Barra superior**: nombre, estado global (chip con color + texto), reloj del escenario (`snap.clock`, `elapsedLabel`), sello "Datos simulados", contador de estaciones por estado (`system.counts`), control de simulación compartido (`mountSimControls`, variante `inline` en la barra o `dock`).
2. **Mapa interactivo** (Leaflet, esquemático, tema oscuro): río por tramos coloreados, zonas, estaciones con marcador por estado (anillo de predicción si `forecast.predictedSeverity > severity`), puntos de referencia (hospital, bomberos, refugios). Clic en estación = selección global (panel de detalle, gráficos, dispositivos).
3. **Panel de estación seleccionada**: nivel, tendencia/tasa (cm/h), lluvia local, umbrales, ETA a vigilancia/naranja/roja del pronóstico, confianza (`forecast.confidenceLabel`, siempre rotulada "simulada").
4. **Gráficos (Chart.js, `site/assets/vendor/chartjs/chart.umd.js`)**:
   - Serie histórica de nivel (`station.history`, `null` = hueco por corte → `spanGaps:false`) + **pronóstico simulado** (`forecast.points`: línea punteada + banda `low/high`) con líneas horizontales de umbral (vigilancia/naranja/roja con sus colores) y marca del "ahora".
   - Comparador de todas las estaciones (nivel normalizado `fill`) y/o lluvia (`rainMmH`). Máx. 3 gráficos; sin gráficos decorativos.
   - Actualizá con `chart.update('none')`; nada de recrear charts por tick.
5. **Alertas activas** (`snap.alerts`): lista ordenada por gravedad, con tipo (nivel / predicción / dispositivo), estación, "desde" (`sinceT` → hora) y acción sugerida del nivel (`system.level.operator`). La alerta de predicción (`kind:'forecast'`) debe destacar.
6. **Registro de eventos** (`snap.events`): cronología con hora, tipo, estación, severidad; filtros por tipo/estación; se llena al avanzar la línea temporal y se vacía al retroceder (los eventos son función de `t`).
7. **Estado de dispositivos** (`station.device`): batería (barra + %), conectividad (`online/degraded/offline`, dBm, `lastSeenMin`), sensores (`ok/degraded/offline`), salud global (`health`). Resalta E2 (batería), E5 (corte ~min 200–228), E6 (sensor degradado).
8. **Zonas expuestas** (`snap.zones`): listado con estado.
9. **Meteo** (`snap.weather`): lluvia actual/acumulada/prevista, viento, presión (compacto).

### Interacciones
- Selección de estación única y sincronizada (mapa ↔ lista ↔ gráficos ↔ dispositivos). Persistí la selección en `location.hash` (`#E4`).
- Teclado: navegación por lista de estaciones, foco visible; atajos opcionales (espacio = play/pausa cuando el foco no está en un input) documentados en la UI.
- Cuando cambia el nivel de una estación o aparece una predicción: resaltado sutil (parpadeo corto del chip / entrada animada en alertas). Sin sonidos, sin notificaciones del navegador.

### Estados a cuidar
- **Simulación apagada (`mode:'baseline'`)**: dashboard completo con datos normales y un aviso discreto: "Estado base — activá la simulación". Los gráficos muestran historial previo (t<0) sin pronóstico alarmante.
- **Estación sin conexión (`stale:true`)**: mostrar "última lectura hace X min", valor atenuado y hueco en el gráfico.
- Retroceder/avanzar en la línea temporal debe actualizar todo coherentemente (mapa, métricas, gráficos, alertas, eventos).

## Dirección de diseño
- Mismo ADN visual que la vista pública (tokens `base.css`, Bricolage Grotesque + Inter) pero tema oscuro "sala de control": fondo `--ar-ink`, superficies translúcidas, bordes finos, números en `--font-mono`/tabulares.
- Jerarquía: estado global > alertas/predicción > mapa > detalle de estación > registro. Evitá una grilla uniforme de tarjetas idénticas: variá escala, usá paneles con propósito (rail lateral, mapa dominante, franja inferior de gráficos).
- Color sólo con significado (niveles + estados de dispositivo `--dev-*`); texto/iconos siempre acompañan al color. Contraste AA.
- Responsive: ≥1280 px layout de 3 zonas; 768–1279 px dos columnas; <768 px pestañas (Mapa · Estaciones · Gráficos · Alertas · Eventos · Dispositivos) con la barra de estado fija.

## Criterios de aceptación
- [ ] Con simulación apagada y encendida, sin errores ni 404 en consola.
- [ ] Reproducir el escenario completo: mapa, métricas, gráficos (histórico+pronóstico), alertas y eventos se actualizan fluidos (sin recrear mapa/charts por tick).
- [ ] Se aprecia la predicción anticipada de nivel crítico (~min 127) antes de la alerta roja (~min 249) en alertas, panel de estación y gráfico.
- [ ] Todo rotulado como simulado; ninguna acción real (los botones de "protocolo" son sólo visuales/estados locales).
- [ ] Sincronización con la pestaña pública verificada (`node tests/browser-smoke.mjs`).
- [ ] 360 px sin scroll horizontal de página; teclado y foco correctos.
- [ ] `node tests/validate.mjs`, `node tests/browser-smoke.mjs` y `node tests/check-ownership.mjs operadores` en verde.

## Receta rápida (Chart.js: histórico + pronóstico)
```js
// x lineal en minutos de escenario; formateá ticks con una función (sin adaptador de fechas)
const hist = st.history.map(p => ({ x: p.t, y: p.level }));
const fc   = st.forecast.points.map(p => ({ x: snap.t + p.dtMin, y: p.level, lo: p.low, hi: p.high }));
// datasets: histórico (línea), pronóstico (borderDash [6,4]), banda (dos líneas lo/hi con fill entre ellas),
// umbrales: tres datasets constantes con st.thresholds.* y colores de levels[...].color
```
