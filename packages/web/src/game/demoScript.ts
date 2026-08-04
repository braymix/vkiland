/**
 * «Demo guidata»: copione DETERMINISTICO di una partita dimostrativa.
 *
 * Non è la partita vera del giocatore: è una sequenza di istantanee (viste
 * filtrate del motore) catturate nei momenti chiave — piazzi il primo
 * villaggio, gli altri clan piazzano, il secondo villaggio produce, tiri i
 * dadi… — così la DemoScreen può mostrarle passo dopo passo sulla tavola vera.
 *
 * Tutto qui è puro (nessun DOM, nessun timer): è coperto da test in Vitest e,
 * dato lo stesso seme, produce sempre le stesse istantanee.
 */
import {
  applyAction,
  boardTopoKey,
  createGame,
  getLegalActions,
  getPlayerView,
  getTopology,
  hexKey,
  parseVertexId,
  RESOURCES,
  type Action,
  type EdgeId,
  type GameState,
  type HexId,
  type NewGameOptions,
  type PlayerColor,
  type PlayerId,
  type PlayerView,
  type Resource,
  type ResourceCount,
  type VertexId,
} from '@vikiland/engine';
import { createBot } from '@vikiland/bots';
import { vertexTotalPips } from '@vikiland/bots';

/** Il clan del giocatore nella demo (il rosso). Gli altri sono pilotati dai bot. */
export const DEMO_YOU: PlayerId = 0;
export const DEMO_YOU_COLOR: PlayerColor = '#c0392b';

/**
 * Seme della demo. Scelto (e verificato dal test) perché:
 *  - l'ordine di partenza fa giocare per primo il TUO clan (turnOrder[0] === 0);
 *  - il primo tiro NON è un 7 e ti porta subito qualche risorsa.
 * Così l'arco «piazzi → tiri → produci» fila liscio. Vedi `demoScript.test.ts`.
 */
export const DEMO_SEED = 'viking-demo-002';

const DEMO_NAMES = ['Tu', 'Astrid', 'Leif'];
const DEMO_COLORS: PlayerColor[] = ['#c0392b', '#2e6fb7', '#3e8f4e'];

function demoOptions(seed: string): NewGameOptions {
  return {
    seed,
    players: DEMO_NAMES.map((name, i) => ({
      name,
      color: DEMO_COLORS[i]!,
      isBot: i !== DEMO_YOU,
      botLevel: 'normale' as const,
    })),
    avoidAdjacent68: true,
    targetGloryPoints: 10,
  };
}

function applyOrThrow(state: GameState, action: Action): GameState {
  const res = applyAction(state, action);
  if (!res.ok) throw new Error(`demo: mossa illegale ${action.type} — ${res.error.message}`);
  return res.state;
}

/** Villaggio iniziale «migliore»: massimi pip totali (tie-break deterministico per id). */
function chooseVillage(state: GameState, player: PlayerId): VertexId {
  const view = getPlayerView(state, player);
  const vertices = getLegalActions(state, player)
    .filter((m): m is Extract<Action, { type: 'piazzaVillaggioIniziale' }> => m.type === 'piazzaVillaggioIniziale')
    .map((m) => m.vertex);
  let best = vertices[0]!;
  let bestScore = -Infinity;
  for (const v of vertices) {
    const score = vertexTotalPips(view, v);
    if (score > bestScore || (score === bestScore && v < best)) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

/** Sentiero iniziale: il primo lato legale (ordine deterministico per id). */
function chooseRoad(state: GameState, player: PlayerId): EdgeId {
  const edges = getLegalActions(state, player)
    .filter((m): m is Extract<Action, { type: 'piazzaSentieroIniziale' }> => m.type === 'piazzaSentieroIniziale')
    .map((m) => m.edge)
    .sort();
  return edges[0]!;
}

/** Esagoni con segnalino incidenti a un incrocio: quelli che producono per chi ci costruisce. */
function producingHexes(view: PlayerView, vertex: VertexId): HexId[] {
  const out: HexId[] = [];
  for (const coord of parseVertexId(vertex)) {
    const id = hexKey(coord);
    const hex = view.board.hexes.find((h) => h.id === id);
    if (hex && hex.token !== null) out.push(id);
  }
  return out;
}

/** Chiave della topologia per una vista (gestisce anche le tavole «con rientranze»). */
function viewTopoKey(view: PlayerView) {
  return boardTopoKey(view.boardRadius, view.boardShape, view.board.hexes);
}

/** Cosa afferra un incrocio: esagoni produttivi, risorse distinte e numeri. */
function vertexInfo(view: PlayerView, vertex: VertexId): {
  hexes: HexId[];
  resources: Resource[];
  numbers: number[];
} {
  const hexes: HexId[] = [];
  const resources: Resource[] = [];
  const numbers: number[] = [];
  for (const coord of parseVertexId(vertex)) {
    const id = hexKey(coord);
    const hex = view.board.hexes.find((h) => h.id === id);
    if (!hex || hex.token === null || hex.terrain === 'tundra') continue;
    hexes.push(id);
    numbers.push(hex.token);
    if (!resources.includes(hex.terrain)) resources.push(hex.terrain);
  }
  return { hexes, resources, numbers };
}

/**
 * I «posti migliori» dell'isola vuota: gli incroci con più pip totali. Serve al
 * passo «valutare l'isola» dell'esempio di partita. Ordinamento deterministico:
 * pip decrescenti, poi id crescente (come la scelta del bot). Il primo coincide
 * con il villaggio scelto dalla demo.
 */
function bestSpots(view: PlayerView, howMany: number): VertexId[] {
  const topo = getTopology(viewTopoKey(view));
  return [...topo.vertices]
    .map((v) => ({ v, pips: vertexTotalPips(view, v) }))
    .sort((a, b) => b.pips - a.pips || (a.v < b.v ? -1 : 1))
    .slice(0, howMany)
    .map((x) => x.v);
}

/**
 * Espansione con le strade: dal primo villaggio, prolungando il primo sentiero,
 * verso quale incrocio conviene puntare? Si sceglie il vicino dell'estremità
 * libera del sentiero che aggiunge PIÙ risorse nuove (poi più pip, poi id): è la
 * mossa «punta ad altri numeri e materiali», mostrata sulla tavola vera.
 */
function chooseExpansion(
  view: PlayerView,
  fromVertex: VertexId,
  roadEdge: EdgeId
): {
  targetVertex: VertexId;
  targetEdge: EdgeId;
  newHexes: HexId[];
  newResources: Resource[];
  newNumbers: number[];
} {
  const topo = getTopology(viewTopoKey(view));
  const [ea, eb] = topo.edgeVertices[roadEdge]!;
  const roadEnd = ea === fromVertex ? eb : ea;
  const first = vertexInfo(view, fromVertex);
  const firstRes = new Set(first.resources);
  const firstHexes = new Set(first.hexes);

  let best: VertexId | null = null;
  let bestNew = -1;
  let bestPips = -1;
  for (const nb of topo.vertexNeighbors[roadEnd] ?? []) {
    if (nb === fromVertex) continue;
    const info = vertexInfo(view, nb);
    const gainNew = info.resources.filter((r) => !firstRes.has(r)).length;
    const pips = vertexTotalPips(view, nb);
    if (gainNew > bestNew || (gainNew === bestNew && pips > bestPips) ||
        (gainNew === bestNew && pips === bestPips && (best === null || nb < best))) {
      best = nb;
      bestNew = gainNew;
      bestPips = pips;
    }
  }
  const targetVertex = best ?? roadEnd;
  // Lo spigolo che collega l'estremità libera al bersaglio.
  const targetEdge = (topo.vertexEdges[roadEnd] ?? []).find((e) => {
    const [v1, v2] = topo.edgeVertices[e]!;
    return v1 === targetVertex || v2 === targetVertex;
  }) ?? roadEdge;

  const info = vertexInfo(view, targetVertex);
  const newHexes: HexId[] = [];
  const newNumbers: number[] = [];
  for (const coord of parseVertexId(targetVertex)) {
    const id = hexKey(coord);
    if (firstHexes.has(id)) continue;
    const hex = view.board.hexes.find((h) => h.id === id);
    if (!hex || hex.token === null || hex.terrain === 'tundra') continue;
    newHexes.push(id);
    newNumbers.push(hex.token);
  }
  const newResources = info.resources.filter((r) => !firstRes.has(r));
  return { targetVertex, targetEdge, newHexes, newResources, newNumbers };
}

/** Differenza non negativa fra due conteggi risorse (quanto è ENTRATO). */
function resourceGain(before: ResourceCount, after: ResourceCount): ResourceCount {
  const gain = {} as ResourceCount;
  for (const r of RESOURCES) gain[r] = Math.max(0, after[r] - before[r]);
  return gain;
}

function totalOf(count: ResourceCount): number {
  return RESOURCES.reduce((sum, r) => sum + count[r], 0);
}

/** Fa giocare i bot (anche il tuo posto) fino alla fine: serve solo per mostrare un'isola «a fine partita». */
function playToEnd(start: GameState, seed: string): GameState {
  const bots = DEMO_COLORS.map(() => createBot('normale'));
  let state = start;
  let guard = 0;
  while (state.phase.type !== 'gameOver' && guard < 4000) {
    guard += 1;
    // Chi deve agire: nello scarto simultaneo è uno dei giocatori in lista, altrimenti il giocatore di turno.
    const actor =
      state.phase.type === 'discard'
        ? (state.players.find((p) => (state.phase as { mustDiscard: Record<number, number> }).mustDiscard[p.id])?.id ??
          state.currentPlayer)
        : state.currentPlayer;
    const legal = getLegalActions(state, actor);
    if (legal.length === 0) break;
    const action = bots[actor]!.decide({
      view: getPlayerView(state, actor),
      legalActions: legal,
      player: actor,
      rngSeed: `${seed}:demo-end:${guard}:${actor}`,
    });
    const res = applyAction(state, action);
    if (res.ok) {
      state = res.state;
      continue;
    }
    // Difesa: se il bot sbaglia, forza la prima mossa concreta per non incepparsi.
    const fallback = legal.find(
      (m): m is Action => m.type !== 'scartaDescr' && m.type !== 'proponiScambioDescr'
    );
    if (!fallback) break;
    const forced = applyAction(state, fallback);
    if (!forced.ok) break;
    state = forced.state;
  }
  return state;
}

export interface DemoData {
  /** L'ordine di partenza fa cominciare il tuo clan? (vero col seme scelto). */
  youStart: boolean;
  /** Tavola appena generata, ancora vuota. */
  island: PlayerView;
  /** Dopo il TUO primo villaggio. */
  village1: { view: PlayerView; vertex: VertexId };
  /** Dopo il TUO primo sentiero. */
  road1: { view: PlayerView; edge: EdgeId };
  /** Quando tutti i clan hanno piazzato il primo villaggio. */
  othersPlaced: PlayerView;
  /** Dopo il TUO secondo villaggio (con gli esagoni che produce subito). */
  secondVillage: { view: PlayerView; vertex: VertexId; producingHexes: HexId[] };
  /** Fine del setup: tutti i clan in posizione. */
  setupDone: { view: PlayerView; myProducingHexes: HexId[] };
  /** Il primo tiro di dadi e ciò che hai prodotto. */
  rolled: { view: PlayerView; dice: [number, number]; total: number; myGain: ResourceCount; gained: boolean };
  /** Esagono del Drago (parte dalla tundra). */
  dragonHex: HexId;
  /** Un'isola «a fine partita», piena di insediamenti. */
  finalView: PlayerView;
  /** Dati «ragionati» per l'esempio di partita (perché una mossa è buona). */
  strategy: DemoStrategy;
}

/**
 * Materiale dell'«Esempio di partita»: non nuove istantanee, ma le RAGIONI
 * dietro alle scelte già fatte nella demo — quali incroci valutare, cosa
 * afferra il posto migliore, verso quali risorse nuove puntano le strade.
 */
export interface DemoStrategy {
  /** I 3 incroci migliori dell'isola vuota (il primo è quello scelto). */
  topSpots: VertexId[];
  /** Cosa afferra il primo villaggio: esagoni produttivi, risorse e numeri. */
  firstHexes: HexId[];
  firstResources: Resource[];
  firstNumbers: number[];
  /** L'espansione con le strade: dove punti e quali risorse/numeri nuovi prendi. */
  expansion: {
    targetVertex: VertexId;
    targetEdge: EdgeId;
    newHexes: HexId[];
    newResources: Resource[];
    newNumbers: number[];
  };
  /** Risorse che il secondo villaggio aggiunge rispetto al primo. */
  secondNewResources: Resource[];
}

/** Costruisce tutte le istantanee della demo per un seme. Deterministico. */
export function buildDemo(seed: string = DEMO_SEED): DemoData {
  let state = createGame(demoOptions(seed));
  const youStart = state.turnOrder[0] === DEMO_YOU;
  const island = getPlayerView(state, DEMO_YOU);

  let village1: DemoData['village1'] | null = null;
  let road1: DemoData['road1'] | null = null;
  let othersPlaced: PlayerView | null = null;
  let secondVillage: DemoData['secondVillage'] | null = null;
  let youVillages = 0;

  while (state.phase.type === 'setup') {
    const actor = state.currentPlayer;
    if (state.phase.expecting === 'villaggio') {
      const vertex = chooseVillage(state, actor);
      state = applyOrThrow(state, { type: 'piazzaVillaggioIniziale', player: actor, vertex });
      if (actor === DEMO_YOU) {
        youVillages += 1;
        if (youVillages === 1) village1 = { view: getPlayerView(state, DEMO_YOU), vertex };
        else if (youVillages === 2) {
          const view = getPlayerView(state, DEMO_YOU);
          secondVillage = { view, vertex, producingHexes: producingHexes(view, vertex) };
        }
      }
      // Primo villaggio per tutti ⇒ istantanea «anche gli altri piazzano».
      if (!othersPlaced && state.players.every((p) => p.villages.length >= 1)) {
        othersPlaced = getPlayerView(state, DEMO_YOU);
      }
    } else {
      const edge = chooseRoad(state, actor);
      state = applyOrThrow(state, { type: 'piazzaSentieroIniziale', player: actor, edge });
      if (actor === DEMO_YOU && youVillages === 1 && !road1) {
        road1 = { view: getPlayerView(state, DEMO_YOU), edge };
      }
    }
  }

  const setupView = getPlayerView(state, DEMO_YOU);
  const myProducingHexes = [
    ...new Set(setupView.players[DEMO_YOU]!.villages.flatMap((v) => producingHexes(setupView, v))),
  ];

  // Primo tiro (di chi tocca: col seme scelto è il tuo clan). La produzione
  // tocca tutti, quindi il TUO guadagno è valido in ogni caso.
  const beforeRoll = getPlayerView(state, DEMO_YOU).me!.resources;
  const roller = state.currentPlayer;
  const rollRes = applyAction(state, { type: 'tiraDadi', player: roller });
  if (!rollRes.ok) throw new Error(`demo: tiro fallito — ${rollRes.error.message}`);
  const rolledState = rollRes.state;
  const diceEvent = rollRes.events.find((e): e is Extract<typeof e, { type: 'dadiTirati' }> => e.type === 'dadiTirati')!;
  const afterRoll = getPlayerView(rolledState, DEMO_YOU).me!.resources;
  const myGain = resourceGain(beforeRoll, afterRoll);
  const rolledView = getPlayerView(rolledState, DEMO_YOU);

  const finalView = getPlayerView(playToEnd(rolledState, seed), 'spettatore');

  // Ragionamento dell'esempio di partita: valutazione dell'isola, cosa afferra
  // il primo villaggio, e verso dove puntano le strade (tutto deterministico).
  const first = vertexInfo(island, village1!.vertex);
  const secondInfo = vertexInfo(secondVillage!.view, secondVillage!.vertex);
  const firstResSet = new Set(first.resources);
  const strategy: DemoStrategy = {
    topSpots: bestSpots(island, 3),
    firstHexes: first.hexes,
    firstResources: first.resources,
    firstNumbers: first.numbers,
    expansion: chooseExpansion(road1!.view, village1!.vertex, road1!.edge),
    secondNewResources: secondInfo.resources.filter((r) => !firstResSet.has(r)),
  };

  return {
    youStart,
    island,
    village1: village1!,
    road1: road1!,
    othersPlaced: othersPlaced!,
    secondVillage: secondVillage!,
    setupDone: { view: setupView, myProducingHexes },
    rolled: {
      view: rolledView,
      dice: diceEvent.dice,
      total: diceEvent.total,
      myGain,
      gained: totalOf(myGain) > 0,
    },
    dragonHex: rolledView.board.dragonHex,
    finalView,
    strategy,
  };
}
