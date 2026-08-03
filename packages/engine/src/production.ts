/** Distribuzione delle risorse al tiro dei dadi (con regola di penuria banca). */
import { boardTopoKey, getTopology } from './board/topology';
import { RESOURCES } from './constants';
import type { GameEvent } from './actions';
import { materialMultiplier } from './calamityRules';
import { totalResources, zeroResources } from './resources';
import type { GameState, Resource, ResourceCount } from './types';

/**
 * Produce le risorse per il totale uscito dai dadi (≠7), mutando `state`
 * (che è già un clone). Regola di penuria: se la banca non copre una risorsa
 * richiesta da PIÙ giocatori, quella risorsa non viene distribuita a nessuno;
 * se la richiede uno solo, riceve quel che resta.
 */
export function produceResources(state: GameState, total: number, events: GameEvent[]): void {
  const topo = getTopology(boardTopoKey(state.config.boardRadius, state.config.boardShape, state.board.hexes));
  const demand = new Map<number, ResourceCount>(); // giocatore → richiesta

  for (const hex of state.board.hexes) {
    if (hex.token !== total) continue;
    if (hex.id === state.board.dragonHex) continue; // il Drago blocca la produzione
    if (hex.terrain === 'tundra') continue; // (per costruzione non ha token)
    const res = hex.terrain;
    // Calamità: materiale bloccato (×0) o raddoppiato (×2) per questo giro.
    const mult = materialMultiplier(state, res);
    if (mult === 0) continue;
    for (const v of topo.hexVertices[hex.id]!) {
      for (const p of state.players) {
        let amount = 0;
        // La Capitale (modalità Capitale) è ANCHE in `strongholds`: si controlla
        // prima, perché frutta 3 al posto dei 2 della Roccaforte.
        if (p.capitals.includes(v)) amount = 3;
        else if (p.strongholds.includes(v)) amount = 2;
        else if (p.villages.includes(v)) amount = 1;
        if (amount === 0) continue;
        const d = demand.get(p.id) ?? zeroResources();
        d[res] += amount * mult;
        demand.set(p.id, d);
      }
    }
  }

  // RAZZIA: se un clan ha giocato la Razzia, la produzione di questo tiro NON va
  // ai proprietari delle caselle — la incassa tutta il razziatore (fin dove
  // arriva la banca). Si fondono tutte le richieste in un'unica, sua.
  if (state.razzia) {
    const raider = state.razzia.player;
    const merged = zeroResources();
    for (const d of demand.values()) for (const res of RESOURCES) merged[res] += d[res];
    demand.clear();
    if (totalResources(merged) > 0) demand.set(raider, merged);
  }

  // Penuria banca, risorsa per risorsa.
  const shortage: Resource[] = [];
  for (const res of RESOURCES) {
    let totalDemand = 0;
    const claimants: number[] = [];
    for (const [pid, d] of demand) {
      if (d[res] > 0) {
        totalDemand += d[res];
        claimants.push(pid);
      }
    }
    if (totalDemand === 0 || state.bank[res] >= totalDemand) continue;
    shortage.push(res);
    if (claimants.length === 1) {
      // Unico richiedente: prende ciò che resta.
      demand.get(claimants[0]!)![res] = state.bank[res];
    } else {
      for (const pid of claimants) demand.get(pid)![res] = 0;
    }
  }

  const gains: { player: number; resources: ResourceCount }[] = [];
  for (const [pid, d] of demand) {
    if (totalResources(d) === 0) continue;
    const p = state.players[pid]!;
    for (const res of RESOURCES) {
      p.resources[res] += d[res];
      state.bank[res] -= d[res];
    }
    gains.push({ player: pid, resources: d });
  }

  if (shortage.length > 0) events.push({ type: 'penuriaBanca', resources: shortage });
  if (gains.length > 0) {
    if (state.razzia) {
      // Produzione dirottata: evento dedicato (nel log «la razzia frutta a …»).
      events.push({ type: 'razziaRiscossa', player: state.razzia.player, resources: gains[0]!.resources });
    } else {
      gains.sort((a, b) => a.player - b.player);
      events.push({ type: 'risorseProdotte', gains });
    }
  }
}

/** Produzione immediata del secondo villaggio del setup: 1 risorsa per esagono adiacente. */
export function produceForSetupVillage(
  state: GameState,
  player: number,
  vertex: string,
  events: GameEvent[]
): void {
  const topo = getTopology(boardTopoKey(state.config.boardRadius, state.config.boardShape, state.board.hexes));
  const byId = new Map(state.board.hexes.map((h) => [h.id, h]));
  const gained = zeroResources();
  for (const hexId of topo.vertexLandHexes[vertex]!) {
    const hex = byId.get(hexId)!;
    if (hex.terrain === 'tundra') continue;
    if (state.bank[hex.terrain] > 0) {
      gained[hex.terrain] += 1;
      state.bank[hex.terrain] -= 1;
      state.players[player]!.resources[hex.terrain] += 1;
    }
  }
  if (totalResources(gained) > 0) {
    events.push({ type: 'risorseProdotte', gains: [{ player, resources: gained }] });
  }
}
