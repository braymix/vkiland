/**
 * Regole condivise tra validazione (`validate.ts`) ed enumerazione delle mosse
 * legali (`legal.ts`): un'unica fonte di verità per ogni vincolo di piazzamento.
 */
import { BOARD_RADIUS } from './board/coords';
import { getTopology } from './board/topology';
import { calamityBankFloor, calamityBlocksSaga } from './calamityRules';
import { PIECE_LIMITS } from './constants';
import type { EdgeId, GameState, PiecesView, PlayerId, Resource, TradeRatioView, VertexId } from './types';

/** Chi ha un edificio (villaggio o roccaforte) su questo vertice? null = nessuno. */
export function buildingOwnerAt(state: PiecesView, vertex: VertexId): PlayerId | null {
  for (const p of state.players) {
    if (p.villages.includes(vertex) || p.strongholds.includes(vertex)) return p.id;
  }
  return null;
}

export function roadOwnerAt(state: PiecesView, edge: EdgeId): PlayerId | null {
  for (const p of state.players) {
    if (p.roads.includes(edge)) return p.id;
  }
  return null;
}

/** Regola della distanza: il vertice e tutti i suoi vicini devono essere liberi. */
export function vertexFreeWithDistance(
  state: PiecesView,
  vertex: VertexId,
  radius: number = BOARD_RADIUS
): boolean {
  const topo = getTopology(radius);
  if (buildingOwnerAt(state, vertex) !== null) return false;
  return topo.vertexNeighbors[vertex]!.every((v) => buildingOwnerAt(state, v) === null);
}

/**
 * Connettività di un sentiero: deve toccare in un estremo un proprio edificio,
 * oppure un proprio sentiero — ma la connessione via sentiero NON vale se su
 * quel vertice c'è un edificio AVVERSARIO (non si costruisce "attraverso").
 */
export function roadConnects(
  state: PiecesView,
  player: PlayerId,
  edge: EdgeId,
  radius: number = BOARD_RADIUS
): boolean {
  const topo = getTopology(radius);
  const me = state.players[player]!;
  for (const v of topo.edgeVertices[edge]!) {
    const owner = buildingOwnerAt(state, v);
    if (owner === player) return true;
    if (owner !== null) continue; // edificio avversario: questo estremo non connette
    const hasOwnRoad = topo.vertexEdges[v]!.some((e) => e !== edge && me.roads.includes(e));
    if (hasOwnRoad) return true;
  }
  return false;
}

/** Lo spigolo è piazzabile (libero, valido, connesso, pezzi disponibili)? Costo escluso. */
export function canPlaceRoad(
  state: PiecesView,
  player: PlayerId,
  edge: EdgeId,
  radius: number = BOARD_RADIUS
): boolean {
  const topo = getTopology(radius);
  if (!(edge in topo.edgeVertices)) return false;
  if (roadOwnerAt(state, edge) !== null) return false;
  if (state.players[player]!.roads.length >= PIECE_LIMITS.sentiero) return false;
  return roadConnects(state, player, edge, radius);
}

/** Tutti gli spigoli su cui `player` potrebbe piazzare un sentiero ora. */
export function legalRoadEdges(
  state: PiecesView,
  player: PlayerId,
  radius: number = BOARD_RADIUS
): EdgeId[] {
  const topo = getTopology(radius);
  const me = state.players[player]!;
  // Candidati: spigoli adiacenti alla propria rete (estremi di sentieri e edifici).
  // Gli id sconosciuti alla topologia (stati sintetici) vengono ignorati.
  const candidates = new Set<EdgeId>();
  const addAround = (v: VertexId) => {
    const edges = topo.vertexEdges[v];
    if (!edges) return;
    for (const e of edges) candidates.add(e);
  };
  for (const e of me.roads) {
    const vs = topo.edgeVertices[e];
    if (!vs) continue;
    for (const v of vs) addAround(v);
  }
  for (const v of [...me.villages, ...me.strongholds]) addAround(v);
  return [...candidates].filter((e) => canPlaceRoad(state, player, e, radius));
}

/** Tutti i vertici su cui `player` potrebbe costruire un villaggio ora (connettività inclusa). */
export function legalVillageVertices(
  state: PiecesView,
  player: PlayerId,
  radius: number = BOARD_RADIUS
): VertexId[] {
  const topo = getTopology(radius);
  const me = state.players[player]!;
  const candidates = new Set<VertexId>();
  for (const e of me.roads) {
    const vs = topo.edgeVertices[e];
    if (!vs) continue;
    for (const v of vs) candidates.add(v);
  }
  return [...candidates].filter((v) => vertexFreeWithDistance(state, v, radius));
}

/**
 * Vista strutturale minima per la Battaglia: come `PiecesView`, ma include gli
 * insediamenti iniziali (le "case indistruttibili"). La soddisfa `GameState`.
 */
export interface BattleView {
  players: ReadonlyArray<{
    id: PlayerId;
    villages: VertexId[];
    strongholds: VertexId[];
    roads: EdgeId[];
    initialVillages: VertexId[];
  }>;
}

/**
 * Modalità Battaglia: gli edifici AVVERSARI che `player` ha "raggiunto" con una
 * propria strada (un vertice nemico su cui incide un suo sentiero) E che sono
 * attaccabili. Le due CASE INIZIALI di un clan sono indistruttibili finché
 * restano casette: qui vengono escluse; una roccaforte è sempre un bersaglio
 * valido (anche se sorge su un insediamento iniziale).
 */
export function battleTargets(
  state: BattleView,
  player: PlayerId,
  radius: number = BOARD_RADIUS
): VertexId[] {
  const topo = getTopology(radius);
  const myRoads = new Set(state.players[player]!.roads);
  if (myRoads.size === 0) return [];
  const reached = (v: VertexId): boolean => {
    const edges = topo.vertexEdges[v];
    return edges ? edges.some((e) => myRoads.has(e)) : false;
  };
  const out: VertexId[] = [];
  for (const p of state.players) {
    if (p.id === player) continue;
    const indistruttibili = new Set(p.initialVillages);
    // Le roccaforti sono sempre attaccabili (declassate a casetta).
    for (const v of p.strongholds) if (reached(v)) out.push(v);
    // Le casette solo se NON sono un insediamento iniziale.
    for (const v of p.villages) if (!indistruttibili.has(v) && reached(v)) out.push(v);
  }
  return out;
}

/**
 * Un estremo `v` della strada `edge` è "ancorato" per il proprietario `owner`
 * se lì c'è un suo edificio oppure un'ALTRA sua strada. Una strada ancorata su
 * entrambi gli estremi è "interna" alla rete; se almeno un estremo è libero è
 * una strada "all'estremità".
 */
function roadEndpointAnchored(
  owner: { villages: VertexId[]; strongholds: VertexId[]; roads: EdgeId[] },
  vertex: VertexId,
  edge: EdgeId,
  radius: number
): boolean {
  if (owner.villages.includes(vertex) || owner.strongholds.includes(vertex)) return true;
  const topo = getTopology(radius);
  return (topo.vertexEdges[vertex] ?? []).some((e) => e !== edge && owner.roads.includes(e));
}

/**
 * Attacco LEGGERO: una strada avversaria è "spezzabile" se è collegata su UN
 * SOLO lato alla rete del proprietario (almeno un estremo libero: una strada
 * all'estremità). Le strade collegate su entrambi i lati NON si possono spezzare.
 */
export function roadIsBreakable(
  owner: { villages: VertexId[]; strongholds: VertexId[]; roads: EdgeId[] },
  edge: EdgeId,
  radius: number = BOARD_RADIUS
): boolean {
  const topo = getTopology(radius);
  const vs = topo.edgeVertices[edge];
  if (!vs) return false;
  const [v1, v2] = vs;
  const a1 = roadEndpointAnchored(owner, v1, edge, radius);
  const a2 = roadEndpointAnchored(owner, v2, edge, radius);
  return !(a1 && a2);
}

/**
 * Modalità Battaglia — attacco LEGGERO: le strade AVVERSARIE che `player` ha
 * "raggiunto" con una propria strada (un estremo su cui incide un suo sentiero)
 * E che sono spezzabili (all'estremità, collegate su un solo lato).
 */
export function roadBattleTargets(
  state: BattleView,
  player: PlayerId,
  radius: number = BOARD_RADIUS
): EdgeId[] {
  const topo = getTopology(radius);
  const myRoads = new Set(state.players[player]!.roads);
  if (myRoads.size === 0) return [];
  const reached = (edge: EdgeId): boolean => {
    const vs = topo.edgeVertices[edge];
    if (!vs) return false;
    return vs.some((v) => (topo.vertexEdges[v] ?? []).some((e) => myRoads.has(e)));
  };
  const out: EdgeId[] = [];
  for (const p of state.players) {
    if (p.id === player) continue;
    for (const e of p.roads) {
      if (reached(e) && roadIsBreakable(p, e, radius)) out.push(e);
    }
  }
  return out;
}

/** Rapporto di scambio con la banca per una data risorsa da approdi/banca (4, 3 o 2). */
export function bankTradeRatio(
  state: TradeRatioView,
  player: PlayerId,
  give: Resource,
  radius: number = BOARD_RADIUS
): number {
  const topo = getTopology(radius);
  const me = state.players[player]!;
  const buildings = new Set([...me.villages, ...me.strongholds]);
  let ratio = 4;
  for (const port of state.board.ports) {
    const [v1, v2] = topo.edgeVertices[port.edge]!;
    if (!buildings.has(v1) && !buildings.has(v2)) continue;
    if (port.kind === give) ratio = Math.min(ratio, 2);
    else if (port.kind === 'generico') ratio = Math.min(ratio, 3);
  }
  return ratio;
}

/**
 * Rapporto di scambio EFFETTIVO: come `bankTradeRatio`, ma con l'eventuale
 * "sconto" della calamità del giro (3:1, 2:1 su un materiale, 2:1 per tutti).
 * Serve GameState perché legge la calamità attiva; i bot possono continuare a
 * stimare con `bankTradeRatio` sulla vista (l'engine rivalida comunque).
 */
export function effectiveBankRatio(
  state: GameState,
  player: PlayerId,
  give: Resource,
  radius: number = BOARD_RADIUS
): number {
  return Math.min(bankTradeRatio(state, player, give, radius), calamityBankFloor(state, give));
}

/** Il giocatore può giocare una carta Saga (non Eroi) in questo momento del turno? */
export function canPlaySagaCard(
  state: GameState,
  player: PlayerId,
  card: 'berserker' | 'costruttoriDiSentieri' | 'banchetto' | 'tributo' | 'assalto'
): boolean {
  if (player !== state.currentPlayer) return false;
  if (state.devCardPlayedThisTurn) return false;
  if (state.pendingTrade !== null) return false;
  if (calamityBlocksSaga(state)) return false; // calamità "niente Saga" per questo giro
  const me = state.players[player]!;
  if (!me.sagaCards.includes(card)) return false;
  // Il Berserker è giocabile anche prima del tiro; le altre solo in fase main.
  if (card === 'berserker') {
    return state.phase.type === 'preRoll' || state.phase.type === 'main';
  }
  return state.phase.type === 'main';
}
