# Vista de operadores — implementación y pedidos al núcleo

## Implementado

- Centro de operaciones oscuro con panorama de cuenca, niveles observados, contadores, reloj y anticipación simulada destacada.
- Mapa Leaflet local, sin teselas externas: tramos y zonas por estado, estaciones seleccionables, anillos de riesgo previsto y servicios ficticios.
- Selección compartida entre mapa, estaciones, zonas, alertas, gráficos y dispositivos; persistencia en `#E1`…`#E6`, navegación de estaciones con flechas, Inicio y Fin.
- Historial con huecos de desconexión, estimación simulada punteada y banda de incertidumbre, tres umbrales y marca del instante actual. Comparador del recorrido base → umbral crítico. Se conservan ambas instancias de Chart.js y se actualizan sin animación por minuto del escenario.
- Alertas ordenadas por el motor y registro filtrable por tipo/estación. Retroceder reconstruye el registro correspondiente al instante, sin acumular eventos futuros.
- Batería, conectividad, señal, salud y sensores; E5 muestra lectura congelada durante el corte. Meteorología del snapshot y guía informativa de respuesta.
- Controles compartidos originales en variante inline, sincronización con la vista pública y atajo Espacio fuera de controles interactivos.
- Tres zonas en escritorio, dos columnas en tablet y seis paneles navegables en celular; estado y sello de simulación persistentes en la cabecera móvil. Foco visible, chips con texto/símbolo, movimiento reducido y recursos locales.
- Sin backend, autenticación, IA real, notificaciones ni integración externa. No se modificaron archivos del núcleo ni de la vista pública.

## Verificación

- `node tests/validate.mjs`: 48 correctas, 0 fallos.
- `node tests/browser-smoke.mjs`: 9 verificaciones en Chrome real, incluida sincronización bidireccional de reproducción, pausa, avance, reinicio y apagado.
- `node tests/check-ownership.mjs operadores`: territorio correcto.
- Revisión visual en Brave a 360, 768 y 1440 px. A 360 px, ancho del documento 345 px para viewport de 360 px (la barra de paneles tiene su propio desplazamiento horizontal).
- En t=130: vigilancia observada y anticipación de nivel crítico en E4 de 1 h 58 min; selección de E4 actualiza detalle y gráfico.
- En t=210: E5 informa última lectura hace 10 min y sensores sin conexión. Se verificaron llegada al rojo, reproducción completa t=0→360 a ×8, parada automática en 00:00, retroceso a t=0 y selección por teclado. El filtro dispositivo/E5 pasa de 3 de 26 eventos al final a 0 de 1 en t=0.

## Pedidos no bloqueantes al núcleo y workarounds

1. **Hora de inicio de las alertas.** El contrato describe `sinceT`, pero las alertas de dispositivo lo omiten y la predicción lo entrega como `null`. Para poder presentar una hora de inicio auténtica, el núcleo debería proporcionarla. La vista muestra “Inicio no informado”; no infiere fechas ni duplica lógica del motor.
2. **Confianza opcional.** `system.outlook.confidenceLabel` puede ser `null` cuando no hay estación de anticipación. Documentar su nulabilidad. La vista muestra “Sin riesgo anticipado en esta ventana”.
3. **Mensaje después del cruce crítico.** El panorama del motor conserva un texto prospectivo cuando ya hay rojo observado. La vista lo contextualiza como “Nivel crítico observado”, usando el estado actual del snapshot.
4. **Favicon por defecto.** En la sesión de QA el navegador solicitó automáticamente `/favicon.ico`, que devuelve 404; el icono explícito `assets/img/favicon.svg` y los recursos de la vista cargan correctamente. Un favicon de respaldo en la raíz del sitio corresponde al núcleo.
5. **Contraste del widget compartido.** Revisar el contraste del chip verde con texto blanco de `.simctl__phase` (colores compartidos). Los chips propios de operadores usan fondo oscuro y borde del token para mantener contraste alto sin alterar colores de nivel.

## Pendiente

No quedan componentes prioritarios pendientes de la interfaz. Los pedidos anteriores son mejoras de datos/recursos compartidos; la vista incluye los workarounds indicados. Integración y publicación quedan a cargo del coordinador; no se hizo merge ni push.

## Resolución (integración en main)
1. `sinceT` ahora lo informan también las alertas de dispositivo y de predicción (nunca `null`).
2. `confidenceLabel` puede ser `null` sin estación de anticipación (documentado en el contrato).
3. Texto tras el cruce crítico: resuelto con `system.outlook.ongoing` (mensaje no prospectivo).
4. `site/favicon.ico` agregado en la raíz.
5. Contraste: `--lvl-normal` pasó a `#16845a` (4,69:1 con texto blanco) en `base.css` y `levels.json`.
- Eje X del gráfico histórico: sin ticks de borde (se solapaban a la derecha).
