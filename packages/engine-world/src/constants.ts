/** Costanti di gioco di Vikings Around the World (regolamento: docs/vikings-around-the-world.md). */
import type { BuildingKind, ProducedResource, ResourceMap, WorldResource } from './types';

export const PRODUCED_RESOURCES: readonly ProducedResource[] = ['legname', 'pietra', 'lana', 'orzo', 'ferro'];
export const WORLD_RESOURCES: readonly WorldResource[] = [...PRODUCED_RESOURCES, 'argento'];

export type WorldBuildable = 'strada' | BuildingKind | 'porto' | 'mercato';

const c = (legname: number, pietra: number, lana: number, orzo: number, ferro: number, argento = 0): ResourceMap => ({
  legname, pietra, lana, orzo, ferro, argento,
});

export const BUILD_COSTS: Readonly<Record<WorldBuildable, ResourceMap>> = {
  strada: c(1, 1, 0, 0, 0),
  villaggio: c(1, 1, 1, 1, 0),
  citta: c(0, 0, 0, 2, 3),
  sala: c(0, 1, 0, 1, 2, 2),
  porto: c(1, 0, 1, 0, 1),
  mercato: c(0, 1, 1, 1, 0),
};

export const PIECE_LIMITS = { strada: 15, villaggio: 6, citta: 4, sala: 1, porto: 3, mercato: 3 } as const;

/** Punti Gloria per edificio. */
export const BUILDING_POINTS: Readonly<Record<BuildingKind, number>> = { villaggio: 1, citta: 2, sala: 4 };

/** Produzione per edificio (un villaggio tocca UN solo territorio: la resa è doppia rispetto alla Classica). */
export const BUILDING_YIELD: Readonly<Record<BuildingKind, number>> = { villaggio: 2, citta: 3, sala: 3 };

/** Insediamenti (di clan diversi) per territorio. */
export const MAX_SETTLEMENTS = 2;
/** Materiali raccolti dal Jarl a ogni tiro (non col 7) nel territorio dove si trova. */
export const JARL_GATHER = 1;

export const HAND_LIMIT = 7;
export const MOVE_POINTS = 4;
export const MOVE_COST_OWN_ROAD = 1;
export const MOVE_COST_OTHER = 2;
export const TOLL_BASE = 1;
export const TOLL_SALA = 2;

export const GRANDE_VIA_MIN = 5;
export const GRANDE_VIAGGIATORE_MIN = 3;
export const AWARD_POINTS = 2;

export const DEFAULT_TARGET_POINTS = 10;
export const MIN_TARGET_POINTS = 8;
export const MAX_TARGET_POINTS = 15;

export const BANK_RATIO = 4;
export const PORT_RATIO = 3;
/** 1 argento -> 2 materiali; 3 materiali uguali -> 1 argento. */
export const SILVER_SELL = 2;
export const SILVER_BUY = 3;

/** Territori produttivi minimi di una mappa (anche dopo gli override admin). */
export const MIN_PRODUCTIVE_TERRITORIES = 15;
