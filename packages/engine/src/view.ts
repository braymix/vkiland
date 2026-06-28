/**
 * Viste filtrate: l'informazione nascosta (mani altrui, ordine del mazzo,
 * stato del PRNG, Eroi non rivelati) viene RIMOSSA, non solo nascosta.
 * Bot e client remoti (Fase 3) ricevono solo questo.
 */
import type { GameEvent } from './actions';
import { totalResources } from './resources';
import { gloryPoints } from './scoring';
import type { GameState, PlayerId, PlayerView, PublicPlayer } from './types';

export type Viewer = PlayerId | 'spettatore';

export function getPlayerView(state: GameState, viewer: Viewer): PlayerView {
  const players: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    isBot: state.config.players[p.id]?.isBot ?? false,
    resourceCardCount: totalResources(p.resources),
    sagaCardCount: p.sagaCards.length + p.sagaCardsBoughtThisTurn.length,
    playedBerserkers: p.playedBerserkers,
    villages: [...p.villages],
    strongholds: [...p.strongholds],
    roads: [...p.roads],
    gloryPointsPublic: gloryPoints(state, p.id, false),
  }));

  const self = viewer === 'spettatore' ? null : state.players[viewer] ?? null;

  return {
    board: {
      hexes: state.board.hexes,
      ports: state.board.ports,
      dragonHex: state.board.dragonHex,
      dragonMovedBy: state.board.dragonMovedBy,
    },
    bank: { ...state.bank },
    sagaDeckCount: state.sagaDeck.length,
    players,
    me: self
      ? {
          id: self.id,
          resources: { ...self.resources },
          sagaCards: [...self.sagaCards],
          sagaCardsBoughtThisTurn: [...self.sagaCardsBoughtThisTurn],
          gloryPointsTotal: gloryPoints(state, self.id, true),
        }
      : null,
    currentPlayer: state.currentPlayer,
    turnNumber: state.turnNumber,
    phase:
      state.phase.type === 'discard'
        ? { type: 'discard', mustDiscard: { ...state.phase.mustDiscard } }
        : state.phase.type === 'steal'
          ? { type: 'steal', candidates: [...state.phase.candidates], cause: state.phase.cause }
          : { ...state.phase },
    dice: state.dice ? [state.dice[0], state.dice[1]] : null,
    rolledThisTurn: state.rolledThisTurn,
    devCardPlayedThisTurn: state.devCardPlayedThisTurn,
    turnOrder: [...state.turnOrder],
    startingRolls: state.startingRolls.map((round) =>
      round.map((r) => ({ player: r.player, dice: [r.dice[0], r.dice[1]] as [number, number] }))
    ),
    setupOrder: [...state.setupOrder],
    setupIndex: state.setupIndex,
    pendingTrade: state.pendingTrade
      ? {
          ...state.pendingTrade,
          give: { ...state.pendingTrade.give },
          receive: { ...state.pendingTrade.receive },
          responses: { ...state.pendingTrade.responses },
        }
      : null,
    longestRoad: { ...state.longestRoad },
    largestArmy: { ...state.largestArmy },
    targetGloryPoints: state.config.targetGloryPoints,
    boardRadius: state.config.boardRadius,
  };
}

/**
 * Filtra gli eventi per un osservatore: ciò che è segreto per lui diventa
 * `null` (es. QUALE risorsa è stata rubata la sanno solo ladro e derubato;
 * QUALE carta è stata comprata la sa solo l'acquirente).
 */
export function filterEventsForPlayer(events: GameEvent[], viewer: Viewer): GameEvent[] {
  return events.map((e) => {
    switch (e.type) {
      case 'risorsaRubata': {
        if (viewer === e.thief || viewer === e.victim) return e;
        return { ...e, resource: null };
      }
      case 'cartaSagaComprata': {
        if (viewer === e.player) return e;
        return { ...e, card: null };
      }
      case 'risorseScartate': {
        // Gli altri vedono solo QUANTE carte sono state scartate.
        if (viewer === e.player) return e;
        return { ...e, resources: null };
      }
      default:
        return e;
    }
  });
}
