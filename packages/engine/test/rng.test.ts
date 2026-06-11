import { describe, expect, it } from 'vitest';
import { nextInt, nextU32, rollDie, seedRng, shuffle, type RngState } from '../src/rng';

describe('rng (xoshiro128** seedato)', () => {
  it('stesso seed ⇒ stessa sequenza', () => {
    let a = seedRng('vikiland');
    let b = seedRng('vikiland');
    for (let i = 0; i < 50; i++) {
      const [va, na] = nextU32(a);
      const [vb, nb] = nextU32(b);
      expect(va).toBe(vb);
      a = na;
      b = nb;
    }
  });

  it('seed diversi ⇒ sequenze diverse', () => {
    const [va] = nextU32(seedRng('seed-1'));
    const [vb] = nextU32(seedRng('seed-2'));
    expect(va).not.toBe(vb);
  });

  it('non muta mai lo stato in ingresso', () => {
    const s = seedRng('immutabile');
    const copia = [...s];
    nextU32(s);
    nextInt(s, 10);
    shuffle(s, [1, 2, 3]);
    expect([...s]).toEqual(copia);
  });

  it('nextInt resta nei limiti e copre tutti i valori', () => {
    let s = seedRng('range');
    const visti = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const [v, next] = nextInt(s, 6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
      visti.add(v);
      s = next;
    }
    expect(visti.size).toBe(6);
  });

  it('rollDie produce 1..6 con distribuzione plausibile', () => {
    let s = seedRng('dadi');
    const conteggi = new Map<number, number>();
    const n = 6000;
    for (let i = 0; i < n; i++) {
      const [v, next] = rollDie(s);
      conteggi.set(v, (conteggi.get(v) ?? 0) + 1);
      s = next;
    }
    for (let faccia = 1; faccia <= 6; faccia++) {
      const c = conteggi.get(faccia) ?? 0;
      // atteso 1000 ± tolleranza larga (test anti-regressione, non statistico)
      expect(c).toBeGreaterThan(800);
      expect(c).toBeLessThan(1200);
    }
  });

  it('shuffle è una permutazione deterministica dato il seed', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const [p1] = shuffle(seedRng('mescola'), items);
    const [p2] = shuffle(seedRng('mescola'), items);
    expect(p1).toEqual(p2);
    expect([...p1].sort((a, b) => a - b)).toEqual(items);
    expect(p1).not.toEqual(items); // con 20 elementi è praticamente impossibile
  });

  it('lo stato sopravvive a un round-trip JSON', () => {
    let s = seedRng('json');
    for (let i = 0; i < 7; i++) [, s] = nextU32(s);
    const ripristinato = JSON.parse(JSON.stringify(s)) as RngState;
    const [v1] = nextU32(s);
    const [v2] = nextU32(ripristinato);
    expect(v1).toBe(v2);
  });
});
