/**
 * Tavola «CON RIENTRANZE»: isola dalla forma casuale (golfi, penisole) con lo
 * stesso numero di caselle della taglia, più il concetto di PONTE (strada che
 * scavalca un golfo largo «una strada»).
 */
import { describe, expect, it } from 'vitest';
import {
  GIGANTE_BOARD,
  GRANDE_BOARD,
  SMALL_BOARD,
  boardTopoKey,
  canPlaceRoad,
  createGame,
  generateBoard,
  getTopology,
  hexKey,
  hexNeighbors,
  legalRoadEdges,
  longestRoadLength,
  parseEdgeId,
  seedRng,
  shapeSignature,
  type BoardSpec,
} from '../src';
import { autoSetup, expectResourceInvariants, mut, randomPlayout } from './helpers';

const SIZES: { name: string; spec: BoardSpec; count: number }[] = [
  { name: 'piccola', spec: SMALL_BOARD, count: SMALL_BOARD.terrainPool.length },
  { name: 'grande', spec: GRANDE_BOARD, count: GRANDE_BOARD.terrainPool.length },
  { name: 'gigante', spec: GIGANTE_BOARD, count: GIGANTE_BOARD.terrainPool.length },
];

function rientranzeBoard(seed: string, spec: BoardSpec = SMALL_BOARD) {
  const [board] = generateBoard(seedRng(seed), true, spec, 'rientranze');
  const topo = getTopology(shapeSignature(board.hexes));
  return { board, topo };
}

/** L'isola è connessa via adiacenza di terra (percorribile senza ponti). */
function landConnected(hexes: readonly { id: string; q: number; r: number }[]): boolean {
  const set = new Set(hexes.map((h) => h.id));
  const seen = new Set<string>();
  const stack = [hexes[0]!.id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const [q, r] = cur.split(',').map(Number) as [number, number];
    for (const n of hexNeighbors({ q, r })) {
      const k = hexKey(n);
      if (set.has(k) && !seen.has(k)) stack.push(k);
    }
  }
  return seen.size === set.size;
}

describe('generazione della tavola «con rientranze»', () => {
  for (const { name, spec, count } of SIZES) {
    it(`${name}: stesso numero di caselle (${count}), isola connessa, con una tundra`, () => {
      for (let i = 0; i < 20; i++) {
        const { board } = rientranzeBoard(`shape-${name}-${i}`, spec);
        expect(board.hexes).toHaveLength(count);
        // Terreni: stesso multiset del sacchetto della taglia.
        const terr = board.hexes.map((h) => h.terrain).sort();
        expect(terr).toEqual([...spec.terrainPool].sort());
        expect(landConnected(board.hexes)).toBe(true);
        expect(board.hexes.some((h) => h.terrain === 'tundra')).toBe(true);
        // Nessuna casella duplicata.
        expect(new Set(board.hexes.map((h) => h.id)).size).toBe(count);
      }
    });
  }

  it('non è (quasi mai) un semplice esagono: la forma cambia col seed', () => {
    const a = rientranzeBoard('forma-a').board.hexes.map((h) => h.id).sort().join('|');
    const b = rientranzeBoard('forma-b').board.hexes.map((h) => h.id).sort().join('|');
    expect(a).not.toBe(b);
  });

  it('stesso seed ⇒ stessa isola (deterministica)', () => {
    const a = rientranzeBoard('det').board;
    const b = rientranzeBoard('det').board;
    expect(a).toEqual(b);
  });

  it('gli approdi stanno su spigoli costieri (1 sola casella di terra) e non si ripetono', () => {
    const { board } = rientranzeBoard('approdi-r', GIGANTE_BOARD);
    const land = new Set(board.hexes.map((h) => h.id));
    expect(board.ports.length).toBeGreaterThan(0);
    for (const port of board.ports) {
      const [a, b] = parseEdgeId(port.edge);
      const onLand = Number(land.has(hexKey(a))) + Number(land.has(hexKey(b)));
      expect(onLand).toBe(1); // costiero: mai su un ponte (0 terra)
    }
    expect(new Set(board.ports.map((p) => p.edge)).size).toBe(board.ports.length);
  });
});

describe('topologia e ponti', () => {
  it('le tavole a forma fissa (chiave numerica) non hanno ponti', () => {
    expect(getTopology(SMALL_BOARD.code).bridges).toHaveLength(0);
    expect(getTopology(GRANDE_BOARD.code).bridges).toHaveLength(0);
    expect(getTopology(GIGANTE_BOARD.code).bridges).toHaveLength(0);
  });

  it('ogni ponte è uno spigolo di solo MARE con entrambi i vertici sulla terra', () => {
    let seenAnyBridge = false;
    for (let i = 0; i < 60; i++) {
      const { board, topo } = rientranzeBoard(`ponti-${i}`, GIGANTE_BOARD);
      const land = new Set(board.hexes.map((h) => h.id));
      for (const bridge of topo.bridges) {
        seenAnyBridge = true;
        // 0 caselle di terra ai lati (è mare).
        const [a, b] = parseEdgeId(bridge);
        expect(Number(land.has(hexKey(a))) + Number(land.has(hexKey(b)))).toBe(0);
        // È incluso negli spigoli percorribili, con 2 vertici che toccano terra.
        expect(topo.edges).toContain(bridge);
        const [v1, v2] = topo.edgeVertices[bridge]!;
        expect(topo.vertexLandHexes[v1]!.length).toBeGreaterThan(0);
        expect(topo.vertexLandHexes[v2]!.length).toBeGreaterThan(0);
        // I due vertici del ponte si «vedono» come adiacenti (distanza una strada).
        expect(topo.vertexNeighbors[v1]).toContain(v2);
        expect(topo.vertexEdges[v1]).toContain(bridge);
      }
    }
    // Con l'isola frastagliata i ponti compaiono di frequente.
    expect(seenAnyBridge).toBe(true);
  });

  it('un ponte è una strada costruibile e conta per la Grande Via', () => {
    // Cerca una tavola con almeno un ponte e prepara uno scenario diretto.
    let scenario: { key: ReturnType<typeof boardTopoKey>; bridge: string; v1: string; v2: string; landEdge: string } | null = null;
    for (let i = 0; i < 200 && !scenario; i++) {
      const { board, topo } = rientranzeBoard(`buildable-${i}`, GIGANTE_BOARD);
      const key = shapeSignature(board.hexes);
      for (const bridge of topo.bridges) {
        const [v1, v2] = topo.edgeVertices[bridge]!;
        const landEdge = (topo.vertexEdges[v2] ?? []).find(
          (e) => e !== bridge && !topo.bridges.includes(e)
        );
        if (landEdge) {
          scenario = { key, bridge, v1, v2, landEdge };
          break;
        }
      }
    }
    expect(scenario).not.toBeNull();
    const { key, bridge, v1, v2, landEdge } = scenario!;

    // Stato minimale: un solo giocatore con un edificio su un estremo del ponte.
    const state = mut(createGame({ seed: 'x', players: [
      { name: 'A', color: 'rosso', isBot: false },
      { name: 'B', color: 'blu', isBot: false },
    ] }), (s) => {
      s.players[0]!.villages = [v1];
      s.players[0]!.roads = [];
    });

    // Il ponte è piazzabile (connesso al proprio edificio su v1).
    expect(canPlaceRoad(state, 0, bridge, key)).toBe(true);
    expect(legalRoadEdges(state, 0, key)).toContain(bridge);

    // Con ponte + strada di terra contigua, la Grande Via è lunga 2 (il ponte conta).
    const withRoads = mut(state, (s) => {
      s.players[0]!.roads = [bridge, landEdge];
    });
    expect(longestRoadLength(withRoads, 0, key)).toBeGreaterThanOrEqual(2);
    void v2;
  });
});

describe('partita completa su tavola «con rientranze»', () => {
  it('boardTopoKey: firma per le rientranze, codice numerico altrimenti', () => {
    const g = createGame({ seed: 'k', players: [
      { name: 'A', color: 'rosso', isBot: false },
      { name: 'B', color: 'blu', isBot: false },
    ], boardShape: 'rientranze' });
    const key = boardTopoKey(g.config.boardRadius, g.config.boardShape, g.board.hexes);
    expect(typeof key).toBe('string');
    expect(key).toBe(shapeSignature(g.board.hexes));
    // Senza forma: chiave numerica.
    const plain = createGame({ seed: 'k', players: [
      { name: 'A', color: 'rosso', isBot: false },
      { name: 'B', color: 'blu', isBot: false },
    ] });
    expect(boardTopoKey(plain.config.boardRadius, plain.config.boardShape, plain.board.hexes)).toBe(
      plain.config.boardRadius
    );
  });

  it('il setup si completa e la topologia regge la forma casuale', () => {
    const g = createGame({ seed: 'setup-r', players: [
      { name: 'A', color: 'rosso', isBot: false },
      { name: 'B', color: 'blu', isBot: false },
      { name: 'C', color: 'verde', isBot: false },
    ], boardShape: 'rientranze' });
    const done = autoSetup(g);
    expect(done.phase.type).not.toBe('setup');
  });

  it('15 partite casuali-legali terminano rispettando gli invarianti + replay deterministico', () => {
    for (let i = 0; i < 15; i++) {
      const res = randomPlayout(`rientranze-${i}`, { boardShape: 'rientranze', maxActions: 6000 });
      expect(res.finished).toBe(true);
      expectResourceInvariants(res.state);
    }
    // Determinismo: stesso seed ⇒ stesso esito.
    const a = randomPlayout('rientranze-det', { boardShape: 'rientranze', maxActions: 6000 });
    const b = randomPlayout('rientranze-det', { boardShape: 'rientranze', maxActions: 6000 });
    expect(a.state.turnNumber).toBe(b.state.turnNumber);
    expect(JSON.stringify(a.state.board)).toBe(JSON.stringify(b.state.board));
  });
});
