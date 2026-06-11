/**
 * Funzioni di valutazione condivise dalle euristiche: tutto è calcolato
 * sulla vista filtrata (informazione pubblica + la propria mano).
 */
import {
  RESOURCES,
  getTopology,
  pipWeight,
  vertexFreeWithDistance,
  zeroResources,
  type Hex,
  type PlayerView,
  type Resource,
  type ResourceCount,
  type VertexId,
} from '@vikiland/engine';

export function hexById(view: PlayerView): Map<string, Hex> {
  return new Map(view.board.hexes.map((h) => [h.id, h]));
}

/** Pip per risorsa garantiti da un vertice (esagoni di terra adiacenti). */
export function vertexPips(view: PlayerView, vertex: VertexId): ResourceCount {
  const topo = getTopology();
  const byId = hexById(view);
  const out = zeroResources();
  for (const hexId of topo.vertexLandHexes[vertex] ?? []) {
    const hex = byId.get(hexId);
    if (!hex || hex.terrain === 'tundra' || hex.token === null) continue;
    out[hex.terrain] += pipWeight(hex.token);
  }
  return out;
}

export function vertexTotalPips(view: PlayerView, vertex: VertexId): number {
  const pips = vertexPips(view, vertex);
  return RESOURCES.reduce((sum, r) => sum + pips[r], 0);
}

/** Pip per risorsa già coperti dagli edifici del giocatore. */
export function playerPips(view: PlayerView, player: number): ResourceCount {
  const out = zeroResources();
  const me = view.players[player];
  if (!me) return out;
  for (const v of [...me.villages, ...me.strongholds]) {
    const pips = vertexPips(view, v);
    for (const r of RESOURCES) out[r] += pips[r];
  }
  return out;
}

/**
 * Punteggio di piazzamento di un vertice: produzione + bonus per le risorse
 * NUOVE rispetto a quelle già coperte + bonus approdo.
 */
export function placementScore(view: PlayerView, player: number, vertex: VertexId): number {
  const topo = getTopology();
  const own = playerPips(view, player);
  const pips = vertexPips(view, vertex);
  let score = 0;
  let nuove = 0;
  for (const r of RESOURCES) {
    score += pips[r];
    if (pips[r] > 0 && own[r] === 0) nuove += 1;
  }
  score += nuove * 1.5;
  for (const port of view.board.ports) {
    const [v1, v2] = topo.edgeVertices[port.edge]!;
    if (v1 !== vertex && v2 !== vertex) continue;
    if (port.kind === 'generico') {
      score += 1;
    } else {
      // Un approdo 2:1 vale molto se produciamo (o produrremo) quella risorsa.
      score += own[port.kind] + pips[port.kind] >= 4 ? 2 : 0.5;
    }
  }
  return score;
}

export type Goal = 'villaggio' | 'roccaforte' | 'sentiero' | 'cartaSaga';

/**
 * Obiettivo corrente del bot, con il costo da proteggere (scarti/scambi):
 * prima espandersi dove c'è uno spot, poi promuovere a roccaforte, poi
 * aprire nuovi spot coi sentieri, infine comprare carte.
 */
export function currentGoal(
  view: PlayerView,
  player: number,
  costs: Record<'sentiero' | 'villaggio' | 'roccaforte' | 'cartaSaga', ResourceCount>,
  hasVillageSpot: boolean
): { goal: Goal; cost: ResourceCount } {
  const me = view.players[player]!;
  if (hasVillageSpot && me.villages.length < 5) {
    return { goal: 'villaggio', cost: costs.villaggio };
  }
  if (me.villages.length > 0 && me.strongholds.length < 4) {
    return { goal: 'roccaforte', cost: costs.roccaforte };
  }
  if (me.roads.length < 15) {
    return { goal: 'sentiero', cost: costs.sentiero };
  }
  return { goal: 'cartaSaga', cost: costs.cartaSaga };
}

/** Quanto manca per coprire un costo. */
export function deficit(have: ResourceCount, cost: ResourceCount): ResourceCount {
  const out = zeroResources();
  for (const r of RESOURCES) out[r] = Math.max(0, cost[r] - have[r]);
  return out;
}

export function totalOf(rc: ResourceCount): number {
  return RESOURCES.reduce((s, r) => s + rc[r], 0);
}

/**
 * Valore di espansione di uno spigolo: il miglior vertice libero raggiungibile
 * subito (estremi dello spigolo) o al passo successivo (vicini degli estremi,
 * scontati del 40%).
 */
export function edgeExpansionScore(view: PlayerView, player: number, edge: string): number {
  const topo = getTopology();
  let best = 0;
  for (const v of topo.edgeVertices[edge] ?? []) {
    if (vertexFreeWithDistance(view, v)) {
      best = Math.max(best, placementScore(view, player, v));
    }
    for (const w of topo.vertexNeighbors[v] ?? []) {
      if (vertexFreeWithDistance(view, w)) {
        best = Math.max(best, placementScore(view, player, w) * 0.6);
      }
    }
  }
  return best;
}

/** Il giocatore (≠ me) con più Punti Gloria pubblici. */
export function leaderId(view: PlayerView, me: number): number | null {
  let best: number | null = null;
  let bestPg = -1;
  for (const p of view.players) {
    if (p.id === me) continue;
    if (p.gloryPointsPublic > bestPg) {
      bestPg = p.gloryPointsPublic;
      best = p.id;
    }
  }
  return best;
}

/** Danno (in pip pesati) che il Drago farebbe su un esagono, per giocatore. */
export function dragonDamage(
  view: PlayerView,
  hexId: string
): { perPlayer: Map<number, number>; total: number } {
  const topo = getTopology();
  const byId = hexById(view);
  const hex = byId.get(hexId);
  const perPlayer = new Map<number, number>();
  if (!hex || hex.token === null || hex.terrain === 'tundra') {
    return { perPlayer, total: 0 };
  }
  const pip = pipWeight(hex.token);
  for (const v of topo.hexVertices[hexId] ?? []) {
    for (const p of view.players) {
      const weight = p.strongholds.includes(v) ? 2 : p.villages.includes(v) ? 1 : 0;
      if (weight > 0) perPlayer.set(p.id, (perPlayer.get(p.id) ?? 0) + weight * pip);
    }
  }
  let total = 0;
  for (const d of perPlayer.values()) total += d;
  return { perPlayer, total };
}

export { type Resource };
