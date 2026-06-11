import { describe, expect, it } from 'vitest';
import {
  getTopology,
  hexEdgeIds,
  longestRoadLength,
  parseHexKey,
  type EdgeId,
  type GameState,
  type VertexId,
} from '../src';
import { recomputeGrandeVia } from '../src/longestRoad';
import type { GameEvent } from '../src/actions';
import { apply, autoSetup, clearHands, give, mut, newGame, toMain } from './helpers';

const topo = getTopology();

/** Cerca con DFS un cammino SEMPLICE (vertici distinti) di `length` spigoli. */
function findSimplePath(
  start: VertexId,
  length: number,
  avoidVertices: ReadonlySet<VertexId> = new Set()
): { edges: EdgeId[]; vertices: VertexId[] } | null {
  const path: EdgeId[] = [];
  const verts: VertexId[] = [start];
  const seen = new Set<VertexId>([start]);
  const dfs = (v: VertexId): boolean => {
    if (path.length === length) return true;
    for (const e of topo.vertexEdges[v]!) {
      const [a, b] = topo.edgeVertices[e]!;
      const next = a === v ? b : a;
      if (seen.has(next) || avoidVertices.has(next)) continue;
      path.push(e);
      verts.push(next);
      seen.add(next);
      if (dfs(next)) return true;
      path.pop();
      verts.pop();
      seen.delete(next);
    }
    return false;
  };
  return dfs(start) ? { edges: path, vertices: verts } : null;
}

/** Come findSimplePath, ma cerca un punto di partenza valido su tutta la tavola. */
function findPathAnywhere(
  length: number,
  avoidVertices: ReadonlySet<VertexId> = new Set()
): { edges: EdgeId[]; vertices: VertexId[] } {
  for (const start of topo.vertices) {
    if (avoidVertices.has(start)) continue;
    const found = findSimplePath(start, length, avoidVertices);
    if (found) return found;
  }
  throw new Error(`Nessun cammino di ${length} spigoli trovato`);
}

/** Stato "nudo" senza edifici: solo ciò che serve per il calcolo dei percorsi. */
function bareState(): GameState {
  return mut(newGame(4, 'grande-via'), (d) => {
    for (const p of d.players) {
      p.villages = [];
      p.roads = [];
    }
    d.phase = { type: 'main' };
  });
}

function withRoads(roads: EdgeId[], player = 0): GameState {
  return mut(bareState(), (d) => {
    d.players[player]!.roads = [...roads];
  });
}

describe('lunghezza del percorso più lungo', () => {
  it('catena semplice di 5 → 5', () => {
    const path = findSimplePath(topo.vertices[0]!, 5)!;
    expect(longestRoadLength(withRoads(path.edges), 0)).toBe(5);
  });

  it('biforcazione: si conta il ramo migliore, non la somma', () => {
    // Linea di 4 (v0..v4) + ramo di 2 a partire da v2: il massimo è 2+2=4.
    const main = findSimplePath(topo.vertices[7]!, 4)!;
    const branchStart = main.vertices[2]!;
    const branch = findSimplePath(branchStart, 2, new Set(main.vertices))!;
    const s = withRoads([...main.edges, ...branch.edges]);
    expect(longestRoadLength(s, 0)).toBe(4);
  });

  it('un anello di 6 attorno a un esagono vale 6', () => {
    const hex = parseHexKey(topo.hexKeys[9]!); // un esagono centrale qualsiasi
    const ring = hexEdgeIds(hex);
    expect(longestRoadLength(withRoads(ring), 0)).toBe(6);
  });

  it('reti separate: vince la componente migliore', () => {
    const a = findSimplePath(topo.vertices[0]!, 3)!;
    const b = findSimplePath(topo.vertices[40]!, 5, new Set(a.vertices))!;
    expect(longestRoadLength(withRoads([...a.edges, ...b.edges]), 0)).toBe(5);
  });

  it('un edificio avversario spezza il percorso (ma ci si può terminare)', () => {
    const path = findSimplePath(topo.vertices[12]!, 6)!;
    const s = mut(withRoads(path.edges), (d) => {
      d.players[1]!.villages.push(path.vertices[3]!); // a metà: 3 + 3
    });
    expect(longestRoadLength(s, 0)).toBe(3);
    // Un edificio su un ESTREMO invece non accorcia nulla.
    const s2 = mut(withRoads(path.edges), (d) => {
      d.players[1]!.villages.push(path.vertices[0]!);
    });
    expect(longestRoadLength(s2, 0)).toBe(6);
  });
});

describe('assegnazione del bonus Grande Via', () => {
  function recompute(s: GameState): { s: GameState; events: GameEvent[] } {
    const events: GameEvent[] = [];
    const out = mut(s, (d) => recomputeGrandeVia(d, events));
    return { s: out, events };
  }

  it('sotto i 5 sentieri il bonus non esiste', () => {
    const path = findSimplePath(topo.vertices[3]!, 4)!;
    const { s } = recompute(withRoads(path.edges));
    expect(s.longestRoad).toEqual({ holder: null, length: 0 });
  });

  it('a 5 si conquista; il pareggio successivo NON spodesta', () => {
    const p0 = findSimplePath(topo.vertices[3]!, 5)!;
    let s = withRoads(p0.edges, 0);
    ({ s } = recompute(s));
    expect(s.longestRoad.holder).toBe(0);

    // p1 raggiunge 5: pareggio, il bonus resta a p0.
    const p1 = findSimplePath(topo.vertices[44]!, 5, new Set(p0.vertices))!;
    s = mut(s, (d) => {
      d.players[1]!.roads = [...p1.edges];
    });
    ({ s } = recompute(s));
    expect(s.longestRoad.holder).toBe(0);

    // p1 supera con 6: il bonus passa.
    const p1lungo = findSimplePath(topo.vertices[44]!, 6, new Set(p0.vertices));
    if (p1lungo) {
      s = mut(s, (d) => {
        d.players[1]!.roads = [...p1lungo.edges];
      });
      const r = recompute(s);
      expect(r.s.longestRoad).toEqual({ holder: 1, length: 6 });
      expect(r.events.some((e) => e.type === 'grandeViaCambiata' && e.holder === 1)).toBe(true);
    }
  });

  it('una rottura con pareggio tra sfidanti lascia il bonus a nessuno', () => {
    const p0 = findPathAnywhere(6);
    const p1 = findPathAnywhere(5, new Set(p0.vertices));
    const p2 = findPathAnywhere(5, new Set([...p0.vertices, ...p1.vertices]));
    let s = mut(bareState(), (d) => {
      d.players[0]!.roads = [...p0.edges];
      d.players[1]!.roads = [...p1.edges];
      d.players[2]!.roads = [...p2.edges];
      d.longestRoad = { holder: 0, length: 6 };
    });
    // p3 spezza la via di p0 a metà (3+3): p1 e p2 pareggiano a 5 → nessuno.
    s = mut(s, (d) => {
      d.players[3]!.villages.push(p0.vertices[3]!);
    });
    const { s: dopo, events } = recompute(s);
    expect(dopo.longestRoad).toEqual({ holder: null, length: 0 });
    expect(events.some((e) => e.type === 'grandeViaCambiata' && e.holder === null)).toBe(true);
  });

  it('integrazione: costruire un villaggio che spezza la via ricalcola il bonus', () => {
    // Partita reale: a p0 viene "regalata" una via di 6 isolata, p1 la spezza
    // a metà con l'AZIONE costruisciVillaggio: il ricalcolo deve scattare da solo.
    const base = clearHands(autoSetup(newGame(2, 'via-rottura')));
    const occupati = new Set(
      base.players.flatMap((p) => [
        ...p.villages,
        ...p.strongholds,
        // anche i vicini degli edifici: così la regola della distanza non interferisce
        ...[...p.villages, ...p.strongholds].flatMap((v) => topo.vertexNeighbors[v] ?? []),
      ])
    );
    // Cerca un cammino di 6 il cui punto di mezzo abbia un terzo spigolo libero.
    let fixture: { edges: EdgeId[]; vertices: VertexId[]; incidente: EdgeId } | null = null;
    for (const start of topo.vertices) {
      if (occupati.has(start)) continue;
      const path = findSimplePath(start, 6, occupati);
      if (!path) continue;
      const target = path.vertices[3]!;
      const incidente = topo.vertexEdges[target]!.find((e) => !path.edges.includes(e));
      if (incidente) {
        fixture = { ...path, incidente };
        break;
      }
    }
    expect(fixture).not.toBeNull();
    const { edges, vertices, incidente } = fixture!;
    const target = vertices[3]!;

    let s = mut(toMain(base), (d) => {
      d.players[0]!.roads.push(...edges);
      d.longestRoad = { holder: 0, length: 6 };
      d.currentPlayer = 1;
      d.players[1]!.roads.push(incidente);
    });
    s = give(s, 1, { legname: 1, pietra: 1, lana: 1, orzo: 1 });
    const dopo = apply(s, { type: 'costruisciVillaggio', player: 1, vertex: target });
    expect(dopo.longestRoad.holder).toBeNull(); // 3+3: p0 perde il bonus
  });
});
