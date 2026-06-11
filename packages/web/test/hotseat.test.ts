/** Test della logica hot-seat: a quale umano va il dispositivo. */
import { describe, expect, it } from 'vitest';
import {
  applyAction,
  cloneState,
  createGame,
  getLegalActions,
  type Action,
  type GameState,
  type PlayerConfig,
} from '@vikiland/engine';
import { nextHumanActor } from '../src/game/hotseat';

function player(name: string, isBot: boolean): PlayerConfig {
  const colors = ['rosso', 'blu', 'verde', 'giallo'] as const;
  return { name, color: colors[name.length % 4]!, isBot, botLevel: 'facile' };
}

function newGame(flags: boolean[]): GameState {
  return createGame({
    seed: 'hotseat-test',
    players: flags.map((isBot, i) => ({ ...player(`P${i}`, isBot), color: (['rosso', 'blu', 'verde', 'giallo'] as const)[i]! })),
    avoidAdjacent68: true,
    targetGloryPoints: 10,
  });
}

/** Applica la prima mossa legale concreta dell'attore di setup. */
function playFirstLegal(state: GameState, pid: number): GameState {
  const move = getLegalActions(state, pid).find(
    (m): m is Action => m.type !== 'scartaDescr' && m.type !== 'proponiScambioDescr'
  );
  expect(move).toBeDefined();
  const res = applyAction(state, move!);
  expect(res.ok).toBe(true);
  return res.ok ? res.state : state;
}

describe('nextHumanActor — fase di setup', () => {
  it('con 2 umani il dispositivo segue la serpentina, senza handoff inutili', () => {
    let state = newGame([false, false]);
    // L'attore del setup è sempre setupOrder[setupIndex].
    while (state.phase.type === 'setup') {
      const expected = state.setupOrder[state.setupIndex]!;
      expect(nextHumanActor(state, [0, 1], expected)).toBe(expected);
      // Da un viewpoint diverso, il prossimo attore resta quello del setup.
      const other = expected === 0 ? 1 : 0;
      expect(nextHumanActor(state, [0, 1], other)).toBe(expected);
      state = playFirstLegal(state, expected);
    }
    expect(state.phase.type).toBe('preRoll');
  });

  it('con 1 umano e 1 bot non chiede mai il passaggio durante le mosse del bot', () => {
    let state = newGame([false, true]);
    while (state.phase.type === 'setup') {
      const actor = state.setupOrder[state.setupIndex]!;
      // Quando muove il bot, nessun umano deve agire ⇒ il viewpoint resta fermo.
      expect(nextHumanActor(state, [0], 0)).toBe(actor === 0 ? 0 : null);
      state = playFirstLegal(state, actor);
    }
  });
});

describe('nextHumanActor — scarti simultanei sul 7', () => {
  function discardState(): GameState {
    const state = cloneState(newGame([false, true, false]));
    // Stato costruito a mano: i giocatori 0 e 2 devono scartare.
    state.phase = { type: 'discard', mustDiscard: { 0: 2, 2: 2 } };
    for (const pid of [0, 2]) {
      state.players[pid]!.resources = { legname: 4, pietra: 0, lana: 0, orzo: 0, ferro: 0 };
    }
    return state;
  }

  it('serializza gli scarti: prima chi guarda lo schermo, poi gli altri', () => {
    const state = discardState();
    // Chi sta guardando lo schermo e deve scartare ha la precedenza.
    expect(nextHumanActor(state, [0, 2], 2)).toBe(2);
    expect(nextHumanActor(state, [0, 2], 0)).toBe(0);
    // Dopo lo scarto del giocatore 0, tocca al 2 (handoff).
    const after = applyAction(state, {
      type: 'scarta',
      player: 0,
      resources: { legname: 2, pietra: 0, lana: 0, orzo: 0, ferro: 0 },
    });
    expect(after.ok).toBe(true);
    if (after.ok) expect(nextHumanActor(after.state, [0, 2], 0)).toBe(2);
  });
});

describe('nextHumanActor — offerte di scambio', () => {
  function tradeState(): GameState {
    const state = cloneState(newGame([false, false, true]));
    // Stato in fase main col giocatore 0 proponente di un'offerta aperta.
    state.phase = { type: 'main' };
    state.currentPlayer = 0;
    state.rolledThisTurn = true;
    state.players[0]!.resources = { legname: 2, pietra: 0, lana: 0, orzo: 0, ferro: 0 };
    state.players[1]!.resources = { legname: 0, pietra: 1, lana: 0, orzo: 0, ferro: 0 };
    state.pendingTrade = {
      id: 1,
      from: 0,
      give: { legname: 1, pietra: 0, lana: 0, orzo: 0, ferro: 0 },
      receive: { legname: 0, pietra: 1, lana: 0, orzo: 0, ferro: 0 },
      to: null,
      responses: {},
    };
    return state;
  }

  it("prima risponde l'altro umano, poi il proponente conferma", () => {
    const state = tradeState();
    // Anche se il proponente (viewpoint) ha annulla/conferma tra le mosse,
    // il dispositivo va prima a chi deve rispondere.
    expect(nextHumanActor(state, [0, 1], 0)).toBe(1);
    const answered = cloneState(state);
    answered.pendingTrade!.responses[1] = 'accettata';
    expect(nextHumanActor(answered, [0, 1], 1)).toBe(0);
  });
});

describe('nextHumanActor — fine partita', () => {
  it('a partita conclusa nessuno deve agire', () => {
    const state = cloneState(newGame([false, false]));
    state.phase = { type: 'gameOver', winner: 0 };
    expect(nextHumanActor(state, [0, 1], 0)).toBeNull();
  });
});
