/**
 * Applicazione delle azioni: `applyAction` valida, clona lo stato, esegue e
 * restituisce il NUOVO stato più gli eventi accaduti. Mai mutazioni dell'input:
 * la coppia (seed, lista di azioni) riproduce sempre la stessa partita.
 */
import type { Action, ApplyResult, GameEvent } from './actions';
import { boardTopoKey, getTopology } from './board/topology';
import { changeCalamity, revealCalamity } from './calamities';
import { dragonPhaseAfterSeven, rollTimePhase } from './calamityRules';
import {
  ATTACK_COST_EDIFICIO,
  ATTACK_COST_SENTIERO,
  BUILD_COSTS,
  HAND_LIMIT,
  RESOURCES,
} from './constants';
import { cloneState } from './game';
import { recomputeFuria } from './largestArmy';
import { recomputeGrandeVia } from './longestRoad';
import { produceForSetupVillage, produceResources } from './production';
import { flattenResources, totalResources, zeroResources } from './resources';
import { nextInt, rollDie } from './rng';
import { effectiveBankRatio, legalRoadEdges } from './rules';
import { gloryPoints, scoreBreakdown } from './scoring';
import { friendsOf, isTeamMode, tradeResponders } from './teams';
import { effectivePieceLimit, heroDef } from './heroes';
import type { GameState, PlayerId, ResourceCount, SagaCard } from './types';
import { isLegal } from './validate';

/**
 * Inizio turno condiviso (fine setup e `fineTurno`): annuncia il turno e, se è
 * un NUOVO GIRO in modalità Calamità (torna a `turnOrder[0]`), rivela la carta.
 * Se la carta apre una fase interattiva (scarto/guadagno/strade) ci si ferma lì;
 * altrimenti si va alla fase di tiro (preRoll, o spostamento Drago se imposto).
 */
function beginTurn(state: GameState, events: GameEvent[]): void {
  // La RAZZIA dura «un giro»: si spegne quando torna il turno di chi l'ha giocata,
  // così la sua produzione di questo turno torna normale.
  if (state.razzia && state.currentPlayer === state.razzia.player) {
    state.razzia = null;
  }
  // Modalità squadra: il conto degli scambi (max 2) riparte a ogni turno.
  if (isTeamMode(state.config.teams)) state.teamTradesThisTurn = 0;
  // Modalità Eroi: azzera il contatore dei doppi spostamenti del Berserker.
  delete state.heroBerserkerMovesLeft;
  events.push({
    type: 'turnoIniziato',
    player: state.currentPlayer,
    turnNumber: state.turnNumber,
  });
  // Modalità Eroi: abilità di inizio turno (Dono +2 di un materiale, Odino +1
  // di ognuno), risolte prima dell'eventuale calamità del giro.
  applyTurnStartHeroGains(state, events);
  if (state.calamities && state.currentPlayer === state.turnOrder[0]) {
    if (revealCalamity(state, events)) return; // fase interattiva prima del tiro
  }
  state.phase = rollTimePhase(state);
}

/** Avanza la fase `calamityRoads` dopo un sentiero gratis; a coda vuota si va al tiro. */
function advanceCalamityRoads(state: GameState): void {
  if (state.phase.type !== 'calamityRoads') return;
  const radius = boardTopoKey(state.config.boardRadius, state.config.boardShape, state.board.hexes);
  const canPlace = (pid: PlayerId): boolean =>
    state.players[pid]!.roads.length < effectivePieceLimit(state, pid, 'sentiero') &&
    legalRoadEdges(state, pid, radius, friendsOf(state.config.teams, pid)).length > 0;

  const current = state.phase.queue[0]!;
  const remaining = state.phase.remaining - 1;
  // Il piazzatore finisce quando esaurisce i 2 sentieri, i pezzi o gli spazi liberi.
  if (remaining > 0 && canPlace(current)) {
    state.phase = { type: 'calamityRoads', queue: state.phase.queue, remaining };
    return;
  }
  let rest = state.phase.queue.slice(1);
  while (rest.length > 0 && !canPlace(rest[0]!)) rest = rest.slice(1);
  state.phase = rest.length > 0 ? { type: 'calamityRoads', queue: rest, remaining: 2 } : rollTimePhase(state);
}

/**
 * Battaglia: risolve un attacco su un edificio avversario (già validato). La
 * roccaforte viene declassata a casetta, la casetta distrutta. Distruggere una
 * casetta libera un vertice: può ricongiungere una Grande Via prima spezzata.
 * Non tocca le risorse: il costo (risorse o carta) lo paga il chiamante.
 */
function resolveAttack(
  state: GameState,
  attacker: PlayerId,
  vertex: string,
  events: GameEvent[]
): void {
  const owner = state.players.find(
    (p) => p.villages.includes(vertex) || p.strongholds.includes(vertex)
  )!;
  if (owner.strongholds.includes(vertex)) {
    owner.strongholds = owner.strongholds.filter((v) => v !== vertex);
    owner.villages.push(vertex);
    events.push({
      type: 'edificioAttaccato',
      attacker,
      owner: owner.id,
      vertex,
      esito: 'roccaforteDeclassata',
    });
  } else {
    owner.villages = owner.villages.filter((v) => v !== vertex);
    events.push({
      type: 'edificioAttaccato',
      attacker,
      owner: owner.id,
      vertex,
      esito: 'casettaDistrutta',
    });
  }
  recomputeGrandeVia(state, events);
}

/**
 * Battaglia — attacco leggero: rimuove una strada avversaria (già validata:
 * all'estremità e raggiunta). Spezzare una strada può accorciare la Grande Via.
 * Non tocca le risorse: il costo lo paga il chiamante.
 */
function resolveRoadAttack(
  state: GameState,
  attacker: PlayerId,
  edge: string,
  events: GameEvent[]
): void {
  const owner = state.players.find((p) => p.roads.includes(edge))!;
  owner.roads = owner.roads.filter((e) => e !== edge);
  events.push({ type: 'sentieroSpezzato', attacker, owner: owner.id, edge });
  recomputeGrandeVia(state, events);
}

/**
 * Modalità Eroi — abilità di inizio turno del giocatore di turno. Il «Dono»
 * (eroi comuni) frutta 2 del proprio materiale; Odino (leggendario) 1 di ogni
 * materiale. Si prende dalla banca, senza superarne le scorte.
 */
function applyTurnStartHeroGains(state: GameState, events: GameEvent[]): void {
  if (!state.config.heroes) return;
  const me = state.players[state.currentPlayer]!;
  const def = heroDef(me.hero);
  if (!def) return;
  const gain = zeroResources();
  if (def.donoResource) {
    gain[def.donoResource] = Math.min(2, state.bank[def.donoResource]);
  } else {
    return;
  }
  if (totalResources(gain) === 0) return;
  for (const r of RESOURCES) {
    me.resources[r] += gain[r];
    state.bank[r] -= gain[r];
  }
  events.push({ type: 'eroeGuadagno', player: me.id, hero: def.id, resources: gain });
}

/**
 * Modalità Eroi (Comandante Ulfar): dopo aver risolto uno spostamento del Drago
 * causato da un Berserker, se restano spostamenti dovuti si torna alla fase
 * `moveDragon`; altrimenti si prosegue normalmente.
 */
function finishDragonCycle(state: GameState, cause: 'sette' | 'berserker' | 'calamita'): void {
  if (cause === 'berserker' && (state.heroBerserkerMovesLeft ?? 0) > 1) {
    state.heroBerserkerMovesLeft = (state.heroBerserkerMovesLeft ?? 0) - 1;
    state.phase = { type: 'moveDragon', cause: 'berserker' };
    return;
  }
  delete state.heroBerserkerMovesLeft;
  afterDragonPhase(state);
}

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
  const topo = getTopology(boardTopoKey(state.config.boardRadius, state.config.boardShape, state.board.hexes));
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
function resolveDragonArrival(state: GameState, cause: 'sette' | 'berserker' | 'calamita'): void {
  const candidates = stealCandidates(state, state.currentPlayer);
  if (candidates.length === 0) {
    finishDragonCycle(state, cause);
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
  // In modalità squadra si vince coi Punti Gloria COMBINATI della squadra; il
  // "vincitore" annunciato è il giocatore di turno (un membro della squadra).
  const total = isTeamMode(state.config.teams)
    ? [...friendsOf(state.config.teams, pid)].reduce((s, m) => s + gloryPoints(state, m, true), 0)
    : gloryPoints(state, pid, true);
  if (total >= state.config.targetGloryPoints) {
    state.phase = { type: 'gameOver', winner: pid };
    events.push({
      type: 'vittoria',
      winner: pid,
      breakdown: state.players.map((p) => scoreBreakdown(state, p.id)),
    });
  }
}

/** Modalità squadra: registra uno scambio fra compagni concluso in questo turno. */
function countTeamTrade(state: GameState): void {
  if (isTeamMode(state.config.teams)) {
    state.teamTradesThisTurn = (state.teamTradesThisTurn ?? 0) + 1;
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
      // Insediamento iniziale: "casa indistruttibile" in modalità Battaglia.
      me.initialVillages.push(action.vertex);
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
      // Modalità Eroi (Apripista Vegard): 2 sentieri iniziali per casa invece di uno.
      const roadsLeft = state.config.heroes && me.hero === 'apripista' ? 2 : 1;
      state.phase = { type: 'setup', expecting: 'sentiero', lastVillage: action.vertex, roadsLeft };
      break;
    }
    case 'piazzaSentieroIniziale': {
      me.roads.push(action.edge);
      // Sentiero iniziale: "indistruttibile" dalla calamità Frana.
      me.initialRoads.push(action.edge);
      events.push({
        type: 'costruito',
        player: me.id,
        kind: 'sentiero',
        position: action.edge,
        gratis: true,
      });
      // Apripista: restano sentieri iniziali per questa casa? Si resta sul
      // giocatore (stessa fase) senza avanzare la serpentina.
      const remainingSetupRoads =
        (state.phase.type === 'setup' ? state.phase.roadsLeft ?? 1 : 1) - 1;
      if (remainingSetupRoads > 0) {
        state.phase = {
          type: 'setup',
          expecting: 'sentiero',
          lastVillage: state.phase.type === 'setup' ? state.phase.lastVillage : null,
          roadsLeft: remainingSetupRoads,
        };
        break;
      }
      state.setupIndex += 1;
      if (state.setupIndex >= state.setupOrder.length) {
        // Setup completato: comincia chi ha vinto il tiro per l'ordine (1° giro:
        // in modalità Calamità qui si rivela la prima carta).
        state.currentPlayer = state.turnOrder[0]!;
        state.turnNumber = 1;
        beginTurn(state, events);
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
            : dragonPhaseAfterSeven(state);
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
            : dragonPhaseAfterSeven(state);
      } else if (state.phase.type === 'calamityDiscard') {
        // Scarto imposto da una calamità: quando tutti hanno scartato, si tira.
        const remaining = { ...state.phase.mustDiscard };
        delete remaining[me.id];
        state.phase =
          Object.keys(remaining).length > 0
            ? { type: 'calamityDiscard', mustDiscard: remaining }
            : rollTimePhase(state);
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
      const cause = state.phase.type === 'steal' ? state.phase.cause : 'sette';
      const victim = state.players[action.target]!;
      const pool = flattenResources(victim.resources);
      const [idx, rng] = nextInt(state.rngState, pool.length);
      state.rngState = rng;
      const stolen = pool[idx]!;
      victim.resources[stolen] -= 1;
      me.resources[stolen] += 1;
      events.push({ type: 'risorsaRubata', thief: me.id, victim: victim.id, resource: stolen });
      finishDragonCycle(state, cause);
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
    case 'costruisciCapitale': {
      payCost(state, me.id, BUILD_COSTS.capitale);
      // Il vertice resta ANCHE tra le roccaforti (rete/approdi/distanza): la
      // Capitale è solo il "di più" (produce 3, vale 3, indistruttibile).
      me.capitals.push(action.vertex);
      events.push({
        type: 'costruito',
        player: me.id,
        kind: 'capitale',
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

    // ----------------------------------------------------------- battaglia
    case 'attaccaEdificio': {
      payCost(state, me.id, ATTACK_COST_EDIFICIO);
      resolveAttack(state, me.id, action.vertex, events);
      break;
    }
    case 'spezzaSentiero': {
      payCost(state, me.id, ATTACK_COST_SENTIERO);
      resolveRoadAttack(state, me.id, action.edge, events);
      break;
    }
    case 'giocaAssalto': {
      // La carta ASSALTO è un attacco pesante GRATIS: la carta stessa è il costo.
      removeCard(me.sagaCards, 'assalto');
      state.devCardPlayedThisTurn = true;
      events.push({ type: 'cartaSagaGiocata', player: me.id, card: 'assalto' });
      resolveAttack(state, me.id, action.vertex, events);
      break;
    }
    case 'giocaAssaltoLeggero': {
      // La carta ASSALTO LEGGERO è uno spezza-strada GRATIS: la carta è il costo.
      removeCard(me.sagaCards, 'assaltoLeggero');
      state.devCardPlayedThisTurn = true;
      events.push({ type: 'cartaSagaGiocata', player: me.id, card: 'assaltoLeggero' });
      resolveRoadAttack(state, me.id, action.edge, events);
      break;
    }
    case 'giocaCambiaCalamita': {
      // Sostituisce la calamità del giro con la prossima persistente del mazzo.
      removeCard(me.sagaCards, 'cambiaCalamita');
      state.devCardPlayedThisTurn = true;
      events.push({ type: 'cartaSagaGiocata', player: me.id, card: 'cambiaCalamita' });
      changeCalamity(state, events);
      break;
    }

    // ----------------------------------------------------------- scambi
    case 'scambioBanca': {
      const ratio = effectiveBankRatio(state, me.id, action.give, boardTopoKey(state.config.boardRadius, state.config.boardShape, state.board.hexes));
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
      // In modalità squadra anche l'offerta APERTA (a tutta la squadra) si conclude
      // in AUTOMATICO: il primo compagno che accetta esegue subito lo scambio.
      const autoExecute = offer.to !== null || isTeamMode(state.config.teams);
      if (autoExecute) {
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
          countTeamTrade(state);
          state.pendingTrade = null;
        } else if (offer.to !== null) {
          // Offerta DIRETTA: un rifiuto la chiude.
          state.pendingTrade = null;
        } else {
          // Offerta alla squadra: un rifiuto è registrato e l'offerta resta aperta
          // per gli altri compagni. Se TUTTI i compagni hanno ora rifiutato, si
          // chiude da sola con un esito CHIARO (evento dedicato per il diario).
          offer.responses[me.id] = 'rifiutata';
          const responders = tradeResponders(state.config.teams, state.players, offer);
          if (responders.every((id) => offer.responses[id] !== undefined)) {
            events.push({ type: 'scambioRifiutato', offerId: offer.id });
            state.pendingTrade = null;
          }
        }
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
      countTeamTrade(state);
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
      // Modalità Eroi (Comandante Ulfar): il Drago si sposta due volte.
      if (state.config.heroes && me.hero === 'comandante') state.heroBerserkerMovesLeft = 2;
      state.phase = { type: 'moveDragon', cause: 'berserker' };
      break;
    }
    case 'giocaCostruttori': {
      removeCard(me.sagaCards, 'costruttoriDiSentieri');
      state.devCardPlayedThisTurn = true;
      events.push({ type: 'cartaSagaGiocata', player: me.id, card: 'costruttoriDiSentieri' });
      const remaining = Math.min(2, effectivePieceLimit(state, me.id, 'sentiero') - me.roads.length);
      state.phase = { type: 'freeRoads', remaining };
      // Se non c'è nessun piazzamento legale la carta si esaurisce subito.
      if (legalRoadEdges(state, me.id, boardTopoKey(state.config.boardRadius, state.config.boardShape, state.board.hexes), friendsOf(state.config.teams, me.id)).length === 0) state.phase = { type: 'main' };
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
        if (remaining <= 0 || legalRoadEdges(state, me.id, boardTopoKey(state.config.boardRadius, state.config.boardShape, state.board.hexes), friendsOf(state.config.teams, me.id)).length === 0) {
          state.phase = { type: 'main' };
        } else {
          state.phase = { type: 'freeRoads', remaining };
        }
      } else if (state.phase.type === 'calamityRoads') {
        advanceCalamityRoads(state);
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
    case 'giocaRazzia': {
      // La RAZZIA si posa su una casella (illuminata del colore del razziatore) e
      // resta attiva fino al ritorno del suo turno: da qui la produzione di OGNI
      // tiro (anche degli avversari) la incassa lui al posto dei proprietari.
      removeCard(me.sagaCards, 'razzia');
      state.devCardPlayedThisTurn = true;
      state.razzia = { player: me.id, hex: action.hex };
      events.push({ type: 'cartaSagaGiocata', player: me.id, card: 'razzia' });
      events.push({ type: 'razziaPosata', player: me.id, hex: action.hex });
      break;
    }

    // ----------------------------------------------------------- Calamità
    case 'guadagnaCalamita': {
      // Guadagno "a scelta" (dalla banca) imposto da una calamità istantanea.
      for (const r of RESOURCES) {
        me.resources[r] += action.resources[r];
        state.bank[r] -= action.resources[r];
      }
      if (totalResources(action.resources) > 0) {
        events.push({
          type: 'risorseProdotte',
          gains: [{ player: me.id, resources: { ...action.resources } }],
        });
      }
      if (state.phase.type === 'calamityGain') {
        const remaining = { ...state.phase.mustGain };
        delete remaining[me.id];
        state.phase =
          Object.keys(remaining).length > 0
            ? { type: 'calamityGain', mustGain: remaining }
            : rollTimePhase(state);
      }
      break;
    }
    case 'franaSentiero': {
      // Calamità Frana: la strada marginale scelta crolla. Come uno spezza-strada,
      // può accorciare la Grande Via. Risolta la scelta, si passa al tiro del giro.
      me.roads = me.roads.filter((e) => e !== action.edge);
      events.push({ type: 'franaSpezzata', player: me.id, edge: action.edge });
      recomputeGrandeVia(state, events);
      state.phase = rollTimePhase(state);
      break;
    }

    // ----------------------------------------------------------- Modalità Eroi
    case 'eroeMutaporto': {
      // Njord: trasforma un proprio approdo. Gli approdi sono congelati alla
      // creazione: si sostituisce l'intero array con una copia modificata.
      const ratio: 2 | 3 = action.kind === 'generico' ? 3 : 2;
      state.board = {
        ...state.board,
        ports: state.board.ports.map((p) =>
          p.edge === action.edge ? { ...p, kind: action.kind, ratio } : p
        ),
      };
      if (me.heroUses) me.heroUses.mutaporto = (me.heroUses.mutaporto ?? 0) - 1;
      events.push({ type: 'portoTrasformato', player: me.id, edge: action.edge, kind: action.kind });
      break;
    }
    case 'eroeMercante': {
      // Gest: scambio 2-a-1 con la banca (consumo di un uso «per partita»).
      me.resources[action.give] -= 2;
      state.bank[action.give] += 2;
      state.bank[action.receive] -= 1;
      me.resources[action.receive] += 1;
      if (me.heroUses) me.heroUses.mercante = (me.heroUses.mercante ?? 0) - 1;
      const give = zeroResources();
      give[action.give] = 2;
      const receive = zeroResources();
      receive[action.receive] = 1;
      events.push({ type: 'scambioEseguito', kind: 'banca', from: me.id, to: null, give, receive });
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
      // Nuovo giro ⇒ eventuale rivelazione della calamità (dentro beginTurn).
      beginTurn(state, events);
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
