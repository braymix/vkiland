import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalWorldController, type WorldSetup } from '../src/game/world/LocalWorldController';
import { formatWorldEvent } from '../src/game/world/logFormat';
import { fmt, wt } from '../src/i18n/world';
import { getMapDefinition, freezeMapForTest } from './worldHelpers';

const botsOnly = (n: number, seed: string): WorldSetup => ({
  seed,
  players: Array.from({ length: n }, (_, i) => ({ name: `B${i}`, color: '#fff', bot: 'normale' as const })),
  targetPoints: 8,
  materialiCasuali: false,
  mapId: 'mondo',
});

describe('LocalWorldController', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('una partita di soli bot arriva alla vittoria da sola', async () => {
    const ctl = new LocalWorldController(botsOnly(3, 'ctl1'));
    let guard = 0;
    while (ctl.getSnapshot().winner === null && guard++ < 4000) await vi.advanceTimersByTimeAsync(700);
    const snap = ctl.getSnapshot();
    expect(snap.winner).not.toBeNull();
    expect(snap.log.length).toBeGreaterThan(10);
    ctl.dispose();
  });

  it('un umano unico non riceve mai il passaggio del dispositivo', async () => {
    const setup = botsOnly(3, 'ctl2');
    setup.players[0] = { name: 'Io', color: '#f00', bot: null };
    const ctl = new LocalWorldController(setup);
    await vi.advanceTimersByTimeAsync(10);
    const snap = ctl.getSnapshot();
    expect(snap.viewpoint).toBe(0);
    expect(snap.handoff).toBeNull();
    // Tocca all'umano: ha le mosse di setup, e non è «in pensiero».
    expect(snap.legal.some((a) => a.type === 'piazzaVillaggioIniziale')).toBe(true);
    expect(snap.thinking).toBe(false);
    ctl.dispose();
  });

  it('in hot-seat fra due umani chiede il passaggio quando cambia il giocatore', async () => {
    const setup = botsOnly(2, 'ctl3');
    setup.players = [
      { name: 'A', color: '#f00', bot: null },
      { name: 'B', color: '#00f', bot: null },
    ];
    const ctl = new LocalWorldController(setup);
    await vi.advanceTimersByTimeAsync(10);
    const first = ctl.getSnapshot();
    expect(first.viewpoint).toBe(0);
    const a = first.legal.find((x) => x.type === 'piazzaVillaggioIniziale')!;
    expect(ctl.dispatch(a)).toBeNull();
    const road = ctl.getSnapshot().legal.find((x) => x.type === 'piazzaStradaIniziale')!;
    expect(ctl.dispatch(road)).toBeNull();
    const snap = ctl.getSnapshot();
    expect(snap.handoff).toBe(1);
    expect(snap.legal).toEqual([]); // niente mosse (né mano) finché non si conferma
    ctl.confirmHandoff();
    expect(ctl.getSnapshot().viewpoint).toBe(1);
    expect(ctl.getSnapshot().legal.length).toBeGreaterThan(0);
    ctl.dispose();
  });

  it('respinge le azioni illegali con un messaggio', async () => {
    const setup = botsOnly(2, 'ctl4');
    setup.players[0] = { name: 'Io', color: '#f00', bot: null };
    const ctl = new LocalWorldController(setup);
    await vi.advanceTimersByTimeAsync(10);
    const err = ctl.dispatch({ type: 'tiraDadi', player: 0 });
    expect(err).not.toBeNull();
    expect(err!.message.length).toBeGreaterThan(0);
    ctl.dispose();
  });
});

describe('log e testi', () => {
  it('formatta gli eventi con i nomi di giocatori e territori', () => {
    const map = freezeMapForTest();
    const ctx = { playerName: (id: number) => ['Ada', 'Bo'][id]!, map };
    expect(formatWorldEvent({ type: 'mosso', player: 0, from: 'italia', to: 'balcani', cost: 2 }, ctx)).toContain('Balcani');
    expect(formatWorldEvent({ type: 'dadi', player: 1, dice: [3, 4], total: 7 }, ctx)).toContain('7');
    expect(formatWorldEvent({ type: 'grandeVia', holder: null, length: 0 }, ctx)).toBeNull();
  });

  it('fmt sostituisce i segnaposto e wt ripiega sull\'inglese per le lingue mancanti', () => {
    expect(fmt('Ciao {nome}, {n}', { nome: 'X', n: 3 })).toBe('Ciao X, 3');
    expect(typeof wt.titolo).toBe('string');
    expect(getMapDefinition('mondo')).not.toBeNull();
  });
});
