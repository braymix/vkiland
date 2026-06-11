/** Costanti di gioco: il "mapping tematico" dei valori classici. */
import type { PortKind, Resource, ResourceCount, SagaCard, TerrainType } from './types';

export const RESOURCES: readonly Resource[] = ['legname', 'pietra', 'lana', 'orzo', 'ferro'];

/** 19 terreni: foreste, cave, pascoli, campi d'orzo, miniere e una tundra. */
export const TERRAIN_POOL: readonly TerrainType[] = [
  'legname', 'legname', 'legname', 'legname',
  'lana', 'lana', 'lana', 'lana',
  'orzo', 'orzo', 'orzo', 'orzo',
  'pietra', 'pietra', 'pietra',
  'ferro', 'ferro', 'ferro',
  'tundra',
];

/** 18 segnalini numerici (la tundra non ne ha). */
export const TOKEN_POOL: readonly number[] = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

export type Buildable = 'sentiero' | 'villaggio' | 'roccaforte' | 'cartaSaga';

export const BUILD_COSTS: Readonly<Record<Buildable, ResourceCount>> = {
  sentiero: { legname: 1, pietra: 1, lana: 0, orzo: 0, ferro: 0 },
  villaggio: { legname: 1, pietra: 1, lana: 1, orzo: 1, ferro: 0 },
  roccaforte: { legname: 0, pietra: 0, lana: 0, orzo: 2, ferro: 3 },
  cartaSaga: { legname: 0, pietra: 0, lana: 1, orzo: 1, ferro: 1 },
};

export const PIECE_LIMITS = { villaggio: 5, roccaforte: 4, sentiero: 15 } as const;

export const BANK_PER_RESOURCE = 19;

/** Mazzo Carte Saga: 25 carte. */
export const SAGA_DECK_COMPOSITION: readonly SagaCard[] = [
  ...Array<SagaCard>(14).fill('berserker'),
  ...Array<SagaCard>(5).fill('sagaDegliEroi'),
  ...Array<SagaCard>(2).fill('costruttoriDiSentieri'),
  ...Array<SagaCard>(2).fill('banchetto'),
  ...Array<SagaCard>(2).fill('tributo'),
];

/**
 * Posizioni degli approdi sull'anello costiero di 30 spigoli:
 * intervalli 3-4-3-3-4-3-3-4-3 → nessun approdo condivide vertici col successivo.
 */
export const PORT_RING_INDICES: readonly number[] = [0, 3, 7, 10, 13, 17, 20, 23, 27];

export const PORT_KINDS_POOL: readonly PortKind[] = [
  'generico', 'generico', 'generico', 'generico',
  'legname', 'pietra', 'lana', 'orzo', 'ferro',
];

/** Con più di 7 carte in mano, un 7 costringe a scartarne la metà. */
export const HAND_LIMIT = 7;

export const GRANDE_VIA_MIN = 5; // sentieri minimi per "La Grande Via"
export const FURIA_MIN = 3; // berserker minimi per la "Furia dei Berserker"
export const BONUS_GLORY = 2; // Punti Gloria di ciascun bonus

export const DEFAULT_TARGET_GLORY = 10;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

/** Peso "pip" di un segnalino: numero di combinazioni di 2 dadi che lo producono / 1. */
export function pipWeight(token: number | null): number {
  if (token === null) return 0;
  return 6 - Math.abs(token - 7);
}
