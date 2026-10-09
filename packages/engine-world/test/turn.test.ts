import { describe, expect, it } from 'vitest';
import { applyAction, getDefaultAction, getLegalActions, getPlayerView, filterEventsForPlayer, totalResources, type WorldGameState } from '../src';
import { act, blank, give, own } from './helpers';

/** Forza un tiro: ripete (avanzando il PRNG) finché i dadi danno `total`. */
function rollUntil(s: WorldGameState, total: number): { state: WorldGameState } {
  let cur = s;
  for (let i = 0; i < 2000; i++) {
    const r = applyAction(cur, { type: 'tiraDadi', player: cur.currentPlayer });
    if (!r.ok) throw new Error(r.error.message);
    if (r.state.dice![0] + r.state.dice![1] === total) return { state: r.state };
    cur = { ...cur, rng: r.state.rng };
  }
  throw new Error('impossibile ottenere il tiro');
}

describe('produzione', () => {
  it('villaggio 2, città 3, Sala 3; il Mercato aggiunge 1 argento', () => {
    const s = blank(3, 'italia');
    s.phase = { type: 'tiro' };
    const num = 8;
    s.territories['italia']!.number = num; // pietra
    s.territories['iberia']!.number = num; // orzo
    s.territories['balcani']!.number = num; // pietra
    own(s, 0, 'italia', 'villaggio');
    own(s, 1, 'iberia', 'citta');
    own(s, 2, 'balcani', 'sala');
    s.territories['italia']!.mercato = true;
    const { state } = rollUntil(s, num);
    expect(state.players[0]!.hand.pietra).toBe(2);
    expect(state.players[0]!.hand.argento).toBe(1);
    expect(state.players[1]!.hand.orzo).toBe(3);
    expect(state.players[2]!.hand.pietra).toBe(3);
    expect(state.phase.type).toBe('azioni');
  });

  it('un territorio senza edificio non produce', () => {
    const s = blank(2, 'italia');
    s.phase = { type: 'tiro' };
    for (const t of Object.values(s.territories)) t.number = t.number === 5 ? 5 : t.number;
    const { state } = rollUntil(s, 5);
    for (const p of state.players) expect(totalResources(p.hand)).toBe(0);
  });
});

describe('Tassa del Re (il 7)', () => {
  it('chi ha più di 7 carte scarta la metà (per difetto); poi si può razziare', () => {
    const s = blank(3, 'italia');
    s.phase = { type: 'tiro' };
    give(s, 0, { legname: 9 }); // scarta 4
    give(s, 1, { pietra: 7 }); // 7 non basta
    give(s, 2, { lana: 8 }); // scarta 4
    own(s, 1, 'balcani'); // confinante con l'Italia
    const { state } = rollUntil(s, 7);
    expect(state.phase).toEqual({ type: 'scarto', pending: [0, 2] });
    expect(applyAction(state, { type: 'scarta', player: 1, resources: state.players[1]!.hand }).ok).toBe(false);
    expect(applyAction(state, { type: 'scarta', player: 0, resources: { ...state.players[0]!.hand, legname: 3 } }).ok).toBe(false);
    let t = act(state, { type: 'scarta', player: 2, resources: { legname: 0, pietra: 0, lana: 4, orzo: 0, ferro: 0, argento: 0 } });
    expect(t.phase).toEqual({ type: 'scarto', pending: [0] });
    t = act(t, { type: 'scarta', player: 0, resources: { legname: 4, pietra: 0, lana: 0, orzo: 0, ferro: 0, argento: 0 } });
    expect(totalResources(t.players[0]!.hand)).toBe(5 + 1); // 9-4 + 1 rubata al clan 1 (unico candidato: risolta da sola)
    expect(t.phase.type).toBe('azioni');
  });

  it('nessuna produzione con il 7; con più candidati sceglie il tiratore', () => {
    const s = blank(3, 'italia');
    s.phase = { type: 'tiro' };
    own(s, 1, 'balcani');
    own(s, 2, 'europa_occ');
    give(s, 1, { lana: 2 });
    give(s, 2, { orzo: 2 });
    const { state } = rollUntil(s, 7);
    expect(state.phase).toEqual({ type: 'razzia', candidates: [1, 2] });
    expect(applyAction(state, { type: 'ruba', player: 0, target: 0 }).ok).toBe(false);
    const t = act(state, { type: 'ruba', player: 0, target: 2 });
    expect(t.players[0]!.hand.orzo).toBe(1);
    expect(t.players[2]!.hand.orzo).toBe(1);
    expect(t.phase.type).toBe('azioni');
  });

  it('nessun candidato = niente furto; il tiratore non ruba a sé stesso né a mani vuote', () => {
    const s = blank(2, 'italia');
    s.phase = { type: 'tiro' };
    own(s, 0, 'italia');
    own(s, 1, 'balcani'); // mano vuota
    const { state } = rollUntil(s, 7);
    expect(state.phase.type).toBe('azioni');
  });

  it('la carta rubata si vede solo ai coinvolti', () => {
    const ev = [{ type: 'rubato' as const, player: 0, target: 1, resource: 'orzo' as const }];
    expect((filterEventsForPlayer(ev, 2)[0] as { resource: unknown }).resource).toBeNull();
    expect((filterEventsForPlayer(ev, 0)[0] as { resource: unknown }).resource).toBe('orzo');
    expect((filterEventsForPlayer(ev, 1)[0] as { resource: unknown }).resource).toBe('orzo');
  });
});

describe('turno e vista', () => {
  it('fineTurno passa al giocatore dopo con 4 punti movimento', () => {
    const s = blank(3, 'italia');
    const t = act(s, { type: 'fineTurno', player: 0 });
    expect(t.currentPlayer).toBe(1);
    expect(t.phase).toEqual({ type: 'tiro' });
    expect(t.players[1]!.movePointsLeft).toBe(4);
    const u = act(act(act(t, { type: 'tiraDadi', player: 1 }), { type: 'fineTurno', player: 1 }), { type: 'tiraDadi', player: 2 });
    expect(u.currentPlayer).toBe(2);
  });

  it('non si finisce il turno prima di tirare', () => {
    const s = blank(2, 'italia');
    s.phase = { type: 'tiro' };
    expect(applyAction(s, { type: 'fineTurno', player: 0 }).ok).toBe(false);
  });

  it('la vista nasconde le mani altrui e il PRNG', () => {
    const s = blank(2, 'italia');
    give(s, 0, { legname: 3 });
    give(s, 1, { orzo: 4 });
    const v = getPlayerView(s, 0);
    expect(v.hand!.legname).toBe(3);
    expect(v.players[1]!.handCount).toBe(4);
    expect(JSON.stringify(v)).not.toContain('"rng"');
    expect(getPlayerView(s, null).hand).toBeNull();
  });

  it('azioni legali e azione di default sono coerenti', () => {
    const s = blank(2, 'italia');
    const legal = getLegalActions(s, 0);
    expect(legal.some((a) => a.type === 'fineTurno')).toBe(true);
    expect(getLegalActions(s, 1)).toEqual([]);
    expect(getDefaultAction(s)).toEqual({ type: 'fineTurno', player: 0 });
    s.phase = { type: 'tiro' };
    expect(getDefaultAction(s)).toEqual({ type: 'tiraDadi', player: 0 });
  });
});
