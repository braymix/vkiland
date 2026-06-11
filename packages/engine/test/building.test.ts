import { describe, expect, it } from 'vitest';
import {
  BUILD_COSTS,
  edgeId,
  getTopology,
  vertexId,
  type EdgeId,
  type GameState,
  type VertexId,
} from '../src';
import { apply, expectError, give, mut, newGame, toMain } from './helpers';

/**
 * Fixture geometrica esplicita (2 giocatori) con coordinate note:
 * p0 a nord, p1 a sud-ovest, ben distanziati. L'area a est dell'origine
 * resta libera per i test di espansione.
 */
const O = { q: 0, r: 0 };
const NW = { q: 0, r: -1 };
const NE = { q: 1, r: -1 };
const E = { q: 1, r: 0 };
const SE = { q: 0, r: 1 };

const V0_NORD: VertexId = vertexId(O, NW, NE); // villaggio iniziale di p0
const E0_NW: EdgeId = edgeId(O, NW);
const P0_V2: VertexId = vertexId({ q: 0, r: -2 }, { q: 1, r: -2 }, { q: 0, r: -1 });
const P0_E2: EdgeId = edgeId({ q: 0, r: -2 }, { q: 1, r: -2 });

const P1_V1: VertexId = vertexId({ q: -1, r: 1 }, { q: 0, r: 1 }, { q: -1, r: 2 });
const P1_E1: EdgeId = edgeId({ q: -1, r: 1 }, { q: 0, r: 1 });
const P1_V2: VertexId = vertexId({ q: -2, r: 0 }, { q: -1, r: 0 }, { q: -2, r: 1 });
const P1_E2: EdgeId = edgeId({ q: -2, r: 0 }, { q: -1, r: 0 });

// Area di espansione di p0 verso est.
const V0_NORDEST: VertexId = vertexId(O, NE, E); // adiacente a V0_NORD
const E0_NE: EdgeId = edgeId(O, NE);
const E0_E: EdgeId = edgeId(O, E);
const V_EST: VertexId = vertexId(O, E, SE); // a 2 passi da V0_NORD

/** Partita a 2 con piazzamenti controllati, in fase main del giocatore 0. */
function fixtureGame(): GameState {
  let s = newGame(2, 'fixture-costruzioni');
  s = apply(s, { type: 'piazzaVillaggioIniziale', player: 0, vertex: V0_NORD });
  s = apply(s, { type: 'piazzaSentieroIniziale', player: 0, edge: E0_NW });
  s = apply(s, { type: 'piazzaVillaggioIniziale', player: 1, vertex: P1_V1 });
  s = apply(s, { type: 'piazzaSentieroIniziale', player: 1, edge: P1_E1 });
  s = apply(s, { type: 'piazzaVillaggioIniziale', player: 1, vertex: P1_V2 });
  s = apply(s, { type: 'piazzaSentieroIniziale', player: 1, edge: P1_E2 });
  s = apply(s, { type: 'piazzaVillaggioIniziale', player: 0, vertex: P0_V2 });
  s = apply(s, { type: 'piazzaSentieroIniziale', player: 0, edge: P0_E2 });
  return toMain(s);
}

describe('costruzione di sentieri', () => {
  it('paga il costo e aggiunge il pezzo', () => {
    let s = give(fixtureGame(), 0, { legname: 1, pietra: 1 });
    const legnamePrima = s.players[0]!.resources.legname;
    const bancaPrima = s.bank.legname;
    s = apply(s, { type: 'costruisciSentiero', player: 0, edge: E0_NE });
    expect(s.players[0]!.roads).toContain(E0_NE);
    expect(s.players[0]!.resources.legname).toBe(legnamePrima - 1);
    expect(s.bank.legname).toBe(bancaPrima + 1);
  });

  it('rifiuta: senza risorse, spigolo occupato, non connesso, fase/turno errati', () => {
    const s = fixtureGame();
    const conRisorse = give(s, 0, { legname: 5, pietra: 5 });
    expectError(s, { type: 'costruisciSentiero', player: 0, edge: E0_NE }, 'RISORSE_INSUFFICIENTI');
    expectError(
      conRisorse,
      { type: 'costruisciSentiero', player: 0, edge: E0_NW },
      'SPIGOLO_OCCUPATO'
    );
    // Spigolo lontano dalla rete di p0.
    expectError(
      conRisorse,
      { type: 'costruisciSentiero', player: 0, edge: edgeId({ q: -2, r: 1 }, { q: -2, r: 2 }) },
      'NON_CONNESSO'
    );
    expectError(
      give(s, 1, { legname: 1, pietra: 1 }),
      { type: 'costruisciSentiero', player: 1, edge: edgeId({ q: -1, r: 1 }, { q: -1, r: 2 }) },
      'NON_IL_TUO_TURNO'
    );
    const preRoll = mut(conRisorse, (d) => {
      d.phase = { type: 'preRoll' };
      d.rolledThisTurn = false;
    });
    expectError(preRoll, { type: 'costruisciSentiero', player: 0, edge: E0_NE }, 'FASE_ERRATA');
  });

  it('non si costruisce ATTRAVERSO un edificio avversario', () => {
    let s = give(fixtureGame(), 0, { legname: 2, pietra: 2 });
    s = apply(s, { type: 'costruisciSentiero', player: 0, edge: E0_NE });
    // p1 occupa il vertice di passaggio: p0 non può proseguire oltre.
    const bloccato = mut(s, (d) => {
      d.players[1]!.villages.push(V0_NORDEST);
    });
    expectError(bloccato, { type: 'costruisciSentiero', player: 0, edge: E0_E }, 'NON_CONNESSO');
    // Controprova: senza il villaggio nemico la stessa mossa è lecita.
    s = apply(s, { type: 'costruisciSentiero', player: 0, edge: E0_E });
    expect(s.players[0]!.roads).toContain(E0_E);
  });

  it('rispetta il limite di 15 sentieri', () => {
    const s = mut(give(fixtureGame(), 0, { legname: 1, pietra: 1 }), (d) => {
      while (d.players[0]!.roads.length < 15) {
        d.players[0]!.roads.push(`fake-${d.players[0]!.roads.length}`);
      }
    });
    expectError(s, { type: 'costruisciSentiero', player: 0, edge: E0_NE }, 'PEZZI_ESAURITI');
  });
});

describe('costruzione di villaggi', () => {
  it('richiede connessione a un proprio sentiero e regola della distanza', () => {
    let s = give(fixtureGame(), 0, { legname: 3, pietra: 3, lana: 2, orzo: 2 });
    s = apply(s, { type: 'costruisciSentiero', player: 0, edge: E0_NE });
    // V0_NORDEST è adiacente al villaggio in V0_NORD: troppo vicino.
    expectError(s, { type: 'costruisciVillaggio', player: 0, vertex: V0_NORDEST }, 'DISTANZA');
    // Due passi più in là va bene.
    s = apply(s, { type: 'costruisciSentiero', player: 0, edge: E0_E });
    s = apply(s, { type: 'costruisciVillaggio', player: 0, vertex: V_EST });
    expect(s.players[0]!.villages).toContain(V_EST);
  });

  it('rifiuta un vertice non raggiunto dai propri sentieri', () => {
    const s = give(fixtureGame(), 0, { legname: 1, pietra: 1, lana: 1, orzo: 1 });
    expectError(s, { type: 'costruisciVillaggio', player: 0, vertex: V_EST }, 'NON_CONNESSO');
  });

  it('rispetta il limite di 5 villaggi', () => {
    const s = mut(give(fixtureGame(), 0, { legname: 1, pietra: 1, lana: 1, orzo: 1 }), (d) => {
      // Rete che raggiunge V_EST, così l'unico ostacolo restano i pezzi.
      d.players[0]!.roads.push(E0_NE, E0_E);
      while (d.players[0]!.villages.length < 5) {
        d.players[0]!.villages.push(`fake-${d.players[0]!.villages.length}`);
      }
    });
    expectError(s, { type: 'costruisciVillaggio', player: 0, vertex: V_EST }, 'PEZZI_ESAURITI');
  });
});

describe('costruzione di roccaforti', () => {
  it('promuove un proprio villaggio: il pezzo villaggio torna disponibile', () => {
    let s = give(fixtureGame(), 0, { orzo: 2, ferro: 3 });
    s = apply(s, { type: 'costruisciRoccaforte', player: 0, vertex: V0_NORD });
    expect(s.players[0]!.strongholds).toContain(V0_NORD);
    expect(s.players[0]!.villages).not.toContain(V0_NORD);
    expect(s.players[0]!.villages).toHaveLength(1);
  });

  it('rifiuta vertici vuoti o villaggi altrui, risorse mancanti e limite pezzi', () => {
    const s = fixtureGame();
    const conRisorse = give(s, 0, { orzo: 2, ferro: 3 });
    expectError(
      conRisorse,
      { type: 'costruisciRoccaforte', player: 0, vertex: V_EST },
      'VERTICE_NON_VALIDO'
    );
    expectError(
      conRisorse,
      { type: 'costruisciRoccaforte', player: 0, vertex: P1_V1 },
      'VERTICE_NON_VALIDO'
    );
    expectError(
      s,
      { type: 'costruisciRoccaforte', player: 0, vertex: V0_NORD },
      'RISORSE_INSUFFICIENTI'
    );
    const alLimite = mut(conRisorse, (d) => {
      d.players[0]!.strongholds = ['f1', 'f2', 'f3', 'f4'];
    });
    expectError(
      alLimite,
      { type: 'costruisciRoccaforte', player: 0, vertex: V0_NORD },
      'PEZZI_ESAURITI'
    );
  });
});

describe('costi e fixture', () => {
  it('le tabelle dei costi sono quelle attese', () => {
    expect(BUILD_COSTS.sentiero).toEqual({ legname: 1, pietra: 1, lana: 0, orzo: 0, ferro: 0 });
    expect(BUILD_COSTS.villaggio).toEqual({ legname: 1, pietra: 1, lana: 1, orzo: 1, ferro: 0 });
    expect(BUILD_COSTS.roccaforte).toEqual({ legname: 0, pietra: 0, lana: 0, orzo: 2, ferro: 3 });
    expect(BUILD_COSTS.cartaSaga).toEqual({ legname: 0, pietra: 0, lana: 1, orzo: 1, ferro: 1 });
  });

  it('la topologia contiene i vertici/spigoli usati dalla fixture', () => {
    const topo = getTopology();
    for (const v of [V0_NORD, V0_NORDEST, V_EST, P0_V2, P1_V1, P1_V2]) {
      expect(topo.vertices).toContain(v);
    }
    for (const e of [E0_NW, E0_NE, E0_E, P0_E2, P1_E1, P1_E2]) {
      expect(topo.edges).toContain(e);
    }
  });
});
