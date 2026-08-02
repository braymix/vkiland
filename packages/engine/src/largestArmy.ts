/** "Furia dei Berserker": bonus per il maggior numero di Berserker giocati. */
import { FURIA_MIN } from './constants';
import { isTeamMode } from './teams';
import type { GameEvent } from './actions';
import type { GameState, PlayerId } from './types';

/**
 * Da chiamare dopo ogni Berserker giocato da `player`. In modalità squadra la
 * Furia è di squadra: si contano i Berserker COMBINATI dei compagni e il
 * "detentore" è una squadra (rappresentata da un suo membro).
 */
export function recomputeFuria(state: GameState, player: PlayerId, events: GameEvent[]): void {
  const teams = state.config.teams;
  const entity = (id: PlayerId): number => (isTeamMode(teams) ? teams[id]! : id);
  const teamCount = (id: PlayerId): number => {
    if (!isTeamMode(teams)) return state.players[id]!.playedBerserkers;
    const ent = entity(id);
    let sum = 0;
    for (const p of state.players) if (entity(p.id) === ent) sum += p.playedBerserkers;
    return sum;
  };

  const count = teamCount(player);
  const prev = state.largestArmy;

  if (prev.holder !== null && entity(prev.holder) === entity(player)) {
    // La stessa squadra si rafforza: aggiorna il conteggio, nessun annuncio.
    state.largestArmy = { holder: prev.holder, count };
    return;
  }
  // Per strappare il bonus serve SUPERARE (non pareggiare) il detentore.
  if (count >= FURIA_MIN && count > prev.count) {
    state.largestArmy = { holder: player, count };
    events.push({ type: 'furiaBerserkerCambiata', holder: player, count });
  }
}
