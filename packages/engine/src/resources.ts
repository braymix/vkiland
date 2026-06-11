/** Aritmetica pura sui mazzetti di risorse (`ResourceCount`). */
import { RESOURCES } from './constants';
import type { Resource, ResourceCount } from './types';

export function zeroResources(): ResourceCount {
  return { legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 0 };
}

export function cloneResources(rc: ResourceCount): ResourceCount {
  return { ...rc };
}

export function totalResources(rc: ResourceCount): number {
  let total = 0;
  for (const r of RESOURCES) total += rc[r];
  return total;
}

export function addResources(a: ResourceCount, b: ResourceCount): ResourceCount {
  const out = zeroResources();
  for (const r of RESOURCES) out[r] = a[r] + b[r];
  return out;
}

export function subtractResources(a: ResourceCount, b: ResourceCount): ResourceCount {
  const out = zeroResources();
  for (const r of RESOURCES) out[r] = a[r] - b[r];
  return out;
}

/** a contiene almeno b? */
export function hasAtLeast(a: ResourceCount, b: ResourceCount): boolean {
  return RESOURCES.every((r) => a[r] >= b[r]);
}

/** Tutte le quantità sono intere e ≥ 0? (validazione input esterni) */
export function isValidResourceCount(rc: unknown): rc is ResourceCount {
  if (typeof rc !== 'object' || rc === null) return false;
  const obj = rc as Record<string, unknown>;
  return RESOURCES.every(
    (r) => typeof obj[r] === 'number' && Number.isInteger(obj[r]) && (obj[r] as number) >= 0
  );
}

export function resourceEntries(rc: ResourceCount): [Resource, number][] {
  return RESOURCES.map((r) => [r, rc[r]] as [Resource, number]);
}

/** Le risorse con quantità > 0 in entrambi i mazzetti (per il divieto give∩receive). */
export function overlappingResources(a: ResourceCount, b: ResourceCount): Resource[] {
  return RESOURCES.filter((r) => a[r] > 0 && b[r] > 0);
}

/** Espande un mazzetto in lista piatta (es. per pescare una carta a caso). */
export function flattenResources(rc: ResourceCount): Resource[] {
  const out: Resource[] = [];
  for (const r of RESOURCES) {
    for (let i = 0; i < rc[r]; i++) out.push(r);
  }
  return out;
}
