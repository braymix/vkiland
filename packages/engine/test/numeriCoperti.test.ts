import { describe, expect, it } from 'vitest';
import { createGame, getPlayerView } from '../src';
import { autoSetup, makePlayers } from './helpers';

/** Partita in modalità Numeri Coperti con ordine di setup deterministico. */
function copertiGame(n = 3, seed = 'seme-numeri') {
  return createGame({ seed, players: makePlayers(n), numeriCoperti: true });
}

describe('modalità Numeri Coperti', () => {
  it('la config e la vista espongono il flag', () => {
    const g = copertiGame();
    expect(g.config.numeriCoperti).toBe(true);
    expect(getPlayerView(g, 0).numeriCoperti).toBe(true);

    const standard = createGame({ seed: 'x', players: makePlayers(3) });
    expect(standard.config.numeriCoperti).toBe(false);
    expect(getPlayerView(standard, 0).numeriCoperti).toBe(false);
  });

  it('nel setup nasconde i numeri ma mostra i materiali', () => {
    const g = copertiGame();
    expect(g.phase.type).toBe('setup');

    for (const viewer of [0, 1, 'spettatore'] as const) {
      const view = getPlayerView(g, viewer);
      for (const hex of view.board.hexes) {
        const real = g.board.hexes.find((h) => h.id === hex.id)!;
        // Materiale reale visibile...
        expect(hex.terrain).toBe(real.terrain);
        // ...ma il numero coperto: token nullo e flag alzato dove c'era un numero.
        if (real.token !== null) {
          expect(hex.token).toBeNull();
          expect(hex.tokenCovered).toBe(true);
        } else {
          // Il deserto (senza numero) resta tale, senza flag.
          expect(hex.tokenCovered).toBeFalsy();
        }
        // La geometria resta quella reale.
        expect(hex.q).toBe(real.q);
        expect(hex.r).toBe(real.r);
      }
    }
  });

  it('lo stato del motore conserva SEMPRE i numeri reali (produzione ecc.)', () => {
    const g = copertiGame();
    const withNumber = g.board.hexes.filter((h) => h.terrain !== 'tundra');
    expect(withNumber.length).toBeGreaterThan(0);
    for (const hex of withNumber) {
      expect(hex.token).not.toBeNull();
    }
  });

  it('finito il setup i numeri si rivelano', () => {
    const g = copertiGame();
    const after = autoSetup(g);
    expect(after.phase.type).not.toBe('setup');

    const view = getPlayerView(after, 0);
    for (const hex of view.board.hexes) {
      const real = after.board.hexes.find((h) => h.id === hex.id)!;
      // Numero reale rivelato, mai più coperto.
      expect(hex.token).toBe(real.token);
      expect(hex.tokenCovered).toBeFalsy();
    }
  });

  it('si combina con Carte Coperte: casella del tutto cieca nel setup', () => {
    const g = createGame({
      seed: 'seme-doppio',
      players: makePlayers(3),
      carteCoperte: true,
      numeriCoperti: true,
    });
    const view = getPlayerView(g, 0);
    for (const hex of view.board.hexes) {
      const real = g.board.hexes.find((h) => h.id === hex.id)!;
      expect(hex.terrain).toBe('coperta');
      if (real.token !== null) {
        expect(hex.token).toBeNull();
        expect(hex.tokenCovered).toBe(true);
      }
    }
  });

  it('in una partita standard i numeri sono visibili anche nel setup', () => {
    const standard = createGame({ seed: 'std', players: makePlayers(3) });
    expect(standard.phase.type).toBe('setup');
    const view = getPlayerView(standard, 0);
    for (const hex of view.board.hexes) {
      const real = standard.board.hexes.find((h) => h.id === hex.id)!;
      expect(hex.token).toBe(real.token);
      expect(hex.tokenCovered).toBeFalsy();
    }
  });
});
