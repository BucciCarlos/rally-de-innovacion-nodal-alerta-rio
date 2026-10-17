// Verifica que una rama sólo toque los archivos de su rol (antes de pedir integración).
// Uso: node tests/check-ownership.mjs publico|operadores|nodo [baseRef=main]
import { spawnSync } from 'node:child_process';

const OWNED = {
  publico: ['site/index.html', 'site/assets/css/publico.css', 'site/assets/js/publico/', 'site/assets/img/publico/', 'docs/requests/publico.md'],
  nodo: ['site/nodo/', 'site/assets/css/nodo.css', 'site/assets/js/nodo/', 'site/assets/img/nodo/', 'docs/requests/nodo.md'],
  operadores: ['site/operadores/', 'site/assets/css/operadores.css', 'site/assets/js/operadores/', 'site/assets/img/operadores/', 'docs/requests/operadores.md']
};
const [role, base = 'main'] = process.argv.slice(2);
if (!OWNED[role]) { console.error('Uso: node tests/check-ownership.mjs publico|operadores|nodo [baseRef]'); process.exit(2); }

const run = (args) => spawnSync('git', args, { encoding: 'utf8' });
const diff = run(['diff', '--name-only', `${base}...HEAD`]);
const dirty = run(['status', '--porcelain']);
if (diff.status !== 0) { console.error(diff.stderr); process.exit(2); }
const changed = new Set(diff.stdout.split('\n').filter(Boolean));
for (const line of dirty.stdout.split('\n').filter(Boolean)) changed.add(line.slice(3).replace(/^"|"$/g, '').split(' -> ').pop());

const allowed = (f) => OWNED[role].some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p));
const bad = [...changed].filter((f) => !allowed(f));
if (bad.length) {
  console.error(`✘ Archivos fuera de tu propiedad (${role}):\n  ` + bad.join('\n  ') + '\nPedí el cambio en docs/requests/' + role + '.md o revertilo.');
  process.exit(1);
}
console.log(`✔ ${changed.size} archivo(s) modificados, todos dentro del territorio de "${role}".`);
