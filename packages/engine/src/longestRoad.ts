/**
 * "La Grande Via": calcolo del percorso di sentieri più lungo e regole di
 * assegnazione del bonus.
 *
 * Il percorso è un "trail": non ripete SPIGOLI (i vertici possono ripetersi,
 * quindi gli anelli contano per intero). Un vertice con un edificio avversario
 * SPEZZA il percorso: ci si può terminare, ma non attraversarlo.
 */
import { BOARD_RADIUS } from './board/coords';
import { getTopology } from './board/topology';
import { GRANDE_VIA_MIN } from './constants';
import type { GameEvent } from './actions';
import { buildingOwnerAt } from './rules';
import type { GameState, PiecesView, PlayerId, VertexId } from './types';

export function longestRoadLength(
  state: PiecesView,
  player: PlayerId,
  radius: number = BOARD_RADIUS
): number {
  const topo = getTopology(radius);
  const roads = new Set(state.players[player]!.roads);
  if (roads.size === 0) return 0;

  const isBlocked = (v: VertexId): boolean => {
    const owner = buildingOwnerAt(state, v);
    return owner !== null && owner !== player;
  };

  let best = 0;
  const used = new Set<string>();

  // DFS con backtracking: con ≤15 sentieri per giocatore il costo è trascurabile.
  const dfs = (v: VertexId, length: number): void => {
    if (length > best) best = length;
    // Si può TERMINARE su un vertice bloccato, ma non proseguire oltre.
    if (length > 0 && isBlocked(v)) return;
    for (const e of topo.vertexEdges[v]!) {
      if (!roads.has(e) || used.has(e)) continue;
      const [v1, v2] = topo.edgeVertices[e]!;
      const next = v1 === v ? v2 : v1;
      used.add(e);
      dfs(next, length + 1);
      used.delete(e);
    }
  };

  // Ogni percorso ha due estremità: partire da tutti i vertici della rete
  // garantisce di provarle entrambe. (Id sconosciuti alla topologia ignorati.)
  const startVertices = new Set<VertexId>();
  for (const e of roads) {
    const vs = topo.edgeVertices[e];
    if (!vs) continue;
    for (const v of vs) startVertices.add(v);
  }
  for (const v of startVertices) dfs(v, 0);
  return best;
}

/**
 * Ricalcola il detentore della Grande Via. Da chiamare dopo OGNI piazzamento
 * di sentiero e di villaggio (un villaggio può spezzare la via altrui).
 *
 * Regole: serve un percorso ≥5; i pareggi non spodestano il detentore; se il
 * detentore viene spezzato e più giocatori pareggiano al massimo, il bonus
 * non va a nessuno finché qualcuno non resta da solo in testa.
 */
export function recomputeGrandeVia(state: GameState, events: GameEvent[]): void {
  const lengths = state.players.map((p) => longestRoadLength(state, p.id, state.config.boardRadius));
  const best = Math.max(...lengths);
  const prev = state.longestRoad;

  let next: { holder: PlayerId | null; length: number };
  const winners = state.players
    .map((p) => p.id)
    .filter((id) => lengths[id] === best && best >= GRANDE_VIA_MIN);

  if (prev.holder !== null && lengths[prev.holder]! >= GRANDE_VIA_MIN && lengths[prev.holder]! >= best) {
    // Il detentore resta in testa (anche a pari merito): conserva il bonus.
    next = { holder: prev.holder, length: lengths[prev.holder]! };
  } else if (winners.length === 1) {
    next = { holder: winners[0]!, length: best };
  } else {
    // Nessuno ≥5, oppure pareggio tra sfidanti dopo una rottura: bonus a nessuno.
    next = { holder: null, length: 0 };
  }

  const changed = next.holder !== prev.holder;
  state.longestRoad = next;
  if (changed) {
    events.push({ type: 'grandeViaCambiata', holder: next.holder, length: next.length });
  }
}
