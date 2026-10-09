import { describe, expect, it } from 'vitest';
import { applyAction, bankRate } from '../src';
import { act, blank, give, own } from './helpers';

const R = (o: Partial<Record<'legname' | 'pietra' | 'lana' | 'orzo' | 'ferro' | 'argento', number>>) => ({
  legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 0, argento: 0, ...o,
});

describe('banca', () => {
  it('4:1 senza porto, 3:1 con un tuo Porto', () => {
    const s = blank(2);
    give(s, 0, { legname: 8 });
    expect(bankRate(s, 0, 'legname', 'orzo')).toEqual({ giveCount: 4, receiveCount: 1 });
    own(s, 0, 'italia');
    s.territories['italia']!.porto = true;
    expect(bankRate(s, 0, 'legname', 'orzo')).toEqual({ giveCount: 3, receiveCount: 1 });
    const t = act(s, { type: 'scambioBanca', player: 0, give: 'legname', receive: 'orzo' });
    expect(t.players[0]!.hand.legname).toBe(5);
    expect(t.players[0]!.hand.orzo).toBe(1);
  });

  it('il porto di un avversario non aiuta', () => {
    const s = blank(2);
    own(s, 1, 'italia');
    s.territories['italia']!.porto = true;
    expect(bankRate(s, 0, 'legname', 'orzo')).toEqual({ giveCount: 4, receiveCount: 1 });
  });

  it('1 argento → 2 materiali; 3 materiali uguali → 1 argento', () => {
    const s = blank(2);
    give(s, 0, { argento: 1, ferro: 3 });
    const t = act(s, { type: 'scambioBanca', player: 0, give: 'argento', receive: 'lana' });
    expect(t.players[0]!.hand.lana).toBe(2);
    expect(t.players[0]!.hand.argento).toBe(0);
    const u = act(t, { type: 'scambioBanca', player: 0, give: 'ferro', receive: 'argento' });
    expect(u.players[0]!.hand.argento).toBe(1);
    expect(u.players[0]!.hand.ferro).toBe(0);
  });

  it('serve avere abbastanza carte; non si scambia con sé stessi', () => {
    const s = blank(2);
    give(s, 0, { legname: 3 });
    expect(applyAction(s, { type: 'scambioBanca', player: 0, give: 'legname', receive: 'orzo' }).ok).toBe(false);
    expect(applyAction(s, { type: 'scambioBanca', player: 0, give: 'legname', receive: 'legname' }).ok).toBe(false);
  });
});

describe('scambi fra giocatori', () => {
  it('proposta → accettazione → conferma', () => {
    const s = blank(3);
    give(s, 0, { legname: 2 });
    give(s, 1, { orzo: 1 });
    let t = act(s, { type: 'proponiScambio', player: 0, give: R({ legname: 1 }), receive: R({ orzo: 1 }), to: null });
    const id = t.pendingTrade!.id;
    t = act(t, { type: 'rispondiScambio', player: 1, offerId: id, accept: true });
    t = act(t, { type: 'confermaScambio', player: 0, offerId: id, with: 1 });
    expect(t.players[0]!.hand).toMatchObject({ legname: 1, orzo: 1 });
    expect(t.players[1]!.hand).toMatchObject({ legname: 1, orzo: 0 });
    expect(t.pendingTrade).toBeNull();
  });

  it('chi accetta deve avere ciò che viene chiesto; non si conferma con chi ha rifiutato', () => {
    const s = blank(3);
    give(s, 0, { legname: 2 });
    let t = act(s, { type: 'proponiScambio', player: 0, give: R({ legname: 1 }), receive: R({ orzo: 1 }), to: null });
    const id = t.pendingTrade!.id;
    expect(applyAction(t, { type: 'rispondiScambio', player: 1, offerId: id, accept: true }).ok).toBe(false);
    t = act(t, { type: 'rispondiScambio', player: 1, offerId: id, accept: false });
    expect(applyAction(t, { type: 'confermaScambio', player: 0, offerId: id, with: 1 }).ok).toBe(false);
  });

  it('se tutti rifiutano l\'offerta si chiude da sola', () => {
    const s = blank(3);
    give(s, 0, { legname: 2 });
    let t = act(s, { type: 'proponiScambio', player: 0, give: R({ legname: 1 }), receive: R({ orzo: 1 }), to: null });
    const id = t.pendingTrade!.id;
    t = act(t, { type: 'rispondiScambio', player: 1, offerId: id, accept: false });
    expect(t.pendingTrade).not.toBeNull();
    t = act(t, { type: 'rispondiScambio', player: 2, offerId: id, accept: false });
    expect(t.pendingTrade).toBeNull();
  });

  it('offerte non valide: vuote, sovrapposte, senza risorse, a sé stessi; una sola alla volta', () => {
    const s = blank(2);
    give(s, 0, { legname: 2 });
    const bad = (give_: ReturnType<typeof R>, rec: ReturnType<typeof R>, to: number | null = null) =>
      applyAction(s, { type: 'proponiScambio', player: 0, give: give_, receive: rec, to }).ok;
    expect(bad(R({}), R({ orzo: 1 }))).toBe(false);
    expect(bad(R({ legname: 1 }), R({ legname: 1 }))).toBe(false);
    expect(bad(R({ pietra: 1 }), R({ orzo: 1 }))).toBe(false);
    expect(bad(R({ legname: 1 }), R({ orzo: 1 }), 0)).toBe(false);
    const t = act(s, { type: 'proponiScambio', player: 0, give: R({ legname: 1 }), receive: R({ orzo: 1 }), to: 1 });
    expect(applyAction(t, { type: 'proponiScambio', player: 0, give: R({ legname: 1 }), receive: R({ orzo: 1 }), to: 1 }).ok).toBe(false);
    expect(applyAction(t, { type: 'annullaScambio', player: 1, offerId: t.pendingTrade!.id }).ok).toBe(false);
    expect(act(t, { type: 'annullaScambio', player: 0, offerId: t.pendingTrade!.id }).pendingTrade).toBeNull();
  });

  it('l\'offerta cade a fine turno', () => {
    const s = blank(2);
    give(s, 0, { legname: 2 });
    const t = act(s, { type: 'proponiScambio', player: 0, give: R({ legname: 1 }), receive: R({ orzo: 1 }), to: null });
    expect(act(t, { type: 'fineTurno', player: 0 }).pendingTrade).toBeNull();
  });
});
