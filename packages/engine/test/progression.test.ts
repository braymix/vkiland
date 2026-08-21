/**
 * Progressione: casse, frammenti ed eroi sbloccati. Logica PURA condivisa da
 * client e server, quindi va tenuta ben coperta (sblocco, spreco, cap casse,
 * validazione difensiva dell'input esterno).
 */
import { describe, expect, it } from 'vitest';
import {
  sanitizeProgression,
  isHeroUnlocked,
  unlockedHeroIds,
  fragmentsOf,
  addChest,
  canEarnChest,
  openChest,
  applyFragment,
  chestReady,
  pickChestReward,
  canClaimFreeChest,
  claimFreeChest,
  COMMON_HERO_IDS,
  UNCOMMON_HERO_IDS,
  MAX_CHESTS,
  FRAGMENTS_PER_HERO,
  currentChestDurationMs,
  type PlayerProgression,
  type ChestSlot,
} from '../src/index';

const chestAt = (id: string, startedAt: number, durationMs = 1000): ChestSlot => ({
  id,
  rarity: 'nonComune',
  startedAt,
  durationMs,
});

describe('rarità degli eroi', () => {
  it('esistono comuni e non comuni, insiemi disgiunti', () => {
    expect(COMMON_HERO_IDS.length).toBeGreaterThan(0);
    expect(UNCOMMON_HERO_IDS.length).toBeGreaterThan(0);
    for (const id of COMMON_HERO_IDS) expect(UNCOMMON_HERO_IDS).not.toContain(id);
  });
});

describe('isHeroUnlocked / unlockedHeroIds', () => {
  it('i comuni sono sempre sbloccati, i non comuni no (senza frammenti)', () => {
    const prog: PlayerProgression = {};
    for (const id of COMMON_HERO_IDS) expect(isHeroUnlocked(prog, id)).toBe(true);
    for (const id of UNCOMMON_HERO_IDS) expect(isHeroUnlocked(prog, id)).toBe(false);
    expect(unlockedHeroIds(prog).sort()).toEqual([...COMMON_HERO_IDS].sort());
  });

  it('il tester ha ogni eroe disponibile', () => {
    const prog: PlayerProgression = { tester: true };
    for (const id of UNCOMMON_HERO_IDS) expect(isHeroUnlocked(prog, id)).toBe(true);
    expect(unlockedHeroIds(prog).length).toBe(COMMON_HERO_IDS.length + UNCOMMON_HERO_IDS.length);
  });

  it('un non comune sbloccato è disponibile', () => {
    const hero = UNCOMMON_HERO_IDS[0]!;
    expect(isHeroUnlocked({ unlocked: [hero] }, hero)).toBe(true);
  });
});

describe('casse: aggiunta e cap', () => {
  it('addChest rispetta il massimo di casse in lavorazione', () => {
    let prog: PlayerProgression = {};
    let n = 0;
    for (let i = 0; i < MAX_CHESTS + 2; i++) {
      prog = addChest(prog, 1000 + i, () => `c${n++}`);
    }
    expect(prog.chests?.length).toBe(MAX_CHESTS);
    expect(canEarnChest(prog)).toBe(false);
  });

  it('la durata assegnata è quella corrente (sconto)', () => {
    const prog = addChest({}, 1000, () => 'c0');
    expect(prog.chests?.[0]?.durationMs).toBe(currentChestDurationMs());
  });
});

describe('chestReady', () => {
  it('pronta solo a caricamento finito', () => {
    const c = chestAt('c', 1000, 500);
    expect(chestReady(c, 1400)).toBe(false);
    expect(chestReady(c, 1500)).toBe(true);
    expect(chestReady(c, 2000)).toBe(true);
  });
});

describe('apertura casse e frammenti', () => {
  it('openChest ritorna null se la cassa non è pronta o non esiste', () => {
    const prog: PlayerProgression = { chests: [chestAt('c', 1000, 1000)] };
    expect(openChest(prog, 'c', 1500)).toBeNull(); // non ancora pronta
    expect(openChest(prog, 'ignota', 5000)).toBeNull(); // id sconosciuto
  });

  it('aprire una cassa la rimuove e assegna un frammento non comune', () => {
    const prog: PlayerProgression = { chests: [chestAt('c', 0, 1000)] };
    // rand fisso → primo eroe non comune del pool.
    const result = openChest(prog, 'c', 2000, () => 0)!;
    expect(result).not.toBeNull();
    expect(UNCOMMON_HERO_IDS).toContain(result.heroId);
    expect(result.progression.chests ?? []).toHaveLength(0);
    expect(fragmentsOf(result.progression, result.heroId)).toBe(1);
    expect(result.unlockedNow).toBe(false);
  });

  it('al quinto frammento l’eroe si sblocca', () => {
    const hero = UNCOMMON_HERO_IDS[0]!;
    const prog: PlayerProgression = { fragments: { [hero]: FRAGMENTS_PER_HERO - 1 } };
    const res = applyFragment(prog, hero);
    expect(res.fragments).toBe(FRAGMENTS_PER_HERO);
    expect(res.unlockedNow).toBe(true);
    expect(isHeroUnlocked(res.progression, hero)).toBe(true);
  });

  it('un frammento di un eroe già sbloccato è sprecato', () => {
    const hero = UNCOMMON_HERO_IDS[0]!;
    const prog: PlayerProgression = { unlocked: [hero] };
    const res = applyFragment(prog, hero);
    expect(res.wasted).toBe(true);
    expect(res.unlockedNow).toBe(false);
    expect(res.progression).toEqual(prog); // invariata
  });

  it('pickChestReward resta nel pool dei non comuni agli estremi di rand', () => {
    expect(UNCOMMON_HERO_IDS).toContain(pickChestReward(() => 0));
    expect(UNCOMMON_HERO_IDS).toContain(pickChestReward(() => 0.999999));
  });
});

describe('cassa gratuita giornaliera (negozio)', () => {
  it('è disponibile finché il giorno non è quello già riscosso', () => {
    expect(canClaimFreeChest({}, '2026-8-21')).toBe(true);
    expect(canClaimFreeChest({ freeChestDay: '2026-8-20' }, '2026-8-21')).toBe(true);
    expect(canClaimFreeChest({ freeChestDay: '2026-8-21' }, '2026-8-21')).toBe(false);
  });

  it('riscuoterla apre istantaneamente, dà un frammento e segna il giorno', () => {
    const res = claimFreeChest({}, '2026-8-21', () => 0)!;
    expect(res).not.toBeNull();
    expect(UNCOMMON_HERO_IDS).toContain(res.heroId);
    expect(fragmentsOf(res.progression, res.heroId)).toBe(1);
    expect(res.progression.freeChestDay).toBe('2026-8-21');
    // Non tocca la coda delle casse in lavorazione.
    expect(res.progression.chests ?? []).toHaveLength(0);
  });

  it('non si può riscuotere due volte nello stesso giorno', () => {
    const res = claimFreeChest({}, '2026-8-21', () => 0)!;
    expect(claimFreeChest(res.progression, '2026-8-21')).toBeNull();
  });

  it('un nuovo giorno la rende di nuovo disponibile', () => {
    const res = claimFreeChest({}, '2026-8-21', () => 0)!;
    expect(claimFreeChest(res.progression, '2026-8-22', () => 0)).not.toBeNull();
  });

  it('sanitizeProgression conserva un freeChestDay valido e scarta il resto', () => {
    expect(sanitizeProgression({ freeChestDay: '2026-8-21' }).freeChestDay).toBe('2026-8-21');
    expect(sanitizeProgression({ freeChestDay: 123 }).freeChestDay).toBeUndefined();
    expect(sanitizeProgression({ freeChestDay: '' }).freeChestDay).toBeUndefined();
  });
});

describe('sanitizeProgression (validazione input esterno)', () => {
  it('scarta strutture non valide e mantiene solo il buono', () => {
    const clean = sanitizeProgression({
      tester: 'sì', // non è true → scartato
      chests: [
        { id: 'ok', rarity: 'nonComune', startedAt: 100, durationMs: 500 },
        { id: 'noDur', startedAt: 1 }, // manca durationMs → scartata
        'spazzatura',
      ],
      fragments: { nonEsiste: 3, [UNCOMMON_HERO_IDS[0]!]: 2, [COMMON_HERO_IDS[0]!]: 4 },
      unlocked: [UNCOMMON_HERO_IDS[1]!, COMMON_HERO_IDS[0]!, 'boh'],
    });
    expect(clean.tester).toBeUndefined();
    expect(clean.chests).toHaveLength(1);
    expect(clean.chests?.[0]?.id).toBe('ok');
    // Solo il frammento di un non comune resta; comuni/ignoti scartati.
    expect(clean.fragments).toEqual({ [UNCOMMON_HERO_IDS[0]!]: 2 });
    // Solo il non comune valido resta tra gli sbloccati.
    expect(clean.unlocked).toEqual([UNCOMMON_HERO_IDS[1]!]);
  });

  it('un frammento pieno implica lo sblocco', () => {
    const hero = UNCOMMON_HERO_IDS[0]!;
    const clean = sanitizeProgression({ fragments: { [hero]: FRAGMENTS_PER_HERO } });
    expect(clean.unlocked).toContain(hero);
  });

  it('clampa il numero di casse al massimo', () => {
    const chests = Array.from({ length: MAX_CHESTS + 3 }, (_, i) => ({
      id: `c${i}`,
      rarity: 'nonComune',
      startedAt: i,
      durationMs: 10,
    }));
    expect(sanitizeProgression({ chests }).chests).toHaveLength(MAX_CHESTS);
  });

  it('conserva il flag tester quando è true', () => {
    expect(sanitizeProgression({ tester: true }).tester).toBe(true);
  });
});
