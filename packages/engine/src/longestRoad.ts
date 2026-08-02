/**
 * "La Grande Via": calcolo del percorso di sentieri più lungo e regole di
 * assegnazione del bonus.
 *
 * Il percorso è un "trail": non ripete SPIGOLI (i vertici possono ripetersi,
 * quindi gli anelli contano per intero). Un vertice con un edificio avversario
 * SPEZZA il percorso: ci si può terminare, ma non attraversarlo.
 */
import { BOARD_RADIUS } from './board/coords';
import { boardTopoKey, getTopology, type TopoKey } from './board/topology';
import { GRANDE_VIA_MIN } from './constants';
import { friendsOf, isTeamMode } from './teams';
import type { GameEvent } from './actions';
import { buildingOwnerAt } from './rules';
import type { EdgeId, GameState, PiecesView, PlayerId, VertexId } from './types';

/**
 * Lunghezza del percorso di sentieri più lungo per `player`. In modalità
 * squadra passa `friends` con i compagni: la rete considerata è l'UNIONE delle
 * strade della squadra e i "blocchi" sono solo gli edifici AVVERSARI (quelli dei
 * compagni non spezzano il percorso).
 */
export function longestRoadLength(
  state: PiecesView,
  player: PlayerId,
  radius: TopoKey = BOARD_RADIUS,
  friends?: ReadonlySet<PlayerId>
): number {
  const topo = getTopology(radius);
  const team = friends ?? new Set([player]);
  const roads = new Set<EdgeId>();
  for (const p of state.players) if (team.has(p.id)) for (const e of p.roads) roads.add(e);
  if (roads.size === 0) return 0;

  const isBlocked = (v: VertexId): boolean => {
    const owner = buildingOwnerAt(state, v);
    return owner !== null && !team.has(owner);
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
  const topoKey = boardTopoKey(state.config.boardRadius, state.config.boardShape, state.board.hexes);
  const teams = state.config.teams;
  // In modalità squadra il "detentore" è una SQUADRA; la lunghezza è quella
  // della rete combinata. Trattiamo ogni entità (squadra o singolo) allo stesso
  // modo, così le partite classiche restano identiche.
  const entity = (id: PlayerId): number => (isTeamMode(teams) ? teams[id]! : id);

  const lenByEntity = new Map<number, number>();
  for (const p of state.players) {
    const ent = entity(p.id);
    if (lenByEntity.has(ent)) continue;
    const friends = isTeamMode(teams) ? friendsOf(teams, p.id) : undefined;
    lenByEntity.set(ent, longestRoadLength(state, p.id, topoKey, friends));
  }
  const best = Math.max(0, ...lenByEntity.values());
  const prev = state.longestRoad;
  const prevEntity = prev.holder !== null ? entity(prev.holder) : null;
  const prevLen = prevEntity !== null ? (lenByEntity.get(prevEntity) ?? 0) : 0;

  const winners = [...lenByEntity.entries()]
    .filter(([, len]) => len === best && best >= GRANDE_VIA_MIN)
    .map(([ent]) => ent);

  // Rappresentante di un'entità: fuori dalla modalità squadra è il giocatore
  // stesso; in squadra un membro qualsiasi (si conserva il detentore precedente
  // se è già di questa squadra, per non "cambiare" inutilmente).
  const reprOf = (ent: number): PlayerId => {
    if (!isTeamMode(teams)) return ent;
    if (prev.holder !== null && entity(prev.holder) === ent) return prev.holder;
    return state.players.find((p) => entity(p.id) === ent)!.id;
  };

  let next: { holder: PlayerId | null; length: number };
  if (prevEntity !== null && prevLen >= GRANDE_VIA_MIN && prevLen >= best) {
    // Il detentore resta in testa (anche a pari merito): conserva il bonus.
    next = { holder: prev.holder, length: prevLen };
  } else if (winners.length === 1) {
    next = { holder: reprOf(winners[0]!), length: best };
  } else {
    // Nessuno ≥5, oppure pareggio tra sfidanti dopo una rottura: bonus a nessuno.
    next = { holder: null, length: 0 };
  }

  const changedEntity =
    next.holder === null ? prev.holder !== null : prevEntity === null || entity(next.holder) !== prevEntity;
  state.longestRoad = next;
  if (changedEntity) {
    events.push({ type: 'grandeViaCambiata', holder: next.holder, length: next.length });
  }
}
