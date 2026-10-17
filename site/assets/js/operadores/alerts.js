import { fmtEta } from '../core/format.js';
import { $, text, symbols, types, clockAt } from './ui.js';

export function createAlerts(sim) {
  const root = $('alert-list');
  const nodes = new Map();
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML = '<span aria-hidden="true">✓</span><h3>Sin alertas activas</h3><p>La cuenca permanece bajo monitoreo. Los avisos aparecerán al avanzar el escenario.</p>';
  root.append(empty);

  function renderOutlook(snap) {
    const outlook = snap.system.outlook;
    $('outlook').dataset.status = outlook.status;
    $('outlook').classList.toggle('pre-alert', outlook.preAlert);
    const criticalObserved = snap.system.status === 'roja' && !outlook.preAlert;
    text('outlook-title', criticalObserved ? 'Nivel crítico observado' : outlook.label);
    text('outlook-message', criticalObserved
      ? 'El escenario alcanzó el umbral crítico. Seguí la evolución observada y las estimaciones simuladas por estación.'
      : outlook.message);
    text('outlook-eta', outlook.preAlert
      ? `Anticipación ${fmtEta(outlook.etaMin)}`
      : outlook.key === 'critical' ? 'Seguimiento crítico' : `Ventana de ${outlook.windowMin} min`);
    text('outlook-confidence', outlook.confidenceLabel
      ? `Confianza ${outlook.confidenceLabel} · estimación simulada`
      : 'Sin riesgo anticipado en esta ventana');
    $('focus-outlook').hidden = !outlook.stationId;
    text('response-copy', snap.system.level.operator);
    text('response-forecast', `Ante el pronóstico simulado: ${sim.levels[outlook.status].operator}`);
  }

  return (snap) => {
    renderOutlook(snap);
    text('alert-count', snap.alerts.length);
    empty.hidden = snap.alerts.length > 0;
    const active = new Set(snap.alerts.map((a) => a.id));
    for (const [id, node] of nodes) {
      if (!active.has(id)) { node.remove(); nodes.delete(id); }
    }
    // Preserve the engine's severity order and existing buttons, including focus.
    snap.alerts.forEach((alert, index) => {
      let node = nodes.get(alert.id);
      if (!node) {
        node = document.createElement('article');
        node.className = 'alert-item';
        node.innerHTML = '<div class="alert-meta"><span class="alert-kind"></span><span class="alert-since"></span></div><h3></h3><p></p><button type="button"></button>';
        nodes.set(alert.id, node);
      }
      node.classList.toggle('forecast-alert', alert.kind === 'forecast');
      node.dataset.status = alert.status || 'normal';
      node.dataset.kind = alert.kind;
      node.dataset.severity = alert.severity;
      const icon = alert.kind === 'forecast' ? '◇' : alert.kind === 'device' ? '⊗' : symbols[alert.status];
      node.querySelector('.alert-kind').textContent = `${icon} ${types[alert.kind]}`;
      node.querySelector('.alert-since').textContent = alert.sinceT == null
        ? 'Inicio no informado' : `Desde ${clockAt(alert.sinceT, sim.timeline)}`;
      node.querySelector('h3').textContent = alert.title;
      node.querySelector('p').textContent = alert.detail;
      const button = node.querySelector('button');
      button.dataset.alertStation = alert.stationId;
      button.textContent = `${alert.stationId} · Analizar estación ↗`;
      if (root.children[index] !== node) root.insertBefore(node, root.children[index] || empty);
    });
  };
}
