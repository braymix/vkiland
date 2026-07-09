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
  ATTACK_COST_EDIFICIO,
  ATTACK_COST_SENTIERO,
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

/**
 * Guadagno "a scelta" di una calamità: prima colma il fabbisogno dell'obiettivo
 * corrente (ciò che manca al `goalCost`), poi riempie col materiale più capiente
 * in banca. Ogni scelta è limitata da ciò che la banca ha davvero.
 */
function gainTowardGoal(
  hand: ResourceCount,
  goalCost: ResourceCount,
  bank: ResourceCount,
  amount: number
): ResourceCount {
  const out = zeroResources();
  const left = { ...bank };
  const need: ResourceCount = zeroResources();
  for (const r of RESOURCES) need[r] = Math.max(0, goalCost[r] - hand[r]);
  let taken = 0;
  // 1) verso l'obiettivo
  for (const r of RESOURCES) {
    while (taken < amount && need[r] > 0 && left[r] > 0) {
      out[r] += 1;
      left[r] -= 1;
      need[r] -= 1;
      taken += 1;
    }
  }
  // 2) riempimento col materiale più abbondante disponibile
  while (taken < amount) {
    let best: Resource | null = null;
    for (const r of RESOURCES) if (left[r] > 0 && (best === null || left[r] > left[best])) best = r;
    if (best === null) break; // banca vuota
    out[best] += 1;
    left[best] -= 1;
    taken += 1;
  }
  return out;
}

/** Il Drago è su un esagono che produce per me? */
function dragonHurtsMe(view: PlayerView, me: number): boolean {
  const { perPlayer } = dragonDamage(view, view.board.dragonHex);
  return (perPlayer.get(me) ?? 0) > 0;
}

/** Tarature per livello di difficoltà. */
interface LevelCfg {
  /** Probabilità di una mossa casuale (errori voluti). */
  epsilon: number;
  /** Propone scambi agli altri giocatori (max per turno). */
  proposalsPerTurn: number;
  /** Margine richiesto per accettare un'offerta (più basso = più accomodante). */
  acceptMargin: number;
  /** Rifiuta scambi con chi è a ≤ N Punti Gloria pubblici dalla vittoria (0 = off). */
  guardLeaderPG: number;
  /** Scambi proattivi con banca/approdi. */
  bankTrades: boolean;
  /** Soglia di surplus per comprare una Carta Saga. */
  cardBuyMargin: number;
  /** Carte avversarie minime per giocare il Tributo. */
  tributeThreshold: number;
  /**
   * Modalità Battaglia: attacca un avversario a ≤ N Punti Gloria pubblici dalla
   * vittoria (0 = mai). Da 3 in su il bot fa anche attacchi opportunistici al
   * leader col surplus.
   */
  attackWithin: number;
}

const LEVELS: Record<BotLevel, LevelCfg> = {
  facile: {
    epsilon: 0.35,
    proposalsPerTurn: 0,
    acceptMargin: 2,
    guardLeaderPG: 0,
    bankTrades: false,
    cardBuyMargin: 3,
    tributeThreshold: 6,
    attackWithin: 0,
  },
  normale: {
    epsilon: 0,
    proposalsPerTurn: 1,
    acceptMargin: 1,
    guardLeaderPG: 0,
    bankTrades: true,
    cardBuyMargin: 3,
    tributeThreshold: 6,
    attackWithin: 2,
  },
  difficile: {
    epsilon: 0,
    proposalsPerTurn: 2,
    acceptMargin: 1,
    guardLeaderPG: 2,
    bankTrades: true,
    cardBuyMargin: 2,
    tributeThreshold: 5,
    attackWithin: 3,
  },
  esperto: {
    epsilon: 0,
    proposalsPerTurn: 2,
    acceptMargin: 0,
    guardLeaderPG: 3,
    bankTrades: true,
    cardBuyMargin: 2,
    tributeThreshold: 4,
    attackWithin: 4,
  },
};

/** Giocatori pericolosamente vicini alla vittoria (PG pubblici). */
function nearVictory(view: PlayerView, margin: number): Set<number> {
  const out = new Set<number>();
  if (margin <= 0) return out;
  for (const p of view.players) {
    if (p.gloryPointsPublic >= view.targetGloryPoints - margin) out.add(p.id);
  }
  return out;
}

type AttackMove = Extract<Action, { type: 'attaccaEdificio' | 'giocaAssalto' }>;

/**
 * Modalità Battaglia: sceglie il miglior edificio avversario da attaccare tra i
 * `candidates` dati (o null se non conviene). `defensiveOnly` limita ai bersagli
 * di un avversario PROSSIMO alla vittoria — disattivarlo ha priorità sulle
 * proprie costruzioni. `free` = attacco con la carta ASSALTO (nessun costo in
 * risorse): salta la prudenza sul surplus. Con `candidates` vuoto esce subito.
 */
function chooseAttack(
  view: PlayerView,
  player: number,
  cfg: LevelCfg,
  candidates: readonly AttackMove[],
  free: boolean,
  defensiveOnly: boolean
): Action | null {
  if (cfg.attackWithin <= 0) return null;
  if (candidates.length === 0) return null;
  const my = view.me!;

  const scored = candidates
    .map((m) => {
      let owner = -1;
      let stronghold = false;
      for (const p of view.players) {
        if (p.id === player) continue;
        if (p.strongholds.includes(m.vertex)) {
          owner = p.id;
          stronghold = true;
          break;
        }
        if (p.villages.includes(m.vertex)) {
          owner = p.id;
          break;
        }
      }
      const ownerPG = owner >= 0 ? view.players[owner]!.gloryPointsPublic : -1;
      return {
        m,
        owner,
        ownerPG,
        stronghold,
        pips: vertexTotalPips(view, m.vertex),
        imminent: ownerPG >= view.targetGloryPoints - 1,
        threat: ownerPG >= view.targetGloryPoints - cfg.attackWithin,
      };
    })
    .filter((x) => x.owner >= 0);

  let pool = scored.filter((x) => x.threat);
  if (defensiveOnly) {
    // In difesa colpisco solo chi sta per vincere.
    pool = pool.filter((x) => x.imminent);
  } else if (pool.length === 0 && cfg.attackWithin >= 3) {
    // Livelli alti, senza minacce vicine: attacco opportunistico al leader.
    const leader = leaderId(view, player);
    if (leader !== null) pool = scored.filter((x) => x.owner === leader);
  }
  if (pool.length === 0) return null;

  // Prudenza: l'attacco a pagamento, se non imminente, si fa solo col surplus
  // (qualche carta oltre al costo). L'attacco con la carta ASSALTO è gratis.
  if (!free && !pool.some((x) => x.imminent) && totalResources(my.resources) - totalOf(ATTACK_COST_EDIFICIO) < 3) {
    return null;
  }

  // Migliore: prima chi è più avanti, poi le roccaforti, poi i vertici più ricchi.
  pool.sort(
    (a, b) =>
      b.ownerPG - a.ownerPG ||
      Number(b.stronghold) - Number(a.stronghold) ||
      b.pips - a.pips
  );
  return pool[0]!.m;
}

type RoadBreakMove = Extract<Action, { type: 'spezzaSentiero' }>;

/**
 * Modalità Battaglia — attacco leggero: sceglie quale strada avversaria
 * spezzare tra i `candidates` (o null se non conviene). Priorità: togliere La
 * Grande Via a chi la detiene, poi ostacolare un avversario prossimo alla
 * vittoria. È un'azione a pagamento: fuori dai casi urgenti si fa solo col
 * surplus, come l'attacco pesante.
 */
function chooseRoadBreak(
  view: PlayerView,
  player: number,
  cfg: LevelCfg,
  candidates: readonly RoadBreakMove[]
): Action | null {
  if (cfg.attackWithin <= 0) return null;
  if (candidates.length === 0) return null;
  const my = view.me!;

  const ownerOf = (edge: string): number => {
    for (const p of view.players) {
      if (p.id !== player && p.roads.includes(edge)) return p.id;
    }
    return -1;
  };

  const viaHolder = view.longestRoad.holder;
  const scored = candidates
    .map((m) => {
      const owner = ownerOf(m.edge);
      const ownerPG = owner >= 0 ? view.players[owner]!.gloryPointsPublic : -1;
      return {
        m,
        owner,
        ownerPG,
        // Spezzare La Grande Via a chi la detiene vale molto (2 PG in ballo).
        breaksVia: owner >= 0 && viaHolder === owner,
        threat: ownerPG >= view.targetGloryPoints - cfg.attackWithin,
        imminent: ownerPG >= view.targetGloryPoints - 1,
      };
    })
    .filter((x) => x.owner >= 0);

  // Interessa solo chi detiene La Grande Via o è entro la soglia di minaccia.
  const pool = scored.filter((x) => x.breaksVia || x.threat);
  if (pool.length === 0) return null;

  // Prudenza: se non c'è urgenza (né Grande Via né minaccia imminente), si
  // spezza solo col surplus oltre il costo.
  const urgent = pool.some((x) => x.breaksVia || x.imminent);
  if (!urgent && totalResources(my.resources) - totalOf(ATTACK_COST_SENTIERO) < 3) {
    return null;
  }

  // Prima chi mi toglie La Grande Via, poi chi è più avanti in classifica.
  pool.sort((a, b) => Number(b.breaksVia) - Number(a.breaksVia) || b.ownerPG - a.ownerPG);
  return pool[0]!.m;
}

export function createHeuristicBot(level: BotLevel = 'normale'): Bot {
  const cfg = LEVELS[level];
  const epsilon = cfg.epsilon;
  // Memoria per turno: quante proposte fatte e quale l'ultima (per non
  // riproporre all'infinito la stessa offerta rifiutata).
  let proposalTurn = -1;
  let proposalsThisTurn = 0;
  let lastProposalKey = '';

  return {
    name: `euristico-${level}`,
    decide(input: BotInput): Action {
      const { view, player } = input;
      const me = view.players[player]!;
      const my = view.me!;
      const topo = getTopology(view.boardRadius);

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
              m.type !== 'guadagnaDescr' &&
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

      // --- Scarto sul 7 o imposto da una calamità (stesso descrittore) ---
      const discard = input.legalActions.find((m) => m.type === 'scartaDescr');
      if (discard && discard.type === 'scartaDescr') {
        const spots = legalVillageVertices(view, player, view.boardRadius);
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

      // --- Guadagno "a scelta" di una calamità: si punta all'obiettivo corrente ---
      const gain = input.legalActions.find((m) => m.type === 'guadagnaDescr');
      if (gain && gain.type === 'guadagnaDescr') {
        const spots = legalVillageVertices(view, player, view.boardRadius);
        const { cost } = currentGoal(view, player, BUILD_COSTS, spots.length > 0);
        return {
          type: 'guadagnaCalamita',
          player,
          resources: gainTowardGoal(my.resources, cost, view.bank, gain.amount),
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
        const spots = legalVillageVertices(view, player, view.boardRadius);
        const { cost } = currentGoal(view, player, BUILD_COSTS, spots.length > 0);
        const need = deficit(my.resources, cost);
        // Ciò che RICEVO è offer.give; ciò che PAGO è offer.receive.
        // Ricevere ciò che mi manca vale 3, il resto 1; pagare una risorsa
        // che serve all'obiettivo (e non è in surplus) costa 3, il surplus 1.
        const gain = RESOURCES.reduce(
          (sum, r) => sum + offer.give[r] * (need[r] > 0 ? 3 : 1),
          0
        );
        const pay = RESOURCES.reduce((sum, r) => {
          const isSurplus = my.resources[r] - offer.receive[r] >= cost[r];
          return sum + offer.receive[r] * (isSurplus ? 1 : 3);
        }, 0);
        const danger = nearVictory(view, cfg.guardLeaderPG);
        const accept = tradeResponses.find((m) => m.accept);
        const reject = tradeResponses.find((m) => !m.accept)!;
        if (accept && gain - pay >= cfg.acceptMargin && gain > 0 && !danger.has(offer.from)) {
          return accept;
        }
        return reject;
      }

      // --- Gestione della PROPRIA offerta: conferma il migliore o ritira ---
      const confirms = bucket(input, 'confermaScambio');
      const cancels = bucket(input, 'annullaScambio');
      if ((confirms.length > 0 || cancels.length > 0) && view.pendingTrade?.from === player) {
        if (confirms.length > 0) {
          const danger = nearVictory(view, cfg.guardLeaderPG);
          const safe = confirms.filter((c) => !danger.has(c.with));
          if (safe.length > 0) {
            // Si conclude con l'accettante più indietro in classifica.
            return safe.reduce((a, b) =>
              view.players[b.with]!.gloryPointsPublic < view.players[a.with]!.gloryPointsPublic
                ? b
                : a
            );
          }
        }
        if (cancels.length > 0) return cancels[0]!;
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
      const spots = legalVillageVertices(view, player, view.boardRadius);
      const { goal, cost } = currentGoal(view, player, BUILD_COSTS, spots.length > 0);
      const need = deficit(my.resources, cost);

      // Battaglia: fermare chi sta per vincere viene prima delle proprie
      // costruzioni. Si preferisce la carta ASSALTO (gratis) all'attacco a pagamento.
      const assaultMoves = bucket(input, 'giocaAssalto');
      const attackMoves = bucket(input, 'attaccaEdificio');
      const roadBreakMoves = bucket(input, 'spezzaSentiero');
      const defend =
        chooseAttack(view, player, cfg, assaultMoves, true, true) ??
        chooseAttack(view, player, cfg, attackMoves, false, true) ??
        chooseRoadBreak(view, player, cfg, roadBreakMoves);
      if (defend) return defend;

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

      // --- Battaglia: attacco opportunistico dopo gli edifici (che valgono PG),
      //     ma PRIMA di un semplice sentiero: colpire il leader vale più di una
      //     strada che non fa punti. Prima la carta ASSALTO (gratis), poi
      //     l'attacco pesante col surplus, infine lo spezza-strada. ---
      const attack =
        chooseAttack(view, player, cfg, assaultMoves, true, false) ??
        chooseAttack(view, player, cfg, attackMoves, false, false) ??
        chooseRoadBreak(view, player, cfg, roadBreakMoves);
      if (attack) return attack;

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
      if (buyCard && totalResources(my.resources) - totalOf(cost) >= cfg.cardBuyMargin) {
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
        if (opponentsCards >= cfg.tributeThreshold && totalOf(need) > 0) {
          let wanted: Resource | null = null;
          for (const r of RESOURCES) if (need[r] > 0 && (wanted === null || need[r] > need[wanted])) wanted = r;
          const m = tributi.find((t) => t.resource === wanted);
          if (m) return m;
        }
      }

      // --- Scambi mirati con banca/approdi ---
      if (cfg.bankTrades && totalOf(need) > 0) {
        const bankTrades = bucket(input, 'scambioBanca');
        const useful = bankTrades.filter((m) => need[m.receive] > 0 && cost[m.give] === 0);
        if (useful.length > 0) {
          // Cede la risorsa più abbondante tra quelle non necessarie.
          return useful.reduce((a, b) =>
            my.resources[b.give] > my.resources[a.give] ? b : a
          );
        }
        // Esperto: pur di sbloccarsi converte anche il surplus di una risorsa
        // che l'obiettivo usa, se ne resta comunque abbastanza.
        if (level === 'esperto') {
          const desperate = bankTrades.filter(
            (m) => need[m.receive] > 0 && my.resources[m.give] - cost[m.give] >= 2
          );
          if (desperate.length > 0) {
            return desperate.reduce((a, b) =>
              my.resources[b.give] - cost[b.give] > my.resources[a.give] - cost[a.give] ? b : a
            );
          }
        }
      }

      // --- Proposta di scambio agli altri giocatori (1 surplus ↔ 1 mancante) ---
      const canPropose = input.legalActions.some((m) => m.type === 'proponiScambioDescr');
      if (canPropose && cfg.proposalsPerTurn > 0 && totalOf(need) > 0) {
        if (view.turnNumber !== proposalTurn) {
          proposalTurn = view.turnNumber;
          proposalsThisTurn = 0;
        }
        const othersHaveCards = view.players.some(
          (p) => p.id !== player && p.resourceCardCount > 0
        );
        if (proposalsThisTurn < cfg.proposalsPerTurn && othersHaveCards) {
          // Risorsa più mancante ↔ surplus più abbondante (oltre la riserva).
          let wanted: Resource | null = null;
          for (const r of RESOURCES) {
            if (need[r] > 0 && (wanted === null || need[r] > need[wanted])) wanted = r;
          }
          let surplus: Resource | null = null;
          for (const r of RESOURCES) {
            if (r === wanted) continue;
            const extra = my.resources[r] - cost[r];
            if (extra >= 1 && (surplus === null || extra > my.resources[surplus] - cost[surplus])) {
              surplus = r;
            }
          }
          const key = `${view.turnNumber}:${wanted}>${surplus}`;
          if (wanted && surplus && key !== lastProposalKey) {
            proposalsThisTurn += 1;
            lastProposalKey = key;
            const give = zeroResources();
            const receive = zeroResources();
            give[surplus] = 1;
            receive[wanted] = 1;
            return { type: 'proponiScambio', player, give, receive, to: null };
          }
        }
      }

      // --- Fine turno (sempre presente in main) ---
      const endTurn = input.legalActions.find((m) => m.type === 'fineTurno');
      if (endTurn) return endTurn as Action;

      // Difesa estrema: prima mossa concreta disponibile.
      const fallback = input.legalActions.find(
        (m) =>
          m.type !== 'proponiScambioDescr' &&
          m.type !== 'scartaDescr' &&
          m.type !== 'guadagnaDescr'
      );
      if (!fallback) throw new Error('heuristicBot: nessuna mossa disponibile');
      void topo;
      return fallback as Action;
    },
  };
}
