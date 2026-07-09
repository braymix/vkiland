/**
 * @vikiland/engine — motore di gioco puro di Vikiland.
 *
 * API principale:
 *   createGame(options)            → GameState iniziale (deterministico dal seed)
 *   applyAction(state, action)     → nuovo stato + eventi, oppure errore di validazione
 *   isLegal(state, action)         → errore | null
 *   getLegalActions(state, player) → mosse legali (concrete o descrittori)
 *   getPlayerView(state, viewer)   → vista filtrata (informazione nascosta rimossa)
 */
export * from './types';
export * from './actions';
export { createGame, cloneState, type NewGameOptions } from './game';
export { applyAction } from './apply';
export { isLegal } from './validate';
export { getLegalActions } from './legal';
export { getPlayerView, filterEventsForPlayer, type Viewer } from './view';
export { sanitizeCosmetics } from './cosmetics';

// Costanti e utilità riusate da bot e UI.
export {
  RESOURCES,
  BUILD_COSTS,
  ATTACK_COST_EDIFICIO,
  ATTACK_COST_SENTIERO,
  PIECE_LIMITS,
  SAGA_DECK_COMPOSITION,
  BATTLE_SAGA_EXTRA,
  HAND_LIMIT,
  GRANDE_VIA_MIN,
  FURIA_MIN,
  BONUS_GLORY,
  DEFAULT_TARGET_GLORY,
  MIN_PLAYERS,
  MAX_PLAYERS,
  LARGE_BOARD_MIN_PLAYERS,
  boardSpecForPlayers,
  type BoardSpec,
  DRAGON_SKIN_IDS,
  STRONGHOLD_SKIN_IDS,
  BANK_PER_RESOURCE,
  CALAMITY_DECK_COMPOSITION,
  pipWeight,
  type Buildable,
} from './constants';
export {
  zeroResources,
  cloneResources,
  totalResources,
  addResources,
  subtractResources,
  hasAtLeast,
  isValidResourceCount,
  resourceEntries,
  flattenResources,
} from './resources';
export {
  buildingOwnerAt,
  roadOwnerAt,
  vertexFreeWithDistance,
  roadConnects,
  canPlaceRoad,
  legalRoadEdges,
  legalVillageVertices,
  battleTargets,
  roadBattleTargets,
  roadIsBreakable,
  bankTradeRatio,
  effectiveBankRatio,
  canPlaySagaCard,
} from './rules';
// Modalità Calamità: query pure sulla calamità attiva (bot e UI).
export {
  activeCalamity,
  materialMultiplier,
  calamityBankFloor,
  calamityBankFloorForCard,
  calamityBlocksBankTrade,
  calamityBlocksRoad,
  calamityBlocksStronghold,
  calamityBlocksSaga,
  calamityDragonFrozen,
} from './calamityRules';
export { longestRoadLength } from './longestRoad';
export { scoreBreakdown, gloryPoints, countHiddenHeroes } from './scoring';
export { seedRng, nextU32, nextInt, rollDie, shuffle, type RngState } from './rng';

// Geometria della tavola (riusata dal renderer e dai bot).
export {
  type AxialCoord,
  HEX_DIRECTIONS,
  BOARD_RADIUS,
  hexKey,
  parseHexKey,
  hexNeighbors,
  hexDistance,
  isOnBoard,
  allBoardHexes,
  vertexId,
  edgeId,
  parseVertexId,
  parseEdgeId,
  hexVertexIds,
  hexEdgeIds,
} from './board/coords';
export { getTopology, type BoardTopology } from './board/topology';
export { generateBoard } from './board/generate';
