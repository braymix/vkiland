import { describe, expect, it } from 'vitest';
import {
  BUILD_COSTS,
  getTopology,
  scoreBreakdown,
  vertexId,
  type GameState,
  type Resource,
  type VertexId,
} from '../src';
import { produceResources } from '../src/production';
import type { GameEvent } from '../src/actions';
import {
  apply,
  clearHands,
  expectError,
  expectResourceInvariants,
  give,
  mut,
  newGame,
  randomPlayout,
  toMain,
} from './helpers';

const O = { q: 0, r: 0 };
const NW = { q: 0, r: -1 };
const NE = { q: 1, r: -1 };

const V0_NORD: VertexId = vertexId(O, NW, NE);

/** Partita a 2 con la modalità Capitale ATTIVA, giocatore 0 con una Roccaforte in V0_NORD. */
function capitaleGame(): GameState {
  let s = newGame(2, 'fixture-capitale');
  s = mut(s, (d) => {
    d.config.capitale = true;
  });
  // Piazza gli insediamenti iniziali (serpentina) e porta p0 in fase main.
  s = apply(s, { type: 'piazzaVillaggioIniziale', player: 0, vertex: V0_NORD });
  s = apply(s, { type: 'piazzaSentieroIniziale', player: 0, edge: getTopology().vertexEdges[V0_NORD]![0]! });
  const p1v1 = vertexId({ q: -1, r: 1 }, { q: 0, r: 1 }, { q: -1, r: 2 });
  s = apply(s, { type: 'piazzaVillaggioIniziale', player: 1, vertex: p1v1 });
  s = apply(s, { type: 'piazzaSentieroIniziale', player: 1, edge: getTopology().vertexEdges[p1v1]![0]! });
  const p1v2 = vertexId({ q: -2, r: 0 }, { q: -1, r: 0 }, { q: -2, r: 1 });
  s = apply(s, { type: 'piazzaVillaggioIniziale', player: 1, vertex: p1v2 });
  s = apply(s, { type: 'piazzaSentieroIniziale', player: 1, edge: getTopology().vertexEdges[p1v2]![0]! });
  const p0v2 = vertexId({ q: 0, r: -2 }, { q: 1, r: -2 }, { q: 0, r: -1 });
  s = apply(s, { type: 'piazzaVillaggioIniziale', player: 0, vertex: p0v2 });
  s = apply(s, { type: 'piazzaSentieroIniziale', player: 0, edge: getTopology().vertexEdges[p0v2]![0]! });
  s = toMain(s);
  // Promuove V0_NORD a Roccaforte (base per la Capitale).
  s = give(s, 0, { orzo: 2, ferro: 3 });
  s = apply(s, { type: 'costruisciRoccaforte', player: 0, vertex: V0_NORD });
  return s;
}

describe('modalità Capitale — costruzione', () => {
  it('il costo è 1 legname, 1 pietra, 1 lana, 2 orzo, 3 ferro', () => {
    expect(BUILD_COSTS.capitale).toEqual({ legname: 1, pietra: 1, lana: 1, orzo: 2, ferro: 3 });
  });

  it('evolve una Roccaforte: paga il costo, il vertice resta anche fra le roccaforti', () => {
    let s = give(capitaleGame(), 0, { legname: 1, pietra: 1, lana: 1, orzo: 2, ferro: 3 });
    const ferroPrima = s.players[0]!.resources.ferro;
    const bancaFerroPrima = s.bank.ferro;
    s = apply(s, { type: 'costruisciCapitale', player: 0, vertex: V0_NORD });
    expect(s.players[0]!.capitals).toContain(V0_NORD);
    // Resta anche fra le roccaforti (per rete, approdi, distanza).
    expect(s.players[0]!.strongholds).toContain(V0_NORD);
    expect(s.players[0]!.resources.ferro).toBe(ferroPrima - 3);
    expect(s.bank.ferro).toBe(bancaFerroPrima + 3);
  });

  it('vale 3 Punti Gloria (2 della roccaforte + 1)', () => {
    let s = give(capitaleGame(), 0, { legname: 1, pietra: 1, lana: 1, orzo: 2, ferro: 3 });
    const prima = scoreBreakdown(s, 0).roccaforti; // roccaforte = 2
    s = apply(s, { type: 'costruisciCapitale', player: 0, vertex: V0_NORD });
    expect(scoreBreakdown(s, 0).roccaforti).toBe(prima + 1);
  });

  it('se ne può costruire una sola', () => {
    let s = give(capitaleGame(), 0, { legname: 2, pietra: 2, lana: 2, orzo: 4, ferro: 6 });
    s = apply(s, { type: 'costruisciCapitale', player: 0, vertex: V0_NORD });
    // Anche promuovendo un'altra roccaforte, la seconda Capitale è vietata.
    s = mut(s, (d) => {
      d.players[0]!.strongholds.push('altra-roccaforte');
    });
    expectError(
      s,
      { type: 'costruisciCapitale', player: 0, vertex: 'altra-roccaforte' },
      'CAPITALE_GIA_COSTRUITA'
    );
  });

  it('si costruisce solo su una propria Roccaforte, non su un villaggio', () => {
    const s = give(capitaleGame(), 0, { legname: 1, pietra: 1, lana: 1, orzo: 2, ferro: 3 });
    const villaggio = s.players[0]!.villages[0]!;
    expectError(
      s,
      { type: 'costruisciCapitale', player: 0, vertex: villaggio },
      'NON_ROCCAFORTE'
    );
  });

  it('è vietata se la modalità Capitale non è attiva', () => {
    const s = mut(give(capitaleGame(), 0, { legname: 1, pietra: 1, lana: 1, orzo: 2, ferro: 3 }), (d) => {
      d.config.capitale = false;
    });
    expectError(s, { type: 'costruisciCapitale', player: 0, vertex: V0_NORD }, 'CAPITALE_SPENTA');
  });
});

describe('modalità Capitale — produzione', () => {
  it('la Capitale frutta 3 al posto dei 2 della roccaforte', () => {
    const base = clearHands(newGame(4));
    const hex = base.board.hexes.find((h) => h.terrain !== 'tundra' && h.token !== null)!;
    const verts = getTopology().hexVertices[hex.id]!;
    const resource = hex.terrain as Resource;
    const s = mut(base, (d) => {
      // Il vertice è ANCHE una roccaforte: così è come nella build reale.
      d.players[0]!.strongholds.push(verts[0]!);
      d.players[0]!.capitals.push(verts[0]!);
    });
    const events: GameEvent[] = [];
    const dopo = mut(s, (d) => produceResources(d, hex.token!, events));
    expect(dopo.players[0]!.resources[resource]).toBe(3);
  });
});

describe('modalità Capitale — partite complete', () => {
  it('20 partite casuali-legali con Capitale terminano e rispettano gli invarianti', () => {
    let almeno = false;
    for (let i = 0; i < 20; i++) {
      const { state, finished } = randomPlayout(`capitale-${i}`, { capitale: true });
      expect(finished).toBe(true);
      expectResourceInvariants(state);
      // Ogni giocatore ha al massimo una Capitale, sempre anche fra le roccaforti.
      for (const p of state.players) {
        expect(p.capitals.length).toBeLessThanOrEqual(1);
        for (const v of p.capitals) expect(p.strongholds).toContain(v);
        if (p.capitals.length > 0) almeno = true;
      }
    }
    // Sanity: in almeno una delle 20 partite qualcuno ha costruito la Capitale.
    expect(almeno).toBe(true);
  });
});

describe('modalità Capitale — indistruttibile in Battaglia', () => {
  it('non si può attaccare una Capitale', () => {
    // p1 raggiunge V0_NORD con una strada e ha risorse per l'attacco, ma V0_NORD
    // è la Capitale di p0: l'attacco è respinto.
    const radiusTopo = getTopology();
    let s = mut(capitaleGame(), (d) => {
      d.config.battle = true;
      d.players[0]!.capitals.push(V0_NORD);
      // p1 mette una strada che incide su V0_NORD.
      const e = radiusTopo.vertexEdges[V0_NORD]![0]!;
      d.players[1]!.roads.push(e);
    });
    s = give(s, 1, { legname: 2, pietra: 1, lana: 1, ferro: 2 });
    // È il turno di p0; passiamo il turno logicamente forzando currentPlayer.
    s = mut(s, (d) => {
      d.currentPlayer = 1;
      d.phase = { type: 'main' };
      d.rolledThisTurn = true;
    });
    expectError(
      s,
      { type: 'attaccaEdificio', player: 1, vertex: V0_NORD },
      'CAPITALE_INDISTRUTTIBILE'
    );
  });
});
