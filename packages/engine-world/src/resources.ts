import { WORLD_RESOURCES } from './constants';
import type { ResourceMap, WorldResource } from './types';

export function zeroResources(): ResourceMap {
  return { legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 0, argento: 0 };
}

export function totalResources(r: ResourceMap): number {
  let n = 0;
  for (const k of WORLD_RESOURCES) n += r[k];
  return n;
}

export function hasAtLeast(hand: ResourceMap, cost: ResourceMap): boolean {
  return WORLD_RESOURCES.every((k) => hand[k] >= cost[k]);
}

export function addResources(a: ResourceMap, b: ResourceMap): void {
  for (const k of WORLD_RESOURCES) a[k] += b[k];
}

export function subResources(a: ResourceMap, b: ResourceMap): void {
  for (const k of WORLD_RESOURCES) a[k] -= b[k];
}

/** Tutti i valori sono interi >= 0. */
export function isValidResourceMap(r: unknown): r is ResourceMap {
  if (typeof r !== 'object' || r === null) return false;
  const o = r as Record<string, unknown>;
  return WORLD_RESOURCES.every((k) => typeof o[k] === 'number' && Number.isInteger(o[k]) && (o[k] as number) >= 0);
}

export function oneOf(res: WorldResource, n = 1): ResourceMap {
  const r = zeroResources();
  r[res] = n;
  return r;
}

export function overlapping(a: ResourceMap, b: ResourceMap): boolean {
  return WORLD_RESOURCES.some((k) => a[k] > 0 && b[k] > 0);
}

/** Scarto/pagamento di default: toglie `n` carte dalle pile più grandi (materiali prima dell'argento). */
export function pickFromLargest(hand: ResourceMap, n: number, includeSilver: boolean): ResourceMap {
  const out = zeroResources();
  const left = { ...hand };
  const keys: WorldResource[] = includeSilver ? [...WORLD_RESOURCES] : WORLD_RESOURCES.filter((k) => k !== 'argento');
  for (let i = 0; i < n; i++) {
    let best: WorldResource | null = null;
    for (const k of keys) if (left[k] > 0 && (best === null || left[k] > left[best])) best = k;
    if (best === null) break;
    left[best] -= 1;
    out[best] += 1;
  }
  return out;
}
