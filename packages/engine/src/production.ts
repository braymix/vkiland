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
  // RAZZIA: la carta è posata su UNA casella. Solo la produzione di QUELLA casella
  // (quando esce il suo numero) è dirottata al razziatore; tutte le altre caselle,
  // anche se hanno lo stesso numero, fruttano normalmente ai loro proprietari.
  const raider = state.razzia ? state.razzia.player : null;
  const razziaHex = state.razzia ? state.razzia.hex : null;
  const razziaGain = state.razzia ? zeroResources() : null; // bottino della sola casella razziata

  for (const hex of state.board.hexes) {
    if (hex.token !== total) continue;
    if (hex.id === state.board.dragonHex) continue; // il Drago blocca la produzione
    if (hex.terrain === 'tundra') continue; // (per costruzione non ha token)
    const res = hex.terrain;
    // Calamità: materiale bloccato (×0) o raddoppiato (×2) per questo giro.
    const mult = materialMultiplier(state, res);
    if (mult === 0) continue;
    const raided = razziaHex !== null && hex.id === razziaHex;
    for (const v of topo.hexVertices[hex.id]!) {
      for (const p of state.players) {
        let amount = 0;
        // La Capitale (modalità Capitale) è ANCHE in `strongholds`: si controlla
        // prima, perché frutta 3 al posto dei 2 della Roccaforte.
        if (p.capitals.includes(v)) amount = 3;
        else if (p.strongholds.includes(v)) amount = 2;
        else if (p.villages.includes(v)) amount = 1;
        if (amount === 0) continue;
        if (raided) {
          // Produzione della casella razziata: tutta al razziatore.
          razziaGain![res] += amount * mult;
        } else {
          const d = demand.get(p.id) ?? zeroResources();
          d[res] += amount * mult;
          demand.set(p.id, d);
        }
      }
    }
  }

  // Il bottino della casella razziata confluisce nella richiesta del razziatore,
  // così la penuria di banca lo tratta come un unico richiedente insieme alla sua
  // produzione normale (edifici su altre caselle).
  if (razziaGain && totalResources(razziaGain) > 0) {
    const d = demand.get(raider!) ?? zeroResources();
    for (const res of RESOURCES) d[res] += razziaGain[res];
    demand.set(raider!, d);
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

  // Per il razziatore separiamo il bottino della casella razziata (evento dedicato
  // «la razzia frutta a …») dalla sua produzione normale su altre caselle. In caso
  // di penuria di banca il bottino razziato è la parte incassata per prima.
  const razziaRiscossa = zeroResources();
  const normalGains: { player: number; resources: ResourceCount }[] = [];
  for (const g of gains) {
    if (raider !== null && g.player === raider && razziaGain) {
      const own = zeroResources();
      for (const res of RESOURCES) {
        const fromRazzia = Math.min(razziaGain[res], g.resources[res]);
        razziaRiscossa[res] = fromRazzia;
        own[res] = g.resources[res] - fromRazzia;
      }
      if (totalResources(own) > 0) normalGains.push({ player: g.player, resources: own });
    } else {
      normalGains.push(g);
    }
  }
  if (normalGains.length > 0) {
    normalGains.sort((a, b) => a.player - b.player);
    events.push({ type: 'risorseProdotte', gains: normalGains });
  }
  if (totalResources(razziaRiscossa) > 0) {
    events.push({ type: 'razziaRiscossa', player: raider!, resources: razziaRiscossa });
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
