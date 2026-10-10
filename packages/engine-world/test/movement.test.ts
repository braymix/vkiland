import { describe, expect, it } from 'vitest';
import { applyAction, planMove, reachableMoves } from '../src';
import { act, annex, blank, give, own, road } from './helpers';

describe('movimento del Jarl', () => {
  it('1 punto su una tua strada, 2 su terra senza strada: 4 punti = 4 passi su strada', () => {
    const s = blank(2, 'iberia');
    road(s, 0, 'iberia', 'europa_occ');
    road(s, 0, 'europa_occ', 'italia');
    road(s, 0, 'italia', 'balcani');
    road(s, 0, 'balcani', 'russia_eur');
    let t = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    t = act(t, { type: 'muovi', player: 0, to: 'italia' });
    t = act(t, { type: 'muovi', player: 0, to: 'balcani' });
    t = act(t, { type: 'muovi', player: 0, to: 'russia_eur' });
    expect(t.players[0]!.jarl).toBe('russia_eur');
    expect(t.players[0]!.movePointsLeft).toBe(0);
    expect(applyAction(t, { type: 'muovi', player: 0, to: 'balcani' }).ok).toBe(false);
  });

  it('senza strada costa 2: due passi fuori strada e basta', () => {
    const s = blank(2, 'iberia');
    let t = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    expect(t.players[0]!.movePointsLeft).toBe(2);
    t = act(t, { type: 'muovi', player: 0, to: 'italia' });
    expect(t.players[0]!.movePointsLeft).toBe(0);
  });

  it('si combinano: 2 passi su strada + 1 fuori', () => {
    const s = blank(2, 'iberia');
    road(s, 0, 'iberia', 'europa_occ');
    road(s, 0, 'europa_occ', 'italia');
    let t = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    t = act(t, { type: 'muovi', player: 0, to: 'italia' });
    t = act(t, { type: 'muovi', player: 0, to: 'balcani' });
    expect(t.players[0]!.movePointsLeft).toBe(0);
  });

  it('la strada di un avversario non conta come tua', () => {
    const s = blank(2, 'iberia');
    road(s, 1, 'iberia', 'europa_occ');
    const p = planMove(s, 0, 'europa_occ');
    expect(p.ok && p.plan.cost).toBe(2);
  });

  it('si può solo verso un territorio confinante', () => {
    const s = blank(2, 'iberia');
    const r = applyAction(s, { type: 'muovi', player: 0, to: 'italia' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('NON_CONFINANTE');
  });

  it('il mare si attraversa solo partendo da un tuo Porto (costo 2)', () => {
    const s = blank(2, 'scandinavia');
    expect(applyAction(s, { type: 'muovi', player: 0, to: 'islanda' }).ok).toBe(false);
    annex(s, 1, 'scandinavia', 'porto'); // porto di un avversario: non vale
    expect(applyAction(s, { type: 'muovi', player: 0, to: 'islanda' }).ok).toBe(false);
    annex(s, 0, 'scandinavia', 'porto'); // il proprio porto, nello stesso territorio
    const t = act(s, { type: 'muovi', player: 0, to: 'islanda' });
    expect(t.players[0]!.jarl).toBe('islanda');
    expect(t.players[0]!.movePointsLeft).toBe(2);
    // dall'isola non si torna indietro senza un porto lì
    expect(applyAction(t, { type: 'muovi', player: 0, to: 'scandinavia' }).ok).toBe(false);
  });

  it('non si muove prima del tiro', () => {
    const s = blank(2, 'iberia');
    s.phase = { type: 'tiro' };
    expect(applyAction(s, { type: 'muovi', player: 0, to: 'europa_occ' }).ok).toBe(false);
  });

  it('reachableMoves elenca i passi possibili con il costo', () => {
    const s = blank(2, 'italia');
    road(s, 0, 'italia', 'balcani');
    const m = reachableMoves(s, 0);
    expect(m.map((x) => x.to).sort()).toEqual(['balcani', 'europa_centrale', 'europa_occ']);
    expect(m.find((x) => x.to === 'balcani')!.cost).toBe(1);
    expect(m.find((x) => x.to === 'europa_occ')!.cost).toBe(2);
    expect(m.find((x) => x.to === 'nord_africa')).toBeUndefined(); // mare senza porto
  });
});

describe('pedaggio', () => {
  it('entrando in un territorio altrui si paga 1 argento se ce l\'hai', () => {
    const s = blank(2, 'iberia');
    own(s, 1, 'europa_occ');
    give(s, 0, { argento: 2, legname: 3 });
    const t = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    expect(t.players[0]!.hand.argento).toBe(1);
    expect(t.players[0]!.hand.legname).toBe(3);
    expect(t.players[1]!.hand.argento).toBe(1);
  });

  it('senza argento si paga 1 materiale a scelta', () => {
    const s = blank(2, 'iberia');
    own(s, 1, 'europa_occ');
    give(s, 0, { legname: 2, pietra: 2 });
    const t = act(s, { type: 'muovi', player: 0, to: 'europa_occ', pay: { legname: 0, pietra: 1, lana: 0, orzo: 0, ferro: 0, argento: 0 } });
    expect(t.players[0]!.hand.pietra).toBe(1);
    expect(t.players[0]!.hand.legname).toBe(2);
    expect(t.players[1]!.hand.pietra).toBe(1);
  });

  it('un pagamento errato è respinto; senza `pay` si sceglie in automatico', () => {
    const s = blank(2, 'iberia');
    own(s, 1, 'europa_occ');
    give(s, 0, { legname: 2, pietra: 2 });
    const bad = applyAction(s, { type: 'muovi', player: 0, to: 'europa_occ', pay: { legname: 0, pietra: 0, lana: 1, orzo: 0, ferro: 0, argento: 0 } });
    expect(bad.ok).toBe(false);
    const t = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    expect(t.players[0]!.hand.legname + t.players[0]!.hand.pietra).toBe(3);
  });

  it('se non hai nulla non paghi nulla', () => {
    const s = blank(2, 'iberia');
    own(s, 1, 'europa_occ');
    const t = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    expect(t.players[1]!.hand.argento).toBe(0);
    expect(t.players[0]!.jarl).toBe('europa_occ');
  });

  it('con la Sala del Jarl il pedaggio è doppio (argento, poi materiali)', () => {
    const s = blank(2, 'iberia');
    own(s, 1, 'europa_occ', 'sala');
    give(s, 0, { argento: 1, orzo: 5 });
    const t = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    expect(t.players[0]!.hand.argento).toBe(0);
    expect(t.players[0]!.hand.orzo).toBe(4);
    expect(t.players[1]!.hand.argento).toBe(1);
    expect(t.players[1]!.hand.orzo).toBe(1);
  });

  it('con meno di quanto dovuto si paga quel che c\'è', () => {
    const s = blank(2, 'iberia');
    own(s, 1, 'europa_occ', 'sala');
    give(s, 0, { argento: 1 });
    const t = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    expect(t.players[0]!.hand.argento).toBe(0);
    expect(t.players[1]!.hand.argento).toBe(1);
  });

  it('una sola volta per territorio per turno (andata e ritorno)', () => {
    const s = blank(2, 'iberia');
    own(s, 1, 'europa_occ');
    road(s, 0, 'iberia', 'europa_occ');
    give(s, 0, { argento: 5 });
    let t = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    t = act(t, { type: 'muovi', player: 0, to: 'iberia' });
    t = act(t, { type: 'muovi', player: 0, to: 'europa_occ' });
    expect(t.players[0]!.hand.argento).toBe(4);
  });

  it('niente pedaggio per il territorio di partenza del turno', () => {
    const s = blank(2, 'europa_occ');
    own(s, 1, 'europa_occ');
    road(s, 0, 'iberia', 'europa_occ');
    give(s, 0, { argento: 5 });
    let t = act(s, { type: 'muovi', player: 0, to: 'iberia' });
    t = act(t, { type: 'muovi', player: 0, to: 'europa_occ' });
    expect(t.players[0]!.hand.argento).toBe(5);
  });

  it('niente pedaggio nei propri territori né in quelli liberi', () => {
    const s = blank(2, 'iberia');
    own(s, 0, 'europa_occ');
    give(s, 0, { argento: 5 });
    const t = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    expect(t.players[0]!.hand.argento).toBe(5);
  });

  it('territorio condiviso: chi ci abita non paga; gli altri pagano al primo arrivato', () => {
    const s = blank(3, 'iberia');
    own(s, 1, 'europa_occ', 'sala'); // primo arrivato (con Sala)
    own(s, 2, 'europa_occ');
    give(s, 0, { argento: 5 });
    give(s, 2, { argento: 5 });
    const t = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    expect(t.players[1]!.hand.argento).toBe(2); // doppio: la Sala è del padrone di casa
    expect(t.players[2]!.hand.argento).toBe(5);
    // il giocatore 2 abita lì: entrando non paga
    const u = blank(3, 'iberia');
    own(u, 1, 'europa_occ');
    own(u, 2, 'europa_occ');
    give(u, 2, { argento: 5 });
    u.currentPlayer = 2;
    const v = act(u, { type: 'muovi', player: 2, to: 'europa_occ' });
    expect(v.players[2]!.hand.argento).toBe(5);
  });

  it('il pedaggio riparte al turno dopo', () => {
    let s = blank(2, 'iberia');
    own(s, 1, 'europa_occ');
    road(s, 0, 'iberia', 'europa_occ');
    give(s, 0, { argento: 5 });
    s = act(s, { type: 'muovi', player: 0, to: 'europa_occ' });
    expect(s.players[0]!.tollsPaidThisTurn).toContain('europa_occ');
    s = act(s, { type: 'fineTurno', player: 0 });
    s = act(s, { type: 'tiraDadi', player: 1 });
    expect(s.currentPlayer).toBe(1);
  });
});
