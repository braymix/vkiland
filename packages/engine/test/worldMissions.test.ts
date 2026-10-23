/**
 * Missioni del Mondo: speculari a quelle Classiche (partita casuale da
 * vincere contro bot), ma su una mappa del Mondo e con ricompense che possono
 * dare anche eroi rari/leggendari (farmabili SOLO lì). Logica PURA, stessa
 * copertura delle missioni Classiche.
 */
import { describe, expect, it } from 'vitest';
import {
  generateWorldMission,
  generateWorldMissionBoard,
  ensureWorldMissions,
  completeWorldMission,
  missionsExpired,
  sanitizeProgression,
  isHeroUnlocked,
  MISSIONS_COUNT,
  MISSION_REWARD_CHESTS,
  MISSION_FACILE_PROB,
  WORLD_MISSION_TARGET_POINTS,
  UNCOMMON_HERO_IDS,
  RARE_HERO_IDS,
  LEGENDARY_HERO_IDS,
  FRAGMENTS_BY_RARITY,
  type WorldProgression,
  type WorldMission,
} from '../src/index';

const MAP_IDS = ['mondo', 'europa', 'italia', 'milano'];

/** Generatore deterministico: restituisce in sequenza i valori dati (poi 0). */
const seqRand = (values: number[]): (() => number) => {
  let i = 0;
  return () => values[i++] ?? 0;
};

let idCounter = 0;
const makeId = () => `id-${idCounter++}`;

describe('generazione delle missioni del Mondo', () => {
  it('una bacheca ha MISSIONS_COUNT missioni con campi validi', () => {
    const board = generateWorldMissionBoard(1000, makeId, MAP_IDS);
    expect(board.missions).toHaveLength(MISSIONS_COUNT);
    expect(board.generatedAt).toBe(1000);
    for (const m of board.missions) {
      expect(['facile', 'normale']).toContain(m.rarity);
      expect(MAP_IDS).toContain(m.mapId);
      expect(m.targetPoints).toBe(WORLD_MISSION_TARGET_POINTS);
      expect(m.completed).toBeUndefined();
    }
  });

  it('la rarità dipende dalla soglia, come nella Classica', () => {
    const facile = generateWorldMission(makeId, MAP_IDS, seqRand([MISSION_FACILE_PROB - 0.01]));
    expect(facile.rarity).toBe('facile');
    expect(facile.botCount).toBe(2);
    const normale = generateWorldMission(makeId, MAP_IDS, seqRand([MISSION_FACILE_PROB + 0.01]));
    expect(normale.rarity).toBe('normale');
    expect(normale.botCount).toBe(3);
  });

  it('la mappa è scelta tra quelle passate', () => {
    const m = generateWorldMission(makeId, ['solo-una'], () => 0.5);
    expect(m.mapId).toBe('solo-una');
  });
});

describe('ensureWorldMissions', () => {
  it('genera una bacheca se assente e la lascia invariata se valida', () => {
    const { progression, changed } = ensureWorldMissions({}, 1000, makeId, MAP_IDS);
    expect(changed).toBe(true);
    expect(progression.missions?.missions).toHaveLength(MISSIONS_COUNT);
    const again = ensureWorldMissions(progression, 1000, makeId, MAP_IDS);
    expect(again.changed).toBe(false);
  });

  it('rigenera una bacheca scaduta (riusa missionsExpired, condiviso con la Classica)', () => {
    const board = generateWorldMissionBoard(0, makeId, MAP_IDS);
    expect(missionsExpired(board, board.generatedAt + board.refreshMs + 1)).toBe(true);
    const prog: WorldProgression = { missions: board };
    const after = board.generatedAt + board.refreshMs + 1;
    const { progression, changed } = ensureWorldMissions(prog, after, makeId, MAP_IDS);
    expect(changed).toBe(true);
    expect(progression.missions).not.toBe(board);
  });
});

describe('completeWorldMission', () => {
  const mission = (over: Partial<WorldMission> = {}): WorldMission => ({
    id: 'm1',
    rarity: 'facile',
    botLevel: 'facile',
    botCount: 2,
    seed: 'world-mission-x',
    mapId: 'mondo',
    targetPoints: WORLD_MISSION_TARGET_POINTS,
    ...over,
  });

  it('facile → 1 cassa, normale → 2 casse', () => {
    const progFacile: WorldProgression = {
      missions: { missions: [mission()], generatedAt: 0, refreshMs: 1000 },
    };
    const resFacile = completeWorldMission(progFacile, 'm1', () => 0.5);
    expect(resFacile!.rewards).toHaveLength(MISSION_REWARD_CHESTS.facile);
    expect(resFacile!.progression.missions!.missions[0]!.completed).toBe(true);

    const progNormale: WorldProgression = {
      missions: { missions: [mission({ rarity: 'normale' })], generatedAt: 0, refreshMs: 1000 },
    };
    const resNormale = completeWorldMission(progNormale, 'm1', () => 0.5);
    expect(resNormale!.rewards).toHaveLength(MISSION_REWARD_CHESTS.normale);
  });

  it('a differenza della Classica, può dare un eroe raro o leggendario', () => {
    const prog: WorldProgression = {
      missions: { missions: [mission()], generatedAt: 0, refreshMs: 1000 },
    };
    // rand → 0 fa sempre sorteggiare la rarità più alta (leggendaria).
    const res = completeWorldMission(prog, 'm1', () => 0);
    expect(LEGENDARY_HERO_IDS).toContain(res!.rewards[0]!.heroId);
  });

  it('agli estremi opposti di rand resta nel pool non comune, come la Classica', () => {
    const prog: WorldProgression = {
      missions: { missions: [mission()], generatedAt: 0, refreshMs: 1000 },
    };
    const res = completeWorldMission(prog, 'm1', () => 0.999999);
    expect(UNCOMMON_HERO_IDS).toContain(res!.rewards[0]!.heroId);
  });

  it('una missione già completata o inesistente non dà ricompensa', () => {
    const prog: WorldProgression = {
      missions: { missions: [mission({ completed: true })], generatedAt: 0, refreshMs: 1000 },
    };
    expect(completeWorldMission(prog, 'm1')).toBeNull();
    expect(completeWorldMission({}, 'm1')).toBeNull();
  });

  it('i frammenti si accumulano separatamente da quelli Classici (progressione indipendente)', () => {
    // rand fisso a 0.1 → rollChestRarity sceglie sempre "rara" (sotto la soglia
    // rara+leggendaria), pickChestRewardOf sceglie sempre il primo raro del pool.
    const hero = RARE_HERO_IDS[0]!;
    let prog: WorldProgression = {};
    for (let i = 0; i < FRAGMENTS_BY_RARITY.rara; i++) {
      prog = { ...prog, missions: { missions: [mission({ id: `m${i}` })], generatedAt: 0, refreshMs: 1000 } };
      const res = completeWorldMission(prog, `m${i}`, () => 0.1);
      prog = res!.progression;
    }
    expect(isHeroUnlocked(prog, hero)).toBe(true);
  });
});

describe('sanitizeProgression — bacheca del Mondo nel nuovo shape', () => {
  it('accetta una bacheca del Mondo ben formata sotto aroundTheWorld', () => {
    const board = generateWorldMissionBoard(1000, makeId, MAP_IDS);
    const clean = sanitizeProgression({ aroundTheWorld: { missions: board } });
    expect(clean.aroundTheWorld?.missions?.missions).toHaveLength(MISSIONS_COUNT);
    // Un blob con la chiave aroundTheWorld è già nel nuovo shape: niente migrazione.
    expect(clean.classico).toEqual({});
  });

  it('scarta una missione del Mondo senza mapId/targetPoints validi', () => {
    const clean = sanitizeProgression({
      aroundTheWorld: {
        missions: {
          generatedAt: 0,
          refreshMs: 1000,
          missions: [
            { id: 'ok', rarity: 'facile', botLevel: 'facile', botCount: 2, seed: 's', mapId: 'mondo', targetPoints: 10 },
            { id: 'noMap', rarity: 'facile', botLevel: 'facile', botCount: 2, seed: 's', targetPoints: 10 },
          ],
        },
      },
    });
    expect(clean.aroundTheWorld?.missions?.missions).toHaveLength(1);
    expect(clean.aroundTheWorld?.missions?.missions[0]!.id).toBe('ok');
  });
});
