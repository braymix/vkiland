import { describe, expect, it } from 'vitest';
import {
  PIECE_LIMITS,
  WORLD_RESOURCES,
  applyAction,
  createGame,
  defaultConfig,
  getLegalActions,
  nextInt,
  whoMustAct,
  type WorldAction,
  type WorldGameState,
} from '../src';
import { COLORS } from './helpers';

/** Gioca a caso fra le mosse legali (con una preferenza per le costruzioni) fino alla fine. */
function playRandom(seed: string, n: number, maxSteps = 30000): { state: WorldGameState; log: WorldAction[] } {
  let s = createGame(
    defaultConfig({ seed, targetPoints: 8, players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, color: COLORS[i]! })) })
  );
  const log: WorldAction[] = [];
  let rng = s.rng;
  for (let step = 0; step < maxSteps && s.phase.type !== 'fine'; step++) {
    const actor = whoMustAct(s);
    let legal: WorldAction[] = getLegalActions(s, actor).filter((a) => a.type !== 'confermaScambio' && a.type !== 'annullaScambio');
    if (s.phase.type === 'azioni') {
      legal = policy(legal, s);
    }
    const [i, next] = nextInt(rng, legal.length);
    rng = next;
    const a = legal[i]!;
    const r = applyAction(s, a);
    if (!r.ok) throw new Error(`mossa legale respinta: ${JSON.stringify(a)} ${r.error.message}`);
    s = r.state;
    log.push(a);
    checkInvariants(s);
  }
  return { state: s, log };
}

/** Politica semplice ma sensata: costruisce per priorità, scambia col banco, si sposta, poi chiude. */
function policy(legal: WorldAction[], s: WorldGameState): WorldAction[] {
  for (const what of ['sala', 'citta', 'villaggio', 'mercato', 'porto'] as const) {
    const c = legal.filter((a) => a.type === 'costruisci' && a.what === what);
    if (c.length > 0) return c;
  }
  const roads = legal.filter((a) => a.type === 'costruisciStrada');
  const me = s.players[s.currentPlayer]!;
  const banks = legal.filter((a) => a.type === 'scambioBanca' && a.give !== 'argento' && me.hand[a.give] >= 4 && a.receive !== 'argento');
  if (banks.length > 0) return banks;
  const moves = legal.filter((a) => a.type === 'muovi');
  const toFree = moves.filter((a) => a.type === 'muovi' && s.territories[a.to]!.owner === null);
  if (toFree.length > 0) return toFree;
  if (roads.length > 0 && me.hand.legname > 1) return roads;
  if (moves.length > 0 && me.movePointsLeft > 1) return moves;
  return legal.filter((a) => a.type === 'fineTurno');
}

function checkInvariants(s: WorldGameState): void {
  for (const p of s.players) {
    for (const k of WORLD_RESOURCES) expect(p.hand[k]).toBeGreaterThanOrEqual(0);
    expect(p.movePointsLeft).toBeGreaterThanOrEqual(0);
    expect(s.territories[p.jarl]).toBeDefined();
  }
  for (const p of s.players) {
    const roads = Object.values(s.roads).filter((o) => o === p.id).length;
    expect(roads).toBeLessThanOrEqual(PIECE_LIMITS.strada);
    const own = Object.values(s.territories).filter((t) => t.owner === p.id);
    expect(own.filter((t) => t.building === 'villaggio').length).toBeLessThanOrEqual(PIECE_LIMITS.villaggio);
    expect(own.filter((t) => t.building === 'citta').length).toBeLessThanOrEqual(PIECE_LIMITS.citta);
    expect(own.filter((t) => t.building === 'sala').length).toBeLessThanOrEqual(PIECE_LIMITS.sala);
    expect(own.filter((t) => t.porto).length).toBeLessThanOrEqual(PIECE_LIMITS.porto);
    expect(own.filter((t) => t.mercato).length).toBeLessThanOrEqual(PIECE_LIMITS.mercato);
  }
  for (const t of Object.values(s.territories)) {
    // porto/mercato solo su territori posseduti; edificio <=> proprietario
    if (t.porto || t.mercato) expect(t.owner).not.toBeNull();
    expect(t.building === null).toBe(t.owner === null);
  }
}

describe('partite complete casuali-legali', () => {
  for (const [seed, n] of [['f1', 2], ['f2', 3], ['f3', 4], ['f4', 5], ['f5', 6]] as const) {
    it(`seed ${seed}, ${n} giocatori: terminano con un vincitore e rispettano gli invarianti`, () => {
      const { state } = playRandom(seed, n);
      expect(state.phase.type).toBe('fine');
    });
  }

  it('è deterministica: stesse mosse dallo stesso seed = stesso stato finale', () => {
    const a = playRandom('det', 3);
    let s = createGame(
      defaultConfig({ seed: 'det', targetPoints: 8, players: Array.from({ length: 3 }, (_, i) => ({ name: `P${i}`, color: COLORS[i]! })) })
    );
    for (const act of a.log) {
      const r = applyAction(s, act);
      if (!r.ok) throw new Error('replay fallito');
      s = r.state;
    }
    expect(JSON.parse(JSON.stringify(s))).toEqual(JSON.parse(JSON.stringify(a.state)));
  });

  it('applyAction non muta lo stato di partenza', () => {
    const s = createGame(defaultConfig({ seed: 'imm', players: [{ name: 'a', color: 'x' }, { name: 'b', color: 'y' }] }));
    const before = JSON.stringify(s);
    const a = getLegalActions(s, s.currentPlayer)[0]!;
    applyAction(s, a);
    expect(JSON.stringify(s)).toBe(before);
  });
});
