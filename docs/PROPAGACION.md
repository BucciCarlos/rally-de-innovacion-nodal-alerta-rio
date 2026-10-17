# Propagación y distancias (conceptual)

La geografía del Río Serena es **ficticia**; las coordenadas están en grados y permiten medir distancias sobre el trazado, pero no hay datos de pendiente, sección ni caudal. La propagación de la crecida es una **cronología conceptual**, no una calibración hidrológica.

| Tramo | Distancia | Retardo (`lagMin`) | Velocidad implícita |
|---|---|---|---|
| E1 → E2 | 8,0 km | 30 min | 16,0 km/h (≈4,4 m/s) |
| E2 → E3 | 8,4 km | 35 min | 14,4 km/h (≈4,0 m/s) |
| E3 → E4 | 8,5 km | 35 min | 14,6 km/h (≈4,0 m/s) |
| E4 → E5 | 7,8 km | 30 min | 15,6 km/h (≈4,3 m/s) |
| E5 → E6 | 6,9 km | 30 min | 13,8 km/h (≈3,8 m/s) |

- `riverKm` (`data/stations.json`) = distancia acumulada sobre la polilínea desde E1: 0; 8,0; 16,4; 24,9; 32,7; 39,6 km. Ninguna vista lo muestra y los mapas no llevan escala gráfica.
- `lagMin` = retardo respecto de E4. La celeridad resultante (≈4 m/s, uniforme) es la de un cauce empinado o canalizado; en ríos de llanura suele ser menor. Se eligió para que el escenario de 6 h muestre toda la secuencia, y **no debe presentarse como calibración**.
- Los **umbrales** son sintéticos y propios de cada estación (vulnerabilidad local, p. ej. el tramo urbano de E4). Por eso una estación aguas abajo puede cruzar su umbral antes que otra aguas arriba (E4 antes que E3); no se fuerza un orden creciente.
- Las estaciones aguas arriba alcanzan antes su cresta (E1 hacia t≈300, E2 hacia t≈330): luego su nivel se estabiliza o baja unos centímetros.

## Propagación frente a anticipación
El retardo entre estaciones (E1→E4 ≈ 100 min) **no** es la anticipación del pronóstico (~118 min en t=130). La predicción simulada proyecta la propia curva de E4 cuando hay evidencia de lluvia (lluvia observada y acumulados previstos, más la tendencia aguas arriba); no se calcula a partir del viaje de la onda.

## Qué cambió respecto de la versión anterior
`riverKm` (de 0–30 km a la geometría real); `lagMin` de E1/E2/E3 (−60/−40/−20 → −100/−70/−35); umbrales de vigilancia y naranja de E1–E3 recalibrados para **conservar los tiempos de alerta** (E1 64/141, E2 77/161, E3 98/179 min); `baselineT` −60 → −120 (para que el estado base sea estable con los nuevos retardos). E4, E5, E6, la predicción en t≈127 y la alerta roja de E4 en t≈249 no cambiaron.
