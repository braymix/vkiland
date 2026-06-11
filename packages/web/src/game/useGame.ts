/** Aggancio React al controller di partita (useSyncExternalStore). */
import { useSyncExternalStore } from 'react';
import type { GameSnapshot, LocalGameController } from './LocalGameController';

export function useGame(controller: LocalGameController): GameSnapshot {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot);
}
