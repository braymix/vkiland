/** "Furia dei Berserker": bonus per il maggior numero di Berserker giocati. */
import { FURIA_MIN } from './constants';
import type { GameEvent } from './actions';
import type { GameState, PlayerId } from './types';

/** Da chiamare dopo ogni Berserker giocato da `player`. */
export function recomputeFuria(state: GameState, player: PlayerId, events: GameEvent[]): void {
  const count = state.players[player]!.playedBerserkers;
  const prev = state.largestArmy;

  if (prev.holder === player) {
    // Il detentore si rafforza: aggiorna il conteggio, nessun annuncio.
    state.largestArmy = { holder: player, count };
    return;
  }
  // Per strappare il bonus serve SUPERARE (non pareggiare) il detentore.
  if (count >= FURIA_MIN && count > prev.count) {
    state.largestArmy = { holder: player, count };
    events.push({ type: 'furiaBerserkerCambiata', holder: player, count });
  }
}
