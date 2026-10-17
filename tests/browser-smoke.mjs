// Prueba de humo en navegador real (Chrome/Chromium headless): carga ambas vistas en iframes del mismo origen
// y verifica que el control de simulación se sincroniza entre ellas (BroadcastChannel + localStorage).
// Uso: node tests/browser-smoke.mjs     (opcional: CHROME_BIN=/ruta/al/chrome)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };

const candidates = [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const chrome = candidates.find((c) => spawnSync(c, ['--version'], { stdio: 'ignore' }).status === 0);
if (!chrome) { console.log('⚠ Chrome/Chromium no encontrado: se omite la prueba de navegador (definí CHROME_BIN).'); process.exit(0); }

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(ROOT, path.endsWith('/') ? path + 'index.html' : path);
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const profile = mkdtempSync(join(tmpdir(), 'alertario-chrome-'));
// spawn ASÍNCRONO: el servidor HTTP de este mismo proceso debe seguir atendiendo mientras corre Chrome.
const r = await new Promise((done) => {
  const child = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', `--user-data-dir=${profile}`, '--virtual-time-budget=30000',
    '--dump-dom', `http://127.0.0.1:${port}/tests/browser/sync-harness.html`]);
  let stdout = '', stderr = '';
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  const kill = setTimeout(() => child.kill('SIGKILL'), 90000);
  child.on('close', () => { clearTimeout(kill); done({ stdout, stderr }); });
});
server.close(); rmSync(profile, { recursive: true, force: true });

const m = /<pre id="result">([\s\S]*?)<\/pre>/.exec(r.stdout || '');
const body = m ? m[1].replace(/&lt;/g, '<').replace(/&amp;/g, '&') : 'sin resultado\n' + (r.stderr || '').slice(0, 500);
console.log(body);
const lines = body.split('\n');
const fails = lines.filter((l) => l.startsWith('FAIL')).length;
if (!lines.includes('DONE') || fails > 0 || !lines.some((l) => l.startsWith('PASS'))) { console.log('✘ prueba de navegador fallida'); process.exit(1); }
console.log(`✔ ${lines.filter((l) => l.startsWith('PASS')).length} verificaciones de navegador correctas`);
