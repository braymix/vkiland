import { describe, expect, it } from 'vitest';
import { createGame, getPlayerView } from '../src';
import { autoSetup, makePlayers } from './helpers';

/** Partita in modalità Carte Coperte con ordine di setup deterministico. */
function coperteGame(n = 3, seed = 'seme-coperte') {
  return createGame({ seed, players: makePlayers(n), carteCoperte: true });
}

describe('modalità Carte Coperte', () => {
  it('la config e la vista espongono il flag', () => {
    const g = coperteGame();
    expect(g.config.carteCoperte).toBe(true);
    expect(getPlayerView(g, 0).carteCoperte).toBe(true);

    const standard = createGame({ seed: 'x', players: makePlayers(3) });
    expect(standard.config.carteCoperte).toBe(false);
    expect(getPlayerView(standard, 0).carteCoperte).toBe(false);
  });

  it('nel setup nasconde i materiali ma mostra i numeri', () => {
    const g = coperteGame();
    expect(g.phase.type).toBe('setup');

    for (const viewer of [0, 1, 'spettatore'] as const) {
      const view = getPlayerView(g, viewer);
      for (const hex of view.board.hexes) {
        // Materiale coperto...
        expect(hex.terrain).toBe('coperta');
        // ...ma il numero (e la geometria) restano quelli reali.
        const real = g.board.hexes.find((h) => h.id === hex.id)!;
        expect(hex.token).toBe(real.token);
        expect(hex.q).toBe(real.q);
        expect(hex.r).toBe(real.r);
      }
    }
  });

  it('lo stato del motore conserva SEMPRE i terreni reali (produzione ecc.)', () => {
    const g = coperteGame();
    for (const hex of g.board.hexes) {
      expect(hex.terrain).not.toBe('coperta');
    }
  });

  it('finito il setup i materiali si rivelano', () => {
    const g = coperteGame();
    const after = autoSetup(g);
    expect(after.phase.type).not.toBe('setup');

    const view = getPlayerView(after, 0);
    for (const hex of view.board.hexes) {
      const real = after.board.hexes.find((h) => h.id === hex.id)!;
      // Terreno reale rivelato, mai più coperto.
      expect(hex.terrain).toBe(real.terrain);
      expect(hex.terrain).not.toBe('coperta');
    }
  });

  it('in una partita standard i terreni sono visibili anche nel setup', () => {
    const standard = createGame({ seed: 'std', players: makePlayers(3) });
    expect(standard.phase.type).toBe('setup');
    const view = getPlayerView(standard, 0);
    for (const hex of view.board.hexes) {
      const real = standard.board.hexes.find((h) => h.id === hex.id)!;
      expect(hex.terrain).toBe(real.terrain);
    }
  });
});
