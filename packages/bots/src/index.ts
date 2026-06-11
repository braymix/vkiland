/** @vikiland/bots — giocatori artificiali di Vikiland. */
export type { Bot, BotInput } from './types';
export { createRandomBot, buildGreedyDiscard } from './randomBot';
export { createHeuristicBot } from './heuristicBot';
export {
  placementScore,
  vertexPips,
  vertexTotalPips,
  playerPips,
  edgeExpansionScore,
  currentGoal,
  dragonDamage,
  leaderId,
} from './evaluation';

import type { BotLevel } from '@vikiland/engine';
import { createHeuristicBot } from './heuristicBot';
import type { Bot } from './types';

/** Fabbrica standard usata da UI e server: livello → bot. */
export function createBot(level: BotLevel): Bot {
  return createHeuristicBot(level);
}
