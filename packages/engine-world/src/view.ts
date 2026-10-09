/** Vista per giocatore: mani altrui solo come conteggio, niente stato del PRNG. */
import type { WorldEvent } from './actions';
import { totalResources } from './resources';
import { gloryPoints } from './rules';
import type { PlayerId, WorldGameState, WorldPlayerView } from './types';

export type Viewer = PlayerId | null;

export function getPlayerView(state: WorldGameState, viewer: Viewer): WorldPlayerView {
  return {
    kind: 'world',
    viewer,
    config: state.config,
    map: state.map,
    territories: state.territories,
    roads: state.roads,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      ...(p.bot ? { bot: p.bot } : {}),
      jarl: p.jarl,
      movePointsLeft: p.movePointsLeft,
      tollsPaidThisTurn: p.tollsPaidThisTurn,
      handCount: totalResources(p.hand),
      points: gloryPoints(state, p.id),
    })),
    hand: viewer === null ? null : { ...state.players[viewer]!.hand },
    currentPlayer: state.currentPlayer,
    turnNumber: state.turnNumber,
    phase: state.phase,
    dice: state.dice,
    pendingTrade: state.pendingTrade,
    grandeVia: state.grandeVia,
    grandeViaggiatore: state.grandeViaggiatore,
  };
}

/** Nasconde la carta rubata a chi non è coinvolto. */
export function filterEventsForPlayer(events: WorldEvent[], viewer: Viewer): WorldEvent[] {
  return events.map((e) => {
    if (e.type === 'rubato' && viewer !== e.player && viewer !== e.target) return { ...e, resource: null };
    return e;
  });
}
