/**
 * Enumerazione delle mosse legali di un giocatore nello stato corrente.
 * Le azioni enumerabili sono concrete (pronte per `applyAction`); per gli
 * spazi combinatori (scarto, proposta di scambio) si emette un descrittore.
 *
 * Garanzia testata: ogni azione concreta restituita è accettata da `isLegal`.
 */
import type { LegalMove } from './actions';
import { getTopology } from './board/topology';
import {
  calamityBlocksBankTrade,
  calamityBlocksRoad,
  calamityBlocksStronghold,
  calamityDragonFrozen,
} from './calamityRules';
import { ATTACK_COST, BUILD_COSTS, PIECE_LIMITS, RESOURCES } from './constants';
import { hasAtLeast, totalResources } from './resources';
import {
  battleTargets,
  canPlaySagaCard,
  effectiveBankRatio,
  legalRoadEdges,
  legalVillageVertices,
  vertexFreeWithDistance,
} from './rules';
import type { GameState, PlayerId, Resource } from './types';

export function getLegalActions(state: GameState, player: PlayerId): LegalMove[] {
  const radius = state.config.boardRadius;
  const topo = getTopology(radius);
  const moves: LegalMove[] = [];
  if (player < 0 || player >= state.players.length) return moves;
  const me = state.players[player]!;

  switch (state.phase.type) {
    case 'gameOver':
      return moves;

    case 'setup': {
      if (player !== state.setupOrder[state.setupIndex]) return moves;
      if (state.phase.expecting === 'villaggio') {
        for (const v of topo.vertices) {
          if (vertexFreeWithDistance(state, v, radius)) {
            moves.push({ type: 'piazzaVillaggioIniziale', player, vertex: v });
          }
        }
      } else {
        const last = state.phase.lastVillage!;
        for (const e of topo.vertexEdges[last]!) {
          const occupied = state.players.some((p) => p.roads.includes(e));
          if (!occupied) moves.push({ type: 'piazzaSentieroIniziale', player, edge: e });
        }
      }
      return moves;
    }

    case 'preRoll': {
      if (player !== state.currentPlayer) return moves;
      moves.push({ type: 'tiraDadi', player });
      if (
        canPlaySagaCard(state, player, 'berserker') &&
        !state.devCardPlayedThisTurn &&
        !calamityDragonFrozen(state)
      ) {
        moves.push({ type: 'giocaBerserker', player });
      }
      return moves;
    }

    case 'discard': {
      const due = state.phase.mustDiscard[player];
      if (due !== undefined) moves.push({ type: 'scartaDescr', player, amount: due });
      return moves;
    }

    case 'calamityDiscard': {
      const due = state.phase.mustDiscard[player];
      if (due !== undefined) moves.push({ type: 'scartaDescr', player, amount: due });
      return moves;
    }

    case 'calamityGain': {
      const due = state.phase.mustGain[player];
      // Si prende il minimo tra la propria quota e ciò che resta in banca.
      if (due !== undefined) {
        moves.push({ type: 'guadagnaDescr', player, amount: Math.min(due, totalResources(state.bank)) });
      }
      return moves;
    }

    case 'calamityRoads': {
      if (player !== state.phase.queue[0]) return moves;
      for (const e of legalRoadEdges(state, player, radius)) {
        moves.push({ type: 'piazzaSentieroGratis', player, edge: e });
      }
      return moves;
    }

    case 'moveDragon': {
      if (player !== state.currentPlayer) return moves;
      for (const h of state.board.hexes) {
        if (h.id !== state.board.dragonHex) {
          moves.push({ type: 'muoviDrago', player, hex: h.id });
        }
      }
      return moves;
    }

    case 'steal': {
      if (player !== state.currentPlayer) return moves;
      for (const target of state.phase.candidates) {
        moves.push({ type: 'ruba', player, target });
      }
      return moves;
    }

    case 'freeRoads': {
      if (player !== state.currentPlayer) return moves;
      for (const e of legalRoadEdges(state, player, radius)) {
        moves.push({ type: 'piazzaSentieroGratis', player, edge: e });
      }
      return moves;
    }

    case 'main': {
      const offer = state.pendingTrade;
      if (offer !== null) {
        // Con uno scambio pendente sono ammesse solo le azioni di risposta.
        if (player === offer.from) {
          if (offer.to === null) {
            for (const p of state.players) {
              if (offer.responses[p.id] === 'accettata' && hasAtLeast(p.resources, offer.receive)) {
                moves.push({ type: 'confermaScambio', player, offerId: offer.id, with: p.id });
              }
            }
          }
          moves.push({ type: 'annullaScambio', player, offerId: offer.id });
        } else if (
          (offer.to === null || offer.to === player) &&
          offer.responses[player] === undefined
        ) {
          if (hasAtLeast(me.resources, offer.receive)) {
            moves.push({ type: 'rispondiScambio', player, offerId: offer.id, accept: true });
          }
          moves.push({ type: 'rispondiScambio', player, offerId: offer.id, accept: false });
        }
        return moves;
      }

      if (player !== state.currentPlayer) return moves;

      // Costruzioni (solo se ci sono risorse e pezzi: liste concrete di posizioni).
      // Alcune calamità del giro bloccano sentieri (bufera) o roccaforti (assedio).
      if (
        !calamityBlocksRoad(state) &&
        hasAtLeast(me.resources, BUILD_COSTS.sentiero) &&
        me.roads.length < PIECE_LIMITS.sentiero
      ) {
        for (const e of legalRoadEdges(state, player, radius)) {
          moves.push({ type: 'costruisciSentiero', player, edge: e });
        }
      }
      if (
        hasAtLeast(me.resources, BUILD_COSTS.villaggio) &&
        me.villages.length < PIECE_LIMITS.villaggio
      ) {
        for (const v of legalVillageVertices(state, player, radius)) {
          moves.push({ type: 'costruisciVillaggio', player, vertex: v });
        }
      }
      if (
        !calamityBlocksStronghold(state) &&
        hasAtLeast(me.resources, BUILD_COSTS.roccaforte) &&
        me.strongholds.length < PIECE_LIMITS.roccaforte
      ) {
        for (const v of me.villages) {
          moves.push({ type: 'costruisciRoccaforte', player, vertex: v });
        }
      }
      if (state.sagaDeck.length > 0 && hasAtLeast(me.resources, BUILD_COSTS.cartaSaga)) {
        moves.push({ type: 'compraCartaSaga', player });
      }

      // Battaglia: attacca gli edifici avversari raggiunti dalle proprie strade.
      if (state.config.battle && hasAtLeast(me.resources, ATTACK_COST)) {
        for (const v of battleTargets(state, player, radius)) {
          moves.push({ type: 'attaccaEdificio', player, vertex: v });
        }
      }

      // Scambi con banca/approdi (col rapporto scontato dalla calamità del giro,
      // salvo "mare in tempesta" che li vieta del tutto).
      if (!calamityBlocksBankTrade(state)) {
        for (const give of RESOURCES) {
          const ratio = effectiveBankRatio(state, player, give, radius);
          if (me.resources[give] < ratio) continue;
          for (const receive of RESOURCES) {
            if (receive === give || state.bank[receive] < 1) continue;
            moves.push({ type: 'scambioBanca', player, give, receive });
          }
        }
      }
      moves.push({ type: 'proponiScambioDescr', player });

      // Carte Saga (canPlaySagaCard blocca già "niente Saga"; il Berserker anche
      // se il Drago è fermo, perché lo sposterebbe).
      if (canPlaySagaCard(state, player, 'berserker') && !calamityDragonFrozen(state)) {
        moves.push({ type: 'giocaBerserker', player });
      }
      if (
        canPlaySagaCard(state, player, 'costruttoriDiSentieri') &&
        me.roads.length < PIECE_LIMITS.sentiero
      ) {
        moves.push({ type: 'giocaCostruttori', player });
      }
      if (canPlaySagaCard(state, player, 'banchetto')) {
        for (let i = 0; i < RESOURCES.length; i++) {
          for (let j = i; j < RESOURCES.length; j++) {
            const r1 = RESOURCES[i]!;
            const r2 = RESOURCES[j]!;
            const ok = r1 === r2 ? state.bank[r1] >= 2 : state.bank[r1] >= 1 && state.bank[r2] >= 1;
            if (ok) moves.push({ type: 'giocaBanchetto', player, resources: [r1, r2] });
          }
        }
      }
      if (canPlaySagaCard(state, player, 'tributo')) {
        for (const r of RESOURCES) moves.push({ type: 'giocaTributo', player, resource: r as Resource });
      }

      moves.push({ type: 'fineTurno', player });
      return moves;
    }
  }
}
