// PLACEHOLDER del núcleo — feat/publico es dueño de assets/js/publico/**.
// Demuestra el contrato mínimo: crear la simulación, montar el control y renderizar un snapshot.
import { createSimulation } from '../core/simulation.js';
import { mountSimControls } from '../core/sim-controls.js';
import { escapeHtml, fmtLevel } from '../core/format.js';

const app = document.getElementById('app');

try {
  const sim = await createSimulation();
  mountSimControls(document.getElementById('sim-slot'), sim, { variant: 'dock' });
  sim.subscribe((snap) => {
    const { system, stations } = snap;
    app.innerHTML = `
      <section class="pub-banner" data-status="${system.status}">
        <h1>${escapeHtml(system.level.headline)}</h1>
        <p>${escapeHtml(system.outlook.message)}</p>
      </section>
      <ul class="pub-list">${stations.map((s) => `
        <li data-status="${s.status}"><span class="pub-dot"></span>${escapeHtml(s.name)} — ${fmtLevel(s.level)}</li>`).join('')}
      </ul>`;
  });
} catch (err) {
  console.error(err);
  app.textContent = 'No se pudo cargar la simulación. Abrí la página desde un servidor local (ver README).';
}
