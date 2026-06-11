import { describe, expect, it } from 'vitest';
import { PIECE_LIMITS, applyAction, createGame, gloryPoints, type GameState } from '../src';
import { expectResourceInvariants, makePlayers, randomPlayout } from './helpers';

const SEEDS = 60;

describe('partite complete con giocatori casuali-legali', () => {
  it(`${SEEDS} partite terminano sempre, rispettando gli invarianti`, () => {
    for (let i = 0; i < SEEDS; i++) {
      const { state, actions, finished } = randomPlayout(`partita-${i}`);
      expect(finished, `seed partita-${i} non terminata in ${actions.length} azioni`).toBe(true);
      expect(state.phase.type).toBe('gameOver');
      if (state.phase.type === 'gameOver') {
        expect(gloryPoints(state, state.phase.winner, true)).toBeGreaterThanOrEqual(
          state.config.targetGloryPoints
        );
      }
      expectResourceInvariants(state);
      for (const p of state.players) {
        expect(p.villages.length).toBeLessThanOrEqual(PIECE_LIMITS.villaggio);
        expect(p.strongholds.length).toBeLessThanOrEqual(PIECE_LIMITS.roccaforte);
        expect(p.roads.length).toBeLessThanOrEqual(PIECE_LIMITS.sentiero);
      }
    }
  }, 120_000);

  it('replay deterministico: stesso seed + stesse azioni ⇒ stato finale identico', () => {
    for (let i = 0; i < 12; i++) {
      const seed = `replay-${i}`;
      const prima = randomPlayout(seed);
      // Rigioca le stesse azioni da zero.
      let s = createGame({ seed, players: makePlayers(prima.state.players.length) });
      for (const a of prima.actions) {
        const r = applyAction(s, a);
        expect(r.ok, `replay rifiutato: ${a.type}`).toBe(true);
        if (r.ok) s = r.state;
      }
      expect(JSON.stringify(s)).toBe(JSON.stringify(prima.state));
    }
  }, 60_000);

  it('lo stato sopravvive a un round-trip JSON a metà partita', () => {
    const { state } = randomPlayout('roundtrip', { maxActions: 120 });
    const ripristinato = JSON.parse(JSON.stringify(state)) as GameState;
    // Le stesse azioni applicate ai due stati danno lo stesso risultato.
    const azione = { type: 'fineTurno', player: state.currentPlayer } as const;
    const r1 = applyAction(state, azione);
    const r2 = applyAction(ripristinato, azione);
    expect(r1.ok).toBe(r2.ok);
    if (r1.ok && r2.ok) {
      expect(JSON.stringify(r1.state)).toBe(JSON.stringify(r2.state));
    }
  });
});
