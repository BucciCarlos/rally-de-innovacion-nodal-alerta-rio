import { fmtLevel, fmtRate } from '../core/format.js';
import { $, text, clockAt } from './ui.js';

export function createCharts(sim) {
  const Chart = window.Chart;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nowPlugin = { id: 'scenarioNow', afterDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || chart.$now == null) return;
    const x = scales.x.getPixelForValue(chart.$now);
    ctx.save(); ctx.strokeStyle = '#c5d7e3'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke();
    ctx.fillStyle = '#c5d7e3'; ctx.font = '10px Inter Variable, sans-serif'; ctx.fillText('Ahora', Math.min(x + 6, chartArea.right - 34), chartArea.top + 12); ctx.restore();
  } };
  const common = {
    responsive: true, maintainAspectRatio: false, animation: reduced ? false : { duration: 0 },
    color: '#a9bdcc', font: { family: 'Inter Variable, sans-serif' },
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#132d42', titleColor: '#f4f8fb', bodyColor: '#d4e3ec' } }
  };
  const history = new Chart($('history-chart'), {
    type: 'line', plugins: [nowPlugin], data: { datasets: [] }, options: {
      ...common, parsing: false, normalized: false, spanGaps: false,
      elements: { point: { radius: 0, hitRadius: 8 }, line: { borderWidth: 2, tension: .18 } },
      scales: { x: { type: 'linear', grid: { color: '#1e3545' }, ticks: { color: '#a9bdcc', maxTicksLimit: 6, includeBounds: false, callback: (v) => clockAt(v, sim.timeline) } }, y: { grid: { color: '#1e3545' }, ticks: { color: '#a9bdcc', callback: (v) => `${v.toLocaleString('es-AR')} m` } } },
      plugins: { ...common.plugins, tooltip: { ...common.plugins.tooltip, filter: (item) => item.datasetIndex < 2, callbacks: { title: (items) => clockAt(items[0].parsed.x, sim.timeline), label: (item) => `${item.dataset.label}: ${fmtLevel(item.parsed.y)}` } } }
    }
  });
  const comparison = new Chart($('comparison-chart'), { type: 'bar', data: { labels: [], datasets: [{ label: 'Recorrido desde nivel base al umbral rojo', data: [], borderRadius: 3 }] }, options: {
    ...common, indexAxis: 'y', scales: { x: { min: 0, suggestedMax: 110, grid: { color: '#1e3545' }, ticks: { color: '#a9bdcc', callback: (v) => `${v} %` } }, y: { grid: { display: false }, ticks: { color: '#d4e3ec' } } },
    plugins: { ...common.plugins, tooltip: { ...common.plugins.tooltip, callbacks: { label: (item) => `${item.parsed.x.toLocaleString('es-AR')} % del recorrido base → crítico` } } }
  } });
  let last = '';
  return {
    resize() { history.resize(); comparison.resize(); },
    render(snap, selected) {
      const key = `${selected}|${snap.mode}|${Math.floor(snap.t)}`;
      if (key === last) return;
      last = key;
      const st = snap.stations.find((s) => s.id === selected), points = st.forecast.points;
      const min = st.history[0]?.t ?? snap.t - 60;
      const max = snap.t + (points.at(-1)?.dtMin ?? st.forecast.horizonMin);
      const fc = (field) => points.map((p) => ({ x: snap.t + p.dtMin, y: p[field] }));
      history.$now = snap.t;
      history.options.scales.x.min = min; history.options.scales.x.max = max;
      history.data.datasets = [
        { label: 'Nivel observado', data: st.history.map((p) => ({ x: p.t, y: p.level })), borderColor: '#82d7ea', spanGaps: false, order: 0 },
        { label: 'Estimación simulada', data: fc('level'), borderColor: sim.levels[st.forecast.predictedStatus].color, borderDash: [6, 5], order: 0 },
        { label: 'Banda inferior', data: fc('low'), borderWidth: 0, pointRadius: 0, order: 2 },
        { label: 'Banda superior', data: fc('high'), borderWidth: 0, pointRadius: 0, backgroundColor: 'rgba(130,215,234,.09)', fill: '-1', order: 2 },
        ...['vigilancia', 'naranja', 'roja'].map((s) => ({ label: sim.levels[s].label, data: [{ x: min, y: st.thresholds[s] }, { x: max, y: st.thresholds[s] }], borderColor: sim.levels[s].color, borderWidth: 1, borderDash: [3, 5], order: 1 }))
      ];
      history.update('none');
      comparison.data.labels = snap.stations.map((s) => `${s.id}${s.stale ? ' ◷' : ''}`);
      comparison.data.datasets[0].data = snap.stations.map((s) => Math.round(s.fill * 100));
      comparison.data.datasets[0].backgroundColor = snap.stations.map((s) => sim.levels[s.status].color);
      comparison.update('none');
      text('chart-station', `· ${st.id}`);
      text('chart-description', `${st.name}: ${fmtLevel(st.level)}, ${fmtRate(st.rateCmH)}. Pico simulado ${fmtLevel(st.forecast.peakLevel)}. Umbrales: vigilancia ${fmtLevel(st.thresholds.vigilancia)}, naranja ${fmtLevel(st.thresholds.naranja)}, roja ${fmtLevel(st.thresholds.roja)}.${st.stale ? ' Sin conexión: los huecos del historial no se interpolan.' : ''}`);
    }
  };
}
