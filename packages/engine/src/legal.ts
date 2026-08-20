/**
 * Enumerazione delle mosse legali di un giocatore nello stato corrente.
 * Le azioni enumerabili sono concrete (pronte per `applyAction`); per gli
 * spazi combinatori (scarto, proposta di scambio) si emette un descrittore.
 *
 * Garanzia testata: ogni azione concreta restituita è accettata da `isLegal`.
 */
import type { LegalMove } from './actions';
import { boardTopoKey, getTopology } from './board/topology';
import {
  calamityBlocksBankTrade,
  calamityBlocksRoad,
  calamityBlocksStronghold,
  calamityDragonFrozen,
} from './calamityRules';
import { ATTACK_COST_EDIFICIO, ATTACK_COST_SENTIERO, BUILD_COSTS, PIECE_LIMITS, RESOURCES } from './constants';
import { effectivePieceLimit, hasHero, heroUsesLeft } from './heroes';
import { hasAtLeast, totalResources } from './resources';
import {
  battleTargets,
  canPlaySagaCard,
  effectiveBankRatio,
  franaTargets,
  legalRoadEdges,
  legalVillageVertices,
  roadBattleTargets,
  vertexFreeWithDistance,
} from './rules';
import { friendsOf, isTeamMode, tradeResponders } from './teams';
import type { EdgeId, GameState, PlayerId, PortKind, Resource } from './types';

export function getLegalActions(state: GameState, player: PlayerId): LegalMove[] {
  const radius = boardTopoKey(state.config.boardRadius, state.config.boardShape, state.board.hexes);
  const topo = getTopology(radius);
  const moves: LegalMove[] = [];
  if (player < 0 || player >= state.players.length) return moves;
  const me = state.players[player]!;
  // Modalità squadra: rete in comune coi compagni (fuori dalla modalità è {player}).
  const friends = friendsOf(state.config.teams, player);

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
        const maxRoads = state.config.heroes && me.hero === 'apripista' ? 2 : 1;
        const isFirst = (state.phase.roadsLeft ?? 1) === maxRoads;
        // Il primo sentiero parte dal villaggio; con l'Apripista (Vegard) i
        // successivi possono estendere anche dai sentieri iniziali già posati.
        const candidate = new Set<EdgeId>(topo.vertexEdges[last] ?? []);
        if (!isFirst) {
          for (const e of me.roads) {
            for (const v of topo.edgeVertices[e] ?? []) {
              for (const e2 of topo.vertexEdges[v] ?? []) candidate.add(e2);
            }
          }
        }
        for (const e of candidate) {
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
      for (const e of legalRoadEdges(state, player, radius, friends)) {
        moves.push({ type: 'piazzaSentieroGratis', player, edge: e });
      }
      return moves;
    }

    case 'calamityFrana': {
      if (player !== state.phase.player) return moves;
      for (const e of franaTargets(me, radius)) {
        moves.push({ type: 'franaSentiero', player, edge: e });
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
      for (const e of legalRoadEdges(state, player, radius, friends)) {
        moves.push({ type: 'piazzaSentieroGratis', player, edge: e });
      }
      return moves;
    }

    case 'main': {
      const offer = state.pendingTrade;
      if (offer !== null) {
        // Con uno scambio pendente sono ammesse solo le azioni di risposta.
        if (player === offer.from) {
          // Offerta aperta CLASSICA: il proponente sceglie con chi concludere. In
          // modalità squadra invece si conclude in automatico (nessun confermaScambio).
          if (offer.to === null && !isTeamMode(state.config.teams)) {
            for (const p of state.players) {
              if (offer.responses[p.id] === 'accettata' && hasAtLeast(p.resources, offer.receive)) {
                moves.push({ type: 'confermaScambio', player, offerId: offer.id, with: p.id });
              }
            }
          }
          moves.push({ type: 'annullaScambio', player, offerId: offer.id });
        } else if (
          tradeResponders(state.config.teams, state.players, offer).includes(player) &&
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
        me.roads.length < effectivePieceLimit(state, player, 'sentiero')
      ) {
        for (const e of legalRoadEdges(state, player, radius, friends)) {
          moves.push({ type: 'costruisciSentiero', player, edge: e });
        }
      }
      if (
        hasAtLeast(me.resources, BUILD_COSTS.villaggio) &&
        me.villages.length < effectivePieceLimit(state, player, 'villaggio')
      ) {
        for (const v of legalVillageVertices(state, player, radius, friends)) {
          moves.push({ type: 'costruisciVillaggio', player, vertex: v });
        }
      }
      if (
        !calamityBlocksStronghold(state) &&
        hasAtLeast(me.resources, BUILD_COSTS.roccaforte) &&
        me.strongholds.length < effectivePieceLimit(state, player, 'roccaforte')
      ) {
        for (const v of me.villages) {
          moves.push({ type: 'costruisciRoccaforte', player, vertex: v });
        }
      }
      // Capitale (modalità Capitale): evolve una propria Roccaforte, una sola.
      if (
        state.config.capitale &&
        !calamityBlocksStronghold(state) &&
        me.capitals.length < PIECE_LIMITS.capitale &&
        hasAtLeast(me.resources, BUILD_COSTS.capitale)
      ) {
        for (const v of me.strongholds) {
          if (!me.capitals.includes(v)) moves.push({ type: 'costruisciCapitale', player, vertex: v });
        }
      }
      if (state.sagaDeck.length > 0 && hasAtLeast(me.resources, BUILD_COSTS.cartaSaga)) {
        moves.push({ type: 'compraCartaSaga', player });
      }

      // Battaglia — attacco pesante: colpisci gli edifici avversari raggiunti.
      if (state.config.battle && hasAtLeast(me.resources, ATTACK_COST_EDIFICIO)) {
        for (const v of battleTargets(state, player, radius, friends)) {
          moves.push({ type: 'attaccaEdificio', player, vertex: v });
        }
      }
      // Battaglia — attacco leggero: spezza le strade avversarie all'estremità.
      if (state.config.battle && hasAtLeast(me.resources, ATTACK_COST_SENTIERO)) {
        for (const e of roadBattleTargets(state, player, radius, friends)) {
          moves.push({ type: 'spezzaSentiero', player, edge: e });
        }
      }
      // Battaglia: la carta ASSALTO attacca gratis (stessi bersagli pesanti).
      if (state.config.battle && canPlaySagaCard(state, player, 'assalto')) {
        for (const v of battleTargets(state, player, radius, friends)) {
          moves.push({ type: 'giocaAssalto', player, vertex: v });
        }
      }
      // Battaglia: la carta ASSALTO LEGGERO spezza gratis (stesse strade).
      if (state.config.battle && canPlaySagaCard(state, player, 'assaltoLeggero')) {
        for (const e of roadBattleTargets(state, player, radius, friends)) {
          moves.push({ type: 'giocaAssaltoLeggero', player, edge: e });
        }
      }
      // Calamità: la carta CAMBIA SORTE, solo se c'è una calamità in corso.
      if (
        canPlaySagaCard(state, player, 'cambiaCalamita') &&
        state.calamities &&
        state.calamities.current !== null
      ) {
        moves.push({ type: 'giocaCambiaCalamita', player });
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
        me.roads.length < effectivePieceLimit(state, player, 'sentiero')
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
      // Razzia: si posa su una casella qualsiasi della tavola.
      if (canPlaySagaCard(state, player, 'razzia')) {
        for (const h of state.board.hexes) moves.push({ type: 'giocaRazzia', player, hex: h.id });
      }

      // Modalità Eroi — abilità attivabili nella fase principale.
      if (state.config.heroes) {
        // Njord: trasforma un proprio approdo (uno per ogni tipo diverso).
        if (hasHero(state, player, 'mutaporto') && heroUsesLeft(state, player, 'mutaporto') > 0) {
          const kinds: PortKind[] = ['generico', ...RESOURCES];
          for (const port of state.board.ports) {
            const vs = topo.edgeVertices[port.edge] ?? [];
            const owns = vs.some((v) => me.villages.includes(v) || me.strongholds.includes(v));
            if (!owns) continue;
            for (const kind of kinds) {
              if (kind !== port.kind) {
                moves.push({ type: 'eroeMutaporto', player, edge: port.edge as EdgeId, kind });
              }
            }
          }
        }
        // Gest: scambio 2-a-1 con la banca.
        if (hasHero(state, player, 'mercante') && heroUsesLeft(state, player, 'mercante') > 0) {
          for (const give of RESOURCES) {
            if (me.resources[give] < 2) continue;
            for (const receive of RESOURCES) {
              if (receive !== give && state.bank[receive] >= 1) {
                moves.push({ type: 'eroeMercante', player, give, receive });
              }
            }
          }
        }
      }

      moves.push({ type: 'fineTurno', player });
      return moves;
    }
  }
}
