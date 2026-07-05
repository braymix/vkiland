/** Distribuzione delle risorse al tiro dei dadi (con regola di penuria banca). */
import { getTopology } from './board/topology';
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
  const topo = getTopology(state.config.boardRadius);
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
        if (p.villages.includes(v)) amount = 1;
        else if (p.strongholds.includes(v)) amount = 2;
        if (amount === 0) continue;
        const d = demand.get(p.id) ?? zeroResources();
        d[res] += amount * mult;
        demand.set(p.id, d);
      }
    }
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
    gains.sort((a, b) => a.player - b.player);
    events.push({ type: 'risorseProdotte', gains });
  }
}

/** Produzione immediata del secondo villaggio del setup: 1 risorsa per esagono adiacente. */
export function produceForSetupVillage(
  state: GameState,
  player: number,
  vertex: string,
  events: GameEvent[]
): void {
  const topo = getTopology(state.config.boardRadius);
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
