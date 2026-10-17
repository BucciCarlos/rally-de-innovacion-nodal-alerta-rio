# Integración y auditoría final

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
