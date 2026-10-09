/** Valutazioni del bot del mondo: valore dei territori, distanze del Jarl, bisogni di materiali. */
import {
  BUILD_COSTS,
  PRODUCED_RESOURCES,
  isForeign,
  settlementOf,
  mapIndex,
  otherEnd,
  type PlayerId,
  type ProducedResource,
  type ResourceMap,
  type WorldPlayerView,
} from '@vikiland/engine-world';

export const pips = (n: number | null): number => (n === null ? 0 : 6 - Math.abs(7 - n));

export function myTerritories(view: WorldPlayerView, me: PlayerId): string[] {
  return Object.values(view.territories)
    .filter((t) => settlementOf(t, me))
    .map((t) => t.id);
}

/** Produzione attesa (pip pesati dall'edificio) per materiale. */
export function productionOf(view: WorldPlayerView, me: PlayerId): Record<ProducedResource, number> {
  const idx = mapIndex(view.map);
  const out: Record<ProducedResource, number> = { legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 0 };
  for (const t of Object.values(view.territories)) {
    const mine = settlementOf(t, me);
    if (!mine) continue;
    const kind = idx.territory.get(t.id)!.kind;
    if (kind === 'deserto') continue;
    out[kind] += pips(t.number) * (mine.building === 'villaggio' ? 1 : 2) + (mine.mercato ? 0.5 : 0);
  }
  return out;
}

export function continentsOf(view: WorldPlayerView, me: PlayerId): Set<string> {
  const idx = mapIndex(view.map);
  const set = new Set<string>();
  for (const id of myTerritories(view, me)) set.add(idx.territory.get(id)!.continent);
  return set;
}

/** Quanto vale fondare (o tenere) un territorio, dal punto di vista del giocatore. */
export function territoryValue(view: WorldPlayerView, me: PlayerId, id: string): number {
  const idx = mapIndex(view.map);
  const def = idx.territory.get(id);
  const st = view.territories[id];
  if (!def || !st || def.kind === 'deserto') return 0;
  const prod = productionOf(view, me);
  const scarcity = prod[def.kind] === 0 ? 0.7 : prod[def.kind] < 6 ? 0.25 : 0;
  let v = pips(st.number) * (1 + scarcity);
  const conts = continentsOf(view, me);
  if (!conts.has(def.continent)) v += conts.size >= 2 ? 3 : 1.5; // verso Il Grande Viaggiatore
  // un po' di spazio attorno per le strade
  const free = (idx.linksOf.get(id) ?? []).filter((l) => l.kind === 'terra' && view.roads[l.id] === undefined).length;
  v += Math.min(free, 3) * 0.2;
  return v;
}

export interface PathInfo {
  dist: Map<string, number>;
  prev: Map<string, { from: string; link: string; kind: 'terra' | 'mare' }>;
}

/**
 * Dijkstra dei punti movimento dal Jarl (con pedaggi stimati). Il mare si
 * percorre da un proprio Porto (costo 2) o, con penalità, da un proprio
 * territorio costiero dove il Porto andrebbe costruito.
 */
export function jarlPaths(view: WorldPlayerView, me: PlayerId, tollWeight = 1.5): PathInfo {
  const idx = mapIndex(view.map);
  const start = view.players[me]!.jarl;
  const dist = new Map<string, number>([[start, 0]]);
  const prev: PathInfo['prev'] = new Map();
  const done = new Set<string>();
  for (;;) {
    let cur: string | null = null;
    for (const [id, d] of dist) if (!done.has(id) && (cur === null || d < dist.get(cur)!)) cur = id;
    if (cur === null) break;
    done.add(cur);
    const d0 = dist.get(cur)!;
    const here = view.territories[cur]!;
    for (const l of idx.linksOf.get(cur) ?? []) {
      const to = otherEnd(l, cur);
      let cost: number;
      if (l.kind === 'terra') cost = view.roads[l.id] === me ? 1 : 2;
      else if (settlementOf(here, me)?.porto) cost = 2;
      else if (settlementOf(here, me)) cost = 2 + 5; // da costruire il Porto
      else continue;
      const dest = view.territories[to]!;
      if (isForeign(dest, me)) cost += dest.settlements[0]!.building === 'sala' ? tollWeight * 2 : tollWeight;
      const nd = d0 + cost;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, { from: cur, link: l.id, kind: l.kind });
      }
    }
  }
  return { dist, prev };
}

/** Primo passo del percorso dal Jarl verso `target` (e il collegamento che lo compone). */
export function firstStep(
  paths: PathInfo,
  start: string,
  target: string
): { to: string; link: string; kind: 'terra' | 'mare' } | null {
  let cur = target;
  let step: { to: string; link: string; kind: 'terra' | 'mare' } | null = null;
  let guard = 0;
  while (cur !== start) {
    const p = paths.prev.get(cur);
    if (!p || guard++ > 100) return null;
    step = { to: cur, link: p.link, kind: p.kind };
    cur = p.from;
  }
  return step;
}

/** Il primo collegamento di terra SENZA mia strada lungo il percorso verso `target`. */
export function firstUnroaded(
  view: WorldPlayerView,
  me: PlayerId,
  paths: PathInfo,
  start: string,
  target: string
): string | null {
  let cur = target;
  const chain: { link: string; kind: 'terra' | 'mare' }[] = [];
  let guard = 0;
  while (cur !== start) {
    const p = paths.prev.get(cur);
    if (!p || guard++ > 100) return null;
    chain.push({ link: p.link, kind: p.kind });
    cur = p.from;
  }
  chain.reverse();
  for (const c of chain) if (c.kind === 'terra' && view.roads[c.link] !== me) return c.link;
  return null;
}

export function missing(hand: ResourceMap, cost: ResourceMap): ResourceMap {
  const out = { legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 0, argento: 0 };
  for (const k of [...PRODUCED_RESOURCES, 'argento'] as const) out[k] = Math.max(0, cost[k] - hand[k]);
  return out;
}

export const COST = BUILD_COSTS;

export function handTotal(h: ResourceMap): number {
  return h.legname + h.pietra + h.lana + h.orzo + h.ferro + h.argento;
}

/** Il giocatore avversario più avanti in classifica (per razzie e prudenza). */
export function leaderId(view: WorldPlayerView, me: PlayerId): PlayerId | null {
  let best: PlayerId | null = null;
  for (const p of view.players) {
    if (p.id === me) continue;
    if (best === null || p.points > view.players[best]!.points) best = p.id;
  }
  return best;
}
