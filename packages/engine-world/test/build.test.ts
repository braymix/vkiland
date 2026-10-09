import { describe, expect, it } from 'vitest';
import { applyAction, linkId, piecesLeft } from '../src';
import { ALL_FIVE, act, annex, at, blank, give, own, road } from './helpers';

describe('strade', () => {
  it('costano 1 legname + 1 pietra e devono toccare Jarl / territorio proprio / strada propria', () => {
    const s = blank(2, 'italia');
    give(s, 0, { legname: 1, pietra: 1 });
    expect(applyAction(s, { type: 'costruisciStrada', player: 0, link: linkId('iberia', 'europa_occ') }).ok).toBe(false);
    const t = act(s, { type: 'costruisciStrada', player: 0, link: linkId('italia', 'balcani') }); // tocca il Jarl
    expect(t.roads[linkId('italia', 'balcani')]).toBe(0);
    expect(t.players[0]!.hand.legname).toBe(0);
    expect(t.players[0]!.hand.pietra).toBe(0);
  });

  it('si estendono da una strada propria o da un territorio proprio', () => {
    const s = blank(2, 'italia');
    give(s, 0, { ...ALL_FIVE });
    road(s, 0, 'italia', 'balcani');
    expect(applyAction(s, { type: 'costruisciStrada', player: 0, link: linkId('balcani', 'russia_eur') }).ok).toBe(true);
    own(s, 0, 'iberia');
    expect(applyAction(s, { type: 'costruisciStrada', player: 0, link: linkId('iberia', 'europa_occ') }).ok).toBe(true);
  });

  it('non sul mare, non su una strada già presente, non senza risorse', () => {
    const s = blank(2, 'scandinavia');
    give(s, 0, { ...ALL_FIVE });
    expect(applyAction(s, { type: 'costruisciStrada', player: 0, link: linkId('scandinavia', 'islanda') }).ok).toBe(false);
    road(s, 1, 'scandinavia', 'russia_eur');
    expect(applyAction(s, { type: 'costruisciStrada', player: 0, link: linkId('scandinavia', 'russia_eur') }).ok).toBe(false);
    const poor = blank(2, 'italia');
    expect(applyAction(poor, { type: 'costruisciStrada', player: 0, link: linkId('italia', 'balcani') }).ok).toBe(false);
  });

  it('massimo 15 strade', () => {
    const s = blank(2, 'italia');
    give(s, 0, { ...ALL_FIVE });
    const links = s.map.links.filter((l) => l.kind === 'terra' && l.id !== linkId('italia', 'balcani'));
    for (const l of links.slice(0, 15)) s.roads[l.id] = 0;
    expect(piecesLeft(s, 0, 'strada')).toBe(0);
    expect(applyAction(s, { type: 'costruisciStrada', player: 0, link: linkId('italia', 'balcani') }).ok).toBe(false);
  });
});

describe('villaggio', () => {
  it('solo dove si trova il Jarl, su territorio libero e non deserto', () => {
    const s = blank(2, 'italia');
    give(s, 0, { ...ALL_FIVE });
    expect(applyAction(s, { type: 'costruisci', player: 0, what: 'villaggio', territory: 'balcani' }).ok).toBe(false);
    const t = act(s, { type: 'costruisci', player: 0, what: 'villaggio', territory: 'italia' });
    expect(at(t, 'italia', 0)).toMatchObject({ owner: 0, building: 'villaggio' });
    expect(t.players[0]!.hand.legname).toBe(9);
    expect(t.players[0]!.hand.orzo).toBe(9);
    // lo stesso clan non ne costruisce un secondo nello stesso territorio
    expect(applyAction(t, { type: 'costruisci', player: 0, what: 'villaggio', territory: 'italia' }).ok).toBe(false);
    const d = blank(2, 'sahara');
    give(d, 0, { ...ALL_FIVE });
    expect(applyAction(d, { type: 'costruisci', player: 0, what: 'villaggio', territory: 'sahara' }).ok).toBe(false);
  });

  it('due clan diversi possono abitare lo stesso territorio, un terzo no', () => {
    const s = blank(3, 'italia');
    for (const p of [0, 1, 2]) give(s, p, { ...ALL_FIVE });
    own(s, 0, 'italia');
    s.currentPlayer = 1;
    const t = act(s, { type: 'costruisci', player: 1, what: 'villaggio', territory: 'italia' });
    expect(t.territories['italia']!.settlements.map((x) => x.owner)).toEqual([0, 1]);
    t.currentPlayer = 2;
    const r = applyAction(t, { type: 'costruisci', player: 2, what: 'villaggio', territory: 'italia' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('TERRITORIO_OCCUPATO');
  });

  it('niente regola della distanza: si può fondare accanto a un avversario', () => {
    const s = blank(2, 'balcani');
    give(s, 0, { ...ALL_FIVE });
    own(s, 1, 'italia');
    expect(applyAction(s, { type: 'costruisci', player: 0, what: 'villaggio', territory: 'balcani' }).ok).toBe(true);
  });

  it('massimo 6 villaggi', () => {
    const s = blank(2, 'italia');
    give(s, 0, { ...ALL_FIVE });
    for (const id of ['iberia', 'europa_occ', 'europa_centrale', 'balcani', 'russia_eur', 'scandinavia']) own(s, 0, id);
    expect(applyAction(s, { type: 'costruisci', player: 0, what: 'villaggio', territory: 'italia' }).ok).toBe(false);
  });
});

describe('città, Sala, Porto, Mercato', () => {
  it('città: 2 orzo + 3 ferro su un tuo villaggio, ovunque (il Jarl non serve)', () => {
    const s = blank(2, 'russia_eur');
    own(s, 0, 'italia');
    give(s, 0, { orzo: 2, ferro: 3 });
    const t = act(s, { type: 'costruisci', player: 0, what: 'citta', territory: 'italia' });
    expect(at(t, 'italia', 0)!.building).toBe('citta');
    expect(t.players[0]!.hand.orzo).toBe(0);
    expect(applyAction(s, { type: 'costruisci', player: 0, what: 'citta', territory: 'balcani' }).ok).toBe(false);
  });

  it('Sala del Jarl: 2 argento 2 ferro 1 pietra 1 orzo su una tua città, max 1', () => {
    const s = blank(2, 'italia');
    own(s, 0, 'italia', 'citta');
    own(s, 0, 'iberia', 'citta');
    give(s, 0, { argento: 2, ferro: 2, pietra: 1, orzo: 1 });
    expect(applyAction(s, { type: 'costruisci', player: 0, what: 'sala', territory: 'italia' }).ok).toBe(true);
    const poor = blank(2, 'italia');
    own(poor, 0, 'italia', 'citta');
    give(poor, 0, { ferro: 2, pietra: 1, orzo: 1 });
    expect(applyAction(poor, { type: 'costruisci', player: 0, what: 'sala', territory: 'italia' }).ok).toBe(false);
    const t = act(s, { type: 'costruisci', player: 0, what: 'sala', territory: 'italia' });
    give(t, 0, { argento: 2, ferro: 2, pietra: 1, orzo: 1 });
    expect(applyAction(t, { type: 'costruisci', player: 0, what: 'sala', territory: 'iberia' }).ok).toBe(false);
  });

  it('Porto: solo su un tuo territorio costiero, uno per territorio, max 3', () => {
    const s = blank(2, 'italia');
    give(s, 0, { ...ALL_FIVE });
    expect(applyAction(s, { type: 'costruisci', player: 0, what: 'porto', territory: 'italia' }).ok).toBe(false); // non tuo
    own(s, 0, 'italia');
    own(s, 0, 'asia_centrale'); // non costiero
    expect(applyAction(s, { type: 'costruisci', player: 0, what: 'porto', territory: 'asia_centrale' }).ok).toBe(false);
    const t = act(s, { type: 'costruisci', player: 0, what: 'porto', territory: 'italia' });
    expect(at(t, 'italia', 0)!.porto).toBe(true);
    expect(applyAction(t, { type: 'costruisci', player: 0, what: 'porto', territory: 'italia' }).ok).toBe(false);
    for (const id of ['iberia', 'balcani']) {
      annex(t, 0, id, 'porto');
    }
    expect(piecesLeft(t, 0, 'porto')).toBe(0);
    own(t, 0, 'scandinavia');
    expect(applyAction(t, { type: 'costruisci', player: 0, what: 'porto', territory: 'scandinavia' }).ok).toBe(false);
  });

  it('Mercato: su un tuo territorio, non occupa il posto del villaggio', () => {
    const s = blank(2, 'italia');
    give(s, 0, { ...ALL_FIVE });
    own(s, 0, 'italia');
    const t = act(s, { type: 'costruisci', player: 0, what: 'mercato', territory: 'italia' });
    expect(at(t, 'italia', 0)).toMatchObject({ building: 'villaggio', mercato: true });
    expect(applyAction(t, { type: 'costruisci', player: 0, what: 'mercato', territory: 'italia' }).ok).toBe(false);
  });

  it('fuori turno / fuori fase è respinto', () => {
    const s = blank(2, 'italia');
    give(s, 1, { ...ALL_FIVE });
    s.players[1]!.jarl = 'italia';
    expect(applyAction(s, { type: 'costruisci', player: 1, what: 'villaggio', territory: 'italia' }).ok).toBe(false);
    s.phase = { type: 'tiro' };
    give(s, 0, { ...ALL_FIVE });
    expect(applyAction(s, { type: 'costruisci', player: 0, what: 'villaggio', territory: 'italia' }).ok).toBe(false);
  });
});
