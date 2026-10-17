// Chrome DevTools Protocol por pipe: pestañas reales, sin paquetes ni servicios externos.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = 'alertaRio.sim.v1';

export async function runTimelineChecks(chrome, base) {
  const profile = mkdtempSync(join(tmpdir(), 'nodal-timeline-'));
  const artifacts = process.env.NODAL_BROWSER_ARTIFACTS;
  if (artifacts) mkdirSync(artifacts, { recursive: true });
  const child = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--remote-debugging-pipe', `--user-data-dir=${profile}`],
  { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  const closed = new Promise((r) => child.once('close', r));
  let buffer = '', serial = 0, passed = 0, stderr = '';
  const pending = new Map(), issues = [];
  child.stderr.on('data', (d) => { stderr = (stderr + d).slice(-2000); });
  child.stdio[4].on('data', (chunk) => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf('\0')) >= 0) {
      const raw = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      if (!raw) continue;
      const message = JSON.parse(raw), call = pending.get(message.id);
      if (call) {
        pending.delete(message.id); clearTimeout(call.timeout);
        message.error ? call.reject(new Error(JSON.stringify(message.error))) : call.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown'
        || message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error'
        || message.method === 'Log.entryAdded' && message.params.entry.level === 'error'
        || message.method === 'Network.responseReceived' && message.params.response.status >= 400
        || message.method === 'Network.loadingFailed' && !message.params.canceled) issues.push(message);
    }
  });
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++serial;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}\n${stderr}`)); }, 15000);
      pending.set(id, { resolve, reject, timeout });
      child.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
    });
  }
  function ok(label, condition) {
    if (!condition) throw new Error(label);
    passed++; console.log(`PASS ${label}`);
  }
  async function waitFor(fn, label, ms = 8000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { try { if (await fn()) return; } catch { /* navegación en curso */ } await sleep(50); }
    throw new Error(`Tiempo agotado: ${label}`);
  }
  async function open(route, { fallback = false } = {}) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const page = { targetId, sessionId };
    page.call = (method, params) => send(method, params, sessionId);
    page.eval = async (expression) => {
      const r = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    for (const method of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await page.call(method);
    if (fallback) await page.call('Page.addScriptToEvaluateOnNewDocument', { source: 'window.BroadcastChannel = undefined;' });
    await page.call('Page.navigate', { url: base + route });
    await waitFor(() => page.eval(`document.readyState === 'complete' ${route.includes('/site/') ? "&& !!document.querySelector('.simctl__toggle')" : ''}`), `cargar ${route}`);
    return page;
  }
  const close = (page) => send('Target.closeTarget', { targetId: page.targetId });
  const click = (page, selector) => page.eval(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const seek = async (page, t) => {
    await page.eval(`{const r=document.querySelector('.simctl__range'); r.value=${t}; r.dispatchEvent(new Event('input',{bubbles:true}));}`);
    await sleep(250);
  };
  const read = (page) => page.eval(`({t:Number(document.querySelector('.simctl__range').value), clock:document.querySelector('.simctl__clock').textContent,
    open:document.querySelector('.simctl__toggle').getAttribute('aria-expanded')==='true',
    playing:document.querySelector('[data-act=play]').getAttribute('aria-label')==='Pausar', status:document.querySelector('.simctl__phase').dataset.status})`);
  async function reload(page) {
    const before = await page.eval('performance.timeOrigin');
    await page.call('Page.reload');
    await waitFor(() => page.eval(`performance.timeOrigin !== ${before} && document.readyState==='complete' && !!document.querySelector('.simctl__toggle')`), 'recarga completa');
  }
  async function key(page, key, code, virtual) {
    await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtual });
    await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtual });
  }
  async function screenshot(page, name) {
    if (!artifacts) return;
    const image = await page.call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(artifacts, `${name}.png`), Buffer.from(image.data, 'base64'));
  }
  let admin;
  try {
    admin = await open('/tests/browser/session.html');
    await admin.eval('localStorage.clear()');
    let pub = await open('/site/');
    let state = await read(pub);
    ok('primera visita: 18:00, t=0, pausado, controles cerrados y tendencia ascendente', state.t === 0 && !state.open && !state.playing && state.status === 'normal'
      && state.clock.startsWith('18:00') && await pub.eval("/subiendo/i.test(document.querySelector('#chip-trend').textContent) && /simulada/.test(document.querySelector('#status-clock').textContent)"));
    await pub.eval("document.querySelector('.simctl__toggle').focus()");
    await key(pub, ' ', 'Space', 32);
    ok('teclado: espacio abre la línea de tiempo con aria-expanded', (await read(pub)).open);
    await seek(pub, 130);
    ok('t=130 muestra previsión crítica simulada', await pub.eval("document.querySelector('#outlook').dataset.pre==='true' && /simulada/.test(document.querySelector('#outlook-msg').textContent)"));
    await click(pub, '.simctl__toggle');
    ok('cerrar conserva t=130 y su previsión', (await read(pub)).t === 130 && !(await read(pub)).open && await pub.eval("document.querySelector('#outlook').dataset.pre==='true'"));
    await click(pub, '.simctl__toggle');
    ok('reabrir recupera exactamente t=130', (await read(pub)).t === 130 && !(await read(pub)).playing);
    await seek(pub, 249); await click(pub, '.simctl__toggle');
    ok('cerrar en t=249 mantiene la alerta roja visible', (await read(pub)).t === 249 && await pub.eval("document.querySelector('#estado').dataset.status==='roja'"));
    await reload(pub);
    ok('recargar conserva t=249, pausado y controles cerrados', (await read(pub)).t === 249 && !(await read(pub)).playing && !(await read(pub)).open);
    let ops = await open('/site/operadores/'), nodo = await open('/site/nodo/');
    ok('tres pestañas reales comparten el instante y rotulan su hora simulada', [await read(pub), await read(ops), await read(nodo)].every((s) => s.t === 249 && !s.playing)
      && await ops.eval("/HORA SIMULADA/.test(document.body.innerText)") && await nodo.eval("/simulada/.test(document.querySelector('#sb-clock').textContent)"));
    await click(pub, '.simctl__toggle'); await seek(pub, 130); await click(pub, '[data-act=play]'); await sleep(1100);
    const fourth = await open('/site/');
    await waitFor(async () => (await read(fourth)).playing, 'cuarta pestaña recibe respuesta activa');
    ok('cuarta pestaña se incorpora a una reproducción realmente activa', Math.abs((await read(fourth)).t - (await read(pub)).t) <= 1);
    await close(fourth); await close(pub); await close(ops);
    ok('cerrar otras pestañas no pausa al último reproductor vivo', (await read(nodo)).playing);
    await sleep(1100); await close(nodo);
    await sleep(400); // el pagehide de la pestaña cerrada escribe su último checkpoint
    const stopped = await admin.eval(`JSON.parse(localStorage.getItem('${KEY}'))`);
    pub = await open('/site/'); state = await read(pub);
    ok('cerrar la última pestaña en play y reabrir no reanuda ni extrapola el ancla', !state.playing && state.t === Math.round(stopped.t));
    await click(pub, '[data-act=play]'); await sleep(300);
    await reload(pub);
    ok('recarga del único reproductor vuelve pausada, aunque playing persistido era true', !(await read(pub)).playing);
    await seek(pub, 359); await pub.eval("{const s=document.querySelector('[data-act=speed]');s.value='8';s.dispatchEvent(new Event('change',{bubbles:true}));}");
    await click(pub, '[data-act=play]');
    await waitFor(async () => { const s = await read(pub); return s.t === 360 && !s.playing; }, 'final en t=360');
    ok('play llega a t=360 y persiste el final pausado', await admin.eval(`{const s=JSON.parse(localStorage.getItem('${KEY}'));s.t===360 && !s.playing}`));
    await click(pub, '[data-act=play]');
    ok('reproducir desde el final reinicia el escenario', (await read(pub)).playing && (await read(pub)).t < 5);
    await click(pub, '[data-act=reset]');
    ok('reinicio manual vuelve a t=0 y pausa', (await read(pub)).t === 0 && !(await read(pub)).playing);
    await seek(pub, 249); await click(pub, '[data-act=back]');
    ok('retroceso desde rojo lleva a naranja en t=239', (await read(pub)).t === 239 && (await read(pub)).status === 'naranja');
    await pub.eval("document.querySelector('.simctl__range').focus()"); await key(pub, 'ArrowLeft', 'ArrowLeft', 37);
    ok('teclado: flecha mueve la línea temporal y mantiene el foco', (await read(pub)).t === 238 && await pub.eval("document.activeElement.classList.contains('simctl__range')"));
    ops = await open('/site/operadores/');
    await ops.eval("document.querySelector('.simctl__range').focus()"); await click(pub, '.simctl__toggle');
    ok('cierre remoto retira el foco del panel oculto sin desplazar la página', await ops.eval("document.activeElement.classList.contains('simctl__toggle')"));
    await close(pub); await close(ops);

    // Compatibilidad: datos v1 anteriores, incluso con reproducción y ancla antiguas.
    await admin.eval(`localStorage.setItem('${KEY}',JSON.stringify({v:1,rev:40,origin:'legacy',updatedAt:Date.now()-60000,enabled:true,playing:true,speed:2,t:130,anchorWall:Date.now()-60000}))`);
    pub = await open('/site/');
    ok('estado v1 anterior conserva t=130 sin reanudar playing ni calcular tiempo ausente', (await read(pub)).t === 130 && !(await read(pub)).playing);
    await close(pub);
    await admin.eval(`{const s=JSON.parse(localStorage.getItem('${KEY}'));s.updatedAt=Date.now();s.lastActivityAt=Date.now()-12*60*60*1000-1;localStorage.setItem('${KEY}',JSON.stringify(s));}`);
    pub = await open('/site/');
    ok('12 horas sin actividad reinician t=0 y pausa aunque el checkpoint sea reciente', (await read(pub)).t === 0 && !(await read(pub)).open && !(await read(pub)).playing);
    await close(pub);

    // Respaldo sin BroadcastChannel: el mismo estado + saludo/respuesta mediante storage.
    await admin.eval('localStorage.clear()');
    pub = await open('/site/', { fallback: true }); ops = await open('/site/operadores/', { fallback: true });
    await click(pub, '.simctl__toggle'); await seek(pub, 130);
    await waitFor(async () => (await read(ops)).t === 130, 'storage sincroniza seek');
    await click(pub, '[data-act=play]');
    nodo = await open('/site/nodo/', { fallback: true });
    await waitFor(async () => (await read(nodo)).playing, 'storage confirma reproductor activo');
    ok('sin BroadcastChannel: storage sincroniza acciones y confirma presencia activa', (await read(ops)).playing && Math.abs((await read(nodo)).t - (await read(pub)).t) <= 1);
    await click(ops, '.simctl__toggle'); await sleep(200);
    ok('sin BroadcastChannel: cerrar pausa las tres sin volver al estado base', [await read(pub), await read(ops), await read(nodo)].every((s) => !s.open && !s.playing && s.t >= 130));
    await close(pub); await close(ops); await close(nodo);

    // Todas las vistas, cuatro anchos y los estados cerrado/play/130/249.
    for (const [name, route] of [['publico', '/site/'], ['operadores', '/site/operadores/'], ['nodo', '/site/nodo/']]) {
      const page = await open(route);
      for (const width of [360, 768, 1280, 1440]) {
        await page.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
        if (!(await read(page)).open) await click(page, '.simctl__toggle');
        await click(page, '[data-act=reset]'); await click(page, '.simctl__toggle');
        await screenshot(page, `${name}-${width}-cerrada`);
        await click(page, '.simctl__toggle'); await click(page, '[data-act=play]'); await sleep(300);
        await screenshot(page, `${name}-${width}-play`);
        await seek(page, 130); await screenshot(page, `${name}-${width}-130`);
        await seek(page, 249); await screenshot(page, `${name}-${width}-249`);
        ok(`${name} a ${width}px: estados cerrado, play, previsión y rojo; sin desborde horizontal`, await page.eval('document.documentElement.scrollWidth <= innerWidth') && (await read(page)).status === 'roja');
        if (name === 'publico') {
          const geometry = [];
          for (const t of [140, 200, 248, 249, 300]) {
            await seek(page, t);
            geometry.push(await page.eval("['#outlook','#map'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [Math.round(r.top*2)/2,Math.round(r.height)]})"));
          }
          ok(`geometría pública estable entre vigilancia, naranja y roja a ${width}px`, geometry.every((g) => JSON.stringify(g) === JSON.stringify(geometry[0])));
          if (width < 1024) {
            await seek(page, 248); await page.eval('scrollTo(0,500)'); await sleep(300);
            const y = await page.eval('scrollY'); await seek(page, 249);
            ok(`sin salto de scroll al pasar a roja a ${width}px`, Math.abs(await page.eval('scrollY') - y) <= 1);
          } else {
            await page.call('Emulation.setDeviceMetricsOverride', { width, height: 640, deviceScaleFactor: 1, mobile: false });
            await page.eval("document.querySelector('.hero__panel').scrollTop=0");
            await waitFor(() => page.eval("document.querySelector('#scroll-hint').dataset.visible==='true'"), 'indicador de recomendaciones');
            await click(page, '#scroll-hint'); await sleep(900);
            ok(`Ver más recomendaciones funciona y mueve el foco a ${width}px`, await page.eval("document.activeElement.id==='advice' && document.querySelector('.hero__panel').scrollTop>0 && document.querySelector('#scroll-hint').dataset.visible==='false'"));
          }
        }
      }
      await close(page);
    }
    // Logotipos: vuelven al inicio en la misma pestaña, con ratón, toque y teclado.
    const pageCount = async () => (await send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page').length;
    {
      const page = await open('/site/');
      ok('el logotipo público apunta al inicio', await page.eval("new URL(document.querySelector('.pub-brand').href).pathname === '/site/'"));
      await close(page);
    }
    {
      const page = await open('/site/nodo/');
      const before = await pageCount();
      await page.eval("document.querySelector('.apphead__brand').focus()");
      ok('el logotipo de Modo Nodo recibe foco visible con teclado', await page.eval("document.querySelector('.apphead__brand').matches(':focus-visible')"));
      await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
      await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await waitFor(() => page.eval("location.pathname === '/site/'"), 'Enter en el logotipo lleva al inicio');
      ok('Enter en el logotipo de Modo Nodo abre el inicio en la misma pestaña', (await pageCount()) === before);
      await close(page);
    }
    for (const [route, selector, width] of [['/site/nodo/', '.apphead__brand', 1440], ['/site/nodo/', '.apphead__brand', 360], ['/site/nodo/', '.brand', 1440], ['/site/operadores/', '.brand', 1440], ['/site/operadores/', '.brand', 360]]) {
      const page = await open(route);
      const touch = width < 768;
      await page.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: touch });
      const before = await pageCount();
      const { x, y } = await page.eval(`(() => { const r = document.querySelector('${selector}').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (touch) {
        await page.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await page.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await page.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      }
      await waitFor(() => page.eval("location.pathname === '/site/'"), `${selector} de ${route} lleva al inicio a ${width}px`);
      ok(`${selector} de ${route} lleva al inicio a ${width}px (${touch ? 'toque' : 'ratón'}) sin pestañas nuevas`, (await pageCount()) === before);
      await close(page);
    }
    ok('sin errores de consola, excepciones, HTTP 404 ni recursos fallidos en las pestañas reales', issues.length === 0);
    return passed;
  } finally {
    if (artifacts) writeFileSync(join(artifacts, 'console-resources.json'), JSON.stringify(issues, null, 2));
    if (issues.length) console.error(JSON.stringify(issues, null, 2));
    await send('Browser.close').catch(() => child.kill());
    await closed;
    for (const call of pending.values()) clearTimeout(call.timeout);
    rmSync(profile, { recursive: true, force: true });
  }
}
