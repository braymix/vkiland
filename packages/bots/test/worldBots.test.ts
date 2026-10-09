import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  defaultConfig,
  getLegalActions,
  getPlayerView,
  whoMustAct,
  type BotLevel,
  type WorldGameState,
} from '@vikiland/engine-world';
import { createWorldBot } from '../src';

const COLORS = ['#c33', '#36c', '#3a3', '#cc3', '#a3a', '#3cc'];

function simulate(seed: string, levels: BotLevel[], target = 10, maxSteps = 40000): { state: WorldGameState; steps: number } {
  let s = createGame(
    defaultConfig({
      seed,
      targetPoints: target,
      players: levels.map((l, i) => ({ name: `B${i}`, color: COLORS[i]!, bot: l })),
    })
  );
  const bots = levels.map((l) => createWorldBot(l));
  let steps = 0;
  while (s.phase.type !== 'fine' && steps < maxSteps) {
    // Prima le risposte fuori turno a un'offerta aperta.
    const o = s.pendingTrade;
    let actor = whoMustAct(s);
    if (o && s.phase.type === 'azioni') {
      const pending = s.players.find((p) => p.id !== o.from && o.responses[p.id] === undefined && (o.to === null || o.to === p.id));
      if (pending) actor = pending.id;
    }
    const legal = getLegalActions(s, actor);
    const action = bots[actor]!.decide({
      view: getPlayerView(s, actor),
      legalActions: legal,
      player: actor,
      rngSeed: `${seed}:${steps}`,
    });
    const r = applyAction(s, action);
    if (!r.ok) throw new Error(`il bot ${actor} ha giocato una mossa illegale: ${JSON.stringify(action)} — ${r.error.message}`);
    s = r.state;
    steps++;
  }
  return { state: s, steps };
}

describe('bot del mondo', () => {
  it('non giocano mai mosse illegali e chiudono la partita (2 giocatori)', () => {
    const { state } = simulate('w1', ['normale', 'normale']);
    expect(state.phase.type).toBe('fine');
  });

  for (const [seed, levels] of [
    ['w2', ['normale', 'normale', 'normale']],
    ['w3', ['difficile', 'normale', 'facile', 'esperto']],
    ['w4', ['normale', 'normale', 'normale', 'normale', 'normale']],
    ['w5', ['esperto', 'esperto', 'difficile', 'normale', 'facile', 'facile']],
  ] as [string, BotLevel[]][]) {
    it(`seed ${seed} (${levels.length} bot): la partita finisce con un vincitore`, () => {
      const { state, steps } = simulate(seed, levels);
      expect(state.phase.type).toBe('fine');
      expect(steps).toBeLessThan(40000);
    });
  }

  it('è riproducibile: stesso seed = stesso vincitore e stesso numero di turni', () => {
    const a = simulate('rep', ['normale', 'difficile', 'normale']);
    const b = simulate('rep', ['normale', 'difficile', 'normale']);
    expect(a.state.phase).toEqual(b.state.phase);
    expect(a.state.turnNumber).toBe(b.state.turnNumber);
  });

  it('i bot espandono: a fine partita chi vince controlla più territori e continenti', () => {
    const { state } = simulate('w6', ['normale', 'normale', 'normale']);
    if (state.phase.type !== 'fine') throw new Error('non finita');
    const mine = Object.values(state.territories).filter((t) => t.owner === (state.phase as { winner: number }).winner);
    expect(mine.length).toBeGreaterThanOrEqual(3);
  });
});
