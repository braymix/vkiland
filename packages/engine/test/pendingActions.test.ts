/**
 * Azioni in sospeso: i conteggi che alimentano il pallino rosso «da fare» sui
 * pulsanti del menu (Missioni, Inventario, Negozio). Logica PURA, quindi va
 * coperta bene su tutti i casi limite (bacheca assente/scaduta, casse pronte vs
 * in caricamento, riscatti del Negozio già usati).
 */
import { describe, expect, it } from 'vitest';
import {
  readyChestCount,
  pendingMissionCount,
  pendingShopCount,
  pendingActions,
  generateMissionBoard,
  MISSIONS_COUNT,
  CHEST_DURATION_BASE_MS,
  UNCOMMON_HERO_IDS,
  type PlayerProgression,
  type ChestSlot,
} from '../src/index';

let idCounter = 0;
const makeId = () => `id-${idCounter++}`;

/** Una cassa entrata in caricamento a `startedAt` con durata standard. */
const chest = (startedAt: number): ChestSlot => ({
  id: makeId(),
  rarity: 'nonComune',
  startedAt,
  durationMs: CHEST_DURATION_BASE_MS,
});

describe('readyChestCount', () => {
  it('conta solo le casse col caricamento terminato', () => {
    const now = 10 * CHEST_DURATION_BASE_MS;
    const prog: PlayerProgression = {
      // pronta (iniziata molto prima), pronta al limite, ancora in caricamento
      chests: [chest(0), chest(now - CHEST_DURATION_BASE_MS), chest(now - 1)],
    };
    expect(readyChestCount(prog, now)).toBe(2);
  });

  it('è 0 senza casse', () => {
    expect(readyChestCount({}, Date.now())).toBe(0);
  });
});

describe('pendingMissionCount', () => {
  it('vale MISSIONS_COUNT se la bacheca è assente (ne verrebbe generata una nuova)', () => {
    expect(pendingMissionCount({}, 1000)).toBe(MISSIONS_COUNT);
  });

  it('conta solo le missioni non completate su una bacheca valida', () => {
    const board = generateMissionBoard(1000, makeId);
    board.missions[0]!.completed = true;
    const prog: PlayerProgression = { missions: board };
    // now dentro la finestra di refresh: la bacheca è ancora valida
    const now = 1000 + board.refreshMs - 1;
    expect(pendingMissionCount(prog, now)).toBe(MISSIONS_COUNT - 1);
  });

  it('vale MISSIONS_COUNT se la bacheca è scaduta (si rigenera tutta da giocare)', () => {
    const board = generateMissionBoard(1000, makeId);
    board.missions.forEach((m) => (m.completed = true));
    const prog: PlayerProgression = { missions: board };
    const now = 1000 + board.refreshMs; // scaduta
    expect(pendingMissionCount(prog, now)).toBe(MISSIONS_COUNT);
  });
});

describe('pendingShopCount', () => {
  const today = '2026-8-22';

  it('vale 2 su un account nuovo (cassa del giorno + riscatto una-tantum)', () => {
    expect(pendingShopCount({}, today)).toBe(2);
  });

  it('scende a 1 quando la cassa del giorno è già stata riscossa', () => {
    expect(pendingShopCount({ freeChestDay: today }, today)).toBe(1);
  });

  it('scende a 1 quando il riscatto una-tantum è stato usato', () => {
    const heroId = UNCOMMON_HERO_IDS[0]!;
    expect(pendingShopCount({ redeemedUncommon: heroId }, today)).toBe(1);
  });

  it('vale 0 quando entrambi i riscatti sono esauriti', () => {
    const heroId = UNCOMMON_HERO_IDS[0]!;
    expect(pendingShopCount({ freeChestDay: today, redeemedUncommon: heroId }, today)).toBe(0);
  });

  it('torna disponibile in un nuovo giorno', () => {
    expect(pendingShopCount({ freeChestDay: '2026-8-21' }, today)).toBe(2);
  });
});

describe('pendingActions', () => {
  it('somma le tre voci in total', () => {
    const today = '2026-8-22';
    const now = 10 * CHEST_DURATION_BASE_MS;
    const board = generateMissionBoard(now, makeId);
    board.missions[0]!.completed = true;
    const prog: PlayerProgression = {
      chests: [chest(0), chest(now - 1)], // 1 pronta, 1 in caricamento
      missions: board,
      freeChestDay: today, // cassa del giorno già presa → resta solo il riscatto
    };
    const res = pendingActions(prog, now, today);
    expect(res.chests).toBe(1);
    expect(res.missions).toBe(MISSIONS_COUNT - 1);
    expect(res.shop).toBe(1);
    expect(res.total).toBe(1 + (MISSIONS_COUNT - 1) + 1);
  });

  it('account appena creato: nessuna cassa, missioni piene, negozio pieno', () => {
    const res = pendingActions({}, Date.now(), '2026-8-22');
    expect(res).toEqual({
      missions: MISSIONS_COUNT,
      chests: 0,
      shop: 2,
      total: MISSIONS_COUNT + 2,
    });
  });
});
