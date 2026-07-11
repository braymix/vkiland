/** Creazione della partita e clonazione dello stato. */
import { generateBoard } from './board/generate';
import {
  BATTLE_SAGA_EXTRA,
  boardSpecForPlayers,
  CALAMITY_DECK_COMPOSITION,
  CALAMITY_SAGA_EXTRA,
  DEFAULT_TARGET_GLORY,
  MAX_PLAYERS,
  MIN_PLAYERS,
  SAGA_DECK_COMPOSITION,
} from './constants';
import { rollDie, seedRng, shuffle } from './rng';
import type {
  CalamityState,
  GameConfig,
  GameState,
  Phase,
  PlayerConfig,
  PlayerId,
  PlayerState,
} from './types';

export interface NewGameOptions {
  seed: string;
  players: PlayerConfig[];
  avoidAdjacent68?: boolean;
  targetGloryPoints?: number;
  /** Modalità Calamità: una carta per giro. Default false (partita standard). */
  calamities?: boolean;
  /** Modalità Battaglia: attacchi agli edifici avversari. Default false. */
  battle?: boolean;
}

export function createGame(options: NewGameOptions): GameState {
  const { seed, players } = options;
  if (typeof seed !== 'string' || seed.length === 0) {
    throw new Error('createGame: serve un seed non vuoto');
  }
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`createGame: servono da ${MIN_PLAYERS} a ${MAX_PLAYERS} giocatori`);
  }
  const colors = new Set(players.map((p) => p.color));
  if (colors.size !== players.length) {
    throw new Error('createGame: i colori dei giocatori devono essere tutti diversi');
  }

  // La taglia della tavola dipende dal numero di giocatori: 2–4 piccola, 5–6 grande.
  const spec = boardSpecForPlayers(players.length);

  const config: GameConfig = {
    seed,
    players: players.map((p) => ({ ...p })),
    avoidAdjacent68: options.avoidAdjacent68 ?? true,
    targetGloryPoints: options.targetGloryPoints ?? DEFAULT_TARGET_GLORY,
    boardRadius: spec.radius,
    calamities: options.calamities ?? false,
    battle: options.battle ?? false,
  };

  let rng = seedRng(seed);
  const [board, rngAfterBoard] = generateBoard(rng, config.avoidAdjacent68, spec);
  rng = rngAfterBoard;
  // Battaglia e Calamità aggiungono le proprie carte extra al mazzo Saga; le
  // partite standard restano identiche (stessa composizione, stesso consumo di
  // PRNG). L'ordine delle aggiunte è fisso: prima Battaglia, poi Calamità.
  const sagaComposition = [...SAGA_DECK_COMPOSITION];
  if (config.battle) sagaComposition.push(...BATTLE_SAGA_EXTRA);
  if (config.calamities) sagaComposition.push(...CALAMITY_SAGA_EXTRA);
  const [sagaDeck, rngAfterDeck] = shuffle(rng, sagaComposition);
  rng = rngAfterDeck;

  // Il mazzo Calamità consuma il PRNG solo se la modalità è attiva: così le
  // partite standard restano identiche byte-per-byte a prima (stesso seed → stessa tavola/dadi).
  let calamities: CalamityState | undefined;
  if (config.calamities) {
    const [deck, rngAfterCal] = shuffle(rng, CALAMITY_DECK_COMPOSITION);
    rng = rngAfterCal;
    calamities = { deck, current: null };
  }

  // La tavola non cambia mai dopo la creazione (solo dragonHex si muove):
  // congelandola possiamo condividerla tra i cloni dello stato senza rischi.
  Object.freeze(board.hexes);
  for (const h of board.hexes) Object.freeze(h);
  Object.freeze(board.ports);
  for (const p of board.ports) Object.freeze(p);

  const playerStates: PlayerState[] = config.players.map((p, id) => ({
    id,
    name: p.name,
    color: p.color,
    resources: { legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 0 },
    sagaCards: [],
    sagaCardsBoughtThisTurn: [],
    playedBerserkers: 0,
    villages: [],
    strongholds: [],
    roads: [],
    initialVillages: [],
  }));

  // L'ORDINE DI PARTENZA si decide coi dadi (deterministico dal seed): tutti
  // tirano, il totale più alto inizia; i pareggi si ritirano solo tra i pari.
  const startingRolls: { player: PlayerId; dice: [number, number] }[][] = [];
  const rollOff = (group: PlayerId[]): PlayerId[] => {
    if (group.length === 1) return group;
    const round: { player: PlayerId; dice: [number, number] }[] = [];
    const totals = new Map<PlayerId, number>();
    for (const pid of group) {
      const [d1, r1] = rollDie(rng);
      const [d2, r2] = rollDie(r1);
      rng = r2;
      round.push({ player: pid, dice: [d1, d2] });
      totals.set(pid, d1 + d2);
    }
    startingRolls.push(round);
    const distinct = [...new Set(totals.values())].sort((a, b) => b - a);
    const ordered: PlayerId[] = [];
    for (const total of distinct) {
      ordered.push(...rollOff(group.filter((pid) => totals.get(pid) === total)));
    }
    return ordered;
  };
  const turnOrder = rollOff(playerStates.map((p) => p.id));
  Object.freeze(turnOrder);
  for (const round of startingRolls) Object.freeze(round);
  Object.freeze(startingRolls);

  // Serpentina sul turnOrder: ognuno piazza 2 villaggi + 2 sentieri.
  const setupOrder = [...turnOrder, ...turnOrder.slice().reverse()];
  Object.freeze(setupOrder);

  const phase: Phase = { type: 'setup', expecting: 'villaggio', lastVillage: null };

  return {
    version: 1,
    config,
    rngState: rng,
    board,
    players: playerStates,
    bank: {
      legname: spec.bankPerResource,
      pietra: spec.bankPerResource,
      lana: spec.bankPerResource,
      orzo: spec.bankPerResource,
      ferro: spec.bankPerResource,
    },
    sagaDeck,
    currentPlayer: setupOrder[0]!,
    turnNumber: 0,
    phase,
    dice: null,
    rolledThisTurn: false,
    devCardPlayedThisTurn: false,
    turnOrder,
    startingRolls,
    setupOrder,
    setupIndex: 0,
    pendingTrade: null,
    tradeCounter: 0,
    longestRoad: { holder: null, length: 0 },
    largestArmy: { holder: null, count: 0 },
    ...(calamities ? { calamities } : {}),
  };
}

export function clonePhase(phase: Phase): Phase {
  switch (phase.type) {
    case 'discard':
      return { type: 'discard', mustDiscard: { ...phase.mustDiscard } };
    case 'steal':
      return { type: 'steal', candidates: [...phase.candidates], cause: phase.cause };
    case 'calamityDiscard':
      return { type: 'calamityDiscard', mustDiscard: { ...phase.mustDiscard } };
    case 'calamityGain':
      return { type: 'calamityGain', mustGain: { ...phase.mustGain } };
    case 'calamityRoads':
      return { type: 'calamityRoads', queue: [...phase.queue], remaining: phase.remaining };
    default:
      return { ...phase };
  }
}

/**
 * Clona lo stato per l'applicazione immutabile delle azioni.
 * Le parti congelate e mai mutate (esagoni, approdi, config, setupOrder)
 * vengono condivise: il clone è veloce e sicuro.
 */
export function cloneState(s: GameState): GameState {
  return {
    ...s,
    board: {
      hexes: s.board.hexes,
      ports: s.board.ports,
      dragonHex: s.board.dragonHex,
      dragonMovedBy: s.board.dragonMovedBy,
    },
    players: s.players.map((p) => ({
      ...p,
      resources: { ...p.resources },
      sagaCards: [...p.sagaCards],
      sagaCardsBoughtThisTurn: [...p.sagaCardsBoughtThisTurn],
      villages: [...p.villages],
      strongholds: [...p.strongholds],
      roads: [...p.roads],
      initialVillages: [...p.initialVillages],
    })),
    bank: { ...s.bank },
    sagaDeck: [...s.sagaDeck],
    phase: clonePhase(s.phase),
    dice: s.dice ? [s.dice[0], s.dice[1]] : null,
    pendingTrade: s.pendingTrade
      ? {
          ...s.pendingTrade,
          give: { ...s.pendingTrade.give },
          receive: { ...s.pendingTrade.receive },
          responses: { ...s.pendingTrade.responses },
        }
      : null,
    longestRoad: { ...s.longestRoad },
    largestArmy: { ...s.largestArmy },
    // Le carte calamità sono immutabili: si clona l'array, non le carte.
    ...(s.calamities
      ? { calamities: { deck: [...s.calamities.deck], current: s.calamities.current } }
      : {}),
  };
}
