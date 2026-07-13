/**
 * La NUOVA tavola "grande" (codice 5) è la gigante con due lati adiacenti in
 * meno (30 caselle): il renderer deve centrarla dentro il canvas usando il
 * raggio geometrico 3, senza NaN, e con approdi ancorati sull'anello costiero.
 */
import { describe, it, expect } from 'vitest';
import { boardHexes, BOARD_CODE_GRANDE, hexKey, getTopology } from '@vikiland/engine';
import { boardCanvasSize, hexCenterById, portAnchor } from '../src/render/layout';

describe('grande (30 caselle) — geometria di resa', () => {
  it('tutte le 30 caselle stanno dentro il canvas e gli approdi sono finiti', () => {
    const code = BOARD_CODE_GRANDE;
    const { w, h } = boardCanvasSize(code);
    expect(Number.isFinite(w) && Number.isFinite(h)).toBe(true);
    const hexes = boardHexes(code);
    expect(hexes).toHaveLength(30);
    for (const c of hexes) {
      const p = hexCenterById(hexKey(c), code);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(w);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(h);
    }
    const topo = getTopology(code);
    // Un approdo per posizione dell'anello: ancoraggio finito.
    const someEdge = topo.coastalRing[0]!;
    const a = portAnchor(someEdge, code);
    expect(Number.isFinite(a.x) && Number.isFinite(a.y)).toBe(true);
  });
});
