/**
 * Campo PERSONALIZZABILE: numero di deserti (tundra) libero e «campo libero»
 * (numero di caselle scelto a mano, isola compatta con topologia dalle caselle).
 */
import { describe, expect, it } from 'vitest';
import {
  GIGANTE_BOARD,
  MAX_CUSTOM_HEXES,
  MIN_CUSTOM_HEXES,
  boardTopoKey,
  buildTerrainPool,
  buildTokenPool,
  createGame,
  defaultDesertCount,
  getTopology,
  radiusForHexCount,
  resolveBoardSpecCustom,
} from '../src';
import { makePlayers, randomPlayout } from './helpers';
import { RESOURCES } from '../src';

describe('gigante: pescara di terreni corretta (pecore -1, mattoni +1)', () => {
  it('la gigante ha 6 lana, 7 pietra, 2 tundra e 37 caselle in totale', () => {
    const pool = GIGANTE_BOARD.terrainPool;
    const count = (t: string) => pool.filter((x) => x === t).length;
    expect(pool).toHaveLength(37);
    expect(count('lana')).toBe(6);
    expect(count('pietra')).toBe(7);
    expect(count('tundra')).toBe(2);
    // La produttiva totale resta 35 = i segnalini della gigante.
    expect(pool.filter((t) => t !== 'tundra')).toHaveLength(GIGANTE_BOARD.tokenPool.length);
  });
});

describe('buildTerrainPool / buildTokenPool', () => {
  it('rispetta totale, deserti e produttive; i segnalini non contengono mai il 7', () => {
    for (const total of [7, 19, 30, 37, 50, 61]) {
      for (const deserts of [1, 2, 3]) {
        const terrain = buildTerrainPool(total, deserts);
        expect(terrain).toHaveLength(total);
        expect(terrain.filter((t) => t === 'tundra')).toHaveLength(deserts);
        const tokens = buildTokenPool(total - deserts);
        expect(tokens).toHaveLength(total - deserts);
        expect(tokens.some((n) => n === 7)).toBe(false);
        expect(tokens.every((n) => n >= 2 && n <= 12)).toBe(true);
      }
    }
  });
});

describe('resolveBoardSpecCustom', () => {
  it('senza personalizzazioni ritorna lo spec preset identico', () => {
    const r = resolveBoardSpecCustom(8, 'gigante');
    expect(r.freeForm).toBe(false);
    expect(r.spec).toBe(GIGANTE_BOARD);
  });

  it('deserti = naturale non tocca il preset', () => {
    const r = resolveBoardSpecCustom(8, 'gigante', { desertCount: 2 });
    expect(r.spec).toBe(GIGANTE_BOARD);
  });

  it('deserti diversi dal naturale: stessa taglia, tundra aggiornata, segnalini a misura', () => {
    const r = resolveBoardSpecCustom(8, 'gigante', { desertCount: 4 });
    expect(r.freeForm).toBe(false);
    expect(r.spec.code).toBe(GIGANTE_BOARD.code);
    expect(r.spec.terrainPool).toHaveLength(37);
    expect(r.spec.terrainPool.filter((t) => t === 'tundra')).toHaveLength(4);
    expect(r.spec.tokenPool).toHaveLength(37 - 4);
  });

  it('campo libero: caselle e deserti su misura, forma libera, entro i limiti', () => {
    const r = resolveBoardSpecCustom(4, undefined, { hexCount: 25, desertCount: 3 });
    expect(r.freeForm).toBe(true);
    expect(r.spec.terrainPool).toHaveLength(25);
    expect(r.spec.terrainPool.filter((t) => t === 'tundra')).toHaveLength(3);
    expect(r.spec.tokenPool).toHaveLength(22);
    expect(r.spec.code).toBe(radiusForHexCount(25));
  });

  it('campo libero: clampa le caselle ai limiti e i deserti a ≥1', () => {
    const tooBig = resolveBoardSpecCustom(4, undefined, { hexCount: 999 });
    expect(tooBig.spec.terrainPool).toHaveLength(MAX_CUSTOM_HEXES);
    const tooSmall = resolveBoardSpecCustom(4, undefined, { hexCount: 1 });
    expect(tooSmall.spec.terrainPool).toHaveLength(MIN_CUSTOM_HEXES);
    const noDesert = resolveBoardSpecCustom(4, undefined, { hexCount: 19, desertCount: 0 });
    expect(noDesert.spec.terrainPool.filter((t) => t === 'tundra').length).toBeGreaterThanOrEqual(1);
  });
});

describe('createGame — campo libero', () => {
  it('genera esattamente hexCount caselle, con almeno un deserto e il Drago che parte da lì', () => {
    for (const hexCount of [11, 19, 28, 37, 44]) {
      const g = createGame({ seed: `libero-${hexCount}`, players: makePlayers(4), hexCount });
      expect(g.board.hexes).toHaveLength(hexCount);
      expect(g.config.boardShape).toBe('libera');
      const tundra = g.board.hexes.filter((h) => h.terrain === 'tundra');
      expect(tundra.length).toBeGreaterThanOrEqual(1);
      expect(g.board.dragonHex).toBe(tundra[0]!.id);
      expect(g.board.hexes.some((h) => h.token === 7)).toBe(false);
      // La topologia si ricava dalle caselle (firma), non dal codice.
      const key = boardTopoKey(g.config.boardRadius, g.config.boardShape, g.board.hexes);
      expect(typeof key).toBe('string');
      const topo = getTopology(key);
      expect(topo.hexKeys).toHaveLength(hexCount);
      // Ogni casella grown sta dentro il raggio geometrico salvato (canvas la contiene).
      for (const h of g.board.hexes) {
        const d = Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r));
        expect(d).toBeLessThanOrEqual(g.config.boardRadius);
      }
    }
  });

  it('numero esatto di caselle su un esagono pieno = esagono perfetto', () => {
    const g = createGame({ seed: 'pieno', players: makePlayers(4), hexCount: 19 });
    expect(g.board.hexes).toHaveLength(19);
    expect(g.config.boardRadius).toBe(2);
  });

  it('deserti scelti a mano su una taglia preset', () => {
    const g = createGame({ seed: 'des', players: makePlayers(4), boardSize: 'gigante', desertCount: 5 });
    expect(g.board.hexes).toHaveLength(37);
    expect(g.board.hexes.filter((h) => h.terrain === 'tundra')).toHaveLength(5);
  });

  it('partite complete su campo libero terminano rispettando gli invarianti', () => {
    // Taglie abbastanza ampie da ospitare i piazzamenti iniziali di 3 clan.
    for (const hexCount of [19, 25, 31, 37, 43]) {
      const deserts = defaultDesertCount(hexCount);
      const { spec } = resolveBoardSpecCustom(3, undefined, { hexCount, desertCount: deserts });
      const res = randomPlayout(`libero-play-${hexCount}`, {
        nPlayers: 3,
        maxActions: 12000,
        hexCount,
        desertCount: deserts,
      });
      expect(res.state.phase.type).toBe('gameOver');
      // Conservazione delle risorse: banca + mani = capienza per risorsa, mai negativi.
      for (const r of RESOURCES) {
        let total = res.state.bank[r];
        expect(res.state.bank[r]).toBeGreaterThanOrEqual(0);
        for (const p of res.state.players) {
          expect(p.resources[r]).toBeGreaterThanOrEqual(0);
          total += p.resources[r];
        }
        expect(total).toBe(spec.bankPerResource);
      }
    }
  });
});
