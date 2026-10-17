# Alerta Río

**Rally Latinoamericano de Innovación 2026 — mockup web funcional.**

Concepto: reutilizar celulares en desuso como estaciones de monitoreo hídrico. Una red de estaciones registra variables del río y las envía
a un sistema central que combina mediciones, meteorología y predicciones para anticipar posibles inundaciones.

> ⚠️ **Demostración conceptual.** Los datos, estaciones, alertas y predicciones son **sintéticos y simulados**, y están rotulados como tales.
> No es un sistema de alertas real, no envía notificaciones ni activa dispositivos, y no incluye ningún modelo de IA entrenado
> (la "predicción" es una heurística determinista de demostración). El río, la ciudad y las estaciones son ficticios.

## Qué incluye

Una única aplicación web **estática** con dos vistas:

| Vista | Ruta | Para quién |
|---|---|---|
| **Portal público** | `/` | Ciudadanía: estado, tendencia, riesgo y recomendaciones con un mapa protagonista. |
| **Centro de operaciones** | `/operadores/` | Defensa Civil, Bomberos y organismos: mapa, mediciones, gráficos, predicciones, alertas, eventos y estado de dispositivos. |

Ambas comparten un **simulador** (escenario de 6 h: normal → vigilancia → alerta naranja → alerta roja, con una predicción anticipada
del nivel crítico) y se **sincronizan entre pestañas** con `BroadcastChannel` + `localStorage`. El control de simulación es un widget pequeño y discreto
(botón "Simulación" → reproducir, pausar, avanzar, retroceder, reiniciar, velocidad y línea temporal).

## Ejecutar en local (Windows y Linux/macOS)

Sólo hace falta Python 3 (los módulos ES requieren servir por HTTP; no funciona abriendo el archivo con `file://`).

```bash
# Linux / macOS
python3 -m http.server 8000 --directory site

# Windows (PowerShell o CMD)
py -m http.server 8000 --directory site
```

Abrí <http://localhost:8000> (pública) y <http://localhost:8000/operadores/> (operadores). Con Node: `npm run serve`.

## Estructura

```
site/                         ← lo que se publica (Netlify: publish = "site")
  index.html                  Vista pública                      [feat/publico]
  operadores/index.html       Vista de operadores                [feat/operadores]
  assets/
    css/  base.css fonts.css sim-controls.css                    [núcleo: tokens de identidad compartidos]
          publico.css  operadores.css                            [cada vista]
    js/core/                                                     [núcleo]
          engine.js           Motor puro y determinista (snapshotAt)
          controller.js       Reproducción + sincronización entre pestañas
          simulation.js       API pública (createSimulation)
          sim-controls.js     Widget de control compartido
          format.js           Formateo es-AR y utilidades
    js/publico/ js/operadores/                                   [cada vista]
    vendor/  leaflet/ chartjs/    fonts/ (Inter, Bricolage Grotesque; OFL)   → sin CDN
  data/   scenario.json stations.json levels.json map.json       Datos sintéticos centralizados
docs/     CONTRATO-SIMULACION.md  agents/…                       Contrato y briefs
tests/    validate.mjs browser-smoke.mjs check-ownership.mjs
tools/    gen-map.mjs                                            Genera la geografía ficticia
netlify.toml  package.json  AGENTS.md  CLAUDE.md
```

## Arquitectura

```
data/*.json ──► engine.js (puro: snapshotAt(model, t)) ──► simulation.js ──► vistas (suscripción a snapshots)
                                  ▲                              ▲
                                  │                              └─ sim-controls.js (widget)
                    controller.js: estado compartido {enabled, playing, speed, t, anchorWall, rev}
                      ├─ localStorage['alertaRio.sim.v1']  (persistencia + evento storage)
                      └─ BroadcastChannel('alerta-rio-sim') (difusión inmediata)
```

- **Determinista**: todo el estado derivado es una función pura del minuto `t` (sin aleatoriedad): retroceder, saltar y reproducir son coherentes.
- **Sincronización sin deriva**: no se transmite el tiempo cuadro a cuadro; cada pestaña calcula `t` desde un ancla compartida y la velocidad.
- Contrato JavaScript completo: [`docs/CONTRATO-SIMULACION.md`](docs/CONTRATO-SIMULACION.md).

## Pruebas

```bash
node tests/validate.mjs        # datos, motor, escenario, sincronización (simulada), sintaxis y rutas  (Node ≥ 18)
node tests/browser-smoke.mjs   # Chrome headless: ambas vistas en iframes comparten la simulación (BroadcastChannel/localStorage)
npm run test:all               # ambas
```

`browser-smoke` usa Chrome/Chromium instalado (variable `CHROME_BIN` para indicar la ruta); si no lo encuentra, se omite con aviso.

## Despliegue (Netlify + GitHub)

El sitio es 100 % estático; `netlify.toml` ya define `publish = "site"` sin build.

1. Subir el repositorio a GitHub (público) con la rama `main`.
2. En Netlify: **Add new site → Import an existing project → GitHub** → elegir el repo.
3. Ajustes de build: se leen de `netlify.toml` (publish directory `site`, sin comando de build).
4. Cada `git push` a `main` publica automáticamente. Ramas y PR obtienen *deploy previews*.

No requiere variables de entorno, credenciales ni servicios privados.

## Organización de desarrollo (multiagente)

El trabajo se reparte con *git worktrees* sobre archivos **disjuntos** (sin conflictos de merge): ver [`AGENTS.md`](AGENTS.md) y [`docs/agents/`](docs/agents/INICIAR.md).

| Rama | Dueño de |
|---|---|
| `main` | Núcleo: simulador, datos, tokens, tests, docs, despliegue |
| `feat/publico` | `site/index.html`, `css/publico.css`, `js/publico/**` |
| `feat/operadores` | `site/operadores/**`, `css/operadores.css`, `js/operadores/**` |

`main` siempre es recuperable: solo recibe merges con `npm run test:all` en verde.

## Licencias de terceros

Leaflet 1.9.4 (BSD-2), Chart.js 4.5.1 (MIT), Inter y Bricolage Grotesque (SIL OFL 1.1). Copias de las licencias en `site/assets/vendor/*` y `site/assets/fonts/`.
