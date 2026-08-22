/**
 * Missioni: partite casuali da vincere con ricompensa in casse istantanee.
 * Logica PURA condivisa da client e server, quindi va tenuta ben coperta
 * (generazione, rarità/difficoltà, refresh, completamento + ricompense,
 * validazione difensiva dell'input esterno).
 */
import { describe, expect, it } from 'vitest';
import {
  generateMission,
  generateMissionBoard,
  ensureMissions,
  missionsExpired,
  missionsRefreshRemainingMs,
  currentMissionRefreshMs,
  completeMission,
  sanitizeProgression,
  isHeroUnlocked,
  MISSIONS_COUNT,
  MISSION_REWARD_CHESTS,
  MISSION_FACILE_PROB,
  MISSION_MODE_PROB,
  CHEST_DURATION_DISCOUNT_MS,
  CHEST_DURATION_BASE_MS,
  UNCOMMON_HERO_IDS,
  type PlayerProgression,
  type Mission,
} from '../src/index';

/** Generatore deterministico: restituisce in sequenza i valori dati (poi 0). */
const seqRand = (values: number[]): (() => number) => {
  let i = 0;
  return () => values[i++] ?? 0;
};

let idCounter = 0;
const makeId = () => `id-${idCounter++}`;

describe('generazione delle missioni', () => {
  it('una bacheca ha MISSIONS_COUNT missioni con campi validi', () => {
    const board = generateMissionBoard(1000, makeId);
    expect(board.missions).toHaveLength(MISSIONS_COUNT);
    expect(board.generatedAt).toBe(1000);
    expect(board.refreshMs).toBeGreaterThan(0);
    for (const m of board.missions) {
      expect(m.id.length).toBeGreaterThan(0);
      expect(['facile', 'normale']).toContain(m.rarity);
      expect(['facile', 'normale', 'difficile', 'esperto']).toContain(m.botLevel);
      expect(m.botCount).toBeGreaterThanOrEqual(1);
      expect(m.seed.length).toBeGreaterThan(0);
      expect(m.completed).toBeUndefined();
    }
  });

  it('la rarità dipende dalla soglia: sotto → facile, sopra → normale', () => {
    const facile = generateMission(makeId, seqRand([MISSION_FACILE_PROB - 0.01]));
    expect(facile.rarity).toBe('facile');
    const normale = generateMission(makeId, seqRand([MISSION_FACILE_PROB + 0.01]));
    expect(normale.rarity).toBe('normale');
  });

  it('la difficoltà cresce con la rarità: facile → bot deboli, normale → bot forti', () => {
    // rand[0] sceglie la rarità, rand[1] sceglie il livello bot nel pool.
    const facile = generateMission(makeId, seqRand([0, 0]));
    expect(facile.rarity).toBe('facile');
    expect(['facile', 'normale']).toContain(facile.botLevel);
    expect(facile.botCount).toBe(2);
    const normale = generateMission(makeId, seqRand([0.99, 0.99]));
    expect(normale.rarity).toBe('normale');
    expect(['difficile', 'esperto']).toContain(normale.botLevel);
    expect(normale.botCount).toBe(3);
  });

  it('le modalità sono randomizzate: al massimo UNA attiva, e non sempre', () => {
    // rand[2] è la soglia della modalità: sopra MISSION_MODE_PROB → nessuna.
    const senza = generateMission(makeId, seqRand([0, 0, MISSION_MODE_PROB + 0.01]));
    expect(senza.calamities).toBeUndefined();
    expect(senza.battle).toBeUndefined();
    expect(senza.capitale).toBeUndefined();
    // Sotto soglia → esattamente UNA modalità (rand[3] la sceglie: 0 → la prima).
    const conModo = generateMission(makeId, seqRand([0, 0, 0, 0]));
    const attive = [conModo.calamities, conModo.battle, conModo.capitale].filter(Boolean);
    expect(attive).toHaveLength(1);
  });
});

describe('finestra di rigenerazione (refresh)', () => {
  it('senza sconto dura come una cassa piena (9 ore)', () => {
    expect(currentMissionRefreshMs(false)).toBe(CHEST_DURATION_BASE_MS);
  });

  it('con lo sconto dura esattamente 3 ore (come una cassa scontata)', () => {
    expect(currentMissionRefreshMs(true)).toBe(CHEST_DURATION_DISCOUNT_MS);
  });

  it('missionsExpired e il tempo rimanente seguono generatedAt + refreshMs', () => {
    const board = { missions: [], generatedAt: 0, refreshMs: 1000 };
    expect(missionsExpired(board, 999)).toBe(false);
    expect(missionsExpired(board, 1000)).toBe(true);
    expect(missionsRefreshRemainingMs(board, 400)).toBe(600);
    expect(missionsRefreshRemainingMs(board, 2000)).toBe(0);
  });
});

describe('ensureMissions', () => {
  it('genera una bacheca se assente (changed = true)', () => {
    const { progression, changed } = ensureMissions({}, 1000, makeId);
    expect(changed).toBe(true);
    expect(progression.missions?.missions).toHaveLength(MISSIONS_COUNT);
  });

  it('lascia invariata una bacheca ancora valida (changed = false)', () => {
    const seeded = ensureMissions({}, 1000, makeId).progression;
    const again = ensureMissions(seeded, 1000, makeId);
    expect(again.changed).toBe(false);
    expect(again.progression).toBe(seeded);
  });

  it('rigenera una bacheca scaduta', () => {
    const board = generateMissionBoard(0, makeId, seqRand([0, 0]));
    const prog: PlayerProgression = { missions: board };
    const after = board.generatedAt + board.refreshMs + 1;
    const { progression, changed } = ensureMissions(prog, after, makeId);
    expect(changed).toBe(true);
    expect(progression.missions).not.toBe(board);
  });
});

describe('completamento e ricompense', () => {
  const mission = (over: Partial<Mission> = {}): Mission => ({
    id: 'm1',
    rarity: 'facile',
    botLevel: 'facile',
    botCount: 2,
    seed: 'mission-x',
    ...over,
  });

  it('facile → 1 cassa (1 frammento), la missione resta segnata completata', () => {
    const prog: PlayerProgression = {
      missions: { missions: [mission()], generatedAt: 0, refreshMs: 1000 },
    };
    const res = completeMission(prog, 'm1', () => 0);
    expect(res).not.toBeNull();
    expect(res!.rewards).toHaveLength(MISSION_REWARD_CHESTS.facile);
    expect(res!.progression.missions!.missions[0]!.completed).toBe(true);
    // Il frammento è di un eroe non comune.
    expect(UNCOMMON_HERO_IDS).toContain(res!.rewards[0]!.heroId);
  });

  it('normale → 2 casse (2 frammenti)', () => {
    const prog: PlayerProgression = {
      missions: {
        missions: [mission({ rarity: 'normale', botLevel: 'esperto', botCount: 3 })],
        generatedAt: 0,
        refreshMs: 1000,
      },
    };
    const res = completeMission(prog, 'm1', () => 0);
    expect(res!.rewards).toHaveLength(MISSION_REWARD_CHESTS.normale);
    expect(MISSION_REWARD_CHESTS.normale).toBe(2);
  });

  it('una missione già completata non dà una seconda ricompensa', () => {
    const prog: PlayerProgression = {
      missions: { missions: [mission({ completed: true })], generatedAt: 0, refreshMs: 1000 },
    };
    expect(completeMission(prog, 'm1', () => 0)).toBeNull();
  });

  it('una missione inesistente → null', () => {
    const prog: PlayerProgression = {
      missions: { missions: [mission()], generatedAt: 0, refreshMs: 1000 },
    };
    expect(completeMission(prog, 'assente', () => 0)).toBeNull();
    expect(completeMission({}, 'm1', () => 0)).toBeNull();
  });

  it('5 completamenti dello stesso eroe lo sbloccano (frammenti che si accumulano)', () => {
    const hero = UNCOMMON_HERO_IDS[0]!;
    // rand fisso su 0 → pickChestReward sceglie sempre il primo non comune.
    let prog: PlayerProgression = {};
    for (let i = 0; i < 5; i++) {
      prog = {
        ...prog,
        missions: { missions: [mission({ id: `m${i}` })], generatedAt: 0, refreshMs: 1000 },
      };
      const res = completeMission(prog, `m${i}`, () => 0);
      prog = res!.progression;
    }
    expect(isHeroUnlocked(prog, hero)).toBe(true);
  });
});

describe('validazione difensiva (sanitizeProgression)', () => {
  it('accetta una bacheca ben formata', () => {
    const board = generateMissionBoard(1000, makeId);
    const clean = sanitizeProgression({ missions: board });
    expect(clean.missions?.missions).toHaveLength(MISSIONS_COUNT);
  });

  it('scarta missioni malformate e bacheche senza missioni valide', () => {
    const clean = sanitizeProgression({
      missions: {
        generatedAt: 1000,
        refreshMs: 5000,
        missions: [
          { id: 'ok', rarity: 'facile', botLevel: 'normale', botCount: 2, seed: 's' },
          { id: '', rarity: 'facile', botLevel: 'normale', botCount: 2, seed: 's' }, // id vuoto
          { id: 'x', rarity: 'assurda', botLevel: 'normale', botCount: 2, seed: 's' }, // rarità non valida
          { id: 'y', rarity: 'facile', botLevel: 'super', botCount: 2, seed: 's' }, // livello non valido
        ],
      },
    });
    expect(clean.missions?.missions).toHaveLength(1);
    expect(clean.missions?.missions[0]!.id).toBe('ok');
  });

  it('scarta una bacheca con generatedAt/refreshMs non validi', () => {
    expect(sanitizeProgression({ missions: { generatedAt: 'x', refreshMs: 5000, missions: [] } }).missions).toBeUndefined();
    expect(sanitizeProgression({ missions: { generatedAt: 0, refreshMs: -1, missions: [] } }).missions).toBeUndefined();
    expect(sanitizeProgression({ missions: 42 }).missions).toBeUndefined();
  });
});
