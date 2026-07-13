/**
 * Tre taglie di tavola: piccola (2–4, raggio 2, 19 caselle), GRANDE (5–6, la
 * gigante con 2 lati in meno, 29 caselle) e GIGANTE (7–8, esagono pieno raggio
 * 3, 37 caselle). La scelta esplicita vince sul numero di giocatori.
 */
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/game';
import { applyAction } from '../src/apply';
import { getLegalActions } from '../src/legal';
import {
  boardSpecForPlayers,
  resolveBoardSpec,
  BANK_PER_RESOURCE,
  BANK_PER_RESOURCE_GRANDE,
  BANK_PER_RESOURCE_GIGANTE,
  RESOURCES,
} from '../src/constants';
import { BOARD_CODE_SMALL, BOARD_CODE_GRANDE, BOARD_CODE_GIGANTE } from '../src/board/coords';
import { getTopology } from '../src/board/topology';
import { zeroResources } from '../src/resources';
import type { Action } from '../src/actions';
import type { GameState, PlayerConfig } from '../src/types';

const PALETTE = [
  '#c0392b', '#2e6fb7', '#3e8f4e', '#d9a525',
  '#8e44ad', '#e67e22', '#16a085', '#e84393',
];
function makePlayers(n: number): PlayerConfig[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `P${i}`,
    color: PALETTE[i]!,
    isBot: true,
    botLevel: 'normale' as const,
  }));
}

describe('selezione della tavola per numero di giocatori', () => {
  it('2–4 → piccola; 5–6 → grande; 7–8 → gigante', () => {
    expect(boardSpecForPlayers(2).code).toBe(BOARD_CODE_SMALL);
    expect(boardSpecForPlayers(4).code).toBe(BOARD_CODE_SMALL);
    expect(boardSpecForPlayers(5).code).toBe(BOARD_CODE_GRANDE);
    expect(boardSpecForPlayers(6).code).toBe(BOARD_CODE_GRANDE);
    expect(boardSpecForPlayers(7).code).toBe(BOARD_CODE_GIGANTE);
    expect(boardSpecForPlayers(8).code).toBe(BOARD_CODE_GIGANTE);
  });

  it('la scelta esplicita vince a qualsiasi numero di giocatori', () => {
    expect(resolveBoardSpec(2, 'grande').code).toBe(BOARD_CODE_GRANDE);
    expect(resolveBoardSpec(2, 'gigante').code).toBe(BOARD_CODE_GIGANTE);
    expect(resolveBoardSpec(6, 'gigante').code).toBe(BOARD_CODE_GIGANTE);
    expect(resolveBoardSpec(8, 'grande').code).toBe(BOARD_CODE_GRANDE);
    // Senza scelta: consigliata dal numero di giocatori.
    expect(resolveBoardSpec(3).code).toBe(BOARD_CODE_SMALL);
    expect(resolveBoardSpec(6).code).toBe(BOARD_CODE_GRANDE);
    expect(resolveBoardSpec(7).code).toBe(BOARD_CODE_GIGANTE);
  });
});

describe('tavola piccola (4 giocatori) invariata', () => {
  it('19 caselle, banca 19, 9 approdi, codice 2', () => {
    const g = createGame({ seed: 'small-4', players: makePlayers(4) });
    expect(g.config.boardRadius).toBe(BOARD_CODE_SMALL);
    expect(g.board.hexes).toHaveLength(19);
    expect(g.board.ports).toHaveLength(9);
    expect(g.bank.legname).toBe(BANK_PER_RESOURCE);
  });
});

describe('tavola grande (6 giocatori)', () => {
  it('30 caselle, 80 vertici/109 spigoli, banca 25, 10 approdi, 2 deserti', () => {
    const g = createGame({ seed: 'grande-6', players: makePlayers(6) });
    expect(g.config.boardRadius).toBe(BOARD_CODE_GRANDE);
    expect(g.board.hexes).toHaveLength(30);
    expect(g.board.ports).toHaveLength(10);
    expect(g.bank.ferro).toBe(BANK_PER_RESOURCE_GRANDE);
    const topo = getTopology(BOARD_CODE_GRANDE);
    expect(topo.vertices).toHaveLength(80);
    expect(topo.edges).toHaveLength(109);
    const tundra = g.board.hexes.filter((h) => h.terrain === 'tundra');
    expect(tundra).toHaveLength(2);
    expect(g.board.dragonHex).toBe(tundra[0]!.id);
    expect(g.board.hexes.filter((h) => h.token !== null)).toHaveLength(28);
    expect(tundra.every((h) => h.token === null)).toBe(true);
    expect(g.board.hexes.some((h) => h.token === 7)).toBe(false);
  });

  it('una partita completa a 6 giocatori (grande) termina, ed è un replay deterministico', () => {
    const seed = 'grande-6-game';
    const finalA = playOut(seed, 6);
    const finalB = playOut(seed, 6);
    expect(finalA.phase.type).toBe('gameOver');
    expect(finalB.turnNumber).toBe(finalA.turnNumber);
    expect(JSON.stringify(finalB.players.map((p) => p.villages))).toBe(
      JSON.stringify(finalA.players.map((p) => p.villages))
    );
  }, 30000);
});

describe('tavola gigante (8 giocatori)', () => {
  it('37 caselle, 96 vertici/132 spigoli, banca 30, 11 approdi, 2 deserti, codice 3', () => {
    const g = createGame({ seed: 'gigante-8', players: makePlayers(8) });
    expect(g.config.boardRadius).toBe(BOARD_CODE_GIGANTE);
    expect(g.board.hexes).toHaveLength(37);
    expect(g.board.ports).toHaveLength(11);
    expect(g.bank.ferro).toBe(BANK_PER_RESOURCE_GIGANTE);
    const topo = getTopology(BOARD_CODE_GIGANTE);
    expect(topo.vertices).toHaveLength(96);
    expect(topo.edges).toHaveLength(132);
    const tundra = g.board.hexes.filter((h) => h.terrain === 'tundra');
    expect(tundra).toHaveLength(2);
    expect(g.board.hexes.filter((h) => h.token !== null)).toHaveLength(35);
    expect(g.board.hexes.some((h) => h.token === 7)).toBe(false);
  });

  it('una partita completa a 8 giocatori (gigante) termina', () => {
    const final = playOut('gigante-8-game', 8);
    expect(final.phase.type).toBe('gameOver');
    if (final.phase.type === 'gameOver') {
      expect(final.phase.winner).toBeGreaterThanOrEqual(0);
      expect(final.phase.winner).toBeLessThan(8);
    }
  }, 45000);
});

/** Gioca random-legale (deterministico dal seme) fino alla fine. */
function playOut(seed: string, players: number): GameState {
  let state = createGame({ seed, players: makePlayers(players) });
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
