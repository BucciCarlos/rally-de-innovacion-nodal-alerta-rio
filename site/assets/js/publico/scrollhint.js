// Indicador de «hay más contenido debajo» para el panel lateral de escritorio.
// En ≥ 1024 px el panel (estado + «Qué hacer ahora») es un contenedor con scroll propio y barra oculta; si la ventana es baja,
// las recomendaciones quedan parcialmente fuera de vista. El indicador no altera la geometría del panel: es un botón flotante
// que aparece sólo mientras hay contenido por debajo y desplaza suavemente hasta las recomendaciones.
import { prefersReducedMotion } from './dom.js';

const EPS = 12;   // tolerancia (px) para considerar que el panel llegó al final

export function createScrollHint(panel, target, hint) {
  const desktop = window.matchMedia('(min-width: 1024px)');
  let raf = 0;

  const update = () => {
    raf = 0;
    const overflow = panel.scrollHeight - panel.clientHeight > EPS;
    const atEnd = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - EPS;
    const visible = desktop.matches && overflow && !atEnd;
    if (hint.dataset.visible !== String(visible)) hint.dataset.visible = String(visible);
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };

  panel.addEventListener('scroll', schedule, { passive: true });
  desktop.addEventListener('change', schedule);
  window.addEventListener('resize', schedule);
  // Los cambios de estado alteran el alto de las tarjetas: se observan los hijos del panel además del panel.
  const ro = new ResizeObserver(schedule);
  ro.observe(panel);
  for (const child of panel.children) ro.observe(child);

  hint.addEventListener('click', () => {
    const top = target.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop - 8;
    panel.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    target.focus({ preventScroll: true });   // el foco acompaña al contenido (el botón se oculta al llegar al final)
  });

  schedule();
}
