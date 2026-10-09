/** API pubblica di @vikiland/engine-world («Vikings Around the World»). */
export * from './types';
export * from './actions';
export { createGame, cloneState, defaultConfig, type NewWorldGameOptions } from './game';
export { applyAction } from './apply';
export { isLegal, bankRate, razziaCandidates, discardRequired } from './validate';
export { getLegalActions, getDefaultAction, defaultDiscard, whoMustAct } from './legal';
export { getPlayerView, filterEventsForPlayer, type Viewer } from './view';
export {
  MAPS,
  getMapDefinition,
  validateMap,
  applyMapOverride,
  trimNumberPool,
  linkId,
  mapIndex,
  otherEnd,
  linkBetween,
  isProductive,
  type MapIndex,
  type OverrideResult,
} from './map';
export {
  scoreBreakdown,
  gloryPoints,
  longestRoadLength,
  continentsOwned,
  planMove,
  tollDue,
  resolveToll,
  reachableMoves,
  roadTouchesNetwork,
  freeTerraLinks,
  piecesLeft,
  countBuildings,
  countRoads,
  type MovePlan,
  type ScoreBreakdown,
} from './rules';
export {
  BUILD_COSTS,
  BUILDING_POINTS,
  BUILDING_YIELD,
  PIECE_LIMITS,
  PRODUCED_RESOURCES,
  WORLD_RESOURCES,
  HAND_LIMIT,
  MOVE_POINTS,
  DEFAULT_TARGET_POINTS,
  MIN_TARGET_POINTS,
  MAX_TARGET_POINTS,
  MIN_PRODUCTIVE_TERRITORIES,
  type WorldBuildable,
} from './constants';
export { zeroResources, totalResources, hasAtLeast, oneOf } from './resources';
export { seedRng, nextInt, rollDie, shuffle, type RngState } from './rng';
