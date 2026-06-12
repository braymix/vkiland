import { describe, expect, it } from 'vitest';
import { getTopology } from '@vikiland/engine';
import {
  CANVAS_H,
  CANVAS_W,
  edgeEndpoints,
  hexCenterById,
  hexHalfWidthAt,
  nearestEdge,
  nearestVertex,
  portAnchor,
  vertexPoint,
} from '../src/render/layout';

const topo = getTopology();

describe('geometria della tavola', () => {
  it('i punti dei vertici sono interi e dentro il canvas', () => {
    for (const v of topo.vertices) {
      const p = vertexPoint(v);
      expect(Number.isInteger(p.x), `x non intera per ${v}`).toBe(true);
      expect(Number.isInteger(p.y), `y non intera per ${v}`).toBe(true);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(CANVAS_W);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(CANVAS_H);
    }
  });

  it('i centri degli esagoni e gli ancoraggi degli approdi stanno nel canvas', () => {
    for (const h of topo.hexKeys) {
      const c = hexCenterById(h);
      expect(c.x).toBeGreaterThan(23);
      expect(c.x).toBeLessThan(CANVAS_W - 23);
      expect(c.y).toBeGreaterThan(27);
      expect(c.y).toBeLessThan(CANVAS_H - 27);
    }
    for (const e of topo.coastalRing) {
      const a = portAnchor(e);
      expect(a.x).toBeGreaterThanOrEqual(10);
      expect(a.x).toBeLessThanOrEqual(CANVAS_W - 10);
      expect(a.y).toBeGreaterThanOrEqual(8);
      expect(a.y).toBeLessThanOrEqual(CANVAS_H - 8);
    }
  });

  it('gli estremi di ogni spigolo distano esattamente un lato di esagono', () => {
    // Lato pointy-top: i due tipi di segmento misurano √(24²+14²)≈27.8 o 28.
    for (const e of topo.edges) {
      const [p1, p2] = edgeEndpoints(e);
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      expect(d).toBeGreaterThan(26);
      expect(d).toBeLessThan(30);
    }
  });

  it('l’hit-test trova il bersaglio giusto e rispetta il raggio massimo', () => {
    const v = topo.vertices[17]!;
    const p = vertexPoint(v);
    expect(nearestVertex(p.x + 6, p.y - 4, [v])).toBe(v);
    expect(nearestVertex(p.x + 60, p.y, [v])).toBeNull();

    // Tra due vertici adiacenti vince il più vicino al punto toccato.
    const w = topo.vertexNeighbors[v]![0]!;
    const q = vertexPoint(w);
    const px = p.x * 0.75 + q.x * 0.25;
    const py = p.y * 0.75 + q.y * 0.25;
    expect(nearestVertex(px, py, [v, w])).toBe(v);
  });

  it('l’hit-test degli spigoli usa il punto medio', () => {
    const e = topo.edges[33]!;
    const [p1, p2] = edgeEndpoints(e);
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    expect(nearestEdge(mx + 4, my - 2, [e])).toBe(e);
  });

  it('la maschera dell’esagono è simmetrica e larga 48px al centro', () => {
    expect(hexHalfWidthAt(0)).toBe(24);
    expect(hexHalfWidthAt(14)).toBe(24);
    expect(hexHalfWidthAt(-14)).toBe(24);
    expect(hexHalfWidthAt(28)).toBe(0);
    expect(hexHalfWidthAt(29)).toBe(-1);
    for (let dy = 0; dy <= 28; dy++) {
      expect(hexHalfWidthAt(dy)).toBe(hexHalfWidthAt(-dy));
    }
  });
});
