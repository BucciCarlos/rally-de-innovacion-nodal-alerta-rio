// PLACEHOLDER del núcleo — feat/operadores es dueño de assets/js/operadores/**.
import { createSimulation } from '../core/simulation.js';
import { mountSimControls } from '../core/sim-controls.js';
import { escapeHtml, fmtLevel, fmtRate } from '../core/format.js';

const app = document.getElementById('app');

try {
  const sim = await createSimulation();
  mountSimControls(document.getElementById('sim-slot'), sim, { variant: 'dock' });
  sim.subscribe((snap) => {
    app.innerHTML = `
      <p>${snap.mode === 'baseline' ? 'Estado base (simulación apagada)' : `Simulación ${snap.clock} (${snap.elapsedLabel})`} — ${escapeHtml(snap.system.level.label)}</p>
      <table class="ops-table">
        <thead><tr><th>Estación</th><th>Estado</th><th>Nivel</th><th>Tasa</th><th>Batería</th><th>Enlace</th></tr></thead>
        <tbody>${snap.stations.map((s) => `
          <tr><td>${escapeHtml(s.name)}</td><td data-status="${s.status}"><span class="ops-chip">${escapeHtml(s.status)}</span></td>
          <td>${fmtLevel(s.level)}</td><td>${fmtRate(s.rateCmH)}</td><td>${s.device.battery} %</td><td>${s.device.connectivity}</td></tr>`).join('')}
        </tbody>
      </table>
      <h3>Eventos (${snap.events.length})</h3>
      <ul>${snap.events.slice(0, 8).map((e) => `<li>${e.clock} — ${escapeHtml(e.title)}</li>`).join('')}</ul>`;
  });
} catch (err) {
  console.error(err);
  app.textContent = 'No se pudo cargar la simulación. Abrí la página desde un servidor local (ver README).';
}
