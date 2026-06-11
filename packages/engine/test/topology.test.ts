import { describe, expect, it } from 'vitest';
import {
  allBoardHexes,
  edgeId,
  hexDistance,
  hexKey,
  isOnBoard,
  parseEdgeId,
  parseVertexId,
  vertexId,
} from '../src/board/coords';
import { getTopology } from '../src/board/topology';

describe('coordinate e id canonici', () => {
  it('la tavola ha 19 esagoni in righe 3-4-5-4-3', () => {
    const hexes = allBoardHexes();
    expect(hexes).toHaveLength(19);
    const perRiga = new Map<number, number>();
    for (const h of hexes) perRiga.set(h.r, (perRiga.get(h.r) ?? 0) + 1);
    expect([...perRiga.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n)).toEqual([
      3, 4, 5, 4, 3,
    ]);
  });

  it('vertexId è invariante rispetto all’ordine degli argomenti', () => {
    const a = { q: 0, r: 0 };
    const b = { q: 1, r: -1 };
    const c = { q: 1, r: 0 };
    const id = vertexId(a, b, c);
    expect(vertexId(c, a, b)).toBe(id);
    expect(vertexId(b, c, a)).toBe(id);
    const parsed = parseVertexId(id);
    expect(parsed.map(hexKey).sort()).toEqual([a, b, c].map(hexKey).sort());
  });

  it('edgeId è invariante rispetto all’ordine degli argomenti', () => {
    const a = { q: 0, r: 0 };
    const b = { q: 0, r: 1 };
    expect(edgeId(a, b)).toBe(edgeId(b, a));
    const [p1, p2] = parseEdgeId(edgeId(a, b));
    expect(hexDistance(p1, p2)).toBe(1);
  });
});

describe('topologia della tavola', () => {
  const topo = getTopology();

  it('ha 54 vertici, 72 spigoli, 30 spigoli costieri', () => {
    expect(topo.vertices).toHaveLength(54);
    expect(topo.edges).toHaveLength(72);
    expect(topo.coastalRing).toHaveLength(30);
  });

  it('ogni esagono ha 6 vertici e 6 spigoli, tutti registrati', () => {
    for (const h of topo.hexKeys) {
      expect(topo.hexVertices[h]).toHaveLength(6);
      expect(topo.hexEdges[h]).toHaveLength(6);
      for (const v of topo.hexVertices[h]!) expect(topo.vertices).toContain(v);
      for (const e of topo.hexEdges[h]!) expect(topo.edges).toContain(e);
    }
  });

  it('vertice ↔ spigolo: relazioni reciproche coerenti', () => {
    for (const e of topo.edges) {
      const [v1, v2] = topo.edgeVertices[e]!;
      expect(v1).not.toBe(v2);
      expect(topo.vertexEdges[v1]).toContain(e);
      expect(topo.vertexEdges[v2]).toContain(e);
    }
    for (const v of topo.vertices) {
      const incidenti = topo.vertexEdges[v]!;
      expect(incidenti.length).toBeGreaterThanOrEqual(2);
      expect(incidenti.length).toBeLessThanOrEqual(3);
      for (const e of incidenti) {
        expect(topo.edgeVertices[e]).toContain(v);
      }
    }
  });

  it('vicinanza tra vertici simmetrica e coerente con gli spigoli', () => {
    for (const v of topo.vertices) {
      const vicini = topo.vertexNeighbors[v]!;
      expect(vicini).toHaveLength(topo.vertexEdges[v]!.length);
      for (const w of vicini) {
        expect(topo.vertexNeighbors[w]).toContain(v);
      }
    }
  });

  it('ogni vertice tocca 1..3 esagoni di terra; il totale è 19×6', () => {
    let totale = 0;
    for (const v of topo.vertices) {
      const land = topo.vertexLandHexes[v]!;
      expect(land.length).toBeGreaterThanOrEqual(1);
      expect(land.length).toBeLessThanOrEqual(3);
      totale += land.length;
    }
    expect(totale).toBe(19 * 6);
  });

  it('l’anello costiero è chiuso, senza ripetizioni, con spigoli consecutivi adiacenti', () => {
    const ring = topo.coastalRing;
    expect(new Set(ring).size).toBe(30);
    for (let i = 0; i < ring.length; i++) {
      const e1 = ring[i]!;
      const e2 = ring[(i + 1) % ring.length]!; // include la chiusura ultimo→primo
      const shared = topo.edgeVertices[e1]!.filter((v) => topo.edgeVertices[e2]!.includes(v));
      expect(shared).toHaveLength(1);
    }
    for (const e of ring) {
      const [a, b] = parseEdgeId(e);
      expect(Number(isOnBoard(a)) + Number(isOnBoard(b))).toBe(1);
    }
  });
});
