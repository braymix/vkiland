import { describe, expect, it } from 'vitest';
import { getLegalActions, getTopology, zeroResources, type GameState } from '../src';
import { apply, clearHands, expectError, give, mut, newGame, toMain } from './helpers';

/** Partita a 4 in fase main di p0, mani azzerate. */
function base(): GameState {
  return toMain(clearHands(mutSetup(newGame(4, 'scambi'))));
}
function mutSetup(s: GameState): GameState {
  // Setup minimo via chirurgia: bastano edifici qualunque per i test di scambio.
  return mut(s, (d) => {
    d.phase = { type: 'main' };
    d.setupIndex = d.setupOrder.length;
    d.turnNumber = 1;
    d.currentPlayer = 0;
  });
}

function rc(partial: Partial<Record<'legname' | 'pietra' | 'lana' | 'orzo' | 'ferro', number>>) {
  return { ...zeroResources(), ...partial };
}

describe('scambi con la banca', () => {
  it('4:1 senza approdi', () => {
    let s = give(base(), 0, { legname: 4 });
    s = apply(s, { type: 'scambioBanca', player: 0, give: 'legname', receive: 'ferro' });
    expect(s.players[0]!.resources.legname).toBe(0);
    expect(s.players[0]!.resources.ferro).toBe(1);
  });

  it('rifiuta quantità insufficienti e risorse uguali', () => {
    const s = give(base(), 0, { legname: 3 });
    expectError(s, { type: 'scambioBanca', player: 0, give: 'legname', receive: 'ferro' }, 'RISORSE_INSUFFICIENTI');
    expectError(
      give(base(), 0, { legname: 4 }),
      { type: 'scambioBanca', player: 0, give: 'legname', receive: 'legname' },
      'SCAMBIO_NON_VALIDO'
    );
  });

  it('3:1 con un approdo generico, 2:1 solo per la risorsa dell’approdo specifico', () => {
    const topo = getTopology();
    const s0 = base();
    const generico = s0.board.ports.find((p) => p.kind === 'generico')!;
    const specifico = s0.board.ports.find((p) => p.kind !== 'generico')!;
    const risorsaPorto = specifico.kind as 'legname' | 'pietra' | 'lana' | 'orzo' | 'ferro';
    const altra = risorsaPorto === 'legname' ? 'pietra' : 'legname';

    // Possesso dell'approdo generico → 3:1 su tutto.
    const conGenerico = mut(give(s0, 0, { legname: 3 }), (d) => {
      d.players[0]!.villages.push(topo.edgeVertices[generico.edge]![0]);
    });
    const dopo = apply(conGenerico, { type: 'scambioBanca', player: 0, give: 'legname', receive: 'ferro' });
    expect(dopo.players[0]!.resources.legname).toBe(0);
    expect(dopo.players[0]!.resources.ferro).toBe(1);

    // Possesso dell'approdo specifico → 2:1 SOLO per quella risorsa.
    const conSpecifico = mut(give(s0, 0, { [risorsaPorto]: 2, [altra]: 3 }), (d) => {
      d.players[0]!.villages.push(topo.edgeVertices[specifico.edge]![1]);
    });
    const dueAUno = apply(conSpecifico, {
      type: 'scambioBanca',
      player: 0,
      give: risorsaPorto,
      receive: 'ferro',
    });
    expect(dueAUno.players[0]!.resources[risorsaPorto]).toBe(0);
    // ...ma per le altre risorse resta 4:1 (3 non bastano).
    expectError(
      conSpecifico,
      { type: 'scambioBanca', player: 0, give: altra, receive: 'ferro' },
      'RISORSE_INSUFFICIENTI'
    );
  });

  it('rifiuta se la banca non ha la risorsa richiesta', () => {
    const s = mut(give(base(), 0, { legname: 4 }), (d) => {
      d.bank.ferro = 0;
    });
    expectError(s, { type: 'scambioBanca', player: 0, give: 'legname', receive: 'ferro' }, 'BANCA_VUOTA');
  });
});

describe('scambi tra giocatori — offerta diretta', () => {
  it('accettazione: esegue subito e chiude l’offerta', () => {
    let s = give(give(base(), 0, { legname: 2 }), 1, { ferro: 1 });
    s = apply(s, {
      type: 'proponiScambio',
      player: 0,
      give: rc({ legname: 2 }),
      receive: rc({ ferro: 1 }),
      to: 1,
    });
    expect(s.pendingTrade).not.toBeNull();
    s = apply(s, { type: 'rispondiScambio', player: 1, offerId: s.pendingTrade!.id, accept: true });
    expect(s.pendingTrade).toBeNull();
    expect(s.players[0]!.resources).toEqual(rc({ ferro: 1 }));
    expect(s.players[1]!.resources).toEqual(rc({ legname: 2 }));
  });

  it('rifiuto: chiude senza scambiare; solo il destinatario può rispondere', () => {
    let s = give(give(base(), 0, { legname: 2 }), 1, { ferro: 1 });
    s = apply(s, {
      type: 'proponiScambio',
      player: 0,
      give: rc({ legname: 2 }),
      receive: rc({ ferro: 1 }),
      to: 1,
    });
    const offerId = s.pendingTrade!.id;
    expectError(s, { type: 'rispondiScambio', player: 2, offerId, accept: true }, 'RISPOSTA_NON_AMMESSA');
    s = apply(s, { type: 'rispondiScambio', player: 1, offerId, accept: false });
    expect(s.pendingTrade).toBeNull();
    expect(s.players[0]!.resources).toEqual(rc({ legname: 2 }));
  });
});

describe('scambi tra giocatori — offerta aperta', () => {
  function aperta(): GameState {
    let s = give(give(give(base(), 0, { legname: 1 }), 1, { ferro: 1 }), 3, { ferro: 1 });
    s = apply(s, {
      type: 'proponiScambio',
      player: 0,
      give: rc({ legname: 1 }),
      receive: rc({ ferro: 1 }),
      to: null,
    });
    return s;
  }

  it('raccoglie risposte e il proponente conferma con uno degli accettanti', () => {
    let s = aperta();
    const offerId = s.pendingTrade!.id;
    s = apply(s, { type: 'rispondiScambio', player: 1, offerId, accept: true });
    s = apply(s, { type: 'rispondiScambio', player: 2, offerId, accept: false });
    s = apply(s, { type: 'rispondiScambio', player: 3, offerId, accept: true });
    expect(s.pendingTrade!.responses).toEqual({ 1: 'accettata', 2: 'rifiutata', 3: 'accettata' });
    // Conferma con p3: lo scambio avviene solo con lui.
    s = apply(s, { type: 'confermaScambio', player: 0, offerId, with: 3 });
    expect(s.pendingTrade).toBeNull();
    expect(s.players[3]!.resources).toEqual(rc({ legname: 1 }));
    expect(s.players[1]!.resources).toEqual(rc({ ferro: 1 })); // intatto
    expect(s.players[0]!.resources).toEqual(rc({ ferro: 1 }));
  });

  it('vieta conferme con chi ha rifiutato e risposte doppie', () => {
    let s = aperta();
    const offerId = s.pendingTrade!.id;
    s = apply(s, { type: 'rispondiScambio', player: 2, offerId, accept: false });
    expectError(s, { type: 'confermaScambio', player: 0, offerId, with: 2 }, 'RISPOSTA_NON_AMMESSA');
    expectError(s, { type: 'rispondiScambio', player: 2, offerId, accept: true }, 'GIA_RISPOSTO');
  });

  it('l’annullamento chiude l’offerta', () => {
    let s = aperta();
    s = apply(s, { type: 'annullaScambio', player: 0, offerId: s.pendingTrade!.id });
    expect(s.pendingTrade).toBeNull();
  });

  it('senza risorse non si può accettare', () => {
    const s = aperta();
    expectError(
      s,
      { type: 'rispondiScambio', player: 2, offerId: s.pendingTrade!.id, accept: true },
      'RISORSE_INSUFFICIENTI'
    );
  });
});

describe('vincoli generali sugli scambi', () => {
  it('vieta offerte vuote, sovrapposte o senza copertura', () => {
    const s = give(base(), 0, { legname: 2 });
    expectError(
      s,
      { type: 'proponiScambio', player: 0, give: rc({}), receive: rc({ ferro: 1 }), to: null },
      'SCAMBIO_NON_VALIDO'
    );
    expectError(
      s,
      {
        type: 'proponiScambio',
        player: 0,
        give: rc({ legname: 1 }),
        receive: rc({ legname: 1, ferro: 1 }),
        to: null,
      },
      'SCAMBIO_NON_VALIDO'
    );
    expectError(
      s,
      { type: 'proponiScambio', player: 0, give: rc({ pietra: 1 }), receive: rc({ ferro: 1 }), to: null },
      'RISORSE_INSUFFICIENTI'
    );
  });

  it('con uno scambio pendente le altre azioni sono bloccate', () => {
    let s = give(give(base(), 0, { legname: 6, pietra: 1 }), 1, { ferro: 1 });
    s = apply(s, {
      type: 'proponiScambio',
      player: 0,
      give: rc({ legname: 1 }),
      receive: rc({ ferro: 1 }),
      to: null,
    });
    expectError(s, { type: 'fineTurno', player: 0 }, 'SCAMBIO_PENDENTE');
    expectError(
      s,
      { type: 'scambioBanca', player: 0, give: 'legname', receive: 'ferro' },
      'SCAMBIO_PENDENTE'
    );
    // E le mosse legali riflettono il blocco.
    const movesP0 = getLegalActions(s, 0);
    expect(movesP0.every((m) => m.type === 'annullaScambio' || m.type === 'confermaScambio')).toBe(
      true
    );
    const movesP1 = getLegalActions(s, 1);
    expect(movesP1.every((m) => m.type === 'rispondiScambio')).toBe(true);
  });

  it('solo il giocatore di turno propone, e solo in fase main', () => {
    const s = give(base(), 1, { ferro: 1 });
    expectError(
      s,
      { type: 'proponiScambio', player: 1, give: rc({ ferro: 1 }), receive: rc({ lana: 1 }), to: null },
      'NON_IL_TUO_TURNO'
    );
  });
});
