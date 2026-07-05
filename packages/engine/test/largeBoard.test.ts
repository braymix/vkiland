/** Tavola GRANDE per 5–6 giocatori (raggio 3, 37 caselle); piccola per 2–4. */
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/game';
import { applyAction } from '../src/apply';
import { getLegalActions } from '../src/legal';
import {
  boardSpecForPlayers,
  BANK_PER_RESOURCE,
  BANK_PER_RESOURCE_LARGE,
  RESOURCES,
} from '../src/constants';
import { getTopology } from '../src/board/topology';
import { zeroResources } from '../src/resources';
import type { Action } from '../src/actions';
import type { GameState, PlayerConfig } from '../src/types';

const PALETTE = ['#c0392b', '#2e6fb7', '#3e8f4e', '#d9a525', '#8e44ad', '#e67e22'];
function makePlayers(n: number): PlayerConfig[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `P${i}`,
    color: PALETTE[i]!,
    isBot: true,
    botLevel: 'normale' as const,
  }));
}

describe('selezione della tavola per numero di giocatori', () => {
  it('2–4 → piccola (raggio 2); 5–6 → grande (raggio 3)', () => {
    expect(boardSpecForPlayers(2).radius).toBe(2);
    expect(boardSpecForPlayers(4).radius).toBe(2);
    expect(boardSpecForPlayers(5).radius).toBe(3);
    expect(boardSpecForPlayers(6).radius).toBe(3);
  });
});

describe('tavola piccola (4 giocatori) invariata', () => {
  it('19 caselle, banca 19, 9 approdi, raggio 2', () => {
    const g = createGame({ seed: 'small-4', players: makePlayers(4) });
    expect(g.config.boardRadius).toBe(2);
    expect(g.board.hexes).toHaveLength(19);
    expect(g.board.ports).toHaveLength(9);
    expect(g.bank.legname).toBe(BANK_PER_RESOURCE);
  });
});

describe('tavola grande (6 giocatori)', () => {
  it('37 caselle, 96 vertici/132 spigoli, banca 30, 11 approdi, 2 deserti', () => {
    const g = createGame({ seed: 'large-6', players: makePlayers(6) });
    expect(g.config.boardRadius).toBe(3);
    expect(g.board.hexes).toHaveLength(37);
    expect(g.board.ports).toHaveLength(11);
    expect(g.bank.ferro).toBe(BANK_PER_RESOURCE_LARGE);
    const topo = getTopology(3);
    expect(topo.vertices).toHaveLength(96);
    expect(topo.edges).toHaveLength(132);
    // DUE tundra (deserti); il Drago parte dalla prima. Segnalini sulle altre 35.
    const tundra = g.board.hexes.filter((h) => h.terrain === 'tundra');
    expect(tundra).toHaveLength(2);
    expect(g.board.dragonHex).toBe(tundra[0]!.id);
    expect(g.board.hexes.filter((h) => h.token !== null)).toHaveLength(35);
    // Le tundra non hanno segnalino; nessun 7 (è il Drago).
    expect(tundra.every((h) => h.token === null)).toBe(true);
    expect(g.board.hexes.some((h) => h.token === 7)).toBe(false);
  });

  it('una partita completa a 6 giocatori termina, ed è un replay deterministico', () => {
    const seed = 'large-6-game';
    const finalA = playOut(seed);
    const finalB = playOut(seed);
    expect(finalA.phase.type).toBe('gameOver');
    if (finalA.phase.type === 'gameOver') {
      expect(finalA.phase.winner).toBeGreaterThanOrEqual(0);
      expect(finalA.phase.winner).toBeLessThan(6);
    }
    // Determinismo: stesso seme ⇒ stesso vincitore e stesso numero di turni.
    expect(finalB.turnNumber).toBe(finalA.turnNumber);
    expect(JSON.stringify(finalB.players.map((p) => p.villages))).toBe(
      JSON.stringify(finalA.players.map((p) => p.villages))
    );
  }, 30000);
});

/** Gioca random-legale (deterministico dal seme) fino alla fine. */
function playOut(seed: string): GameState {
  let state = createGame({ seed, players: makePlayers(6) });
  let rng = 12345;
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };
  for (let g = 0; g < 20000 && state.phase.type !== 'gameOver'; g++) {
    // Scarto simultaneo sul 7: costruisco una mossa concreta dal descrittore.
    if (state.phase.type === 'discard') {
      const md = state.phase.mustDiscard;
      const actor = state.players.find((p) => md[p.id])!.id;
      let left = md[actor]!;
      const have = state.players[actor]!.resources;
      const toDiscard = zeroResources();
      for (const r of RESOURCES) {
        const take = Math.min(left, have[r]);
        toDiscard[r] = take;
        left -= take;
      }
      const res = applyAction(state, { type: 'scarta', player: actor, resources: toDiscard });
      if (!res.ok) break;
      state = res.state;
      continue;
    }
    const legal = getLegalActions(state, state.currentPlayer);
    const concrete = legal.filter(
      (m): m is Action => m.type !== 'scartaDescr' && m.type !== 'proponiScambioDescr'
    );
    if (concrete.length === 0) break;
    const move = concrete[Math.floor(rand() * concrete.length)]!;
    const res = applyAction(state, move);
    if (!res.ok) break;
    state = res.state;
  }
  return state;
}
