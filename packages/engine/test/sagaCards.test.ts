import { describe, expect, it } from 'vitest';
import { getLegalActions, getTopology, totalResources, type GameState } from '../src';
import {
  apply,
  autoSetup,
  clearHands,
  expectError,
  expectResourceInvariants,
  give,
  mut,
  newGame,
  toMain,
} from './helpers';

function inMain(seed = 'saga'): GameState {
  return toMain(clearHands(autoSetup(newGame(4, seed))));
}

/** Un esagono senza edifici adiacenti, per parcheggiare il Drago senza furti. */
function freeHex(s: GameState): string {
  const topo = getTopology();
  return s.board.hexes.find(
    (h) =>
      h.id !== s.board.dragonHex &&
      topo.hexVertices[h.id]!.every((v) =>
        s.players.every((p) => !p.villages.includes(v) && !p.strongholds.includes(v))
      )
  )!.id;
}

describe('acquisto delle Carte Saga', () => {
  it('paga il costo, pesca dal mazzo, e la carta NON è giocabile nel turno', () => {
    let s = give(inMain(), 0, { lana: 1, orzo: 1, ferro: 1 });
    const cima = s.sagaDeck[s.sagaDeck.length - 1]!;
    const dimensione = s.sagaDeck.length;
    s = apply(s, { type: 'compraCartaSaga', player: 0 });
    expect(s.sagaDeck).toHaveLength(dimensione - 1);
    expect(s.players[0]!.sagaCardsBoughtThisTurn).toEqual([cima]);
    expect(s.players[0]!.sagaCards).toHaveLength(0);
    expect(totalResources(s.players[0]!.resources)).toBe(0);
    expectResourceInvariants(s);
  });

  it('a fine turno le carte comprate diventano giocabili', () => {
    let s = mut(give(inMain(), 0, { lana: 1, orzo: 1, ferro: 1 }), (d) => {
      d.sagaDeck = ['berserker']; // cima nota
    });
    s = apply(s, { type: 'compraCartaSaga', player: 0 });
    expectError(s, { type: 'giocaBerserker', player: 0 }, 'CARTA_NON_DISPONIBILE');
    s = apply(s, { type: 'fineTurno', player: 0 });
    expect(s.players[0]!.sagaCards).toEqual(['berserker']);
    expect(s.players[0]!.sagaCardsBoughtThisTurn).toHaveLength(0);
  });

  it('rifiuta con mazzo esaurito o risorse mancanti', () => {
    const s = inMain();
    expectError(give(mut(s, (d) => void (d.sagaDeck = [])), 0, { lana: 1, orzo: 1, ferro: 1 }), {
      type: 'compraCartaSaga',
      player: 0,
    }, 'MAZZO_ESAURITO');
    expectError(s, { type: 'compraCartaSaga', player: 0 }, 'RISORSE_INSUFFICIENTI');
  });
});

describe('massimo una Carta Saga (non Eroi) per turno', () => {
  it('dopo un Berserker non si gioca un Banchetto', () => {
    let s = mut(inMain(), (d) => {
      d.players[0]!.sagaCards.push('berserker', 'banchetto');
    });
    s = apply(s, { type: 'giocaBerserker', player: 0 });
    s = apply(s, { type: 'muoviDrago', player: 0, hex: freeHex(s) });
    expect(s.phase.type).toBe('main');
    expectError(s, { type: 'giocaBanchetto', player: 0, resources: ['lana', 'orzo'] }, 'CARTA_GIA_GIOCATA');
    // Il turno dopo (giro completo) la seconda carta torna giocabile.
  });
});

describe('Costruttori di Sentieri', () => {
  it('piazza fino a 2 sentieri gratis e torna in main', () => {
    let s = mut(inMain(), (d) => {
      d.players[0]!.sagaCards.push('costruttoriDiSentieri');
    });
    const risorsePrima = { ...s.players[0]!.resources };
    s = apply(s, { type: 'giocaCostruttori', player: 0 });
    expect(s.phase).toEqual({ type: 'freeRoads', remaining: 2 });
    // Due piazzamenti consecutivi, scelti tra le mosse legali del motore.
    for (let i = 0; i < 2; i++) {
      const legali = getLegalActions(s, 0).filter((m) => m.type === 'piazzaSentieroGratis');
      expect(legali.length).toBeGreaterThan(0);
      s = apply(s, legali[0]! as never);
    }
    expect(s.phase.type).toBe('main');
    expect(s.players[0]!.roads).toHaveLength(4); // 2 del setup + 2 gratis
    expect(s.players[0]!.resources).toEqual(risorsePrima); // gratis davvero
  });

  it('con 14 sentieri già piazzati il gratis è uno solo; con 15 la carta è ingiocabile', () => {
    const quattordici = mut(inMain(), (d) => {
      d.players[0]!.sagaCards.push('costruttoriDiSentieri');
      while (d.players[0]!.roads.length < 14) {
        d.players[0]!.roads.push(`fake-${d.players[0]!.roads.length}`);
      }
    });
    const s = apply(quattordici, { type: 'giocaCostruttori', player: 0 });
    expect(s.phase).toEqual({ type: 'freeRoads', remaining: 1 });

    const quindici = mut(inMain(), (d) => {
      d.players[0]!.sagaCards.push('costruttoriDiSentieri');
      while (d.players[0]!.roads.length < 15) {
        d.players[0]!.roads.push(`fake-${d.players[0]!.roads.length}`);
      }
    });
    expectError(quindici, { type: 'giocaCostruttori', player: 0 }, 'PEZZI_ESAURITI');
  });
});

describe('Banchetto', () => {
  it('prende 2 risorse a scelta dalla banca (anche uguali)', () => {
    let s = mut(inMain(), (d) => {
      d.players[0]!.sagaCards.push('banchetto');
    });
    s = apply(s, { type: 'giocaBanchetto', player: 0, resources: ['ferro', 'ferro'] });
    expect(s.players[0]!.resources.ferro).toBe(2);
    expect(s.bank.ferro).toBe(17);
    expectResourceInvariants(s);
  });

  it('rifiuta se la banca non copre la scelta', () => {
    const s = mut(inMain(), (d) => {
      d.players[0]!.sagaCards.push('banchetto');
      d.bank.ferro = 1;
    });
    expectError(s, { type: 'giocaBanchetto', player: 0, resources: ['ferro', 'ferro'] }, 'BANCA_VUOTA');
  });
});

describe('Tributo', () => {
  it('requisisce TUTTE le unità della risorsa scelta dagli avversari', () => {
    let s = mut(inMain(), (d) => {
      d.players[0]!.sagaCards.push('tributo');
    });
    s = give(give(give(s, 1, { orzo: 3 }), 2, { orzo: 2, lana: 1 }), 3, { ferro: 2 });
    s = apply(s, { type: 'giocaTributo', player: 0, resource: 'orzo' });
    expect(s.players[0]!.resources.orzo).toBe(5);
    expect(s.players[1]!.resources.orzo).toBe(0);
    expect(s.players[2]!.resources.orzo).toBe(0);
    expect(s.players[2]!.resources.lana).toBe(1); // le altre risorse restano
    expect(s.players[3]!.resources.ferro).toBe(2);
    expectResourceInvariants(s);
  });
});

describe('Saga degli Eroi', () => {
  it('non è giocabile e non consuma il limite di carte', () => {
    const s = mut(inMain(), (d) => {
      d.players[0]!.sagaCards.push('sagaDegliEroi', 'banchetto');
    });
    // Nessuna azione "gioca eroi" esiste; il banchetto resta giocabile.
    const dopo = apply(s, { type: 'giocaBanchetto', player: 0, resources: ['lana', 'orzo'] });
    expect(dopo.players[0]!.sagaCards).toContain('sagaDegliEroi');
  });
});
