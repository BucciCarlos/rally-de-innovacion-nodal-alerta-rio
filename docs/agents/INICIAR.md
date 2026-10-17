# Cómo iniciar a cada agente

> **Documentación histórica.** Corresponde a la fase de desarrollo multiagente inicial (ya concluida): las ramas, los worktrees y las rutas locales que se mencionan fueron propios de ese proceso. No son instrucciones vigentes; las reglas actuales están en [AGENTS.md](../../AGENTS.md) y el contexto en [DESARROLLO-ASISTIDO-IA.md](../DESARROLLO-ASISTIDO-IA.md).

Worktrees (carpetas hermanas del repo principal, cada una con su rama):

| Rol | Rama | Carpeta | Herramienta sugerida |
|---|---|---|---|
| Vista pública | `feat/publico` | `/home/bucci/Proyectos/rally_latinoam-publico` | Claude Code |
| Vista de operadores | `feat/operadores` | `/home/bucci/Proyectos/rally_latinoam-operadores` | Codex CLI |
| Núcleo / coordinación | `main` | `/home/bucci/Proyectos/rally_latinoam` | coordinador (no abrir agentes de vista acá) |

## Claude Code — vista pública
```bash
cd /home/bucci/Proyectos/rally_latinoam-publico
claude
```
Primer mensaje:
```
Sos el desarrollador de la VISTA PÚBLICA de Alerta Río (rama feat/publico). Leé AGENTS.md, docs/CONTRATO-SIMULACION.md y docs/agents/publico.md y ejecutá el brief completo de forma autónoma.
Sólo podés editar tu territorio (site/index.html, site/assets/css/publico.css, site/assets/js/publico/**, site/assets/img/publico/**, docs/requests/publico.md). No toques el núcleo.
Levantá el sitio con `python3 -m http.server 8000 --directory site`, verificalo en el navegador (360/768/1440 px, simulación apagada y reproduciendo), y cerrá con los tests en verde y commits en tu rama. No hagas merge ni push.
```

## Codex CLI — vista de operadores
```bash
cd /home/bucci/Proyectos/rally_latinoam-operadores
codex
```
Primer mensaje:
```
Sos el desarrollador de la VISTA DE OPERADORES de Alerta Río (rama feat/operadores). Leé AGENTS.md, docs/CONTRATO-SIMULACION.md y docs/agents/operadores.md y ejecutá el brief completo de forma autónoma.
Sólo podés editar tu territorio (site/operadores/**, site/assets/css/operadores.css, site/assets/js/operadores/**, site/assets/img/operadores/**, docs/requests/operadores.md). No toques el núcleo.
Levantá el sitio con `python3 -m http.server 8001 --directory site`, verificalo en el navegador (360/768/1440 px, simulación apagada y reproduciendo), y cerrá con los tests en verde y commits en tu rama. No hagas merge ni push.
```

> Usá puertos distintos (8000 y 8001) para que los dos agentes puedan servir su copia a la vez.
> `node tests/browser-smoke.mjs` abre su propio servidor en un puerto libre, no choca.

## Integración (después, por el coordinador)
```bash
cd /home/bucci/Proyectos/rally_latinoam            # main
git merge --no-ff feat/publico && git merge --no-ff feat/operadores   # territorios disjuntos → sin conflictos
npm run test:all
```
