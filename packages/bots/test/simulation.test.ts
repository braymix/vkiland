import { describe, expect, it } from 'vitest';
import { createHeuristicBot, createRandomBot } from '../src';
import { runBotGame } from './runner';

describe('simulazioni di partite complete', () => {
  it('euristico vs 3 random: vince almeno il 60% delle volte, senza mosse illegali', () => {
    const N = 30;
    let vittorie = 0;
    for (let i = 0; i < N; i++) {
      const { winner, steps } = runBotGame(`sim-vs-random-${i}`, [
        createHeuristicBot('normale'),
        createRandomBot(),
        createRandomBot(),
        createRandomBot(),
      ]);
      expect(winner, `partita ${i} non conclusa (${steps} passi)`).not.toBeNull();
      if (winner === 0) vittorie++;
    }
    // Base casuale = 25%: la soglia al 60% lascia margine anti-flakiness
    // pur dimostrando una superiorità netta.
    expect(vittorie / N).toBeGreaterThanOrEqual(0.6);
  }, 120_000);

  it('4 euristici terminano sempre la partita', () => {
    for (let i = 0; i < 10; i++) {
      const { winner } = runBotGame(`sim-eu-${i}`, [
        createHeuristicBot('normale'),
        createHeuristicBot('normale'),
        createHeuristicBot('facile'),
        createHeuristicBot('facile'),
      ]);
      expect(winner).not.toBeNull();
    }
  }, 120_000);

  it('2 giocatori: euristico vs facile termina e produce un vincitore', () => {
    for (let i = 0; i < 8; i++) {
      const { winner } = runBotGame(`sim-2p-${i}`, [
        createHeuristicBot('normale'),
        createHeuristicBot('facile'),
      ]);
      expect(winner).not.toBeNull();
    }
  }, 120_000);
});
