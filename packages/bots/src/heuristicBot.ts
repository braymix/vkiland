/**
 * Bot euristico principale. Due livelli:
 *  - 'normale': segue sempre le priorità (roccaforte → villaggio → sentiero
 *    utile → carta → scambi mirati → passa);
 *  - 'facile': come sopra, ma con probabilità ε gioca una mossa legale a caso
 *    (e non fa scambi proattivi con la banca).
 *
 * Lavora esclusivamente per "secchielli" di mosse legali già enumerate dal
 * motore: ogni azione restituita è legale per costruzione.
 */
import {
  BUILD_COSTS,
  GRANDE_VIA_MIN,
  RESOURCES,
  getTopology,
  legalVillageVertices,
  longestRoadLength,
  nextInt,
  seedRng,
  totalResources,
  zeroResources,
  type Action,
  type BotLevel,
  type PlayerView,
  type Resource,
  type ResourceCount,
} from '@vikiland/engine';
import {
  currentGoal,
  deficit,
  dragonDamage,
  edgeExpansionScore,
  leaderId,
  placementScore,
  totalOf,
  vertexTotalPips,
} from './evaluation';
import { buildGreedyDiscard } from './randomBot';
import type { Bot, BotInput } from './types';

type Bucket<T extends Action['type']> = Extract<Action, { type: T }>[];

function bucket<T extends Action['type']>(input: BotInput, type: T): Bucket<T> {
  return input.legalActions.filter((m) => m.type === type) as Bucket<T>;
}

/** Scarto che protegge il costo dell'obiettivo corrente. */
function discardProtectingGoal(
  hand: ResourceCount,
  goalCost: ResourceCount,
  amount: number
): ResourceCount {
  const out = zeroResources();
  const left = { ...hand };
  const reserved = { ...goalCost };
  for (let i = 0; i < amount; i++) {
    // Prima il surplus (oltre la riserva) più abbondante...
    let best: Resource | null = null;
    for (const r of RESOURCES) {
      const surplus = left[r] - reserved[r];
      if (surplus > 0 && (best === null || surplus > left[best] - reserved[best])) best = r;
    }
    // ...poi, se costretti, si intacca la riserva.
    if (best === null) {
      for (const r of RESOURCES) {
        if (left[r] > 0 && (best === null || left[r] > left[best])) best = r;
      }
    }
    out[best!] += 1;
    left[best!] -= 1;
  }
  return out;
}

/** Il Drago è su un esagono che produce per me? */
function dragonHurtsMe(view: PlayerView, me: number): boolean {
  const { perPlayer } = dragonDamage(view, view.board.dragonHex);
  return (perPlayer.get(me) ?? 0) > 0;
}

export function createHeuristicBot(level: BotLevel = 'normale'): Bot {
  const epsilon = level === 'facile' ? 0.35 : 0;

  return {
    name: `euristico-${level}`,
    decide(input: BotInput): Action {
      const { view, player } = input;
      const me = view.players[player]!;
      const my = view.me!;
      const topo = getTopology();

      // --- Livello facile: ogni tanto gioca a caso (ma mai scambi/proposte) ---
      if (epsilon > 0) {
        let rng = seedRng(`eps:${input.rngSeed}`);
        const [roll, rng2] = nextInt(rng, 100);
        rng = rng2;
        if (roll < epsilon * 100) {
          const harmless = input.legalActions.filter(
            (m) =>
              m.type !== 'proponiScambioDescr' &&
              m.type !== 'scambioBanca' &&
              m.type !== 'scartaDescr' &&
              m.type !== 'rispondiScambio'
          ) as Action[];
          if (harmless.length > 0) {
            const [idx] = nextInt(rng, harmless.length);
            return harmless[idx]!;
          }
        }
      }

      // --- Setup: piazzamento iniziale ---
      const setupVillages = bucket(input, 'piazzaVillaggioIniziale');
      if (setupVillages.length > 0) {
        return setupVillages.reduce((a, b) =>
          placementScore(view, player, b.vertex) > placementScore(view, player, a.vertex) ? b : a
        );
      }
      const setupRoads = bucket(input, 'piazzaSentieroIniziale');
      if (setupRoads.length > 0) {
        return setupRoads.reduce((a, b) =>
          edgeExpansionScore(view, player, b.edge) > edgeExpansionScore(view, player, a.edge)
            ? b
            : a
        );
      }

      // --- Scarto sul 7 ---
      const discard = input.legalActions.find((m) => m.type === 'scartaDescr');
      if (discard && discard.type === 'scartaDescr') {
        const spots = legalVillageVertices(view, player);
        const { cost } = currentGoal(view, player, BUILD_COSTS, spots.length > 0);
        return {
          type: 'scarta',
          player,
          resources:
            totalResources(my.resources) > 0
              ? discardProtectingGoal(my.resources, cost, discard.amount)
              : buildGreedyDiscard(my.resources, discard.amount),
        };
      }

      // --- Spostamento del Drago: massimo danno altrui, zero danno proprio ---
      const dragonMoves = bucket(input, 'muoviDrago');
      if (dragonMoves.length > 0) {
        const leader = leaderId(view, player);
        let best = dragonMoves[0]!;
        let bestScore = -Infinity;
        for (const m of dragonMoves) {
          const { perPlayer, total } = dragonDamage(view, m.hex);
          const ownDamage = perPlayer.get(player) ?? 0;
          const leaderBonus = leader !== null && (perPlayer.get(leader) ?? 0) > 0 ? 2 : 0;
          const score = total - 2 * ownDamage * 10 + leaderBonus;
          if (score > bestScore) {
            bestScore = score;
            best = m;
          }
        }
        return best;
      }

      // --- Furto: al giocatore in testa (a parità, a chi ha più carte) ---
      const steals = bucket(input, 'ruba');
      if (steals.length > 0) {
        return steals.reduce((a, b) => {
          const pa = view.players[a.target]!;
          const pb = view.players[b.target]!;
          if (pb.gloryPointsPublic !== pa.gloryPointsPublic) {
            return pb.gloryPointsPublic > pa.gloryPointsPublic ? b : a;
          }
          return pb.resourceCardCount > pa.resourceCardCount ? b : a;
        });
      }

      // --- Risposta a un'offerta di scambio ---
      const tradeResponses = bucket(input, 'rispondiScambio');
      if (tradeResponses.length > 0) {
        const offer = view.pendingTrade!;
        const spots = legalVillageVertices(view, player);
        const { cost } = currentGoal(view, player, BUILD_COSTS, spots.length > 0);
        const need = deficit(my.resources, cost);
        // Ciò che RICEVO è offer.give; ciò che PAGO è offer.receive.
        const value = (rc: ResourceCount, weights: ResourceCount) =>
          RESOURCES.reduce((s, r) => s + rc[r] * (weights[r] > 0 ? 2 : 0.5), 0);
        const gain = value(offer.give, need);
        const pay = value(offer.receive, need);
        const proposerIsLeader = offer.from === leaderId(view, player);
        const accept = tradeResponses.find((m) => m.accept);
        const reject = tradeResponses.find((m) => !m.accept)!;
        if (accept && gain > pay && !proposerIsLeader) return accept;
        return reject;
      }

      // --- Sentieri gratuiti (Costruttori) ---
      const freeRoads = bucket(input, 'piazzaSentieroGratis');
      if (freeRoads.length > 0) {
        return freeRoads.reduce((a, b) =>
          edgeExpansionScore(view, player, b.edge) > edgeExpansionScore(view, player, a.edge)
            ? b
            : a
        );
      }

      // --- preRoll: Berserker difensivo, altrimenti dadi ---
      const rollDice = input.legalActions.find((m) => m.type === 'tiraDadi');
      const berserker = input.legalActions.find((m) => m.type === 'giocaBerserker');
      if (rollDice) {
        if (berserker && dragonHurtsMe(view, player)) return berserker as Action;
        return rollDice as Action;
      }

      // --- Fase main: priorità di costruzione ---
      const spots = legalVillageVertices(view, player);
      const { goal, cost } = currentGoal(view, player, BUILD_COSTS, spots.length > 0);
      const need = deficit(my.resources, cost);

      const strongholds = bucket(input, 'costruisciRoccaforte');
      if (strongholds.length > 0) {
        return strongholds.reduce((a, b) =>
          vertexTotalPips(view, b.vertex) > vertexTotalPips(view, a.vertex) ? b : a
        );
      }

      const villages = bucket(input, 'costruisciVillaggio');
      if (villages.length > 0) {
        return villages.reduce((a, b) =>
          placementScore(view, player, b.vertex) > placementScore(view, player, a.vertex) ? b : a
        );
      }

      const roads = bucket(input, 'costruisciSentiero');
      if (roads.length > 0) {
        // Costruire un sentiero solo se serve: apre spot di espansione oppure
        // contende La Grande Via.
        const chasingVia =
          view.longestRoad.holder !== player &&
          longestRoadLength(view, player) + 1 >=
            Math.max(GRANDE_VIA_MIN, view.longestRoad.length + 1) - 1;
        const scored = roads
          .map((m) => ({ m, score: edgeExpansionScore(view, player, m.edge) }))
          .sort((a, b) => b.score - a.score);
        const bestRoad = scored[0]!;
        if (spots.length === 0 && bestRoad.score > 0) return bestRoad.m;
        if (chasingVia) {
          // Sceglie lo spigolo che allunga di più il proprio percorso.
          let best = roads[0]!;
          let bestLen = -1;
          for (const m of roads) {
            const ipotetico = {
              players: view.players.map((p) =>
                p.id === player ? { ...p, roads: [...p.roads, m.edge] } : p
              ),
            };
            const len = longestRoadLength(ipotetico, player);
            if (len > bestLen) {
              bestLen = len;
              best = m;
            }
          }
          if (bestLen > longestRoadLength(view, player)) return best;
        }
      }

      // --- Carte Saga ---
      const buyCard = input.legalActions.find((m) => m.type === 'compraCartaSaga');
      if (buyCard && totalResources(my.resources) - totalOf(cost) >= 3) {
        return buyCard as Action;
      }
      const playBerserkerMain = input.legalActions.find((m) => m.type === 'giocaBerserker');
      if (playBerserkerMain) {
        const securesFuria =
          me.playedBerserkers + 1 >= 3 &&
          view.largestArmy.holder !== player &&
          me.playedBerserkers + 1 > view.largestArmy.count;
        if (dragonHurtsMe(view, player) || securesFuria) return playBerserkerMain as Action;
      }
      const playCostruttori = input.legalActions.find((m) => m.type === 'giocaCostruttori');
      if (playCostruttori && goal === 'sentiero') return playCostruttori as Action;

      const banchetti = bucket(input, 'giocaBanchetto');
      if (banchetti.length > 0 && totalOf(need) > 0 && totalOf(need) <= 2) {
        // Prende esattamente ciò che manca (o quasi).
        const wanted: Resource[] = [];
        for (const r of RESOURCES) for (let i = 0; i < need[r] && wanted.length < 2; i++) wanted.push(r);
        while (wanted.length < 2) wanted.push(wanted[0] ?? 'legname');
        const exact = banchetti.find(
          (m) =>
            (m.resources[0] === wanted[0] && m.resources[1] === wanted[1]) ||
            (m.resources[0] === wanted[1] && m.resources[1] === wanted[0])
        );
        if (exact) return exact;
      }

      const tributi = bucket(input, 'giocaTributo');
      if (tributi.length > 0) {
        const opponentsCards = view.players.reduce(
          (s, p) => (p.id === player ? s : s + p.resourceCardCount),
          0
        );
        if (opponentsCards >= 6 && totalOf(need) > 0) {
          let wanted: Resource | null = null;
          for (const r of RESOURCES) if (need[r] > 0 && (wanted === null || need[r] > need[wanted])) wanted = r;
          const m = tributi.find((t) => t.resource === wanted);
          if (m) return m;
        }
      }

      // --- Scambi mirati con banca/approdi (solo livello normale) ---
      if (level === 'normale' && totalOf(need) > 0) {
        const bankTrades = bucket(input, 'scambioBanca');
        const useful = bankTrades.filter((m) => need[m.receive] > 0 && cost[m.give] === 0);
        if (useful.length > 0) {
          // Cede la risorsa più abbondante tra quelle non necessarie.
          return useful.reduce((a, b) =>
            my.resources[b.give] > my.resources[a.give] ? b : a
          );
        }
      }

      // --- Fine turno (sempre presente in main) ---
      const endTurn = input.legalActions.find((m) => m.type === 'fineTurno');
      if (endTurn) return endTurn as Action;

      // Difesa estrema: prima mossa concreta disponibile.
      const fallback = input.legalActions.find(
        (m) => m.type !== 'proponiScambioDescr' && m.type !== 'scartaDescr'
      );
      if (!fallback) throw new Error('heuristicBot: nessuna mossa disponibile');
      void topo;
      return fallback as Action;
    },
  };
}
