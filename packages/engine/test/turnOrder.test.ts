/** L'ordine di partenza si decide coi dadi e resta per tutta la partita. */
import { describe, expect, it } from 'vitest';
import { createGame, type GameState } from '../src';
import { apply, autoSetup, makePlayers, toMain } from './helpers';

function raw(n: number, seed: string): GameState {
  return createGame({ seed, players: makePlayers(n) });
}

describe('tiro dei dadi per l’ordine di partenza', () => {
  it('turnOrder è una permutazione dei giocatori, deterministica dal seed', () => {
    const a = raw(4, 'ordine-1');
    const b = raw(4, 'ordine-1');
    expect(a.turnOrder).toEqual(b.turnOrder);
    expect([...a.turnOrder].sort()).toEqual([0, 1, 2, 3]);
    expect(a.startingRolls).toEqual(b.startingRolls);
  });

  it('seed diversi producono (prima o poi) ordini diversi', () => {
    const orders = new Set<string>();
    for (let i = 0; i < 30; i++) orders.add(raw(4, `ordine-vario-${i}`).turnOrder.join(','));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('il primo round di tiri include tutti; chi totalizza di più precede gli altri', () => {
    for (let i = 0; i < 20; i++) {
      const g = raw(3, `ordine-tot-${i}`);
      const round = g.startingRolls[0]!;
      expect(round.map((r) => r.player).sort()).toEqual([0, 1, 2]);
      const total = new Map(round.map((r) => [r.player, r.dice[0] + r.dice[1]]));
      // Lungo il turnOrder i totali del primo round non crescono mai.
      for (let k = 1; k < g.turnOrder.length; k++) {
        expect(total.get(g.turnOrder[k - 1]!)!).toBeGreaterThanOrEqual(
          total.get(g.turnOrder[k]!)!
        );
      }
    }
  });

  it('i pareggi si risolvono con round extra SOLO tra i giocatori pari', () => {
    // Si cerca un seed con spareggio (deterministico: la ricerca è fissa).
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const g = raw(4, `spareggio-${i}`);
      if (g.startingRolls.length <= 1) continue;
      found = true;
      const first = g.startingRolls[0]!;
      const totals = new Map(first.map((r) => [r.player, r.dice[0] + r.dice[1]]));
      for (const round of g.startingRolls.slice(1)) {
        expect(round.length).toBeGreaterThanOrEqual(2);
        // Tutti i partecipanti del round avevano lo stesso totale al primo giro.
        const parentTotals = new Set(round.map((r) => totals.get(r.player)));
        expect(parentTotals.size).toBe(1);
      }
    }
    expect(found).toBe(true);
  });

  it('setupOrder è la serpentina del turnOrder e il setup parte dal vincitore', () => {
    const g = raw(3, 'ordine-serpentina');
    expect(g.setupOrder).toEqual([...g.turnOrder, ...[...g.turnOrder].reverse()]);
    expect(g.currentPlayer).toBe(g.turnOrder[0]);
  });

  it('l’ordine deciso si mantiene per tutti i turni successivi', () => {
    const g = raw(3, 'ordine-mantenuto');
    let s = autoSetup(g);
    expect(s.currentPlayer).toBe(g.turnOrder[0]);
    // Tre giri completi: la sequenza dei turni segue sempre turnOrder.
    for (let k = 1; k <= 9; k++) {
      s = apply(toMain(s), { type: 'fineTurno', player: s.currentPlayer });
      expect(s.currentPlayer).toBe(g.turnOrder[k % 3]);
    }
  });
});
