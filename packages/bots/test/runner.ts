/** Runner headless: fa giocare una partita completa a una squadra di bot. */
import {
  applyAction,
  createGame,
  getLegalActions,
  getPlayerView,
  type GameState,
  type PlayerColor,
  type PlayerId,
} from '@vikiland/engine';
import type { Bot } from '../src';

const COLORS: PlayerColor[] = ['rosso', 'blu', 'verde', 'giallo'];

export interface GameRunResult {
  winner: PlayerId | null;
  steps: number;
  state: GameState;
}

export function runBotGame(seed: string, bots: Bot[], maxSteps = 8000): GameRunResult {
  let state = createGame({
    seed,
    players: bots.map((b, i) => ({
      name: `${b.name}-${i}`,
      color: COLORS[i]!,
      isBot: true,
    })),
  });

  let steps = 0;
  while (state.phase.type !== 'gameOver' && steps < maxSteps) {
    // Trova il primo giocatore che ha mosse da fare (nello scarto simultaneo
    // l'ordine non conta; nelle altre fasi è uno solo).
    let acted = false;
    for (let pid = 0; pid < bots.length; pid++) {
      const legalActions = getLegalActions(state, pid);
      if (legalActions.length === 0) continue;
      const action = bots[pid]!.decide({
        view: getPlayerView(state, pid),
        legalActions,
        player: pid,
        rngSeed: `${seed}:${steps}`,
      });
      const res = applyAction(state, action);
      if (!res.ok) {
        throw new Error(
          `Bot ${bots[pid]!.name} (p${pid}) ha proposto una mossa illegale: ` +
            `${action.type} → ${res.error.code} (fase ${state.phase.type})`
        );
      }
      state = res.state;
      acted = true;
      steps++;
      break;
    }
    if (!acted) throw new Error(`Stallo: nessun bot ha mosse legali (fase ${state.phase.type})`);
  }

  return {
    winner: state.phase.type === 'gameOver' ? state.phase.winner : null,
    steps,
    state,
  };
}
