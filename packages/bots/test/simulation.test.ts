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

  it('esperto vs 3 facile: vince nettamente (e nessuna mossa illegale)', () => {
    const N = 20;
    let vittorie = 0;
    for (let i = 0; i < N; i++) {
      const { winner } = runBotGame(`sim-esperto-${i}`, [
        createHeuristicBot('esperto'),
        createHeuristicBot('facile'),
        createHeuristicBot('facile'),
        createHeuristicBot('facile'),
      ]);
      expect(winner).not.toBeNull();
      if (winner === 0) vittorie++;
    }
    // Base casuale = 25%: al 50% la superiorità è netta senza flakiness.
    expect(vittorie / N).toBeGreaterThanOrEqual(0.5);
  }, 120_000);

  it('difficile ed esperto allo stesso tavolo terminano sempre (scambi inclusi)', () => {
    for (let i = 0; i < 8; i++) {
      const { winner } = runBotGame(`sim-dif-${i}`, [
        createHeuristicBot('difficile'),
        createHeuristicBot('esperto'),
        createHeuristicBot('normale'),
        createHeuristicBot('difficile'),
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

  it('MODALITÀ CALAMITÀ: i bot giocano partite complete senza mosse illegali', () => {
    for (let i = 0; i < 12; i++) {
      const { winner, steps } = runBotGame(
        `sim-cal-${i}`,
        [
          createHeuristicBot('normale'),
          createHeuristicBot('facile'),
          createRandomBot(),
        ],
        8000,
        undefined,
        true // ← calamità attive
      );
      expect(winner, `partita calamità ${i} non conclusa (${steps} passi)`).not.toBeNull();
    }
  }, 120_000);

  it('MODALITÀ BATTAGLIA: i bot giocano partite complete senza mosse illegali', () => {
    for (let i = 0; i < 12; i++) {
      const { winner, steps } = runBotGame(
        `sim-bat-${i}`,
        [
          createHeuristicBot('esperto'),
          createHeuristicBot('difficile'),
          createHeuristicBot('normale'),
          createRandomBot(),
        ],
        8000,
        undefined,
        false,
        true // ← modalità Battaglia attiva
      );
      expect(winner, `partita battaglia ${i} non conclusa (${steps} passi)`).not.toBeNull();
    }
  }, 120_000);

  it('MODALITÀ BATTAGLIA + CALAMITÀ insieme: partite complete senza mosse illegali', () => {
    for (let i = 0; i < 8; i++) {
      const { winner, steps } = runBotGame(
        `sim-bat-cal-${i}`,
        [
          createHeuristicBot('difficile'),
          createHeuristicBot('normale'),
          createRandomBot(),
        ],
        8000,
        undefined,
        true, // ← calamità
        true // ← battaglia
      );
      expect(winner, `partita battaglia+calamità ${i} non conclusa (${steps} passi)`).not.toBeNull();
    }
  }, 120_000);
});
