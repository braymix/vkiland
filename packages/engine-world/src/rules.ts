/** Regole derivate dallo stato: punteggi, strada più lunga, continenti, movimento, pedaggio. */
import {
  MAX_SETTLEMENTS,
  AWARD_POINTS,
  BUILDING_POINTS,
  GRANDE_VIAGGIATORE_MIN,
  GRANDE_VIA_MIN,
  MOVE_COST_OTHER,
  MOVE_COST_OWN_ROAD,
  PIECE_LIMITS,
  TOLL_BASE,
  TOLL_SALA,
} from './constants';
import { linkBetween, mapIndex, otherEnd } from './map';
import { pickFromLargest, totalResources, zeroResources } from './resources';
import type { PlayerId, ResourceMap, Settlement, TerritoryState, WorldGameState } from './types';

// ------------------------------------------------------------ insediamenti
/** L'insediamento del clan `pid` in questo territorio (se c'è). */
export function settlementOf(t: Pick<TerritoryState, 'settlements'> | undefined, pid: PlayerId): Settlement | undefined {
  return t?.settlements.find((s) => s.owner === pid);
}

/** C'è posto per un nuovo insediamento di `pid` (senza contare il tipo di terreno)? */
export function hasRoomFor(t: Pick<TerritoryState, 'settlements'> | undefined, pid: PlayerId): boolean {
  return !!t && t.settlements.length < MAX_SETTLEMENTS && !settlementOf(t, pid);
}

/** Il territorio è «straniero» per `pid`: abitato da altri e non da lui. */
export function isForeign(t: Pick<TerritoryState, 'settlements'> | undefined, pid: PlayerId): boolean {
  return !!t && t.settlements.length > 0 && !settlementOf(t, pid);
}

// ------------------------------------------------------------------ pezzi
export function countBuildings(state: WorldGameState, pid: PlayerId, kind: 'villaggio' | 'citta' | 'sala'): number {
  let n = 0;
  for (const t of Object.values(state.territories)) if (settlementOf(t, pid)?.building === kind) n++;
  return n;
}
export function countAnnex(state: WorldGameState, pid: PlayerId, kind: 'porto' | 'mercato'): number {
  let n = 0;
  for (const t of Object.values(state.territories)) if (settlementOf(t, pid)?.[kind]) n++;
  return n;
}
export function countRoads(state: WorldGameState, pid: PlayerId): number {
  let n = 0;
  for (const o of Object.values(state.roads)) if (o === pid) n++;
  return n;
}
export function piecesLeft(
  state: WorldGameState,
  pid: PlayerId,
  kind: 'strada' | 'villaggio' | 'citta' | 'sala' | 'porto' | 'mercato'
): number {
  const used =
    kind === 'strada'
      ? countRoads(state, pid)
      : kind === 'porto' || kind === 'mercato'
        ? countAnnex(state, pid, kind)
        : countBuildings(state, pid, kind);
  return PIECE_LIMITS[kind] - used;
}

// -------------------------------------------------------------- continenti
export function continentsOwned(state: WorldGameState, pid: PlayerId): number {
  const idx = mapIndex(state.map);
  const set = new Set<string>();
  for (const t of Object.values(state.territories)) {
    if (settlementOf(t, pid)) set.add(idx.territory.get(t.id)!.continent);
  }
  return set.size;
}

// ------------------------------------------------------------ strada lunga
/** Lunghezza della strada continua più lunga; i territori con edifici avversari la interrompono. */
export function longestRoadLength(state: WorldGameState, pid: PlayerId): number {
  const edges: { id: string; a: string; b: string }[] = [];
  const idx = mapIndex(state.map);
  for (const [id, owner] of Object.entries(state.roads)) {
    if (owner !== pid) continue;
    const l = idx.link.get(id);
    if (l) edges.push({ id, a: l.a, b: l.b });
  }
  if (edges.length === 0) return 0;
  const adj = new Map<string, { id: string; to: string }[]>();
  for (const e of edges) {
    (adj.get(e.a) ?? adj.set(e.a, []).get(e.a)!).push({ id: e.id, to: e.b });
    (adj.get(e.b) ?? adj.set(e.b, []).get(e.b)!).push({ id: e.id, to: e.a });
  }
  const blocked = (t: string): boolean => {
    return isForeign(state.territories[t], pid);
  };
  let best = 0;
  const used = new Set<string>();
  const dfs = (node: string, len: number): void => {
    if (len > best) best = len;
    for (const e of adj.get(node) ?? []) {
      if (used.has(e.id)) continue;
      used.add(e.id);
      // Se il territorio d'arrivo è di un avversario, la strada finisce lì.
      if (blocked(e.to)) {
        if (len + 1 > best) best = len + 1;
      } else {
        dfs(e.to, len + 1);
      }
      used.delete(e.id);
    }
  };
  for (const node of adj.keys()) dfs(node, 0);
  return best;
}

// ---------------------------------------------------------------- punteggi
export interface ScoreBreakdown {
  villaggi: number;
  citta: number;
  sale: number;
  grandeVia: number;
  grandeViaggiatore: number;
  total: number;
}

export function scoreBreakdown(state: WorldGameState, pid: PlayerId): ScoreBreakdown {
  const villaggi = countBuildings(state, pid, 'villaggio') * BUILDING_POINTS.villaggio;
  const citta = countBuildings(state, pid, 'citta') * BUILDING_POINTS.citta;
  const sale = countBuildings(state, pid, 'sala') * BUILDING_POINTS.sala;
  const grandeVia = state.grandeVia.holder === pid ? AWARD_POINTS : 0;
  const grandeViaggiatore = state.grandeViaggiatore.holder === pid ? AWARD_POINTS : 0;
  return { villaggi, citta, sale, grandeVia, grandeViaggiatore, total: villaggi + citta + sale + grandeVia + grandeViaggiatore };
}

export function gloryPoints(state: WorldGameState, pid: PlayerId): number {
  return scoreBreakdown(state, pid).total;
}

/** Titolo: chi supera strettamente il detentore lo prende; a parità resta a chi lo aveva. */
export function recomputeAward(
  prev: PlayerIdOrNull,
  values: number[],
  min: number
): { holder: PlayerIdOrNull; value: number } {
  let max = 0;
  for (const v of values) if (v > max) max = v;
  if (max < min) return { holder: null, value: 0 };
  const top = values.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0);
  if (prev !== null && top.includes(prev)) return { holder: prev, value: max };
  if (top.length === 1) return { holder: top[0]!, value: max };
  return { holder: null, value: max };
}
type PlayerIdOrNull = PlayerId | null;

export function recomputeGrandeVia(state: WorldGameState): boolean {
  const lens = state.players.map((p) => longestRoadLength(state, p.id));
  const r = recomputeAward(state.grandeVia.holder, lens, GRANDE_VIA_MIN);
  const changed = r.holder !== state.grandeVia.holder;
  state.grandeVia = { holder: r.holder, length: r.holder === null ? 0 : r.value };
  return changed;
}

export function recomputeGrandeViaggiatore(state: WorldGameState): boolean {
  const vals = state.players.map((p) => continentsOwned(state, p.id));
  const r = recomputeAward(state.grandeViaggiatore.holder, vals, GRANDE_VIAGGIATORE_MIN);
  const changed = r.holder !== state.grandeViaggiatore.holder;
  state.grandeViaggiatore = { holder: r.holder, continents: r.holder === null ? 0 : r.value };
  return changed;
}

// -------------------------------------------------------------- movimento
export interface MovePlan {
  from: string;
  to: string;
  link: string;
  kind: 'terra' | 'mare';
  cost: number;
}

/**
 * Il minimo che serve per calcolare movimento e pedaggi: lo soddisfano sia lo
 * stato completo sia la vista di un giocatore (così la UI mostra i costi).
 */
export interface MoveContext {
  map: WorldGameState['map'];
  territories: WorldGameState['territories'];
  roads: WorldGameState['roads'];
  players: { jarl: string; movePointsLeft: number; tollsPaidThisTurn: string[] }[];
}

export type MovePlanResult = { ok: true; plan: MovePlan } | { ok: false; code: string; message: string };

export function planMove(state: MoveContext, pid: PlayerId, to: string): MovePlanResult {
  const p = state.players[pid]!;
  const from = p.jarl;
  if (!state.territories[to]) return { ok: false, code: 'TERRITORIO_INESISTENTE', message: 'Territorio inesistente.' };
  if (to === from) return { ok: false, code: 'GIA_QUI', message: 'Il Jarl è già in questo territorio.' };
  const l = linkBetween(state.map, from, to);
  if (!l) return { ok: false, code: 'NON_CONFINANTE', message: 'Il Jarl può muoversi solo verso un territorio confinante.' };
  let cost: number;
  if (l.kind === 'terra') {
    cost = state.roads[l.id] === pid ? MOVE_COST_OWN_ROAD : MOVE_COST_OTHER;
  } else {
    const here = state.territories[from]!;
    if (!settlementOf(here, pid)?.porto) {
      return { ok: false, code: 'SERVE_PORTO', message: 'Per salpare serve un tuo Porto nel territorio di partenza.' };
    }
    cost = MOVE_COST_OTHER;
  }
  if (p.movePointsLeft < cost) {
    return { ok: false, code: 'PUNTI_MOVIMENTO', message: 'Punti movimento insufficienti.' };
  }
  return { ok: true, plan: { from, to, link: l.id, kind: l.kind, cost } };
}

/** Pedaggio dovuto entrando in `to` (null se nulla è dovuto). */
export function tollDue(state: MoveContext, pid: PlayerId, to: string): { payee: PlayerId; amount: number } | null {
  const t = state.territories[to];
  const p = state.players[pid]!;
  // Chi ha casa qui non paga; altrimenti si paga al primo arrivato.
  if (!t || !isForeign(t, pid)) return null;
  if (p.tollsPaidThisTurn.includes(to)) return null;
  const host = t.settlements[0]!;
  return { payee: host.owner, amount: host.building === 'sala' ? TOLL_SALA : TOLL_BASE };
}

export type PaymentResult = { ok: true; payment: ResourceMap } | { ok: false; code: string; message: string };

/**
 * Risolve il pagamento di un pedaggio: prima argento, poi materiali (a scelta
 * con `pay`, altrimenti dalle pile più grandi). Se non si ha abbastanza si paga ciò che c'è.
 */
export function resolveToll(hand: ResourceMap, amount: number, pay: ResourceMap | undefined): PaymentResult {
  const payment = zeroResources();
  const silver = Math.min(hand.argento, amount);
  payment.argento = silver;
  const rest = amount - silver;
  if (rest === 0) return { ok: true, payment };
  const materials = totalResources({ ...hand, argento: 0 });
  if (materials <= rest) {
    // Poco o niente: paga tutto ciò che ha.
    for (const k of ['legname', 'pietra', 'lana', 'orzo', 'ferro'] as const) payment[k] = hand[k];
    return { ok: true, payment };
  }
  if (!pay) {
    const auto = pickFromLargest({ ...hand, argento: 0 }, rest, false);
    for (const k of ['legname', 'pietra', 'lana', 'orzo', 'ferro'] as const) payment[k] = auto[k];
    return { ok: true, payment };
  }
  let sum = 0;
  for (const k of ['legname', 'pietra', 'lana', 'orzo', 'ferro'] as const) {
    if (!Number.isInteger(pay[k]) || pay[k] < 0 || pay[k] > hand[k]) {
      return { ok: false, code: 'PAGAMENTO_ERRATO', message: 'Il pagamento del pedaggio non è valido.' };
    }
    sum += pay[k];
    payment[k] = pay[k];
  }
  if (pay.argento !== 0 || sum !== rest) {
    return { ok: false, code: 'PAGAMENTO_ERRATO', message: `Devi pagare ${rest} materiale/i come pedaggio.` };
  }
  return { ok: true, payment };
}

// ---------------------------------------------------------- strade legali
/** Una strada si può posare se tocca il Jarl, un territorio proprio o un'altra strada propria. */
export function roadTouchesNetwork(state: WorldGameState, pid: PlayerId, linkIdStr: string): boolean {
  const l = mapIndex(state.map).link.get(linkIdStr);
  if (!l) return false;
  const jarl = state.players[pid]!.jarl;
  for (const end of [l.a, l.b]) {
    if (end === jarl) return true;
    if (settlementOf(state.territories[end], pid)) return true;
    for (const other of mapIndex(state.map).linksOf.get(end) ?? []) {
      if (other.id !== linkIdStr && state.roads[other.id] === pid) return true;
    }
  }
  return false;
}

export function freeTerraLinks(state: WorldGameState, territory: string): string[] {
  return (mapIndex(state.map).linksOf.get(territory) ?? [])
    .filter((l) => l.kind === 'terra' && state.roads[l.id] === undefined)
    .map((l) => l.id);
}

/** Territori raggiungibili con un singolo passo dal Jarl (con costo). */
export function reachableMoves(state: MoveContext, pid: PlayerId): MovePlan[] {
  const out: MovePlan[] = [];
  const idx = mapIndex(state.map);
  const from = state.players[pid]!.jarl;
  for (const l of idx.linksOf.get(from) ?? []) {
    const r = planMove(state, pid, otherEnd(l, from));
    if (r.ok) out.push(r.plan);
  }
  return out;
}
