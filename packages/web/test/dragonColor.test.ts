/** Il Drago ricorda CHI lo ha spostato (per poterlo colorare del suo colore). */
import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  getLegalActions,
  getPlayerView,
  type Action,
  type GameState,
  type PlayerConfig,
} from '@vikiland/engine';
import { createBot } from '@vikiland/bots';

const players: PlayerConfig[] = [
  { name: 'A', color: '#c0392b', isBot: true, botLevel: 'normale' },
  { name: 'B', color: '#2e6fb7', isBot: true, botLevel: 'normale' },
  { name: 'C', color: '#3e8f4e', isBot: true, botLevel: 'normale' },
];

/** Fa giocare i bot finché qualcuno non deve spostare il Drago (un 7 prima o poi esce). */
function playUntilDragonMove(seed: string): GameState | null {
  let state = createGame({ seed, players, avoidAdjacent68: true, targetGloryPoints: 10 });
  const bots = players.map(() => createBot('normale'));
  for (let g = 0; g < 4000 && state.phase.type !== 'gameOver'; g++) {
    if (state.phase.type === 'moveDragon') return state;
    let actor: number;
    if (state.phase.type === 'discard') {
      const md = state.phase.mustDiscard;
      actor = state.players.find((p) => md[p.id])!.id;
    } else {
      actor = state.currentPlayer;
    }
    const legal = getLegalActions(state, actor);
    if (legal.length === 0) break;
    const action = bots[actor]!.decide({
      view: getPlayerView(state, actor),
      legalActions: legal,
      player: actor,
      rngSeed: `${seed}:${g}:${actor}`,
    });
    const res = applyAction(state, action);
    if (!res.ok) break;
    state = res.state;
  }
  return null;
}

describe('Drago: colore di chi lo sposta', () => {
  it('all’inizio nessuno ha mosso il Drago (anche nella vista)', () => {
    const state = createGame({ seed: 'drago-init', players, avoidAdjacent68: true, targetGloryPoints: 10 });
    expect(state.board.dragonMovedBy).toBeNull();
    expect(getPlayerView(state, 'spettatore').board.dragonMovedBy).toBeNull();
  });

  it('dopo muoviDrago, dragonMovedBy = chi lo ha spostato ed è esposto nella vista', () => {
    const state = playUntilDragonMove('drago-seed-7');
    expect(state).not.toBeNull();
    if (!state) return;
    const mover = state.currentPlayer;
    const move = getLegalActions(state, mover).find((m): m is Action => m.type === 'muoviDrago');
    expect(move).toBeDefined();
    const res = applyAction(state, move!);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.board.dragonMovedBy).toBe(mover);
    // La vista filtrata lo riporta: è ciò che usa il renderer per colorarlo.
    expect(getPlayerView(res.state, 'spettatore').board.dragonMovedBy).toBe(mover);
  });
});
