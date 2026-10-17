/**
 * Alerta Río — control de simulación compartido (widget discreto). Archivo del NÚCLEO.
 *
 *   import { mountSimControls } from '../core/sim-controls.js';
 *   mountSimControls(document.getElementById('sim-slot'), sim, { variant: 'dock' });
 *
 * Requiere <link rel="stylesheet" href="…/assets/css/sim-controls.css">.
 * variant: 'dock'   → barra flotante inferior (por defecto)
 *          'inline' → se integra en el flujo del contenedor (p. ej. en una cabecera)
 * Personalizá sólo con variables CSS (--simctl-*) desde tu propio CSS.
 */
import { fmtMinutes } from './engine.js';

const ICON = {
  reset: '<path d="M5 5h2.5v14H5zM19 5.5v13L9 12z" />',
  back: '<path d="M11 6 3 12l8 6zM21 6l-8 6 8 6z" />',
  forward: '<path d="m13 6 8 6-8 6zM3 6l8 6-8 6z" />',
  play: '<path d="M7 4.5v15l13-7.5z" />',
  pause: '<path d="M6 4.5h4v15H6zM14 4.5h4v15h-4z" />',
  flask: '<path d="M9 3h6M10 3v6.5L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9.5V3" />'
};
const svg = (name, extra = '') => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" ${extra}>${ICON[name]}</svg>`;

export function mountSimControls(container, sim, { variant = 'dock' } = {}) {
  const tl = sim.timeline;
  const levels = sim.levels;

  const root = document.createElement('div');
  root.className = `simctl simctl--${variant}`;
  root.dataset.enabled = 'false';
  root.innerHTML = `
    <button type="button" class="simctl__toggle" aria-pressed="false" aria-expanded="false" aria-controls="simctl-panel-${variant}" title="Mostrar u ocultar los controles de la línea de tiempo">
      <span class="simctl__icon">${svg('flask')}</span>
      <span class="simctl__toggle-label">Línea de tiempo</span>
      <span class="simctl__switch" aria-hidden="true"><span></span></span>
    </button>
    <div class="simctl__panel" id="simctl-panel-${variant}" role="group" aria-label="Controles del tiempo simulado" hidden>
      <div class="simctl__buttons">
        <button type="button" data-act="reset" class="simctl__btn" aria-label="Reiniciar" title="Reiniciar">${svg('reset')}</button>
        <button type="button" data-act="back" class="simctl__btn" aria-label="Retroceder ${tl.stepMin} minutos" title="Retroceder ${tl.stepMin} min">${svg('back')}</button>
        <button type="button" data-act="play" class="simctl__btn simctl__btn--primary" aria-label="Reproducir" title="Reproducir / pausar"></button>
        <button type="button" data-act="forward" class="simctl__btn" aria-label="Avanzar ${tl.stepMin} minutos" title="Avanzar ${tl.stepMin} min">${svg('forward')}</button>
        <label class="simctl__speed"><span class="sr-only">Velocidad</span>
          <select data-act="speed" aria-label="Velocidad de reproducción">${tl.speeds.map((s) => `<option value="${s}">×${s}</option>`).join('')}</select>
        </label>
      </div>
      <div class="simctl__timeline">
        <input type="range" class="simctl__range" min="${tl.min}" max="${tl.max}" step="1" value="0" aria-label="Línea temporal del escenario">
        <div class="simctl__markers" aria-hidden="true"></div>
      </div>
      <div class="simctl__meta">
        <output class="simctl__clock" aria-live="off"></output>
        <span class="simctl__phase"></span>
        <span class="sim-badge simctl__badge">Datos simulados</span>
      </div>
    </div>`;
  container.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const toggle = $('.simctl__toggle'), panel = $('.simctl__panel'), range = $('.simctl__range');
  const playBtn = $('[data-act="play"]'), speedSel = $('[data-act="speed"]');
  const clock = $('.simctl__clock'), phase = $('.simctl__phase'), markers = $('.simctl__markers');

  // Pista coloreada por fase (normal → vigilancia → naranja → roja) + marcas de predicción
  const stops = [{ t: 0, color: levels.normal.color }];
  for (const m of tl.markers) if (m.kind === 'status') stops.push({ t: m.t, color: levels[m.status].color });
  const span = tl.max - tl.min;
  const gradient = stops.map((s, i) => {
    const a = (s.t / span) * 100, b = ((stops[i + 1]?.t ?? tl.max) / span) * 100;
    return `${s.color} ${a}% ${b}%`;
  }).join(', ');
  root.style.setProperty('--simctl-track', `linear-gradient(90deg, ${gradient})`);
  markers.innerHTML = tl.markers.map((m) =>
    `<i class="simctl__mark simctl__mark--${m.kind}" style="left:${(m.t / span) * 100}%;--c:${levels[m.status].color}" title="${m.label} (+${fmtMinutes(m.t)})"></i>`).join('');

  const act = {
    reset: () => sim.reset(),
    back: () => sim.stepBack(),
    forward: () => sim.stepForward(),
    play: () => sim.togglePlay()
  };
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (b && act[b.dataset.act]) act[b.dataset.act]();
  });
  toggle.addEventListener('click', () => sim.toggleEnabled());
  speedSel.addEventListener('change', () => sim.setSpeed(Number(speedSel.value)));
  range.addEventListener('input', () => sim.seek(Number(range.value), { pause: true }));

  function render(snap) {
    const s = snap.sim;
    root.dataset.enabled = String(s.enabled);
    toggle.setAttribute('aria-pressed', String(s.enabled));
    toggle.setAttribute('aria-expanded', String(s.enabled));
    if (!s.enabled && panel.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    panel.hidden = !s.enabled;
    playBtn.innerHTML = s.playing ? svg('pause') : svg('play');
    playBtn.setAttribute('aria-label', s.playing ? 'Pausar' : (s.ended ? 'Repetir' : 'Reproducir'));
    if (document.activeElement !== speedSel) speedSel.value = String(s.speed);
    range.value = String(Math.round(s.t));
    range.style.setProperty('--p', `${(s.t / s.max) * 100}%`);
    clock.textContent = `${snap.clock} · ${snap.elapsedLabel} · Hora simulada`;
    const lvl = snap.system.level;
    phase.textContent = lvl.label;
    phase.dataset.status = snap.system.status;
  }
  const unsub = sim.subscribe(render);
  return { el: root, destroy() { unsub(); root.remove(); } };
}
