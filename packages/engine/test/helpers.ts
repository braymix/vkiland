/** Utilità condivise dai test del motore. */
import { expect } from 'vitest';
import type {
  Action,
  GameState,
  LegalMove,
  PlayerConfig,
  PlayerId,
  Resource,
  ResourceCount,
} from '../src';
import {
  RESOURCES,
  applyAction,
  cloneState,
  createGame,
  getLegalActions,
  nextInt,
  seedRng,
  zeroResources,
} from '../src';

const NAMES = ['Bjorn', 'Astrid', 'Leif', 'Sigrid'];
const COLORS = ['rosso', 'blu', 'verde', 'giallo'] as const;

export function makePlayers(n: number): PlayerConfig[] {
  return Array.from({ length: n }, (_, i) => ({
    name: NAMES[i]!,
    color: COLORS[i]!,
    isBot: false,
  }));
}

export function newGame(n = 4, seed = 'seme-di-test'): GameState {
  return createGame({ seed, players: makePlayers(n) });
}

/** applyAction che lancia in caso di errore: per i percorsi felici dei test. */
export function apply(state: GameState, action: Action): GameState {
  const res = applyAction(state, action);
  if (!res.ok) {
    throw new Error(
      `Azione rifiutata nel test: ${action.type} → ${res.error.code} (${res.error.message})`
    );
  }
  return res.state;
}

export function applyOk(state: GameState, action: Action) {
  const res = applyAction(state, action);
  if (!res.ok) {
    throw new Error(`Azione rifiutata nel test: ${action.type} → ${res.error.code}`);
  }
  return res;
}

/** Asserisce che un'azione venga bocciata con il codice atteso. */
export function expectError(state: GameState, action: Action, code: string): void {
  const res = applyAction(state, action);
  expect(res.ok, `attesa bocciatura ${code} per ${action.type}`).toBe(false);
  if (!res.ok) expect(res.error.code).toBe(code);
}

/** Clona lo stato e applica una modifica manuale (chirurgia per i test). */
export function mut(state: GameState, fn: (s: GameState) => void): GameState {
  const s = cloneState(state);
  fn(s);
  return s;
}

/** Sposta risorse dalla banca a un giocatore (per preparare scenari). */
export function give(state: GameState, pid: PlayerId, rc: Partial<ResourceCount>): GameState {
  return mut(state, (s) => {
    for (const r of RESOURCES) {
      const n = rc[r] ?? 0;
      s.players[pid]!.resources[r] += n;
      s.bank[r] -= n;
    }
  });
}

/** Azzeramento delle mani (le risorse tornano in banca). */
export function clearHands(state: GameState): GameState {
  return mut(state, (s) => {
    for (const p of s.players) {
      for (const r of RESOURCES) {
        s.bank[r] += p.resources[r];
        p.resources[r] = 0;
      }
    }
  });
}

/** Completa il setup scegliendo sempre la prima mossa legale (deterministico). */
export function autoSetup(state: GameState): GameState {
  let s = state;
  while (s.phase.type === 'setup') {
    const pid = s.setupOrder[s.setupIndex]!;
    const moves = getLegalActions(s, pid);
    const concrete = moves.find(
      (m): m is Action =>
        m.type === 'piazzaVillaggioIniziale' || m.type === 'piazzaSentieroIniziale'
    );
    if (!concrete) throw new Error('Setup bloccato: nessuna mossa legale');
    s = apply(s, concrete);
  }
  return s;
}

/** Porta lo stato in fase main del giocatore corrente, senza tirare i dadi. */
export function toMain(state: GameState): GameState {
  return mut(state, (s) => {
    s.phase = { type: 'main' };
    s.rolledThisTurn = true;
  });
}

/** Scarto deterministico: sempre dalle risorse più abbondanti. */
export function greedyDiscard(state: GameState, pid: PlayerId, amount: number): ResourceCount {
  const out = zeroResources();
  const hand = { ...state.players[pid]!.resources };
  for (let i = 0; i < amount; i++) {
    let best: Resource = RESOURCES[0]!;
    for (const r of RESOURCES) if (hand[r] > hand[best]) best = r;
    out[best] += 1;
    hand[best] -= 1;
  }
  return out;
}

export interface PlayoutResult {
  state: GameState;
  actions: Action[];
  finished: boolean;
}

/**
 * Partita completa con mosse casuali-legali (leggermente orientate alla
 * costruzione per garantire la terminazione). Registra le azioni per il replay.
 */
export function randomPlayout(
  seed: string,
  opts: { nPlayers?: number; maxActions?: number } = {}
): PlayoutResult {
  const maxActions = opts.maxActions ?? 5000;
  let rng = seedRng(`playout:${seed}`);
  let nPlayers = opts.nPlayers ?? 0;
  if (nPlayers === 0) {
    const [n, r] = nextInt(rng, 3);
    rng = r;
    nPlayers = 2 + n;
  }
  let state = createGame({ seed, players: makePlayers(nPlayers) });
  const actions: Action[] = [];

  while (state.phase.type !== 'gameOver' && actions.length < maxActions) {
    const all: LegalMove[] = [];
    for (const p of state.players) all.push(...getLegalActions(state, p.id));
    const concrete: Action[] = [];
    for (const m of all) {
      if (m.type === 'scartaDescr') {
        concrete.push({
          type: 'scarta',
          player: m.player,
          resources: greedyDiscard(state, m.player, m.amount),
        });
      } else if (m.type === 'proponiScambioDescr') {
        continue; // gli scambi tra giocatori sono coperti dai test dedicati
      } else {
        concrete.push(m);
      }
    }
    if (concrete.length === 0) {
      throw new Error(`Stallo: nessuna mossa legale (fase ${state.phase.type})`);
    }
    const builds = concrete.filter(
      (a) =>
        a.type === 'costruisciSentiero' ||
        a.type === 'costruisciVillaggio' ||
        a.type === 'costruisciRoccaforte' ||
        a.type === 'compraCartaSaga'
    );
    let pool = concrete;
    if (builds.length > 0) {
      const [coin, r] = nextInt(rng, 2);
      rng = r;
      if (coin === 1) pool = builds;
    }
    const [idx, r2] = nextInt(rng, pool.length);
    rng = r2;
    state = apply(state, pool[idx]!);
    actions.push(pool[idx]!);
  }

  return { state, actions, finished: state.phase.type === 'gameOver' };
}

/** Invariante fondamentale: banca + mani = 19 per ogni risorsa; mai negativi. */
export function expectResourceInvariants(state: GameState): void {
  for (const r of RESOURCES) {
    let total = state.bank[r];
    expect(state.bank[r]).toBeGreaterThanOrEqual(0);
    for (const p of state.players) {
      expect(p.resources[r]).toBeGreaterThanOrEqual(0);
      total += p.resources[r];
    }
    expect(total).toBe(19);
  }
}
