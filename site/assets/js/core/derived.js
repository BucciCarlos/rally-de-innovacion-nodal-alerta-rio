/**
 * Nodal — indicadores derivados de un snapshot (PUROS y deterministas). Archivo del NÚCLEO.
 * No modifican el motor: sólo reinterpretan datos que ya trae el snapshot (conectividad, estado de zonas).
 * Todo es conceptual: LoRa y las sirenas son parte de la arquitectura propuesta; nada se envía ni se activa.
 */

export const LORA_STATES = {
  activo:       { label: 'Enlace activo' },
  debil:        { label: 'Enlace débil' },
  'sin-enlace': { label: 'Sin enlace' }
};

export const SIREN_STATES = {
  reposo:      { label: 'En reposo',               severity: 0 },
  advertencia: { label: 'Advertencia simulada',    severity: 1 },
  activa:      { label: 'Activación conceptual',   severity: 2 }
};

/** Enlace LoRa conceptual de una estación, derivado de su conectividad simulada. */
export function loraLink(station) {
  const d = station.device;
  const state = d.connectivity === 'online' ? 'activo' : d.connectivity === 'degraded' ? 'debil' : 'sin-enlace';
  const rssi = d.signalDbm;                                   // dBm (simulado), null sin enlace
  const snr = rssi == null ? null : Math.round(Math.min(9.5, (rssi + 112) / 3.2) * 10) / 10;   // dB (ilustrativo)
  const sf = rssi == null ? null : rssi >= -90 ? 7 : rssi >= -100 ? 8 : rssi >= -108 ? 9 : 10;  // factor de dispersión (ilustrativo)
  return { simulated: true, state, label: LORA_STATES[state].label, rssi, snr, sf };
}

/** Resumen de la red de nodos → gateway → centro de operaciones. */
export function networkSummary(snap) {
  const nodes = snap.stations.map((s) => ({ id: s.id, short: s.short, status: s.status, ...loraLink(s) }));
  const linked = nodes.filter((n) => n.state !== 'sin-enlace').length;
  const weak = nodes.filter((n) => n.state === 'debil').length;
  const down = nodes.length - linked;
  const state = down === nodes.length ? 'sin-datos' : down || weak ? 'degradada' : 'activa';
  const label = state === 'activa' ? 'Red operativa' : state === 'degradada' ? 'Red degradada' : 'Red sin datos';
  return {
    simulated: true, nodes, linked, weak, down, total: nodes.length, state, label,
    gateway: { name: 'Gateway Villa Serena (conceptual)', state: linked ? 'activo' : 'sin-datos' }
  };
}

/** Sirenas barriales conceptuales: una por zona urbana/portuaria baja (bias 0). Reposo → advertencia (naranja) → activación (roja). */
export function sirens(snap, mapData) {
  return mapData.zones
    .filter((z) => z.bias === 0 && z.kind !== 'rural')
    .map((z) => {
      const zone = snap.zones.find((x) => x.id === z.id);
      const state = zone.severity >= 3 ? 'activa' : zone.severity === 2 ? 'advertencia' : 'reposo';
      return { simulated: true, id: `SR-${z.id}`, zoneId: z.id, name: `Sirena ${z.name}`, stationId: z.stationId, state, label: SIREN_STATES[state].label };
    });
}
