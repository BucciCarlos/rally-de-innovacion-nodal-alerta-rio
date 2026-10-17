/**
 * Alerta Río — controlador de estado compartido (reproducción + sincronización entre pestañas).
 * Archivo del NÚCLEO: no editar desde feat/publico ni feat/operadores.
 *
 * Estado compartido (JSON) en localStorage['alertaRio.sim.v1'] y por BroadcastChannel('alerta-rio-sim'):
 *   { v, rev, origin, updatedAt, lastActivityAt?, enabled, playing, speed, t, anchorWall }
 *
 * El tiempo NO se transmite cuadro a cuadro: cada pestaña calcula
 *   t = t_ancla + (ahora - anchorWall)/1000 * speed
 * enabled sólo muestra los controles. Se guardan puntos de recuperación durante play;
 * al cargar, playing sólo se recupera si una pestaña viva responde al saludo.
 * Resolución de conflictos: gana la mayor `rev`; empate → la más reciente (`updatedAt`).
 *
 * No hace red, no envía notificaciones ni activa dispositivos externos.
 */

export const STORAGE_KEY = 'alertaRio.sim.v1';
export const CHANNEL_NAME = 'alerta-rio-sim';
const TICK_MS = 200;
const CHECKPOINT_MS = 1000;
export const SESSION_IDLE_MS = 12 * 60 * 60 * 1000;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const randomId = () => Math.random().toString(36).slice(2, 10);

/** Adaptadores por defecto (navegador). En tests se inyectan versiones en memoria. */
export function browserStorage() {
  let ls = null;
  try { ls = window.localStorage; ls.getItem(STORAGE_KEY); } catch { ls = null; }
  return {
    read() { try { return ls ? ls.getItem(STORAGE_KEY) : null; } catch { return null; } },
    write(str) { try { if (ls) ls.setItem(STORAGE_KEY, str); } catch { /* cuota/privado: se ignora */ } },
    subscribe(cb) {
      const h = (ev) => { if (ev.key === STORAGE_KEY && ev.newValue) cb(ev.newValue); };
      window.addEventListener('storage', h);
      return () => window.removeEventListener('storage', h);
    }
  };
}
export function browserChannel(name) {
  if (typeof BroadcastChannel === 'function') return new BroadcastChannel(name);
  // Señales efímeras de presencia; no son otra fuente de tiempo ni reemplazan el estado.
  const key = `${STORAGE_KEY}.signal`;
  const channel = {
    onmessage: null,
    postMessage(message) {
      try {
        window.localStorage.setItem(key, JSON.stringify(message));
        window.localStorage.removeItem(key);
      } catch { /* almacenamiento bloqueado: operación local */ }
    },
    close() { window.removeEventListener('storage', receive); }
  };
  function receive(ev) {
    if (ev.key !== key || !ev.newValue) return;
    try { channel.onmessage?.({ data: JSON.parse(ev.newValue) }); } catch { /* señal corrupta */ }
  }
  window.addEventListener('storage', receive);
  return channel;
}

function validState(s) {
  return s && s.v === 1 && Number.isSafeInteger(s.rev) && s.rev >= 0 && typeof s.origin === 'string'
    && Number.isFinite(s.updatedAt) && typeof s.enabled === 'boolean' && typeof s.playing === 'boolean'
    && Number.isFinite(s.speed) && Number.isFinite(s.t) && Number.isFinite(s.anchorWall)
    && (s.lastActivityAt === undefined || Number.isFinite(s.lastActivityAt));
}

const compare = (a, b) => a.rev - b.rev || a.updatedAt - b.updatedAt || a.origin.localeCompare(b.origin);

/**
 * @param {{duration:number, baselineT:number, speeds:number[], defaultSpeed:number, stepMin:number}} cfg
 * @param {{storage?:object, channelFactory?:Function, now?:()=>number, origin?:string, setInterval?:Function, clearInterval?:Function}} [deps]
 */
export function createController(cfg, deps = {}) {
  const storage = deps.storage ?? browserStorage();
  const channelFactory = deps.channelFactory ?? browserChannel;
  const now = deps.now ?? (() => Date.now());
  const setIv = deps.setInterval ?? ((f, ms) => setInterval(f, ms));
  const clearIv = deps.clearInterval ?? ((id) => clearInterval(id));
  const origin = deps.origin ?? randomId();

  let st = {
    v: 1, rev: 0, origin, updatedAt: now(), lastActivityAt: now(),
    enabled: false, playing: false, speed: cfg.defaultSpeed, t: 0, anchorWall: now()
  };
  const listeners = new Set();
  let timer = null;
  let lastEmittedT = NaN;
  let wasEnded = false;
  let lastCheckpoint = now();
  let joining = null;
  let destroyed = false;

  /* ---- lectura derivada ---- */
  function currentT() {
    if (!st.playing) return st.t;
    return clamp(st.t + ((now() - st.anchorWall) / 1000) * st.speed, 0, cfg.duration);
  }
  function view() {
    const t = currentT();
    const ended = t >= cfg.duration;
    return {
      enabled: st.enabled,
      playing: st.playing && !ended,
      ended, speed: st.speed, speeds: cfg.speeds, stepMin: cfg.stepMin,
      t, min: 0, max: cfg.duration, baselineT: cfg.baselineT,
      rev: st.rev, origin: st.origin
    };
  }

  function emit(reason) {
    const v = view();
    lastEmittedT = v.t;
    wasEnded = v.ended;
    listeners.forEach((fn) => { try { fn(v, reason); } catch (e) { console.error('[alerta-rio] suscriptor falló', e); } });
    syncTimer();
  }
  function syncTimer() {
    const v = view();
    if (v.playing && !timer) timer = setIv(tick, TICK_MS);
    else if (!v.playing && timer) { clearIv(timer); timer = null; }
  }
  function tick() {
    const v = view();
    if (v.ended && st.playing) { commit((s) => { s.playing = false; }, 'ended', false); return; }
    if (now() - lastCheckpoint >= CHECKPOINT_MS) checkpoint();
    if (v.t !== lastEmittedT || v.ended !== wasEnded) emit('tick');
    else syncTimer();
  }

  /* ---- escritura + difusión ---- */
  let channel = null;
  function post(message) { try { channel?.postMessage(message); } catch { /* canal cerrado */ } }
  function persist() {
    const str = JSON.stringify(st);
    storage.write(str);
    post({ type: 'state', state: st });
  }
  function readStored() {
    try {
      const s = JSON.parse(storage.read());
      return validState(s) && cfg.speeds.includes(s.speed) ? s : null;
    } catch { return null; }
  }
  function expired(s) { return now() - (s.lastActivityAt ?? s.updatedAt) >= SESSION_IDLE_MS; }
  function checkpoint() {
    if (!st.playing) return;
    const stored = readStored();
    if (stored && compare(stored, st) > 0) return;
    storage.write(JSON.stringify({ ...st, t: currentT(), anchorWall: now() }));
    lastCheckpoint = now();
  }
  /** Aplica una mutación tomando como ancla el instante actual y difunde. */
  function commit(mutate, reason, activity = true) {
    const stored = readStored();
    if (stored) adopt(stored, 'remote');
    const t = currentT();
    const effPlaying = view().playing;
    st = { ...st, t, playing: effPlaying, anchorWall: now() };
    mutate(st);
    st.rev += 1; st.origin = origin; st.updatedAt = now();
    if (activity) st.lastActivityAt = now();
    joining = null;
    lastCheckpoint = now();
    persist();
    emit(reason);
  }

  function adopt(remote, reason, liveReply = false) {
    if (!validState(remote) || !cfg.speeds.includes(remote.speed) || expired(remote)) return false;
    const order = compare(remote, st);
    const newer = order > 0 || (liveReply && order === 0 && remote.playing && !st.playing);
    if (!newer) return false;
    st = { ...remote, t: clamp(remote.t, 0, cfg.duration) };
    emit(reason);
    return true;
  }

  /* ---- acciones públicas ---- */
  const api = {
    getState: view,
    subscribe(fn, { immediate = true } = {}) {
      listeners.add(fn);
      if (immediate) fn(view(), 'init');
      return () => listeners.delete(fn);
    },
    enable()  { if (!st.enabled) commit((s) => { s.enabled = true; }, 'enable'); },
    disable() { if (st.enabled || st.playing) commit((s) => { s.enabled = false; s.playing = false; }, 'disable'); },
    toggleEnabled() { st.enabled ? api.disable() : api.enable(); },
    play() {
      commit((s) => { if (s.t >= cfg.duration) s.t = 0; s.playing = true; }, 'play');
    },
    pause() { commit((s) => { s.playing = false; }, 'pause'); },
    togglePlay() { view().playing ? api.pause() : api.play(); },
    seek(t, { pause = false } = {}) {
      commit((s) => { s.t = clamp(Number(t) || 0, 0, cfg.duration); if (pause) s.playing = false; }, 'seek');
    },
    step(deltaMin = cfg.stepMin) {
      commit((s) => { s.t = clamp(s.t + deltaMin, 0, cfg.duration); s.playing = false; }, 'step');
    },
    stepForward() { api.step(cfg.stepMin); },
    stepBack() { api.step(-cfg.stepMin); },
    reset() { commit((s) => { s.t = 0; s.playing = false; }, 'reset'); },
    setSpeed(v) { if (cfg.speeds.includes(v)) commit((s) => { s.speed = v; }, 'speed'); },
    destroy() {
      if (destroyed) return;
      checkpoint(); destroyed = true;
      if (timer) clearIv(timer);
      timer = null; listeners.clear();
      unsubStorage(); if (channel) { try { channel.close(); } catch { /* noop */ } }
      page?.removeEventListener('pagehide', hide);
      page?.removeEventListener('pageshow', show);
    }
  };

  /* ---- arranque: hidratar + escuchar ---- */
  function hydrate() {
    const saved = readStored();
    if (!saved) return;
    if (expired(saved)) {
      st = { ...st, rev: saved.rev + 1, origin, updatedAt: now(), lastActivityAt: now(),
        enabled: false, playing: false, t: 0, speed: cfg.defaultSpeed, anchorWall: now() };
      storage.write(JSON.stringify(st));
    } else {
      // Nunca extrapolar un ancla guardada al abrir/reabrir una página.
      st = { ...saved, t: clamp(saved.t, 0, cfg.duration), playing: false, anchorWall: now() };
    }
  }
  hydrate();

  function hello() {
    joining = `${origin}:${randomId()}`;
    post({ type: 'hello', origin, request: joining });
  }

  channel = channelFactory(CHANNEL_NAME);
  if (channel) {
    channel.onmessage = (ev) => {
      const m = ev.data;
      if (!m) return;
      if (m.type === 'state') adopt(m.state, 'remote');
      else if (m.type === 'hello' && m.origin !== origin) {
        post({ type: 'welcome', target: m.origin, request: m.request,
          state: { ...st, t: currentT(), playing: view().playing, anchorWall: now() } });
      } else if (m.type === 'welcome' && joining && m.target === origin && m.request === joining) adopt(m.state, 'remote', true);
    };
  }
  const unsubStorage = storage.subscribe((str) => { try { adopt(JSON.parse(str), 'remote'); } catch { /* noop */ } });
  // BFCache: una página congelada deja de ser prueba de reproducción activa.
  const page = deps.lifecycle ?? (typeof window === 'object' ? window : null);
  function hide() {
    checkpoint();
    st = { ...st, t: currentT(), playing: false, anchorWall: now() };
    syncTimer();
  }
  function show(event) { if (event.persisted) { hydrate(); emit('restore'); hello(); } }
  page?.addEventListener('pagehide', hide);
  page?.addEventListener('pageshow', show);
  hello();
  syncTimer();

  return api;
}
