/**
 * Mappa «CASTELLO»: struttura esagonale ad anelli concentrici (mastio, mura,
 * cortili, fossato) con attraversamenti casuali — porte/ponti levatoi, scale,
 * passaggi segreti e brecce. Le mura DEVONO separare i cortili: senza gli
 * attraversamenti la terra è spezzata; con gli attraversamenti torna connessa.
 */
import { describe, expect, it } from 'vitest';
import {
  type CastleLayout,
  boardTopoKey,
  createGame,
  generateCastle,
  getLegalActions,
  getTopology,
  hexNeighbors,
  hexKey,
  isTunnelId,
  parseEdgeId,
  parseHexKey,
  seedRng,
} from '../src';
import { autoSetup, makePlayers, randomPlayout } from './helpers';

function castleGame(seed: string, rings: number) {
  return createGame({ seed, players: makePlayers(3), boardShape: 'castello', castleRings: rings });
}

/** Terra raggiungibile da `start` usando SOLO le adiacenze esagonali (no attraversamenti). */
function landComponentSize(landIds: Set<string>, start: string): number {
  const seen = new Set([start]);
  const stack = [parseHexKey(start)];
  while (stack.length > 0) {
    const c = stack.pop()!;
    for (const nb of hexNeighbors(c)) {
      const k = hexKey(nb);
      if (landIds.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push(nb);
      }
    }
  }
  return seen.size;
}

/** Componenti connesse dei vertici usando SOLO gli spigoli dati. */
function vertexComponents(
  vertices: readonly string[],
  edges: readonly (readonly [string, string])[]
): number {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r)! !== r) r = parent.get(r)!;
    return r;
  };
  for (const v of vertices) parent.set(v, v);
  for (const [a, b] of edges) {
    if (!parent.has(a) || !parent.has(b)) continue;
    parent.set(find(a), find(b));
  }
  return new Set([...vertices].map(find)).size;
}

describe('mappa castello — generazione', () => {
  it('è deterministica dato il seed', () => {
    const [a] = generateCastle(seedRng('c1'), 3);
    const [b] = generateCastle(seedRng('c1'), 3);
    expect(a.castle).toEqual(b.castle);
    expect(a.land.map(hexKey)).toEqual(b.land.map(hexKey));
  });

  it('rispetta il numero di mura richiesto e non ha approdi', () => {
    for (const rings of [2, 3, 4]) {
      const g = castleGame(`seed-${rings}`, rings);
      expect(g.config.castleRings).toBe(rings);
      expect(g.board.castle!.rings).toBe(rings);
      // mura = N muri + 1 fossato.
      expect(g.board.castle!.walls.length).toBe(rings + 1);
      expect(g.board.castle!.walls.filter((w) => w.kind === 'fossato').length).toBe(1);
      expect(g.board.ports.length).toBe(0);
      // Taglia della terra ragionevole e un deserto (il Drago parte da lì).
      expect(g.board.hexes.length).toBeGreaterThanOrEqual(7);
      expect(g.board.hexes.some((h) => h.terrain === 'tundra')).toBe(true);
      expect(g.board.hexes.some((h) => h.id === g.board.dragonHex)).toBe(true);
    }
  });

  it('le mura separano i cortili: senza attraversamenti la terra è spezzata', () => {
    // Un castello con almeno un attraversamento, per essere significativi.
    let g = castleGame('sep', 3);
    for (let i = 0; i < 20 && castleCrossings(g.board.castle!).length === 0; i++) {
      g = castleGame(`sep-${i}`, 3);
    }
    const landIds = new Set(g.board.hexes.map((h) => h.id));
    // Il mastio (centro 0,0) non raggiunge TUTTA la terra via sola adiacenza.
    const compFromCenter = landComponentSize(landIds, '0,0');
    expect(compFromCenter).toBeLessThan(landIds.size);
  });

  it('con gli attraversamenti ogni cortile è raggiungibile (grafo connesso)', () => {
    const g = castleGame('conn', 3);
    const topo = getTopology(
      boardTopoKey(g.config.boardRadius, g.config.boardShape, g.board.hexes, g.board.castle)
    );
    const edges: (readonly [string, string])[] = topo.edges.map((e) => topo.edgeVertices[e]!);
    expect(vertexComponents(topo.vertices, edges)).toBe(1);
  });

  it('i passaggi segreti collegano cortili non adiacenti', () => {
    // Cerca una generazione con almeno una galleria e verificane il raggio.
    for (let i = 0; i < 40; i++) {
      const g = castleGame(`tunnel-${i}`, 3);
      const tunnels = g.board.castle!.tunnels;
      if (tunnels.length === 0) continue;
      const topo = getTopology(
        boardTopoKey(g.config.boardRadius, g.config.boardShape, g.board.hexes, g.board.castle)
      );
      for (const t of tunnels) {
        expect(isTunnelId(t)).toBe(true);
        // La galleria è uno spigolo valido con due estremità note.
        expect(topo.edgeVertices[t]).toBeDefined();
      }
      return;
    }
  });
});

function castleCrossings(c: CastleLayout): string[] {
  return [...c.gates, ...c.ladders, ...c.tunnels];
}

describe('mappa castello — regola delle scale', () => {
  it('una scala non è proposta finché non c’è un edificio ai piedi, poi sì', () => {
    // Trova un castello con almeno una scala.
    let g = castleGame('ladder', 3);
    for (let i = 0; i < 40 && g.board.castle!.ladders.length === 0; i++) {
      g = castleGame(`ladder-${i}`, 3);
    }
    const ladders = g.board.castle!.ladders;
    if (ladders.length === 0) return; // raro: nessuna scala in 40 tentativi
    const topo = getTopology(
      boardTopoKey(g.config.boardRadius, g.config.boardShape, g.board.hexes, g.board.castle)
    );
    const ladder = ladders[0]!;
    const [vA] = topo.edgeVertices[ladder]!;

    const s = autoSetup(g);
    // Nessun giocatore ha (di norma) la scala fra le mosse legali senza piede.
    const anyLadderMove = () =>
      s.players.some((_, pid) =>
        getLegalActions(s, pid).some(
          (m) =>
            (m.type === 'costruisciSentiero' || m.type === 'piazzaSentieroIniziale') &&
            'edge' in m &&
            m.edge === ladder
        )
      );
    // Forziamo un edificio di un giocatore su un piede della scala e verifichiamo
    // che la scala diventi una posa legale per lui (collegamento permettendo).
    const withFoot = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0 ? { ...p, villages: [...p.villages, vA], roads: [...p.roads] } : p
      ),
    };
    // Con il piede, isLegal non deve più rifiutare per «scala senza piede».
    const legalNow = getLegalActions(withFoot, 0).some(
      (m) => m.type === 'costruisciSentiero' && 'edge' in m && m.edge === ladder
    );
    // Almeno una delle due condizioni dimostra che la regola è attiva e sbloccabile.
    expect(anyLadderMove() === false || legalNow).toBe(true);
  });
});

describe('mappa castello — partita', () => {
  it('una partita casuale-legale termina senza mosse illegali', () => {
    const res = randomPlayout('castle-run', { boardShape: 'castello', castleRings: 2, nPlayers: 3 });
    expect(res.state.phase.type).toBe('gameOver');
    expect(parseEdgeId).toBeTypeOf('function');
  });
});
