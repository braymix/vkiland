/**
 * Applicazione delle azioni: `applyAction` valida, clona lo stato, esegue e
 * restituisce il NUOVO stato più gli eventi accaduti. Mai mutazioni dell'input:
 * la coppia (seed, lista di azioni) riproduce sempre la stessa partita.
 */
import type { Action, ApplyResult, GameEvent } from './actions';
import { getTopology } from './board/topology';
import { BUILD_COSTS, HAND_LIMIT, PIECE_LIMITS, RESOURCES } from './constants';
import { cloneState } from './game';
import { recomputeFuria } from './largestArmy';
import { recomputeGrandeVia } from './longestRoad';
import { produceForSetupVillage, produceResources } from './production';
import { flattenResources, totalResources, zeroResources } from './resources';
import { nextInt, rollDie } from './rng';
import { bankTradeRatio, legalRoadEdges } from './rules';
import { gloryPoints, scoreBreakdown } from './scoring';
import type { GameState, PlayerId, ResourceCount, SagaCard } from './types';
import { isLegal } from './validate';

/** Paga un costo: dal giocatore alla banca. */
function payCost(state: GameState, player: PlayerId, cost: ResourceCount): void {
  const p = state.players[player]!;
  for (const r of RESOURCES) {
    p.resources[r] -= cost[r];
    state.bank[r] += cost[r];
  }
}

/** Trasferisce risorse tra due giocatori (per gli scambi). */
function transferBetweenPlayers(
  state: GameState,
  from: PlayerId,
  to: PlayerId,
  bundle: ResourceCount
): void {
  for (const r of RESOURCES) {
    state.players[from]!.resources[r] -= bundle[r];
    state.players[to]!.resources[r] += bundle[r];
  }
}

/** Dopo la risoluzione del Drago si torna alla fase giusta. */
function afterDragonPhase(state: GameState): void {
  state.phase = state.rolledThisTurn ? { type: 'main' } : { type: 'preRoll' };
}

/** Avversari derubabili sull'esagono del Drago: edificio adiacente e ≥1 carta. */
function stealCandidates(state: GameState, mover: PlayerId): PlayerId[] {
  const topo = getTopology(state.config.boardRadius);
  const verts = new Set(topo.hexVertices[state.board.dragonHex]!);
  const out: PlayerId[] = [];
  for (const p of state.players) {
    if (p.id === mover) continue;
    if (totalResources(p.resources) === 0) continue;
    const hasBuilding = [...p.villages, ...p.strongholds].some((v) => verts.has(v));
    if (hasBuilding) out.push(p.id);
  }
  return out;
}

/** Dopo lo spostamento del Drago: si passa al furto oppure si prosegue. */
function resolveDragonArrival(state: GameState, cause: 'sette' | 'berserker'): void {
  const candidates = stealCandidates(state, state.currentPlayer);
  if (candidates.length === 0) {
    afterDragonPhase(state);
  } else {
    state.phase = { type: 'steal', candidates, cause };
  }
}

/**
 * Controllo vittoria: si vince SOLO durante il proprio turno (il controllo
 * dopo `fineTurno` copre anche il caso "comincio il turno già a quota 10",
 * per esempio se un bonus è tornato indietro nel frattempo).
 */
function checkVictory(state: GameState, events: GameEvent[]): void {
  if (state.phase.type === 'gameOver' || state.phase.type === 'setup') return;
  const pid = state.currentPlayer;
  if (gloryPoints(state, pid, true) >= state.config.targetGloryPoints) {
    state.phase = { type: 'gameOver', winner: pid };
    events.push({
      type: 'vittoria',
      winner: pid,
      breakdown: state.players.map((p) => scoreBreakdown(state, p.id)),
    });
  }
}

export function applyAction(input: GameState, action: Action): ApplyResult {
  const invalid = isLegal(input, action);
  if (invalid) return { ok: false, error: invalid };

  const state = cloneState(input);
  const events: GameEvent[] = [];
  const me = state.players[action.player]!;

  switch (action.type) {
    // ----------------------------------------------------------- setup
    case 'piazzaVillaggioIniziale': {
      me.villages.push(action.vertex);
      events.push({
        type: 'costruito',
        player: me.id,
        kind: 'villaggio',
        position: action.vertex,
        gratis: true,
      });
      // Il secondo villaggio (seconda metà della serpentina) produce subito.
      if (state.setupIndex >= state.players.length) {
        produceForSetupVillage(state, me.id, action.vertex, events);
      }
      state.phase = { type: 'setup', expecting: 'sentiero', lastVillage: action.vertex };
      break;
    }
    case 'piazzaSentieroIniziale': {
      me.roads.push(action.edge);
      events.push({
        type: 'costruito',
        player: me.id,
        kind: 'sentiero',
        position: action.edge,
        gratis: true,
      });
      state.setupIndex += 1;
      if (state.setupIndex >= state.setupOrder.length) {
        // Setup completato: comincia chi ha vinto il tiro per l'ordine.
        state.currentPlayer = state.turnOrder[0]!;
        state.turnNumber = 1;
        state.phase = { type: 'preRoll' };
        events.push({ type: 'turnoIniziato', player: state.currentPlayer, turnNumber: 1 });
      } else {
        state.currentPlayer = state.setupOrder[state.setupIndex]!;
        state.phase = { type: 'setup', expecting: 'villaggio', lastVillage: null };
      }
      break;
    }

    // ----------------------------------------------------------- turno
    case 'tiraDadi': {
      const [d1, r1] = rollDie(state.rngState);
      const [d2, r2] = rollDie(r1);
      state.rngState = r2;
      state.dice = [d1, d2];
      state.rolledThisTurn = true;
      const total = d1 + d2;
      events.push({ type: 'dadiTirati', player: me.id, dice: [d1, d2], total });

      if (total === 7) {
        // Scarto simultaneo per chi ha più di 7 carte, poi si muove il Drago.
        const mustDiscard: Record<PlayerId, number> = {};
        for (const p of state.players) {
          const n = totalResources(p.resources);
          if (n > HAND_LIMIT) mustDiscard[p.id] = Math.floor(n / 2);
        }
        state.phase =
          Object.keys(mustDiscard).length > 0
            ? { type: 'discard', mustDiscard }
            : { type: 'moveDragon', cause: 'sette' };
      } else {
        produceResources(state, total, events);
        state.phase = { type: 'main' };
      }
      break;
    }
    case 'scarta': {
      for (const r of RESOURCES) {
        me.resources[r] -= action.resources[r];
        state.bank[r] += action.resources[r];
      }
      events.push({
        type: 'risorseScartate',
        player: me.id,
        resources: action.resources,
        total: totalResources(action.resources),
      });
      if (state.phase.type === 'discard') {
        const remaining = { ...state.phase.mustDiscard };
        delete remaining[me.id];
        state.phase =
          Object.keys(remaining).length > 0
            ? { type: 'discard', mustDiscard: remaining }
            : { type: 'moveDragon', cause: 'sette' };
      }
      break;
    }
    case 'muoviDrago': {
      const cause = state.phase.type === 'moveDragon' ? state.phase.cause : 'sette';
      state.board = { ...state.board, dragonHex: action.hex, dragonMovedBy: me.id };
      events.push({ type: 'dragoMosso', player: me.id, hex: action.hex, cause });
      resolveDragonArrival(state, cause);
      break;
    }
    case 'ruba': {
      const victim = state.players[action.target]!;
      const pool = flattenResources(victim.resources);
      const [idx, rng] = nextInt(state.rngState, pool.length);
      state.rngState = rng;
      const stolen = pool[idx]!;
      victim.resources[stolen] -= 1;
      me.resources[stolen] += 1;
      events.push({ type: 'risorsaRubata', thief: me.id, victim: victim.id, resource: stolen });
      afterDragonPhase(state);
      break;
    }

    // ----------------------------------------------------------- costruzioni
    case 'costruisciSentiero': {
      payCost(state, me.id, BUILD_COSTS.sentiero);
      me.roads.push(action.edge);
      events.push({
        type: 'costruito',
        player: me.id,
        kind: 'sentiero',
        position: action.edge,
        gratis: false,
      });
      recomputeGrandeVia(state, events);
      break;
    }
    case 'costruisciVillaggio': {
      payCost(state, me.id, BUILD_COSTS.villaggio);
      me.villages.push(action.vertex);
      events.push({
        type: 'costruito',
        player: me.id,
        kind: 'villaggio',
        position: action.vertex,
        gratis: false,
      });
      // Un villaggio può SPEZZARE la Grande Via di un avversario.
      recomputeGrandeVia(state, events);
      break;
    }
    case 'costruisciRoccaforte': {
      payCost(state, me.id, BUILD_COSTS.roccaforte);
      me.villages = me.villages.filter((v) => v !== action.vertex);
      me.strongholds.push(action.vertex);
      events.push({
        type: 'costruito',
        player: me.id,
        kind: 'roccaforte',
        position: action.vertex,
        gratis: false,
      });
      break;
    }
    case 'compraCartaSaga': {
      payCost(state, me.id, BUILD_COSTS.cartaSaga);
      const card = state.sagaDeck.pop() as SagaCard;
      me.sagaCardsBoughtThisTurn.push(card);
      events.push({ type: 'cartaSagaComprata', player: me.id, card });
      break;
    }

    // ----------------------------------------------------------- scambi
    case 'scambioBanca': {
      const ratio = bankTradeRatio(state, me.id, action.give, state.config.boardRadius);
      me.resources[action.give] -= ratio;
      state.bank[action.give] += ratio;
      state.bank[action.receive] -= 1;
      me.resources[action.receive] += 1;
      const give = zeroResources();
      give[action.give] = ratio;
      const receive = zeroResources();
      receive[action.receive] = 1;
      events.push({ type: 'scambioEseguito', kind: 'banca', from: me.id, to: null, give, receive });
      break;
    }
    case 'proponiScambio': {
      const offer = {
        id: state.tradeCounter,
        from: me.id,
        give: { ...action.give },
        receive: { ...action.receive },
        to: action.to,
        responses: {},
      };
      state.tradeCounter += 1;
      state.pendingTrade = offer;
      events.push({ type: 'scambioProposto', offer: { ...offer } });
      break;
    }
    case 'rispondiScambio': {
      const offer = state.pendingTrade!;
      events.push({
        type: 'rispostaScambio',
        player: me.id,
        offerId: offer.id,
        accepted: action.accept,
      });
      if (offer.to !== null) {
        // Offerta diretta: l'accettazione esegue subito, il rifiuto chiude.
        if (action.accept) {
          transferBetweenPlayers(state, offer.from, me.id, offer.give);
          transferBetweenPlayers(state, me.id, offer.from, offer.receive);
          events.push({
            type: 'scambioEseguito',
            kind: 'giocatori',
            from: offer.from,
            to: me.id,
            give: { ...offer.give },
            receive: { ...offer.receive },
          });
        }
        state.pendingTrade = null;
      } else {
        offer.responses[me.id] = action.accept ? 'accettata' : 'rifiutata';
      }
      break;
    }
    case 'confermaScambio': {
      const offer = state.pendingTrade!;
      transferBetweenPlayers(state, offer.from, action.with, offer.give);
      transferBetweenPlayers(state, action.with, offer.from, offer.receive);
      events.push({
        type: 'scambioEseguito',
        kind: 'giocatori',
        from: offer.from,
        to: action.with,
        give: { ...offer.give },
        receive: { ...offer.receive },
      });
      state.pendingTrade = null;
      break;
    }
    case 'annullaScambio': {
      events.push({ type: 'scambioAnnullato', offerId: action.offerId });
      state.pendingTrade = null;
      break;
    }

    // ----------------------------------------------------------- Carte Saga
    case 'giocaBerserker': {
      removeCard(me.sagaCards, 'berserker');
      me.playedBerserkers += 1;
      state.devCardPlayedThisTurn = true;
      events.push({ type: 'cartaSagaGiocata', player: me.id, card: 'berserker' });
      recomputeFuria(state, me.id, events);
      state.phase = { type: 'moveDragon', cause: 'berserker' };
      break;
    }
    case 'giocaCostruttori': {
      removeCard(me.sagaCards, 'costruttoriDiSentieri');
      state.devCardPlayedThisTurn = true;
      events.push({ type: 'cartaSagaGiocata', player: me.id, card: 'costruttoriDiSentieri' });
      const remaining = Math.min(2, PIECE_LIMITS.sentiero - me.roads.length);
      state.phase = { type: 'freeRoads', remaining };
      // Se non c'è nessun piazzamento legale la carta si esaurisce subito.
      if (legalRoadEdges(state, me.id, state.config.boardRadius).length === 0) state.phase = { type: 'main' };
      break;
    }
    case 'piazzaSentieroGratis': {
      me.roads.push(action.edge);
      events.push({
        type: 'costruito',
        player: me.id,
        kind: 'sentiero',
        position: action.edge,
        gratis: true,
      });
      recomputeGrandeVia(state, events);
      if (state.phase.type === 'freeRoads') {
        const remaining = state.phase.remaining - 1;
        if (remaining <= 0 || legalRoadEdges(state, me.id, state.config.boardRadius).length === 0) {
          state.phase = { type: 'main' };
        } else {
          state.phase = { type: 'freeRoads', remaining };
        }
      }
      break;
    }
    case 'giocaBanchetto': {
      removeCard(me.sagaCards, 'banchetto');
      state.devCardPlayedThisTurn = true;
      const [r1, r2] = action.resources;
      state.bank[r1] -= 1;
      state.bank[r2] -= 1;
      me.resources[r1] += 1;
      me.resources[r2] += 1;
      events.push({ type: 'cartaSagaGiocata', player: me.id, card: 'banchetto' });
      events.push({ type: 'banchettoRiscosso', player: me.id, resources: [r1, r2] });
      break;
    }
    case 'giocaTributo': {
      removeCard(me.sagaCards, 'tributo');
      state.devCardPlayedThisTurn = true;
      let taken = 0;
      for (const p of state.players) {
        if (p.id === me.id) continue;
        taken += p.resources[action.resource];
        p.resources[action.resource] = 0;
      }
      me.resources[action.resource] += taken;
      events.push({ type: 'cartaSagaGiocata', player: me.id, card: 'tributo' });
      events.push({
        type: 'tributoRiscosso',
        player: me.id,
        resource: action.resource,
        total: taken,
      });
      break;
    }

    // ----------------------------------------------------------- fine turno
    case 'fineTurno': {
      // Le carte comprate diventano giocabili dal prossimo turno.
      me.sagaCards.push(...me.sagaCardsBoughtThisTurn);
      me.sagaCardsBoughtThisTurn = [];
      state.devCardPlayedThisTurn = false;
      state.rolledThisTurn = false;
      // Si avanza lungo l'ordine deciso dai dadi, non per id.
      const orderIdx = state.turnOrder.indexOf(state.currentPlayer);
      state.currentPlayer = state.turnOrder[(orderIdx + 1) % state.turnOrder.length]!;
      state.turnNumber += 1;
      state.phase = { type: 'preRoll' };
      events.push({
        type: 'turnoIniziato',
        player: state.currentPlayer,
        turnNumber: state.turnNumber,
      });
      break;
    }
  }

  checkVictory(state, events);
  return { ok: true, state, events };
}

function removeCard(cards: SagaCard[], card: SagaCard): void {
  const idx = cards.indexOf(card);
  if (idx >= 0) cards.splice(idx, 1);
}
