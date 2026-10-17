# Nodal

**Una red comunitaria de nodos que reutiliza celulares en desuso para anticipar crecidas de ríos.**

Nodal es un prototipo conceptual desarrollado para el **Rally Latinoamericano de Innovación 2026**, dentro del desafío *«Sensores al servicio de la comunidad»*.

### ▶ [Abrir la aplicación publicada](https://nodal-rally-2026.netlify.app)

> **Prototipo conceptual con datos simulados.** El río, la ciudad, las estaciones, las mediciones, las alertas y las predicciones de esta aplicación son sintéticos y están rotulados como tales. No hay sensores ni red de estaciones desplegada, no se envían notificaciones reales y no se activa ninguna sirena. Ante una emergencia real, seguí siempre las indicaciones de las autoridades locales.

## El problema

Las crecidas de ríos pueden afectar gravemente a comunidades ribereñas, especialmente cuando no cuentan con información oportuna sobre lo que ocurre aguas arriba. Un monitoreo distribuido a lo largo de la cuenca, con nodos que midan y comuniquen su estado, permitiría disponer de datos más cercanos al territorio y dar a operadores y ciudadanía más tiempo para prepararse.

Nodal explora cómo hacerlo con un costo bajo y con un criterio de economía circular. No promete una anticipación garantizada: su valor depende de validaciones que todavía no se han realizado.

## Nuestra propuesta

1. **Reutilizar celulares en desuso** como nodos de monitoreo, evitando residuos electrónicos y reduciendo costos (economía circular).
2. **Aprovechar sus sensores integrados** (magnetómetro, acelerómetro, giroscopio, entre otros).
3. **Medir y registrar variables hidrológicas** cerca del cauce.
4. **Comunicar los nodos mediante una red LoRa propuesta**, con hardware adicional, para llegar a zonas con poca conectividad.
5. **Procesar y analizar la información** en un sistema central, combinándola con datos meteorológicos.
6. **Evaluar el riesgo y generar alertas** comprensibles, tanto para operadores (Defensa Civil, Bomberos y organismos técnicos) como para la ciudadanía.

Como parte de la arquitectura propuesta, cada nodo podría realizar un **procesamiento en el borde (Edge Computing)**: filtrar y resumir sus lecturas antes de transmitirlas, para ahorrar energía y ancho de banda. El prototipo no implementa este procesamiento.

### Qué es experimental y qué no está implementado

- El mecanismo **magnetómetro + flotador + imán** para estimar el nivel del agua es **experimental**. Su calibración hidrométrica **no está validada**: no existe una relación comprobada entre el campo magnético y el nivel del río.
- El **acelerómetro y el giroscopio** supervisan el movimiento y la orientación del celular; **no miden directamente metros de crecida**.
- La **red LoRa física no está implementada**: en el prototipo se representa de forma conceptual.
- **No existe una red de estaciones desplegada** ni mediciones reales.
- **No se han validado tiempos reales de anticipación ni precisión predictiva.**

### Del nombre al proyecto

La propuesta original se llamaba *«Centinela Niño»*, en referencia a los riesgos hidrometeorológicos que pueden intensificarse durante algunos episodios de El Niño. Evolucionó hacia **Nodal**, un nombre que representa mejor una arquitectura distribuida de nodos y su aplicabilidad a distintas cuencas de Latinoamérica.

## Explorar el prototipo

El prototipo es una aplicación web estática con tres perspectivas de un mismo sistema:

| Vista | Enlace | Para qué sirve |
|---|---|---|
| **Portal ciudadano** | [nodal-rally-2026.netlify.app](https://nodal-rally-2026.netlify.app/) | Muestra a cualquier persona el estado del río, la tendencia, el riesgo, las zonas del mapa y las recomendaciones, con el mapa como elemento principal. |
| **Centro de operaciones** | [/operadores/](https://nodal-rally-2026.netlify.app/operadores/) | Panel técnico para organismos de respuesta: mapa, mediciones por estación, gráficos históricos y pronóstico simulado, alertas, registro de eventos, estado de dispositivos, red LoRa y sirenas simuladas. |
| **Modo Nodo** | [/nodo/](https://nodal-rally-2026.netlify.app/nodo/) | Representa la app en un celular reutilizado dentro de una estación: nivel y magnetómetro (experimental), movimiento, energía y transmisión LoRa (conceptual). Muestra de dónde saldría el dato. |

Las tres vistas comparten un **simulador** determinista de seis horas: un río en ascenso que evoluciona de normal a vigilancia, alerta naranja y alerta roja, con una predicción anticipada del nivel crítico. Un control discreto («Simulación») permite activar el modo, reproducir, pausar, avanzar, retroceder, reiniciar, cambiar la velocidad y mover la línea temporal. Si se abren varias vistas en pestañas del mismo navegador, **se sincronizan entre sí**.

Lo que se ve son predicciones ilustrativas, alertas y datos sintéticos. El sistema no envía notificaciones reales ni activa sirenas.

## Tecnologías utilizadas

**Implementadas en el prototipo**

- HTML5, CSS3 y JavaScript con ES Modules, sin frameworks ni proceso de compilación.
- JSON para los datos sintéticos del escenario.
- [Leaflet](https://leafletjs.com/) para los mapas y [Chart.js](https://www.chartjs.org/) para los gráficos, incluidos localmente (sin CDN).
- `BroadcastChannel` y `localStorage` para la sincronización entre pestañas.
- Node.js (18 o superior) para las pruebas y las herramientas de generación de datos.
- Git y GitHub para el código; Netlify para el alojamiento y el despliegue continuo.

Python es opcional y solo sirve para servir el sitio en local. **No hay backend, base de datos ni autenticación.** El «predictor» es una heurística determinista de demostración: **no se implementó ni entrenó ningún modelo de machine learning.**

**Previstas para una versión futura** (no forman parte de este prototipo): hardware de nodo con LoRa y gateway, backend y almacenamiento de series históricas, validación física de los sensores, modelos hidrológicos y predictivos calibrados con datos reales, y canales oficiales de alerta.

## Ejecutar localmente

Requisitos: Python 3 (solo para servir los archivos) y, para las pruebas, Node.js 18 o superior. Funciona en Windows, Linux y macOS. Los módulos ES requieren servirse por HTTP: no funcionan abriendo los archivos con `file://`.

```bash
git clone https://github.com/BucciCarlos/rally-de-innovacion-nodal-alerta-rio.git
cd rally-de-innovacion-nodal-alerta-rio

# Linux / macOS
python3 -m http.server 8000 --directory site

# Windows (PowerShell o CMD)
py -m http.server 8000 --directory site
```

Luego abrí `http://localhost:8000/` (ciudadano), `http://localhost:8000/operadores/` y `http://localhost:8000/nodo/`.

### Pruebas

```bash
node tests/validate.mjs        # datos, motor de simulación, sincronización, sintaxis y rutas
node tests/browser-smoke.mjs   # las tres vistas sincronizadas en Chrome o Chromium sin interfaz
```

La segunda prueba usa un Chrome o Chromium instalado (se puede indicar la ruta con la variable `CHROME_BIN`); si no lo encuentra, se omite con un aviso. Ambas también están disponibles con `npm run test:all`.

## Documentación técnica

- [Contrato de simulación](docs/CONTRATO-SIMULACION.md): API, estructura de los datos y reglas de sincronización compartidas por las tres vistas.
- [Modo Nodo](docs/NODO.md): qué representa cada módulo y sus límites.
- [Propagación conceptual](docs/PROPAGACION.md): distancias, retardos entre estaciones y por qué no son una calibración hidrológica.
- [Desarrollo asistido por IA](docs/DESARROLLO-ASISTIDO-IA.md): cómo se coordinó el desarrollo multiagente, con enlaces a la documentación histórica.
- [AGENTS.md](AGENTS.md) y [CLAUDE.md](CLAUDE.md): guía para continuar el desarrollo con agentes de IA.

Estructura del repositorio:

```
site/            aplicación publicada (Netlify publica esta carpeta)
  index.html, operadores/, nodo/      las tres vistas
  assets/js/core/                     motor de simulación, sincronización y API compartida
  data/                               datos sintéticos (escenario, estaciones, niveles, mapa y escenografía)
docs/            documentación técnica e histórica
tests/, tools/   pruebas y generadores deterministas de la geografía ficticia
```

## Desarrollo asistido por inteligencia artificial

El prototipo se construyó con ayuda de **Claude Code** y **Codex CLI**, en un flujo multiagente con dirección y revisión humanas. Los agentes se coordinaron mediante un contrato de interfaz compartido y trabajaron en paralelo sobre ramas separadas con Git worktrees: una vista ciudadana y otra de operadores, más un núcleo común de simulación y pruebas. Después se integraron, se verificaron con pruebas automatizadas y auditorías en un navegador real, y se ampliaron con la marca Nodal, el Modo Nodo y mejoras de mapa y presentación. Las decisiones de alcance, nombre, diseño y publicación fueron humanas.

Conviene distinguir dos cosas:

- **La IA como herramienta de desarrollo:** se usó para construir y revisar este prototipo. El detalle está en [docs/DESARROLLO-ASISTIDO-IA.md](docs/DESARROLLO-ASISTIDO-IA.md).
- **La IA como capacidad futura de Nodal:** modelos predictivos que podrían entrenarse con datos hidrológicos y meteorológicos reales. **La implementación actual no contiene ningún modelo de IA predictiva entrenado.**

## Estado del proyecto

Nodal es un **prototipo web funcional de demostración**. El escenario es ficticio, las mediciones son sintéticas y el predictor es determinista, no un modelo entrenado.

Una implementación real requeriría validación física de los sensores, infraestructura de comunicación, un backend, mediciones históricas, evaluación hidrológica y coordinación con los organismos competentes.

## Créditos y contexto

Desarrollado para el **Rally Latinoamericano de Innovación 2026**. Este repositorio no declara una licencia de código abierto (`package.json` indica `UNLICENSED`).

Componentes de terceros incluidos localmente, con sus licencias en las carpetas correspondientes (`site/assets/vendor/` y `site/assets/fonts/`):

- [Leaflet](https://leafletjs.com/) 1.9.4 (BSD-2-Clause).
- [Chart.js](https://www.chartjs.org/) 4.5.1 (MIT).
- Fuentes [Inter](https://rsms.me/inter/) y [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) (SIL Open Font License 1.1).
