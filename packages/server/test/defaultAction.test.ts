/** La mossa di default del timer deve SEMPRE sbloccare la partita. */
import { describe, expect, it } from 'vitest';
import {
  applyAction,
  cloneState,
  createGame,
  totalResources,
  type GameState,
} from '@vikiland/engine';
import { defaultActionFor } from '../src/defaultAction';

function newGame(): GameState {
  return createGame({
    seed: 'default-action-test',
    players: [
      { name: 'A', color: 'rosso', isBot: false },
      { name: 'B', color: 'blu', isBot: false },
    ],
    avoidAdjacent68: true,
    targetGloryPoints: 10,
  });
}

describe('defaultActionFor', () => {
  it('completa da solo il setup e poi tira i dadi', () => {
    let state = newGame();
    for (let guard = 0; guard < 50 && state.phase.type === 'setup'; guard++) {
      const actor = state.setupOrder[state.setupIndex]!;
      const action = defaultActionFor(state, actor);
      expect(action).not.toBeNull();
      const res = applyAction(state, action!);
      expect(res.ok).toBe(true);
      if (res.ok) state = res.state;
    }
    expect(state.phase.type).toBe('preRoll');
    expect(defaultActionFor(state, state.currentPlayer)?.type).toBe('tiraDadi');
  });

  it('in fase main chiude il turno', () => {
    const state = cloneState(newGame());
    state.phase = { type: 'main' };
    state.rolledThisTurn = true;
    expect(defaultActionFor(state, state.currentPlayer)?.type).toBe('fineTurno');
  });

  it('scarta in modo avido esattamente il numero richiesto', () => {
    const state = cloneState(newGame());
    state.phase = { type: 'discard', mustDiscard: { 0: 3 } };
    state.players[0]!.resources = { legname: 5, pietra: 0, lana: 2, orzo: 0, ferro: 0 };
    const action = defaultActionFor(state, 0);
    expect(action?.type).toBe('scarta');
    if (action?.type === 'scarta') {
      expect(totalResources(action.resources)).toBe(3);
      const res = applyAction(state, action);
      expect(res.ok).toBe(true);
    }
  });

  it('ritira la propria offerta e rifiuta quelle altrui', () => {
    const base = cloneState(newGame());
    base.phase = { type: 'main' };
    base.currentPlayer = 0;
    base.rolledThisTurn = true;
    base.players[0]!.resources = { legname: 1, pietra: 0, lana: 0, orzo: 0, ferro: 0 };
    base.pendingTrade = {
      id: 1,
      from: 0,
      give: { legname: 1, pietra: 0, lana: 0, orzo: 0, ferro: 0 },
      receive: { legname: 0, pietra: 1, lana: 0, orzo: 0, ferro: 0 },
      to: null,
      responses: {},
    };
    expect(defaultActionFor(base, 0)?.type).toBe('annullaScambio');
    const refuse = defaultActionFor(base, 1);
    expect(refuse?.type).toBe('rispondiScambio');
    if (refuse?.type === 'rispondiScambio') expect(refuse.accept).toBe(false);
  });
});
