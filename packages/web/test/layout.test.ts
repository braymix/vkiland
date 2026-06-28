import { describe, expect, it } from 'vitest';
import { getTopology } from '@vikiland/engine';
import {
  boardCanvasSize,
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

describe('tavola GRANDE (raggio 3): geometria e hit-test', () => {
  const topo3 = getTopology(3);

  it('il canvas grande è 416×364 (più grande del piccolo 320×280)', () => {
    expect(boardCanvasSize(2)).toEqual({ w: CANVAS_W, h: CANVAS_H });
    expect(boardCanvasSize(3)).toEqual({ w: 416, h: 364 });
  });

  it('i 96 vertici sono interi e dentro il canvas grande', () => {
    const { w, h } = boardCanvasSize(3);
    expect(topo3.vertices).toHaveLength(96);
    for (const v of topo3.vertices) {
      const p = vertexPoint(v, 3);
      expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(w);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(h);
    }
  });

  it('l’hit-test col raggio 3 ritrova ogni vertice dal suo punto disegnato', () => {
    for (const v of topo3.vertices) {
      const p = vertexPoint(v, 3);
      expect(nearestVertex(p.x, p.y, [v], 3)).toBe(v);
    }
    // Gli ancoraggi degli approdi della costa (42 spigoli) stanno nel canvas.
    const { w, h } = boardCanvasSize(3);
    for (const e of topo3.coastalRing) {
      const a = portAnchor(e, 3);
      expect(a.x).toBeGreaterThanOrEqual(6);
      expect(a.x).toBeLessThanOrEqual(w - 6);
      expect(a.y).toBeGreaterThanOrEqual(6);
      expect(a.y).toBeLessThanOrEqual(h - 6);
    }
  });
});
