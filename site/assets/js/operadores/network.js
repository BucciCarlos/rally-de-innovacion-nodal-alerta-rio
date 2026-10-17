import { networkSummary, sirens, SIREN_STATES } from '../core/derived.js';
import { $, esc, html, text } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const NODE_X = (i) => 22 + i * 34, NODE_Y = 28, BUS_Y = 62, GW = [248, 62], HQ = [304, 62];
const SIREN_ICON = { reposo: '○', advertencia: '◐', activa: '●' };
const LINK_ICON = { activo: '', debil: '~', 'sin-enlace': '×' };

/** Red LoRa (nodos → gateway → centro) y sirenas barriales: indicadores compactos y conceptuales, derivados del snapshot. */
export function createNetwork(sim) {
  const svg = $('network-svg');
  const el = (name, attrs) => { const n = document.createElementNS(NS, name); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  const ids = sim.getSnapshot().stations.map((s) => s.id);
  const lines = [], nodes = [], labels = [], marks = [];
  ids.forEach((id, i) => {
    const line = el('line', { x1: NODE_X(i), y1: NODE_Y + 9, x2: NODE_X(i), y2: BUS_Y, class: 'net-line' });
    svg.append(line); lines.push(line);
  });
  svg.prepend(el('line', { x1: NODE_X(0), y1: BUS_Y, x2: GW[0] - 8, y2: BUS_Y, class: 'net-bus' }));
  const hqLine = el('line', { x1: GW[0] + 9, y1: GW[1], x2: HQ[0] - 11, y2: HQ[1], class: 'net-line net-line--hq' }); svg.append(hqLine);
  ids.forEach((id, i) => {
    const g = el('g', { class: 'net-node' });
    g.append(el('circle', { cx: NODE_X(i), cy: NODE_Y, r: 8 }));
    const mark = el('text', { x: NODE_X(i), y: NODE_Y + 3.5, class: 'net-mark' }); g.append(mark);
    const label = el('text', { x: NODE_X(i), y: NODE_Y - 14, class: 'net-label' }); label.textContent = id; g.append(label);
    svg.append(g); nodes.push(g); marks.push(mark);
  });
  const gw = el('g', { class: 'net-gw' });
  gw.append(el('path', { d: `M${GW[0]} ${GW[1] - 10}v20M${GW[0] - 6} ${GW[1] + 10}h12M${GW[0] - 6} ${GW[1] - 4}a8 8 0 0 1 12 0M${GW[0] - 10} ${GW[1] - 9}a13 13 0 0 1 20 0` }));
  const gwl = el('text', { x: GW[0], y: GW[1] + 26, class: 'net-label' }); gwl.textContent = 'Gateway'; gw.append(gwl);
  const hq = el('g', { class: 'net-hq' });
  hq.append(el('rect', { x: HQ[0] - 11, y: HQ[1] - 8, width: 22, height: 16, rx: 3 }));
  const hql = el('text', { x: HQ[0], y: HQ[1] + 26, class: 'net-label' }); hql.textContent = 'Centro'; hq.append(hql);
  svg.append(gw, hq);

  const nodeLink = $('node-link');
  return (snap, selected) => {
    const net = networkSummary(snap);
    const pill = $('network-state'); pill.dataset.tone = net.state === 'activa' ? 'ok' : net.state === 'degradada' ? 'warn' : 'bad';
    text('network-state', net.label);
    net.nodes.forEach((n, i) => {
      nodes[i].dataset.state = n.state; lines[i].dataset.state = n.state; marks[i].textContent = LINK_ICON[n.state];
      nodes[i].classList.toggle('is-selected', n.id === selected);
    });
    hqLine.dataset.state = net.gateway.state;
    text('network-note', `${net.linked}/${net.total} nodos con enlace${net.weak ? ` · ${net.weak} con señal débil` : ''}${net.down ? ` · ${net.down} sin enlace (${net.nodes.filter((n) => n.state === 'sin-enlace').map((n) => n.id).join(', ')})` : ''}. Esquema conceptual: LoRa es parte de la arquitectura propuesta.`);
    html($('siren-list'), sirens(snap, sim.data.map).map((s) => `<li data-state="${s.state}"><span class="siren-icon" aria-hidden="true">${SIREN_ICON[s.state]}</span><span class="siren-name">${esc(s.name.replace('Sirena ', ''))}</span><strong>${esc(SIREN_STATES[s.state].label)}</strong></li>`).join(''));
    if (nodeLink) nodeLink.setAttribute('href', `../nodo/#${selected}`);
  };
}
