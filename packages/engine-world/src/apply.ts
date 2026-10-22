/**
 * Applicazione delle azioni: `applyAction` valida, clona lo stato, esegue e
 * restituisce il NUOVO stato più gli eventi. Mai mutazioni dell'input.
 */
import type { ApplyResult, WorldAction, WorldEvent } from './actions';
import { BUILDING_YIELD, WORLD_RESOURCES } from './constants';
import { cloneState } from './game';
import {
  buildCostFor,
  jarlGatherFor,
  marketSilverFor,
  movePointsFor,
  paysToll,
  razziaAllFor,
  setupRoadsFor,
  startTurnSilverFor,
  worldHeroEffect,
} from './heroes';

const cloneJson = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
import { addResources, subResources, totalResources } from './resources';
import { nextInt, rollDie } from './rng';
import {
  freeTerraLinks,
  gloryPoints,
  settlementOf,
  planMove,
  recomputeGrandeVia,
  recomputeGrandeViaggiatore,
  resolveToll,
  tollDue,
} from './rules';
import { bankRate, discardRequired, isLegal, razziaCandidates } from './validate';
import type { PlayerId, WorldGameState } from './types';

function beginTurn(state: WorldGameState, pid: PlayerId, events: WorldEvent[]): void {
  state.currentPlayer = pid;
  state.turnNumber += 1;
  state.phase = { type: 'tiro' };
  state.dice = null;
  state.pendingTrade = null;
  const p = state.players[pid]!;
  p.movePointsLeft = movePointsFor(state, pid);
  // Nel territorio di partenza non si paga pedaggio.
  p.tollsPaidThisTurn = [p.jarl];
  events.push({ type: 'turnoIniziato', player: pid, turnNumber: state.turnNumber });
  // Eroe «Dono»: +1 del suo materiale all'inizio di ogni turno.
  const eff = worldHeroEffect(p.hero);
  if (eff?.donoResource) {
    p.hand[eff.donoResource] += 1;
    events.push({ type: 'eroeGuadagno', player: pid, hero: eff.id, resource: eff.donoResource, amount: 1 });
  }
  // Odino (allfather): +1 argento all'inizio di ogni turno.
  const silver = startTurnSilverFor(state, pid);
  if (silver > 0 && p.hero) {
    p.hand.argento += silver;
    events.push({ type: 'eroeGuadagno', player: pid, hero: p.hero, resource: 'argento', amount: silver });
  }
}

function produce(state: WorldGameState, total: number, events: WorldEvent[]): void {
  const gains: Extract<WorldEvent, { type: 'produzione' }>['gains'] = [];
  const kindOf = new Map(state.map.territories.map((t) => [t.id, t.kind]));
  for (const ter of Object.values(state.territories)) {
    if (ter.number !== total) continue;
    const kind = kindOf.get(ter.id);
    if (!kind || kind === 'deserto') continue;
    // Producono tutti gli insediamenti del territorio (fino a 2 clan).
    for (const s of ter.settlements) {
      const amount = BUILDING_YIELD[s.building];
      state.players[s.owner]!.hand[kind] += amount;
      gains.push({ player: s.owner, territory: ter.id, resource: kind, amount });
      if (s.mercato) {
        const silver = marketSilverFor(state, s.owner);
        state.players[s.owner]!.hand.argento += silver;
        gains.push({ player: s.owner, territory: ter.id, resource: 'argento', amount: silver });
      }
    }
  }
  // Ogni Jarl che si trova nel territorio col numero uscito raccoglie 1 materiale
  // (anche senza case lì): come un piccolo villaggio che si sposta.
  for (const p of state.players) {
    const ter = state.territories[p.jarl];
    const here = kindOf.get(p.jarl);
    const gather = jarlGatherFor(state, p.id);
    if (!ter || ter.number !== total || !here || here === 'deserto' || gather <= 0) continue;
    p.hand[here] += gather;
    gains.push({ player: p.id, territory: p.jarl, resource: here, amount: gather });
  }
  if (gains.length > 0) events.push({ type: 'produzione', gains });
}

function doSteal(state: WorldGameState, thief: PlayerId, victim: PlayerId, events: WorldEvent[]): void {
  const vh = state.players[victim]!.hand;
  const total = totalResources(vh);
  if (total === 0) {
    events.push({ type: 'rubato', player: thief, target: victim, resource: null });
    return;
  }
  const [pick, rng] = nextInt(state.rng, total);
  state.rng = rng;
  let acc = 0;
  for (const k of WORLD_RESOURCES) {
    acc += vh[k];
    if (pick < acc) {
      vh[k] -= 1;
      state.players[thief]!.hand[k] += 1;
      events.push({ type: 'rubato', player: thief, target: victim, resource: k });
      return;
    }
  }
}

/** Dopo gli scarti della Tassa del Re: il tiratore sceglie chi razziare (o si risolve da sé). */
function enterRazziaStage(state: WorldGameState, events: WorldEvent[]): void {
  const thief = state.currentPlayer;
  const candidates = razziaCandidates(state, thief);
  if (candidates.length === 0) {
    state.phase = { type: 'azioni' };
  } else if (razziaAllFor(state, thief)) {
    // Ragnar (razziatore): ruba una carta da OGNI clan a portata.
    for (const victim of candidates) doSteal(state, thief, victim, events);
    state.phase = { type: 'azioni' };
  } else if (candidates.length === 1) {
    doSteal(state, thief, candidates[0]!, events);
    state.phase = { type: 'azioni' };
  } else {
    state.phase = { type: 'razzia', candidates };
  }
}

function recomputeAwards(state: WorldGameState, events: WorldEvent[]): void {
  if (recomputeGrandeVia(state)) {
    events.push({ type: 'grandeVia', holder: state.grandeVia.holder, length: state.grandeVia.length });
  }
  if (recomputeGrandeViaggiatore(state)) {
    events.push({
      type: 'grandeViaggiatore',
      holder: state.grandeViaggiatore.holder,
      continents: state.grandeViaggiatore.continents,
    });
  }
}

function checkVictory(state: WorldGameState, events: WorldEvent[]): void {
  const pid = state.currentPlayer;
  if (gloryPoints(state, pid) >= state.config.targetPoints) {
    state.phase = { type: 'fine', winner: pid };
    events.push({ type: 'vittoria', player: pid });
  }
}

function afterBuild(state: WorldGameState, events: WorldEvent[]): void {
  recomputeAwards(state, events);
  checkVictory(state, events);
}

export function applyAction(prev: WorldGameState, action: WorldAction): ApplyResult {
  const error = isLegal(prev, action);
  if (error) return { ok: false, error };
  const state = cloneState(prev);
  const events: WorldEvent[] = [];
  const pid = action.player;
  const me = state.players[pid]!;

  switch (action.type) {
    case 'piazzaVillaggioIniziale': {
      const t = state.territories[action.territory]!;
      t.settlements.push({ owner: pid, building: 'villaggio', porto: false, mercato: false });
      me.jarl = t.id;
      state.setupLastTerritory = t.id;
      events.push({ type: 'costruito', player: pid, what: 'villaggio', at: t.id, setup: true });
      // Il secondo villaggio frutta subito 1 materiale del suo territorio.
      if (state.setupIndex >= state.players.length) {
        const kind = state.map.territories.find((x) => x.id === t.id)!.kind;
        if (kind !== 'deserto') {
          me.hand[kind] += 1;
          events.push({ type: 'produzione', gains: [{ player: pid, territory: t.id, resource: kind, amount: 1 }] });
        }
      }
      // L'Apripista (Vegard) piazza 2 strade per ciascun villaggio iniziale.
      state.phase = { type: 'setup', expect: 'strada', roadsLeft: setupRoadsFor(state, pid) };
      break;
    }
    case 'piazzaStradaIniziale': {
      state.roads[action.link] = pid;
      events.push({ type: 'costruito', player: pid, what: 'strada', at: action.link, setup: true });
      const roadsLeft = (state.phase.type === 'setup' ? state.phase.roadsLeft ?? 1 : 1) - 1;
      if (roadsLeft > 0 && freeTerraLinks(state, state.setupLastTerritory!).length > 0) {
        // Ancora una strada da posare attorno allo stesso villaggio (Apripista).
        state.phase = { type: 'setup', expect: 'strada', roadsLeft };
        break;
      }
      state.setupIndex += 1;
      state.setupLastTerritory = null;
      if (state.setupIndex >= state.setupOrder.length) {
        events.push({ type: 'setupFinito' });
        beginTurn(state, state.setupOrder[0]!, events);
      } else {
        state.currentPlayer = state.setupOrder[state.setupIndex]!;
        state.phase = { type: 'setup', expect: 'villaggio' };
      }
      break;
    }
    case 'tiraDadi': {
      const [d1, r1] = rollDie(state.rng);
      const [d2, r2] = rollDie(r1);
      state.rng = r2;
      const total = d1 + d2;
      state.dice = [d1, d2];
      events.push({ type: 'dadi', player: pid, dice: [d1, d2], total });
      if (total === 7) {
        events.push({ type: 'tassaDelRe' });
        // Partendo da chi ha tirato, in ordine di turno.
        const n = state.players.length;
        const pending: PlayerId[] = [];
        for (let i = 0; i < n; i++) {
          const q = (pid + i) % n;
          if (discardRequired(state, q) > 0) pending.push(q);
        }
        if (pending.length > 0) state.phase = { type: 'scarto', pending };
        else enterRazziaStage(state, events);
      } else {
        produce(state, total, events);
        state.phase = { type: 'azioni' };
      }
      break;
    }
    case 'scarta': {
      subResources(me.hand, action.resources);
      events.push({ type: 'scartato', player: pid, count: totalResources(action.resources) });
      if (state.phase.type === 'scarto') {
        const pending = state.phase.pending.filter((q) => q !== pid);
        if (pending.length > 0) state.phase = { type: 'scarto', pending };
        else enterRazziaStage(state, events);
      }
      break;
    }
    case 'ruba': {
      doSteal(state, pid, action.target, events);
      state.phase = { type: 'azioni' };
      break;
    }
    case 'muovi': {
      const plan = planMove(state, pid, action.to);
      if (!plan.ok) throw new Error('unreachable');
      me.movePointsLeft -= plan.plan.cost;
      me.jarl = action.to;
      events.push({ type: 'mosso', player: pid, from: plan.plan.from, to: action.to, cost: plan.plan.cost });
      // Freydis (salvacondotto) non paga mai pedaggi.
      const toll = paysToll(state, pid) ? tollDue(state, pid, action.to) : null;
      if (toll) {
        const r = resolveToll(me.hand, toll.amount, action.pay);
        if (!r.ok) throw new Error('unreachable');
        subResources(me.hand, r.payment);
        addResources(state.players[toll.payee]!.hand, r.payment);
        me.tollsPaidThisTurn.push(action.to);
        events.push({ type: 'pedaggio', payer: pid, payee: toll.payee, territory: action.to, paid: r.payment });
      }
      break;
    }
    case 'costruisciStrada': {
      subResources(me.hand, buildCostFor(state, pid, 'strada'));
      state.roads[action.link] = pid;
      events.push({ type: 'costruito', player: pid, what: 'strada', at: action.link });
      afterBuild(state, events);
      break;
    }
    case 'costruisci': {
      const t = state.territories[action.territory]!;
      // Porto gratis dell'eroe Njord: niente costo, consuma un uso.
      if (action.free && action.what === 'porto') {
        if (me.heroUses) me.heroUses.portoGratis = (me.heroUses.portoGratis ?? 0) - 1;
      } else {
        subResources(me.hand, buildCostFor(state, pid, action.what));
      }
      const mine = settlementOf(t, pid);
      if (action.what === 'villaggio') {
        t.settlements.push({ owner: pid, building: 'villaggio', porto: false, mercato: false });
      } else if (action.what === 'citta') mine!.building = 'citta';
      else if (action.what === 'sala') mine!.building = 'sala';
      else if (action.what === 'porto') mine!.porto = true;
      else mine!.mercato = true;
      events.push({ type: 'costruito', player: pid, what: action.what, at: t.id });
      afterBuild(state, events);
      break;
    }
    case 'scambioBanca': {
      const rate = bankRate(state, pid, action.give, action.receive, action.mercante)!;
      me.hand[action.give] -= rate.giveCount;
      me.hand[action.receive] += rate.receiveCount;
      // Mercante errante (Gest): consuma un uso dell'abilità.
      if (action.mercante && me.heroUses) me.heroUses.mercante = (me.heroUses.mercante ?? 0) - 1;
      events.push({
        type: 'scambioBanca',
        player: pid,
        give: action.give,
        giveCount: rate.giveCount,
        receive: action.receive,
        receiveCount: rate.receiveCount,
      });
      break;
    }
    case 'proponiScambio': {
      state.tradeCounter += 1;
      const offer = {
        id: state.tradeCounter,
        from: pid,
        give: { ...action.give },
        receive: { ...action.receive },
        to: action.to,
        responses: {},
      };
      state.pendingTrade = offer;
      events.push({ type: 'scambioProposto', offer: cloneJson(offer) });
      break;
    }
    case 'rispondiScambio': {
      const o = state.pendingTrade!;
      o.responses[pid] = action.accept ? 'accettata' : 'rifiutata';
      events.push({ type: 'scambioRisposto', player: pid, offerId: o.id, accept: action.accept });
      const responders = o.to !== null ? [o.to] : state.players.filter((p) => p.id !== o.from).map((p) => p.id);
      if (responders.every((q) => o.responses[q] === 'rifiutata')) {
        state.pendingTrade = null;
        events.push({ type: 'scambioRifiutato', offerId: o.id });
      }
      break;
    }
    case 'confermaScambio': {
      const o = state.pendingTrade!;
      const other = state.players[action.with]!;
      subResources(me.hand, o.give);
      addResources(other.hand, o.give);
      subResources(other.hand, o.receive);
      addResources(me.hand, o.receive);
      state.pendingTrade = null;
      events.push({ type: 'scambioConcluso', offer: cloneJson(o), with: action.with });
      break;
    }
    case 'annullaScambio': {
      const id = state.pendingTrade!.id;
      state.pendingTrade = null;
      events.push({ type: 'scambioAnnullato', offerId: id });
      break;
    }
    case 'fineTurno': {
      state.pendingTrade = null;
      beginTurn(state, (pid + 1) % state.players.length, events);
      break;
    }
  }
  return { ok: true, state, events };
}
