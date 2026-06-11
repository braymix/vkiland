/** Aggancio React al controller di partita (useSyncExternalStore). */
import { useSyncExternalStore } from 'react';
import type { GameController, GameSnapshot } from './controller';

export function useGame(controller: GameController): GameSnapshot {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot);
}
