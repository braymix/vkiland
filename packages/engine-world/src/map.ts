/**
 * Mappa a territori: registro delle mappe, validazione, override admin,
 * indice di adiacenza e assegnazione dei numeri. La mappa è un DATO: l'engine
 * lavora solo sul grafo (mondo, nazione o città sono la stessa cosa).
 */
import mondoJson from './maps/mondo.json';
import europaJson from './maps/europa.json';
import italiaJson from './maps/italia.json';
import milanoJson from './maps/milano.json';
import { MIN_PRODUCTIVE_TERRITORIES, PRODUCED_RESOURCES } from './constants';
import { shuffle, type RngState } from './rng';
import type {
  FrozenLink,
  FrozenMap,
  MapDefinition,
  MapOverride,
  TerritoryDef,
} from './types';

/**
 * Registro delle mappe, dalla più grande alla più piccola (la scelta in gioco
 * è «a zoom»: Mondo → Continente → Nazione → Città). Altre città si generano
 * con `scripts/build-city-map.mjs`.
 */
export const MAPS: Readonly<Record<string, MapDefinition>> = {
  mondo: mondoJson as unknown as MapDefinition,
  europa: europaJson as unknown as MapDefinition,
  italia: italiaJson as unknown as MapDefinition,
  milano: milanoJson as unknown as MapDefinition,
};

export const SCALE_ORDER: readonly MapDefinition['scale'][] = ['mondo', 'continente', 'nazione', 'regione', 'citta'];

export function getMapDefinition(id: string): MapDefinition | null {
  return MAPS[id] ?? null;
}

/** Id stabile di un collegamento: i due territori in ordine alfabetico. */
export function linkId(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function isProductive(t: TerritoryDef): boolean {
  return t.kind !== 'deserto';
}

/** Controlli strutturali di una mappa. Restituisce l'elenco degli errori (vuoto = ok). */
export function validateMap(def: MapDefinition): string[] {
  const errors: string[] = [];
  const byId = new Map(def.territories.map((t) => [t.id, t]));
  if (byId.size !== def.territories.length) errors.push('Id dei territori duplicati.');
  const seen = new Set<string>();
  for (const l of def.links) {
    const a = byId.get(l.a);
    const b = byId.get(l.b);
    if (!a || !b) {
      errors.push(`Collegamento verso un territorio sconosciuto: ${l.a}–${l.b}.`);
      continue;
    }
    if (l.a === l.b) errors.push(`Collegamento su se stesso: ${l.a}.`);
    const id = linkId(l.a, l.b);
    if (seen.has(id)) errors.push(`Collegamento duplicato: ${id}.`);
    seen.add(id);
    if (l.kind === 'mare' && !(a.coastal && b.coastal)) {
      errors.push(`La rotta ${id} deve unire due territori costieri.`);
    }
  }
  if (def.territories.length > 0) {
    const adj = new Map<string, string[]>(def.territories.map((t) => [t.id, []]));
    for (const l of def.links) {
      adj.get(l.a)?.push(l.b);
      adj.get(l.b)?.push(l.a);
    }
    const start = def.territories[0]!.id;
    const visited = new Set([start]);
    const stack = [start];
    while (stack.length > 0) {
      const x = stack.pop()!;
      for (const y of adj.get(x) ?? []) {
        if (!visited.has(y)) {
          visited.add(y);
          stack.push(y);
        }
      }
    }
    if (visited.size !== def.territories.length) errors.push('La mappa non è connessa (terra + mare).');
  }
  const productive = def.territories.filter(isProductive).length;
  if (def.numberPool.length !== productive) {
    errors.push(`I numeri (${def.numberPool.length}) non coincidono coi territori produttivi (${productive}).`);
  }
  return errors;
}

/** Toglie dal mazzo di numeri i più «centrali» (vicini al 7; a parità il più basso). */
export function trimNumberPool(pool: readonly number[], keep: number): number[] {
  const out = [...pool].sort((a, b) => a - b);
  while (out.length > keep) {
    let idx = 0;
    for (let i = 1; i < out.length; i++) {
      if (Math.abs(out[i]! - 7) < Math.abs(out[idx]! - 7)) idx = i;
    }
    out.splice(idx, 1);
  }
  return out;
}

export type OverrideResult = { ok: true; def: MapDefinition } | { ok: false; error: string };

/** Applica rinomine e rimozioni dell'admin; rifiuta le mappe ingiocabili. */
export function applyMapOverride(def: MapDefinition, override: MapOverride | null | undefined): OverrideResult {
  if (!override) return { ok: true, def };
  const removed = new Set(override.removed);
  const territories = def.territories
    .filter((t) => !removed.has(t.id))
    .map((t) => {
      const nm = override.names[t.id];
      return nm !== undefined && nm.trim() !== '' ? { ...t, name: nm.trim() } : t;
    });
  const ids = new Set(territories.map((t) => t.id));
  const links = def.links.filter((l) => ids.has(l.a) && ids.has(l.b));
  const productive = territories.filter(isProductive).length;
  const next: MapDefinition = {
    ...def,
    territories,
    links,
    numberPool: trimNumberPool(def.numberPool, productive),
  };
  if (productive < MIN_PRODUCTIVE_TERRITORIES) {
    return { ok: false, error: `Servono almeno ${MIN_PRODUCTIVE_TERRITORIES} territori produttivi.` };
  }
  for (const r of PRODUCED_RESOURCES) {
    if (!territories.some((t) => t.kind === r)) return { ok: false, error: `Manca il materiale «${r}».` };
  }
  const errors = validateMap(next);
  if (errors.length > 0) return { ok: false, error: errors[0]! };
  return { ok: true, def: next };
}

export function freezeMap(def: MapDefinition): FrozenMap {
  return {
    id: def.id,
    name: def.name,
    scale: def.scale,
    projection: def.projection,
    territories: def.territories.map((t) => ({ ...t })),
    links: def.links.map((l) => ({ ...l, id: linkId(l.a, l.b) })),
    ...(def.credits ? { credits: def.credits } : {}),
  };
}

// ----------------------------------------------------------------- indice
export interface MapIndex {
  territory: Map<string, TerritoryDef>;
  linksOf: Map<string, FrozenLink[]>;
  link: Map<string, FrozenLink>;
}

const indexCache = new WeakMap<FrozenMap, MapIndex>();

export function mapIndex(map: FrozenMap): MapIndex {
  const cached = indexCache.get(map);
  if (cached) return cached;
  const territory = new Map(map.territories.map((t) => [t.id, t]));
  const linksOf = new Map<string, FrozenLink[]>(map.territories.map((t) => [t.id, []]));
  const link = new Map<string, FrozenLink>();
  for (const l of map.links) {
    linksOf.get(l.a)?.push(l);
    linksOf.get(l.b)?.push(l);
    link.set(l.id, l);
  }
  const idx = { territory, linksOf, link };
  indexCache.set(map, idx);
  return idx;
}

export function otherEnd(l: FrozenLink, from: string): string {
  return l.a === from ? l.b : l.a;
}

/** Il collegamento diretto fra due territori (terra preferito). */
export function linkBetween(map: FrozenMap, a: string, b: string): FrozenLink | null {
  const l = mapIndex(map).link.get(linkId(a, b));
  return l ?? null;
}

// ----------------------------------------------------------------- numeri
/**
 * Assegna i numeri ai territori produttivi (ordine mappa) mescolando il mazzo;
 * con `avoid68` ritenta finché 6/8 non sono su territori collegati.
 */
export function assignNumbers(
  def: MapDefinition,
  rng: RngState,
  avoid68: boolean
): [Record<string, number>, RngState] {
  const productive = def.territories.filter(isProductive);
  const adj = new Map<string, Set<string>>(productive.map((t) => [t.id, new Set()]));
  for (const l of def.links) {
    adj.get(l.a)?.add(l.b);
    adj.get(l.b)?.add(l.a);
  }
  let s = rng;
  let best: number[] = [];
  for (let attempt = 0; attempt < 300; attempt++) {
    const [pool, next] = shuffle(s, def.numberPool);
    s = next;
    best = pool;
    if (!avoid68) break;
    const num = new Map(productive.map((t, i) => [t.id, pool[i]!]));
    const hot = (n: number | undefined): boolean => n === 6 || n === 8;
    const bad = productive.some(
      (t) => hot(num.get(t.id)) && [...(adj.get(t.id) ?? [])].some((o) => hot(num.get(o)))
    );
    if (!bad) break;
  }
  const out: Record<string, number> = {};
  productive.forEach((t, i) => {
    out[t.id] = best[i]!;
  });
  return [out, s];
}
