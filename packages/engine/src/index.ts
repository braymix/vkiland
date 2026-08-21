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
// Progressione (casse, frammenti, eroi sbloccati): fonte di verità condivisa
// da server (persistenza) e client (localStorage + UI).
export {
  sanitizeProgression,
  emptyProgression,
  fragmentsOf,
  isHeroUnlocked,
  unlockedHeroIds,
  chestReady,
  chestRemainingMs,
  canEarnChest,
  addChest,
  pickChestReward,
  applyFragment,
  openChest,
  currentChestDurationMs,
  MAX_CHESTS,
  FRAGMENTS_PER_HERO,
  CHEST_DURATION_BASE_MS,
  CHEST_DURATION_DISCOUNT_MS,
  CHEST_DISCOUNT_ACTIVE,
  COMMON_HERO_IDS,
  UNCOMMON_HERO_IDS,
  type PlayerProgression,
  type ChestSlot,
  type ChestRarity,
  type ChestOpenResult,
} from './progression';

// Costanti e utilità riusate da bot e UI.
export {
  RESOURCES,
  BUILD_COSTS,
  ATTACK_COST_EDIFICIO,
  ATTACK_COST_SENTIERO,
  PIECE_LIMITS,
  SAGA_DECK_COMPOSITION,
  BATTLE_SAGA_EXTRA,
  CALAMITY_SAGA_EXTRA,
  HAND_LIMIT,
  GRANDE_VIA_MIN,
  FURIA_MIN,
  BONUS_GLORY,
  DEFAULT_TARGET_GLORY,
  MIN_PLAYERS,
  MAX_PLAYERS,
  LARGE_BOARD_MIN_PLAYERS,
  GIGANTE_BOARD_MIN_PLAYERS,
  boardSpecForPlayers,
  resolveBoardSpec,
  resolveBoardSpecCustom,
  type BoardSpec,
  type BoardCustomization,
  type ResolvedBoard,
  MIN_CUSTOM_HEXES,
  MAX_CUSTOM_HEXES,
  defaultDesertCount,
  maxDesertCount,
  radiusForHexCount,
  buildTerrainPool,
  buildTokenPool,
  SMALL_BOARD,
  GRANDE_BOARD,
  GIGANTE_BOARD,
  DRAGON_SKIN_IDS,
  STRONGHOLD_SKIN_IDS,
  BANK_PER_RESOURCE,
  BANK_PER_RESOURCE_GRANDE,
  BANK_PER_RESOURCE_GIGANTE,
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
  franaTargets,
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
// Modalità Eroi: registro e query pure (bot, UI e resa/pixel art).
export {
  HERO_REGISTRY,
  ALL_HEROES,
  RARITY_ORDER,
  heroDef,
  heroOf,
  hasHero,
  heroUsesLeft,
  effectivePieceLimit,
  setupRoadsPerVillage,
  type HeroId,
  type HeroRarity,
  type HeroDef,
} from './heroes';
// Modalità Squadra: query pure (bot, UI e resa).
export {
  isTeamMode,
  teamOf,
  sameTeam,
  friendsOf,
  distinctTeams,
  validateTeams,
  teamSize,
  tradeResponders,
} from './teams';
export { seedRng, nextU32, nextInt, rollDie, shuffle, type RngState } from './rng';

// Geometria della tavola (riusata dal renderer e dai bot).
export {
  type AxialCoord,
  HEX_DIRECTIONS,
  BOARD_RADIUS,
  BOARD_RADIUS_LARGE,
  BOARD_CODE_SMALL,
  BOARD_CODE_GRANDE,
  BOARD_CODE_GIGANTE,
  boardGeomRadius,
  rientranzeRegionRadius,
  boardHexes,
  isHexOnBoardCode,
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
export {
  getTopology,
  boardTopoKey,
  shapeSignature,
  type BoardTopology,
  type TopoKey,
} from './board/topology';
export { generateBoard } from './board/generate';
