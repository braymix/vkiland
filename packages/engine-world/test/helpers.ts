import {
  applyAction,
  createGame,
  defaultConfig,
  getDefaultAction,
  linkId,
  type ResourceMap,
  type WorldAction,
  type WorldGameState,
} from '../src';

export const COLORS = ['#c33', '#36c', '#3a3', '#cc3', '#a3a', '#3cc'];

export function newGame(n = 2, seed = 'test', extra: Partial<Parameters<typeof defaultConfig>[0]> = {}): WorldGameState {
  return createGame(
    defaultConfig({
      seed,
      players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, color: COLORS[i]! })),
      ...extra,
    })
  );
}

/** Esegue un'azione che DEVE essere legale. */
export function act(state: WorldGameState, action: WorldAction): WorldGameState {
  const r = applyAction(state, action);
  if (!r.ok) throw new Error(`${action.type}: ${r.error.code} — ${r.error.message}`);
  return r.state;
}

/** Porta a termine il setup con le mosse di default. */
export function finishSetup(state: WorldGameState): WorldGameState {
  let s = state;
  let guard = 0;
  while (s.phase.type === 'setup') {
    const a = getDefaultAction(s);
    if (!a) throw new Error('nessuna mossa di setup');
    s = act(s, a);
    if (++guard > 200) throw new Error('setup infinito');
  }
  return s;
}

/**
 * Stato «pulito» in fase azioni: nessun edificio, nessuna strada, mani vuote,
 * turno del giocatore 0 col Jarl dove si vuole.
 */
export function blank(n = 2, jarl = 'italia', seed = 'blank'): WorldGameState {
  const s = newGame(n, seed);
  s.phase = { type: 'azioni' };
  s.currentPlayer = 0;
  s.turnNumber = 1;
  s.setupIndex = s.setupOrder.length;
  for (const p of s.players) {
    p.jarl = jarl;
    p.movePointsLeft = 4;
    p.tollsPaidThisTurn = [jarl];
  }
  return s;
}

export function give(s: WorldGameState, pid: number, res: Partial<ResourceMap>): void {
  for (const [k, v] of Object.entries(res)) s.players[pid]!.hand[k as keyof ResourceMap] += v as number;
}

export function own(
  s: WorldGameState,
  pid: number,
  territory: string,
  building: 'villaggio' | 'citta' | 'sala' = 'villaggio'
): void {
  const t = s.territories[territory]!;
  t.owner = pid;
  t.building = building;
}

export function road(s: WorldGameState, pid: number, a: string, b: string): void {
  s.roads[linkId(a, b)] = pid;
}

export const ALL_FIVE: Partial<ResourceMap> = { legname: 10, pietra: 10, lana: 10, orzo: 10, ferro: 10, argento: 10 };
