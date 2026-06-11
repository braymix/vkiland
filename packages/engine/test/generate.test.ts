import { describe, expect, it } from 'vitest';
import { generateBoard } from '../src/board/generate';
import { getTopology } from '../src/board/topology';
import { hexNeighbors, hexKey } from '../src/board/coords';
import { PORT_RING_INDICES, TOKEN_POOL } from '../src/constants';
import { seedRng } from '../src/rng';

function board(seed: string, avoid68 = true) {
  const [b] = generateBoard(seedRng(seed), avoid68);
  return b;
}

describe('generazione della tavola', () => {
  it('usa esattamente il pool di terreni previsto', () => {
    const b = board('terreni');
    const counts = new Map<string, number>();
    for (const h of b.hexes) counts.set(h.terrain, (counts.get(h.terrain) ?? 0) + 1);
    expect(counts.get('legname')).toBe(4);
    expect(counts.get('lana')).toBe(4);
    expect(counts.get('orzo')).toBe(4);
    expect(counts.get('pietra')).toBe(3);
    expect(counts.get('ferro')).toBe(3);
    expect(counts.get('tundra')).toBe(1);
    expect(b.hexes).toHaveLength(19);
  });

  it('assegna i segnalini giusti: tundra senza, gli altri dal pool, mai il 7', () => {
    const b = board('segnalini');
    const tokens: number[] = [];
    for (const h of b.hexes) {
      if (h.terrain === 'tundra') {
        expect(h.token).toBeNull();
      } else {
        expect(h.token).not.toBeNull();
        expect(h.token).not.toBe(7);
        tokens.push(h.token!);
      }
    }
    expect([...tokens].sort((a, b2) => a - b2)).toEqual([...TOKEN_POOL].sort((a, b2) => a - b2));
  });

  it('il Drago parte dalla tundra', () => {
    const b = board('drago');
    const tundra = b.hexes.find((h) => h.terrain === 'tundra')!;
    expect(b.dragonHex).toBe(tundra.id);
  });

  it('piazza 9 approdi sugli spigoli costieri previsti: 4 generici 3:1 e 5 specifici 2:1', () => {
    const topo = getTopology();
    const b = board('approdi');
    expect(b.ports).toHaveLength(9);
    const expectedEdges = PORT_RING_INDICES.map((i) => topo.coastalRing[i]!);
    expect(b.ports.map((p) => p.edge)).toEqual(expectedEdges);
    const generici = b.ports.filter((p) => p.kind === 'generico');
    expect(generici).toHaveLength(4);
    for (const p of generici) expect(p.ratio).toBe(3);
    const specifici = b.ports.filter((p) => p.kind !== 'generico');
    expect(new Set(specifici.map((p) => p.kind)).size).toBe(5);
    for (const p of specifici) expect(p.ratio).toBe(2);
  });

  it('stesso seed ⇒ stessa tavola; seed diversi ⇒ tavole diverse', () => {
    expect(board('uguale')).toEqual(board('uguale'));
    expect(JSON.stringify(board('uno'))).not.toBe(JSON.stringify(board('due')));
  });

  it('con avoidAdjacent68 nessuna coppia 6/8 adiacente (30 seed)', () => {
    for (let i = 0; i < 30; i++) {
      const b = board(`avoid-${i}`, true);
      const byId = new Map(b.hexes.map((h) => [h.id, h]));
      for (const h of b.hexes) {
        if (h.token !== 6 && h.token !== 8) continue;
        for (const n of hexNeighbors({ q: h.q, r: h.r })) {
          const nh = byId.get(hexKey(n));
          if (nh) expect(nh.token === 6 || nh.token === 8).toBe(false);
        }
      }
    }
  });
});
