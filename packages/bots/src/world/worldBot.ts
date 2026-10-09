/**
 * Bot euristico di «Vikings Around the World».
 *
 * Idea: il Jarl cerca il territorio libero più prezioso (valore del numero,
 * materiale che manca, nuovo continente) pesando i punti movimento e i pedaggi;
 * quando ci arriva «si accampa» finché non può fondare il villaggio, scambiando
 * con la banca per colmare le carte che mancano. Poi città, Sala, Mercato e
 * strade lungo il percorso. Mai comportamenti illegali: sceglie sempre fra le
 * mosse già enumerate dal motore.
 */
import {
  PRODUCED_RESOURCES,
  mapIndex,
  nextInt,
  seedRng,
  type BotLevel,
  type PlayerId,
  type ProducedResource,
  type WorldAction,
  type WorldResource,
} from '@vikiland/engine-world';
import {
  COST,
  firstStep,
  firstUnroaded,
  handTotal,
  jarlPaths,
  leaderId,
  missing,
  myTerritories,
  pips,
  territoryValue,
} from './evaluation';
import type { WorldBot, WorldBotInput } from './types';

interface LevelCfg {
  epsilon: number;
  bankTrades: boolean;
  tollWeight: number;
  buildMercato: boolean;
  respondTrades: boolean;
}

const LEVELS: Record<BotLevel, LevelCfg> = {
  facile: { epsilon: 0.35, bankTrades: false, tollWeight: 0.5, buildMercato: false, respondTrades: false },
  normale: { epsilon: 0, bankTrades: true, tollWeight: 1.5, buildMercato: true, respondTrades: true },
  difficile: { epsilon: 0, bankTrades: true, tollWeight: 2, buildMercato: true, respondTrades: true },
  esperto: { epsilon: 0, bankTrades: true, tollWeight: 2.5, buildMercato: true, respondTrades: true },
};

type Act<T extends WorldAction['type']> = Extract<WorldAction, { type: T }>;
const of = <T extends WorldAction['type']>(legal: WorldAction[], type: T): Act<T>[] =>
  legal.filter((a): a is Act<T> => a.type === type);

export function createWorldBot(level: BotLevel = 'normale'): WorldBot {
  const cfg = LEVELS[level];
  return {
    name: `mondo-${level}`,
    decide(input: WorldBotInput): WorldAction {
      const { view, legalActions: legal, player: me } = input;
      if (legal.length === 0) throw new Error('worldBot: nessuna mossa legale');

      // Livello facile: ogni tanto gioca a caso (mai scambi).
      if (cfg.epsilon > 0) {
        const [roll, rng] = nextInt(seedRng(`eps:${input.rngSeed}`), 100);
        if (roll < cfg.epsilon * 100) {
          const harmless = legal.filter(
            (a) => a.type !== 'scambioBanca' && a.type !== 'rispondiScambio' && a.type !== 'scarta' && a.type !== 'fineTurno'
          );
          if (harmless.length > 0) {
            const [i] = nextInt(rng, harmless.length);
            return harmless[i]!;
          }
        }
      }

      const phase = view.phase;
      if (phase.type === 'setup') return decideSetup(input);
      if (phase.type === 'tiro') return of(legal, 'tiraDadi')[0] ?? legal[0]!;
      if (phase.type === 'scarto') return of(legal, 'scarta')[0] ?? legal[0]!;
      if (phase.type === 'razzia') {
        const targets = of(legal, 'ruba');
        const lead = leaderId(view, me);
        let best = targets[0]!;
        for (const t of targets) {
          const a = view.players[t.target]!;
          const b = view.players[best.target]!;
          if (a.handCount + (t.target === lead ? 2 : 0) > b.handCount + (best.target === lead ? 2 : 0)) best = t;
        }
        return best;
      }
      // Fase azioni (o risposta a un'offerta fuori turno).
      if (view.currentPlayer !== me) return respondToTrade(input, cfg);
      return decideActions(input, cfg);
    },
  };
}

// ------------------------------------------------------------------ setup
function decideSetup(input: WorldBotInput): WorldAction {
  const { view, legalActions: legal, player: me } = input;
  const idx = mapIndex(view.map);
  const villages = of(legal, 'piazzaVillaggioIniziale');
  if (villages.length > 0) {
    const owned = new Set(
      myTerritories(view, me).map((id) => idx.territory.get(id)!.kind)
    );
    let best = villages[0]!;
    let bestScore = -Infinity;
    for (const v of villages) {
      const def = idx.territory.get(v.territory)!;
      let score = territoryValue(view, me, v.territory) + (owned.has(def.kind) ? 0 : 1.5);
      // vicinato: territori liberi appetibili raggiungibili
      for (const l of idx.linksOf.get(v.territory) ?? []) {
        const o = l.a === v.territory ? l.b : l.a;
        if (view.territories[o]!.owner === null) score += pips(view.territories[o]!.number) * 0.12;
      }
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    return best;
  }
  const roads = of(legal, 'piazzaStradaIniziale');
  let best = roads[0]!;
  let bestScore = -Infinity;
  for (const r of roads) {
    const l = idx.link.get(r.link)!;
    const here = Object.values(view.territories).find((t) => t.owner === me && !hasRoadAt(view, me, t.id)) ?? null;
    const other = here && (l.a === here.id ? l.b : l.a);
    const score = other ? territoryValue(view, me, other) : 0;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

function hasRoadAt(view: WorldBotInput['view'], me: PlayerId, territory: string): boolean {
  const idx = mapIndex(view.map);
  return (idx.linksOf.get(territory) ?? []).some((l) => view.roads[l.id] === me);
}

// ------------------------------------------------------------ azioni
function decideActions(input: WorldBotInput, cfg: LevelCfg): WorldAction {
  const { view, legalActions: legal, player: me } = input;
  const idx = mapIndex(view.map);
  const hand = view.hand!;
  const mePub = view.players[me]!;
  const here = mePub.jarl;
  const builds = of(legal, 'costruisci');
  const total = handTotal(hand);

  const bestBuild = (what: Act<'costruisci'>['what']): Act<'costruisci'> | null => {
    const c = builds.filter((b) => b.what === what);
    if (c.length === 0) return null;
    let best = c[0]!;
    let bs = -Infinity;
    for (const b of c) {
      const s = territoryValue(view, me, b.territory) + pips(view.territories[b.territory]!.number);
      if (s > bs) {
        bs = s;
        best = b;
      }
    }
    return best;
  };

  // 1) Prestigio: Sala, poi villaggio (espansione), poi città.
  const sala = bestBuild('sala');
  if (sala) return sala;
  const hereState = view.territories[here]!;
  const hereDef = idx.territory.get(here)!;
  const hereIsFree = hereState.owner === null && hereDef.kind !== 'deserto';
  const village = builds.find((b) => b.what === 'villaggio' && b.territory === here);
  if (village) return village;
  const city = bestBuild('citta');
  if (city) return city;

  // 2) Dove vuole andare il Jarl.
  const paths = jarlPaths(view, me, cfg.tollWeight);
  let target: string | null = null;
  let bestScore = -Infinity;
  for (const t of view.map.territories) {
    if (t.id === here || t.kind === 'deserto') continue;
    const st = view.territories[t.id]!;
    if (st.owner !== null) continue;
    const d = paths.dist.get(t.id);
    if (d === undefined) continue;
    const score = territoryValue(view, me, t.id) - 0.9 * d;
    if (score > bestScore) {
      bestScore = score;
      target = t.id;
    }
  }
  const campScore = hereIsFree ? territoryValue(view, me, here) : -Infinity;
  const camping = hereIsFree && (target === null || campScore >= bestScore - 0.5);

  // 3) Obiettivo di carte: villaggio (se si accampa), poi città, poi Sala.
  let goal = camping ? COST.villaggio : null;
  if (!goal) {
    const mine = Object.values(view.territories).filter((t) => t.owner === me);
    if (mine.some((t) => t.building === 'citta')) goal = COST.sala;
    else if (mine.some((t) => t.building === 'villaggio')) goal = COST.citta;
  }
  if (cfg.bankTrades && goal) {
    const trade = bankTradeToward(legal, hand, goal);
    if (trade) return trade;
  }

  // 4) Annessi: Mercato e Porto quando servono e ci sono carte in più.
  const roomy = total >= 5;
  if (cfg.buildMercato && roomy && !camping) {
    const m = bestBuild('mercato');
    if (m) return m;
  }
  const step = target ? firstStep(paths, here, target) : null;
  if (step && step.kind === 'mare' && view.territories[here]!.owner === me && !view.territories[here]!.porto) {
    const port = builds.find((b) => b.what === 'porto' && b.territory === here);
    if (port) return port;
  }

  // 5) Strade lungo il percorso (o per scaricare una mano troppo piena).
  const roads = of(legal, 'costruisciStrada');
  if (!camping && target && roads.length > 0 && hand.legname >= 1 && hand.pietra >= 1) {
    const link = firstUnroaded(view, me, paths, here, target);
    const r = roads.find((x) => x.link === link);
    if (r) return r;
  }
  if (total > 7 && roads.length > 0) {
    let best = roads[0]!;
    let bs = -Infinity;
    for (const r of roads) {
      const l = idx.link.get(r.link)!;
      const s = Math.max(territoryValue(view, me, l.a), territoryValue(view, me, l.b));
      if (s > bs) {
        bs = s;
        best = r;
      }
    }
    return best;
  }

  // 6) Muove il Jarl verso il bersaglio (se non si accampa).
  if (!camping && target && step) {
    const mv = of(legal, 'muovi').find((m) => m.to === step.to);
    if (mv) return mv;
  }

  // 7) Mano piena e niente da fare: converte in ciò che serve o spende l'argento.
  if (cfg.bankTrades && total > 7) {
    const dump = dumpTrade(legal, hand);
    if (dump) return dump;
  }
  return of(legal, 'fineTurno')[0] ?? legal[0]!;
}

/** Scambio con la banca che avvicina a `goal`: cede un'eccedenza per un materiale mancante. */
function bankTradeToward(
  legal: WorldAction[],
  hand: NonNullable<WorldBotInput['view']['hand']>,
  goal: typeof COST.villaggio
): WorldAction | null {
  const miss = missing(hand, goal);
  const need = PRODUCED_RESOURCES.filter((r) => miss[r] > 0);
  if (need.length === 0) return null;
  const trades = of(legal, 'scambioBanca');
  let best: Act<'scambioBanca'> | null = null;
  let bestScore = -Infinity;
  for (const t of trades) {
    if (t.receive === 'argento' || !need.includes(t.receive as ProducedResource)) continue;
    // Eccedenza: ciò che resta dopo aver tenuto il necessario per l'obiettivo.
    const spare = hand[t.give] - goal[t.give];
    if (spare <= 0 && t.give !== 'argento') continue;
    if (t.give === 'argento' && hand.argento <= goal.argento) continue;
    const score = miss[t.receive as ProducedResource] * 2 + spare;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

function dumpTrade(legal: WorldAction[], hand: NonNullable<WorldBotInput['view']['hand']>): WorldAction | null {
  const trades = of(legal, 'scambioBanca').filter((t) => t.receive !== 'argento' || hand.argento < 2);
  let best: Act<'scambioBanca'> | null = null;
  let bs = -Infinity;
  for (const t of trades) {
    const s = hand[t.give] - hand[t.receive as WorldResource];
    if (s > bs) {
      bs = s;
      best = t;
    }
  }
  return best;
}

// ---------------------------------------------------- risposta agli scambi
function respondToTrade(input: WorldBotInput, cfg: LevelCfg): WorldAction {
  const { view, legalActions: legal } = input;
  const offer = view.pendingTrade;
  const responses = of(legal, 'rispondiScambio');
  const no = responses.find((r) => !r.accept);
  const yes = responses.find((r) => r.accept);
  if (!offer || !cfg.respondTrades || !yes) return no ?? legal[0]!;
  const hand = view.hand!;
  // Conviene se riceve qualcosa che gli manca e cede solo eccedenze.
  const goal = COST.villaggio;
  const miss = missing(hand, goal);
  let gain = 0;
  for (const r of [...PRODUCED_RESOURCES, 'argento'] as const) {
    if (offer.give[r] > 0 && (miss[r as ProducedResource] ?? 0) > 0) gain += offer.give[r];
    if (offer.receive[r] > 0 && hand[r] - offer.receive[r] < goal[r]) gain -= 2 * offer.receive[r];
  }
  return gain > 0 ? yes : (no ?? legal[0]!);
}
