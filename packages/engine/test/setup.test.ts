import { describe, expect, it } from 'vitest';
import { getLegalActions, getTopology, totalResources } from '../src';
import { apply, autoSetup, expectError, newGame } from './helpers';

describe('fase di setup a serpentina', () => {
  it('l’ordine è 0..n-1 seguito da n-1..0', () => {
    expect(newGame(3).setupOrder).toEqual([0, 1, 2, 2, 1, 0]);
    expect(newGame(4).setupOrder).toEqual([0, 1, 2, 3, 3, 2, 1, 0]);
  });

  it('si parte aspettando il villaggio del giocatore 0', () => {
    const g = newGame(3);
    expect(g.phase).toEqual({ type: 'setup', expecting: 'villaggio', lastVillage: null });
    expect(g.currentPlayer).toBe(0);
    const moves = getLegalActions(g, 0);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.type === 'piazzaVillaggioIniziale')).toBe(true);
    expect(getLegalActions(g, 1)).toHaveLength(0);
  });

  it('rifiuta piazzamenti fuori turno o nella sotto-fase sbagliata', () => {
    const g = newGame(2);
    const v = getTopology().vertices[0]!;
    expectError(g, { type: 'piazzaVillaggioIniziale', player: 1, vertex: v }, 'NON_IL_TUO_TURNO');
    expectError(g, { type: 'piazzaSentieroIniziale', player: 0, edge: getTopology().edges[0]! }, 'FASE_ERRATA');
  });

  it('applica la regola della distanza già nel setup', () => {
    const topo = getTopology();
    const g = newGame(2);
    const v = topo.vertices[10]!;
    let s = apply(g, { type: 'piazzaVillaggioIniziale', player: 0, vertex: v });
    s = apply(s, { type: 'piazzaSentieroIniziale', player: 0, edge: topo.vertexEdges[v]![0]! });
    // Il giocatore 1 non può piazzare né sullo stesso vertice né su un vicino.
    expectError(s, { type: 'piazzaVillaggioIniziale', player: 1, vertex: v }, 'VERTICE_OCCUPATO');
    for (const adiacente of topo.vertexNeighbors[v]!) {
      expectError(
        s,
        { type: 'piazzaVillaggioIniziale', player: 1, vertex: adiacente },
        'DISTANZA'
      );
    }
  });

  it('il sentiero iniziale deve toccare il villaggio appena piazzato', () => {
    const topo = getTopology();
    const g = newGame(2);
    const v = topo.vertices[10]!;
    const s = apply(g, { type: 'piazzaVillaggioIniziale', player: 0, vertex: v });
    // Uno spigolo lontano dal villaggio viene rifiutato.
    const lontano = topo.edges.find((e) => !topo.vertexEdges[v]!.includes(e))!;
    expectError(s, { type: 'piazzaSentieroIniziale', player: 0, edge: lontano }, 'NON_CONNESSO');
    // Le mosse legali sono esattamente gli spigoli del villaggio.
    const legali = getLegalActions(s, 0);
    expect(new Set(legali.map((m) => (m.type === 'piazzaSentieroIniziale' ? m.edge : '')))).toEqual(
      new Set(topo.vertexEdges[v]!)
    );
  });

  it('solo il SECONDO villaggio produce le risorse degli esagoni adiacenti', () => {
    const topo = getTopology();
    let s = newGame(2);
    const byId = new Map(s.board.hexes.map((h) => [h.id, h]));

    // Prima metà serpentina: nessuna produzione.
    let mosse = getLegalActions(s, 0);
    s = apply(s, mosse[0]! as never);
    expect(totalResources(s.players[0]!.resources)).toBe(0);
    s = apply(s, getLegalActions(s, 0)[0]! as never);
    s = apply(s, getLegalActions(s, 1)[0]! as never);
    expect(totalResources(s.players[1]!.resources)).toBe(0);
    s = apply(s, getLegalActions(s, 1)[0]! as never);

    // Seconda metà: il villaggio produce 1 risorsa per esagono non-tundra adiacente.
    mosse = getLegalActions(s, 1);
    const piazzamento = mosse[0]! as { type: 'piazzaVillaggioIniziale'; vertex: string };
    const attese = topo.vertexLandHexes[piazzamento.vertex]!.filter(
      (h) => byId.get(h)!.terrain !== 'tundra'
    ).length;
    s = apply(s, piazzamento as never);
    expect(totalResources(s.players[1]!.resources)).toBe(attese);
  });

  it('al termine del setup parte il turno 1 del giocatore 0 in preRoll', () => {
    const s = autoSetup(newGame(3));
    expect(s.phase).toEqual({ type: 'preRoll' });
    expect(s.currentPlayer).toBe(0);
    expect(s.turnNumber).toBe(1);
    for (const p of s.players) {
      expect(p.villages).toHaveLength(2);
      expect(p.roads).toHaveLength(2);
    }
  });
});
