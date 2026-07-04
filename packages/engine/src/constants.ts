/** Costanti di gioco: il "mapping tematico" dei valori classici. */
import { BOARD_RADIUS, BOARD_RADIUS_LARGE } from './board/coords';
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

/** 37 terreni della tavola GRANDE (5–6 giocatori): 2 tundra (deserti), 35 produttive. */
export const TERRAIN_POOL_LARGE: readonly TerrainType[] = [
  ...Array<TerrainType>(8).fill('legname'),
  ...Array<TerrainType>(7).fill('lana'),
  ...Array<TerrainType>(8).fill('orzo'),
  ...Array<TerrainType>(6).fill('pietra'),
  ...Array<TerrainType>(6).fill('ferro'),
  'tundra', 'tundra',
];

/** 35 segnalini per le 35 caselle produttive della tavola grande (campana, 6/8 ×4). */
export const TOKEN_POOL_LARGE: readonly number[] = [
  2, 2,
  3, 3, 3, 3,
  4, 4, 4, 4,
  5, 5, 5, 5,
  6, 6, 6, 6,
  8, 8, 8, 8,
  9, 9, 9, 9,
  10, 10, 10, 10,
  11, 11, 11,
  12, 12,
];

export type Buildable = 'sentiero' | 'villaggio' | 'roccaforte' | 'cartaSaga';

export const BUILD_COSTS: Readonly<Record<Buildable, ResourceCount>> = {
  sentiero: { legname: 1, pietra: 1, lana: 0, orzo: 0, ferro: 0 },
  villaggio: { legname: 1, pietra: 1, lana: 1, orzo: 1, ferro: 0 },
  roccaforte: { legname: 0, pietra: 0, lana: 0, orzo: 2, ferro: 3 },
  cartaSaga: { legname: 0, pietra: 0, lana: 1, orzo: 1, ferro: 1 },
};

export const PIECE_LIMITS = { villaggio: 5, roccaforte: 4, sentiero: 15 } as const;

export const BANK_PER_RESOURCE = 19;
/** Banca più capiente sulla tavola grande (più caselle, più giocatori). */
export const BANK_PER_RESOURCE_LARGE = 30;

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

/** 11 approdi sull'anello costiero di 42 spigoli della tavola grande (gap ≥ 3). */
export const PORT_RING_INDICES_LARGE: readonly number[] = [0, 4, 8, 11, 15, 19, 23, 26, 30, 34, 38];

export const PORT_KINDS_POOL_LARGE: readonly PortKind[] = [
  'generico', 'generico', 'generico', 'generico', 'generico', 'generico',
  'legname', 'pietra', 'lana', 'orzo', 'ferro',
];

/**
 * Descrittore di una TAVOLA: raggio + i sacchetti (terreni, segnalini, approdi)
 * e la capienza della banca. Due taglie: piccola (2–4) e grande (5–6).
 */
export interface BoardSpec {
  radius: number;
  terrainPool: readonly TerrainType[];
  tokenPool: readonly number[];
  portRingIndices: readonly number[];
  portKinds: readonly PortKind[];
  bankPerResource: number;
}

export const SMALL_BOARD: BoardSpec = {
  radius: BOARD_RADIUS,
  terrainPool: TERRAIN_POOL,
  tokenPool: TOKEN_POOL,
  portRingIndices: PORT_RING_INDICES,
  portKinds: PORT_KINDS_POOL,
  bankPerResource: BANK_PER_RESOURCE,
};

export const LARGE_BOARD: BoardSpec = {
  radius: BOARD_RADIUS_LARGE,
  terrainPool: TERRAIN_POOL_LARGE,
  tokenPool: TOKEN_POOL_LARGE,
  portRingIndices: PORT_RING_INDICES_LARGE,
  portKinds: PORT_KINDS_POOL_LARGE,
  bankPerResource: BANK_PER_RESOURCE_LARGE,
};

/** Da 5 giocatori in su si gioca sulla tavola grande. */
export const LARGE_BOARD_MIN_PLAYERS = 5;

export function boardSpecForPlayers(playerCount: number): BoardSpec {
  return playerCount >= LARGE_BOARD_MIN_PLAYERS ? LARGE_BOARD : SMALL_BOARD;
}

/**
 * Id delle skin VALIDE (inventario legato all'account). Vocabolario condiviso
 * tra server (validazione) e client (registro sprite); i disegni vivono solo
 * nel client. Id fuori lista ⇒ il renderer ripiega sul classico.
 */
export const DRAGON_SKIN_IDS = ['drago', 'navicella', 'trex', 'briganti'] as const;
export const STRONGHOLD_SKIN_IDS = ['roccaforte', 'torre', 'castello'] as const;

/** Con più di 7 carte in mano, un 7 costringe a scartarne la metà. */
export const HAND_LIMIT = 7;

export const GRANDE_VIA_MIN = 5; // sentieri minimi per "La Grande Via"
export const FURIA_MIN = 3; // berserker minimi per la "Furia dei Berserker"
export const BONUS_GLORY = 2; // Punti Gloria di ciascun bonus

export const DEFAULT_TARGET_GLORY = 10;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/** Peso "pip" di un segnalino: numero di combinazioni di 2 dadi che lo producono / 1. */
export function pipWeight(token: number | null): number {
  if (token === null) return 0;
  return 6 - Math.abs(token - 7);
}
