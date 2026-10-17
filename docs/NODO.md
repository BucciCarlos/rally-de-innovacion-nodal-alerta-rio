# Modo Nodo (`/nodo/`)

Representación **conceptual** de la app instalada en un celular reutilizado dentro de una estación de monitoreo. Muestra de dónde sale el dato que
alimenta el centro de operaciones (`/operadores/`) y, finalmente, el aviso a la ciudadanía (`/`). Se abre desde «Ver nodo» (operadores) y desde
«Cómo funciona» (pública). Estación por defecto: **E4 Costanera**; el selector (o `#E5`, `#E2`…) permite ver batería baja (E2), corte de enlace (E5) o sensor degradado (E6).

## Módulos
| Módulo | Fuente de los datos | Qué es y qué NO es |
|---|---|---|
| Identidad y estado | `snap.stations[i]` (estado, `device.health`, sensores, `lastSeenMin`) | Estado del nodo y última medición simulada. |
| Nivel + magnetómetro | Nivel: `station.level` (simulado). µT: `telemetry.magnet()` | **Experimental.** La señal µT es ilustrativa y determinista; **no existe una relación µT↔nivel validada**, ni calibración ni precisión garantizada (se muestra «Pendiente · sin validar»). El nivel es un dato simulado independiente. |
| Acelerómetro y giroscopio | `telemetry.motion()` (viento del snapshot + tiempo) | Supervisión del movimiento y orientación **del celular** (inclinación, vibración, sacudidas filtradas, calidad). No miden la crecida. |
| Energía | `device.battery`, `batteryState`, `drainPerHour`; solar y temperatura derivadas | Autonomía, panel solar conceptual de 5 W (de noche no aporta) y temperatura interna simulada. Avisos con batería baja/crítica (E2 desde ~min 209). |
| Transmisión LoRa | `core/derived.js → loraLink/networkSummary`; paquete: `telemetry.lora()` | **Arquitectura propuesta.** Enlace y paquetes simulados (1 cada 5 min de escenario); no hay protocolo ni radio reales. Con el enlace caído: paquetes en cola y último valor transmitido. |

## Determinismo
`telemetry.js` no usa `Math.random`: cada valor es función del minuto de escenario y del snapshot, así que recargar o retroceder reproduce lo mismo
(`tests/validate.mjs` lo verifica). La simulación es la compartida (`createSimulation`): se sincroniza con las otras vistas por `BroadcastChannel` + `localStorage`.

## Visibilidad de límites
Banner «Prototipo conceptual · Datos simulados», etiqueta «Experimental» en el magnetómetro, notas bajo cada módulo y panel «Qué es experimental».
