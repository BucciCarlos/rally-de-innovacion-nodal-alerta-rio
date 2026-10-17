/**
 * Alerta Río — controlador de estado compartido (reproducción + sincronización entre pestañas).
 * Archivo del NÚCLEO: no editar desde feat/publico ni feat/operadores.
 *
 * Estado compartido (JSON) en localStorage['alertaRio.sim.v1'] y por BroadcastChannel('alerta-rio-sim'):
 *   { v, rev, origin, updatedAt, enabled, playing, speed, t, anchorWall }
 *
 * El tiempo NO se transmite cuadro a cuadro: cada pestaña calcula
 *   t = t_ancla + (ahora - anchorWall)/1000 * speed
 * y sólo se escribe/difunde cuando el usuario actúa (play, pausa, seek, velocidad…).
 * Resolución de conflictos: gana la mayor `rev`; empate → la más reciente (`updatedAt`).
 *
 * No hace red, no envía notificaciones ni activa dispositivos externos.
 */

export const STORAGE_KEY = 'alertaRio.sim.v1';
export const CHANNEL_NAME = 'alerta-rio-sim';
const TICK_MS = 200;

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
  return typeof BroadcastChannel === 'function' ? new BroadcastChannel(name) : null;
}

function validState(s) {
  return s && s.v === 1 && Number.isFinite(s.rev) && typeof s.enabled === 'boolean' && typeof s.playing === 'boolean'
    && Number.isFinite(s.speed) && Number.isFinite(s.t) && Number.isFinite(s.anchorWall);
}

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
    v: 1, rev: 0, origin, updatedAt: 0,
    enabled: false, playing: false, speed: cfg.defaultSpeed, t: 0, anchorWall: now()
  };
  const listeners = new Set();
  let timer = null;
  let lastEmittedT = NaN;
  let wasEnded = false;

  /* ---- lectura derivada ---- */
  function currentT() {
    if (!st.enabled) return cfg.baselineT;
    if (!st.playing) return st.t;
    return clamp(st.t + ((now() - st.anchorWall) / 1000) * st.speed, 0, cfg.duration);
  }
  function view() {
    const t = currentT();
    const ended = st.enabled && t >= cfg.duration;
    return {
      enabled: st.enabled,
      playing: st.enabled && st.playing && !ended,
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
    if (v.t !== lastEmittedT || v.ended !== wasEnded) emit('tick');
    else syncTimer();
  }

  /* ---- escritura + difusión ---- */
  let channel = null;
  function persist() {
    const str = JSON.stringify(st);
    storage.write(str);
    if (channel) { try { channel.postMessage({ type: 'state', state: st }); } catch { /* canal cerrado */ } }
  }
  /** Aplica una mutación tomando como ancla el instante actual y difunde. */
  function commit(mutate, reason) {
    const t = currentT();
    const effPlaying = view().playing;
    st = { ...st, t: st.enabled ? t : st.t, playing: effPlaying, anchorWall: now() };
    mutate(st);
    st.rev += 1; st.origin = origin; st.updatedAt = now();
    persist();
    emit(reason);
  }

  function adopt(remote, reason) {
    if (!validState(remote)) return false;
    const newer = remote.rev > st.rev || (remote.rev === st.rev && remote.origin !== origin && remote.updatedAt > st.updatedAt);
    if (!newer) return false;
    st = { ...remote };
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
    enable()  { if (!st.enabled) commit((s) => { s.enabled = true; s.playing = false; s.t = clamp(s.t, 0, cfg.duration); }, 'enable'); },
    disable() { if (st.enabled) commit((s) => { s.enabled = false; s.playing = false; }, 'disable'); },
    toggleEnabled() { st.enabled ? api.disable() : api.enable(); },
    play() {
      if (!st.enabled) return;
      commit((s) => { if (s.t >= cfg.duration) s.t = 0; s.playing = true; }, 'play');
    },
    pause() { if (st.enabled) commit((s) => { s.playing = false; }, 'pause'); },
    togglePlay() { view().playing ? api.pause() : api.play(); },
    seek(t, { pause = false } = {}) {
      if (!st.enabled) return;
      commit((s) => { s.t = clamp(Number(t) || 0, 0, cfg.duration); if (pause) s.playing = false; }, 'seek');
    },
    step(deltaMin = cfg.stepMin) {
      if (!st.enabled) return;
      commit((s) => { s.t = clamp(s.t + deltaMin, 0, cfg.duration); s.playing = false; }, 'step');
    },
    stepForward() { api.step(cfg.stepMin); },
    stepBack() { api.step(-cfg.stepMin); },
    reset() { if (st.enabled) commit((s) => { s.t = 0; s.playing = false; }, 'reset'); },
    setSpeed(v) { if (cfg.speeds.includes(v)) commit((s) => { s.speed = v; }, 'speed'); },
    destroy() {
      if (timer) clearIv(timer);
      timer = null; listeners.clear();
      unsubStorage(); if (channel) { try { channel.close(); } catch { /* noop */ } }
    }
  };

  /* ---- arranque: hidratar + escuchar ---- */
  try {
    const raw = storage.read();
    if (raw) { const parsed = JSON.parse(raw); if (validState(parsed)) { st = { ...parsed }; } }
  } catch { /* estado corrupto → se ignora */ }

  channel = channelFactory(CHANNEL_NAME);
  if (channel) {
    channel.onmessage = (ev) => {
      const m = ev.data;
      if (!m) return;
      if (m.type === 'state') adopt(m.state, 'remote');
      else if (m.type === 'hello' && m.origin !== origin && st.rev > 0) { try { channel.postMessage({ type: 'state', state: st }); } catch { /* noop */ } }
    };
    try { channel.postMessage({ type: 'hello', origin }); } catch { /* noop */ }
  }
  const unsubStorage = storage.subscribe((str) => { try { adopt(JSON.parse(str), 'remote'); } catch { /* noop */ } });
  syncTimer();

  return api;
}
