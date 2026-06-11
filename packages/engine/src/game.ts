/** Creazione della partita e clonazione dello stato. */
import { generateBoard } from './board/generate';
import {
  BANK_PER_RESOURCE,
  DEFAULT_TARGET_GLORY,
  MAX_PLAYERS,
  MIN_PLAYERS,
  SAGA_DECK_COMPOSITION,
} from './constants';
import { seedRng, shuffle } from './rng';
import type { GameConfig, GameState, Phase, PlayerConfig, PlayerState } from './types';

export interface NewGameOptions {
  seed: string;
  players: PlayerConfig[];
  avoidAdjacent68?: boolean;
  targetGloryPoints?: number;
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

  const config: GameConfig = {
    seed,
    players: players.map((p) => ({ ...p })),
    avoidAdjacent68: options.avoidAdjacent68 ?? true,
    targetGloryPoints: options.targetGloryPoints ?? DEFAULT_TARGET_GLORY,
  };

  let rng = seedRng(seed);
  const [board, rngAfterBoard] = generateBoard(rng, config.avoidAdjacent68);
  rng = rngAfterBoard;
  const [sagaDeck, rngAfterDeck] = shuffle(rng, SAGA_DECK_COMPOSITION);
  rng = rngAfterDeck;

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
  }));

  // Serpentina: 0,1,...,n-1, n-1,...,1,0 (ognuno piazza 2 villaggi + 2 sentieri)
  const ascending = playerStates.map((p) => p.id);
  const setupOrder = [...ascending, ...ascending.slice().reverse()];
  Object.freeze(setupOrder);

  const phase: Phase = { type: 'setup', expecting: 'villaggio', lastVillage: null };

  return {
    version: 1,
    config,
    rngState: rng,
    board,
    players: playerStates,
    bank: {
      legname: BANK_PER_RESOURCE,
      pietra: BANK_PER_RESOURCE,
      lana: BANK_PER_RESOURCE,
      orzo: BANK_PER_RESOURCE,
      ferro: BANK_PER_RESOURCE,
    },
    sagaDeck,
    currentPlayer: setupOrder[0]!,
    turnNumber: 0,
    phase,
    dice: null,
    rolledThisTurn: false,
    devCardPlayedThisTurn: false,
    setupOrder,
    setupIndex: 0,
    pendingTrade: null,
    tradeCounter: 0,
    longestRoad: { holder: null, length: 0 },
    largestArmy: { holder: null, count: 0 },
  };
}

function clonePhase(phase: Phase): Phase {
  switch (phase.type) {
    case 'discard':
      return { type: 'discard', mustDiscard: { ...phase.mustDiscard } };
    case 'steal':
      return { type: 'steal', candidates: [...phase.candidates], cause: phase.cause };
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
    board: { hexes: s.board.hexes, ports: s.board.ports, dragonHex: s.board.dragonHex },
    players: s.players.map((p) => ({
      ...p,
      resources: { ...p.resources },
      sagaCards: [...p.sagaCards],
      sagaCardsBoughtThisTurn: [...p.sagaCardsBoughtThisTurn],
      villages: [...p.villages],
      strongholds: [...p.strongholds],
      roads: [...p.roads],
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
  };
}
