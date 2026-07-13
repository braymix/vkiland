/** Costanti di gioco: il "mapping tematico" dei valori classici. */
import { BOARD_CODE_GIGANTE, BOARD_CODE_GRANDE, BOARD_CODE_SMALL } from './board/coords';
import type {
  BoardSizeChoice,
  CalamityCard,
  PortKind,
  Resource,
  ResourceCount,
  SagaCard,
  TerrainType,
} from './types';

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

/** 37 terreni della tavola GIGANTE (7–8 giocatori): 2 tundra (deserti), 35 produttive. */
export const TERRAIN_POOL_GIGANTE: readonly TerrainType[] = [
  ...Array<TerrainType>(8).fill('legname'),
  ...Array<TerrainType>(7).fill('lana'),
  ...Array<TerrainType>(8).fill('orzo'),
  ...Array<TerrainType>(6).fill('pietra'),
  ...Array<TerrainType>(6).fill('ferro'),
  'tundra', 'tundra',
];

/** 35 segnalini per le 35 caselle produttive della tavola gigante (campana, 6/8 ×4). */
export const TOKEN_POOL_GIGANTE: readonly number[] = [
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

/**
 * 29 terreni della tavola GRANDE (5–6 giocatori): la gigante con due lati in
 * meno. 2 tundra (deserti) + 27 produttive.
 */
export const TERRAIN_POOL_GRANDE: readonly TerrainType[] = [
  ...Array<TerrainType>(6).fill('legname'),
  ...Array<TerrainType>(5).fill('lana'),
  ...Array<TerrainType>(6).fill('orzo'),
  ...Array<TerrainType>(5).fill('pietra'),
  ...Array<TerrainType>(5).fill('ferro'),
  'tundra', 'tundra',
];

/** 27 segnalini per le 27 caselle produttive della tavola grande (campana, 6/8 ×3). */
export const TOKEN_POOL_GRANDE: readonly number[] = [
  2, 2,
  3, 3, 3,
  4, 4, 4,
  5, 5, 5,
  6, 6, 6,
  8, 8, 8,
  9, 9, 9,
  10, 10, 10,
  11, 11,
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

/**
 * Modalità Battaglia — ATTACCO PESANTE: costo per colpire una casetta o
 * roccaforte avversaria (2 legname, 1 pietra, 1 lana, 2 ferro). La casetta
 * viene distrutta, la roccaforte declassata a casetta. Come le costruzioni,
 * si paga alla banca.
 */
export const ATTACK_COST_EDIFICIO: ResourceCount = { legname: 2, pietra: 1, lana: 1, orzo: 0, ferro: 2 };

/**
 * Modalità Battaglia — ATTACCO LEGGERO: costo per spezzare una strada
 * avversaria (2 legname, 2 ferro). Si possono spezzare solo le strade
 * all'estremità (non collegate su entrambi i lati). Si paga alla banca.
 */
export const ATTACK_COST_SENTIERO: ResourceCount = { legname: 2, pietra: 0, lana: 0, orzo: 0, ferro: 2 };

export const BANK_PER_RESOURCE = 19;
/** Banca più capiente sulla tavola grande (5–6 giocatori, 29 caselle). */
export const BANK_PER_RESOURCE_GRANDE = 25;
/** Banca ancora più capiente sulla tavola gigante (7–8 giocatori, 37 caselle). */
export const BANK_PER_RESOURCE_GIGANTE = 30;
/** @deprecated Alias storico della gigante (retro-compat). */
export const BANK_PER_RESOURCE_LARGE = BANK_PER_RESOURCE_GIGANTE;

/** Mazzo Carte Saga: 25 carte. */
export const SAGA_DECK_COMPOSITION: readonly SagaCard[] = [
  ...Array<SagaCard>(14).fill('berserker'),
  ...Array<SagaCard>(5).fill('sagaDegliEroi'),
  ...Array<SagaCard>(2).fill('costruttoriDiSentieri'),
  ...Array<SagaCard>(2).fill('banchetto'),
  ...Array<SagaCard>(2).fill('tributo'),
];

/**
 * Carte in più mescolate nel mazzo Saga SOLO in modalità Battaglia: 2 ASSALTO
 * (attacco pesante gratis) + 3 ASSALTO LEGGERO (spezza-strada gratis). Tenute
 * separate così le partite standard restano identiche (stesso mazzo).
 */
export const BATTLE_SAGA_EXTRA: readonly SagaCard[] = [
  ...Array<SagaCard>(2).fill('assalto'),
  ...Array<SagaCard>(3).fill('assaltoLeggero'),
];

/**
 * Carte in più mescolate nel mazzo Saga SOLO in modalità Calamità: 3 CAMBIA
 * SORTE (sostituiscono la calamità del giro). Tenute separate così le partite
 * standard restano identiche.
 */
export const CALAMITY_SAGA_EXTRA: readonly SagaCard[] = [
  ...Array<SagaCard>(3).fill('cambiaCalamita'),
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

/** 11 approdi sull'anello costiero di 42 spigoli della tavola GIGANTE (gap ≥ 3). */
export const PORT_RING_INDICES_GIGANTE: readonly number[] = [0, 4, 8, 11, 15, 19, 23, 26, 30, 34, 38];

export const PORT_KINDS_POOL_GIGANTE: readonly PortKind[] = [
  'generico', 'generico', 'generico', 'generico', 'generico', 'generico',
  'legname', 'pietra', 'lana', 'orzo', 'ferro',
];

/** 10 approdi sull'anello costiero di 38 spigoli della tavola GRANDE (gap ≥ 3). */
export const PORT_RING_INDICES_GRANDE: readonly number[] = [0, 4, 8, 12, 16, 20, 24, 27, 30, 34];

export const PORT_KINDS_POOL_GRANDE: readonly PortKind[] = [
  'generico', 'generico', 'generico', 'generico', 'generico',
  'legname', 'pietra', 'lana', 'orzo', 'ferro',
];

/**
 * Descrittore di una TAVOLA: il CODICE (identità/topologia, salvato in
 * `config.boardRadius`) + i sacchetti (terreni, segnalini, approdi) e la
 * capienza della banca. Tre taglie: piccola (2–4), grande (5–6), gigante (7–8).
 */
export interface BoardSpec {
  code: number;
  terrainPool: readonly TerrainType[];
  tokenPool: readonly number[];
  portRingIndices: readonly number[];
  portKinds: readonly PortKind[];
  bankPerResource: number;
}

export const SMALL_BOARD: BoardSpec = {
  code: BOARD_CODE_SMALL,
  terrainPool: TERRAIN_POOL,
  tokenPool: TOKEN_POOL,
  portRingIndices: PORT_RING_INDICES,
  portKinds: PORT_KINDS_POOL,
  bankPerResource: BANK_PER_RESOURCE,
};

/** Tavola GRANDE (5–6 giocatori): la gigante con due lati in meno (29 caselle). */
export const GRANDE_BOARD: BoardSpec = {
  code: BOARD_CODE_GRANDE,
  terrainPool: TERRAIN_POOL_GRANDE,
  tokenPool: TOKEN_POOL_GRANDE,
  portRingIndices: PORT_RING_INDICES_GRANDE,
  portKinds: PORT_KINDS_POOL_GRANDE,
  bankPerResource: BANK_PER_RESOURCE_GRANDE,
};

/** Tavola GIGANTE (7–8 giocatori): esagono pieno raggio 3 (37 caselle). */
export const GIGANTE_BOARD: BoardSpec = {
  code: BOARD_CODE_GIGANTE,
  terrainPool: TERRAIN_POOL_GIGANTE,
  tokenPool: TOKEN_POOL_GIGANTE,
  portRingIndices: PORT_RING_INDICES_GIGANTE,
  portKinds: PORT_KINDS_POOL_GIGANTE,
  bankPerResource: BANK_PER_RESOURCE_GIGANTE,
};

/** @deprecated Alias storico della gigante (retro-compat con i vecchi import). */
export const LARGE_BOARD = GIGANTE_BOARD;

/** Da 5 giocatori in su si gioca su una tavola grande (grande o gigante). */
export const LARGE_BOARD_MIN_PLAYERS = 5;
/** Da 7 giocatori in su la scelta automatica passa alla gigante. */
export const GIGANTE_BOARD_MIN_PLAYERS = 7;

/** Tavola CONSIGLIATA dal solo numero di giocatori (fallback quando non c'è scelta esplicita). */
export function boardSpecForPlayers(playerCount: number): BoardSpec {
  if (playerCount >= GIGANTE_BOARD_MIN_PLAYERS) return GIGANTE_BOARD;
  if (playerCount >= LARGE_BOARD_MIN_PLAYERS) return GRANDE_BOARD;
  return SMALL_BOARD;
}

/**
 * Tavola EFFETTIVA: la scelta esplicita ('grande'/'gigante') vince sempre e a
 * qualsiasi numero di giocatori (nessun vincolo forzato); senza scelta si usa
 * la consigliata per numero di giocatori.
 */
export function resolveBoardSpec(playerCount: number, boardSize?: BoardSizeChoice): BoardSpec {
  if (boardSize === 'gigante') return GIGANTE_BOARD;
  if (boardSize === 'grande') return GRANDE_BOARD;
  return boardSpecForPlayers(playerCount);
}

/**
 * Id delle skin VALIDE (inventario legato all'account). Vocabolario condiviso
 * tra server (validazione) e client (registro sprite); i disegni vivono solo
 * nel client. Id fuori lista ⇒ il renderer ripiega sul classico.
 */
export const DRAGON_SKIN_IDS = ['drago', 'navicella', 'trex', 'briganti'] as const;
export const STRONGHOLD_SKIN_IDS = ['roccaforte', 'torre', 'castello'] as const;

/**
 * Mazzo CALAMITÀ (modalità opzionale): 38 carte, una per giro finché dura.
 * Le carte "per materiale" hanno 5 varianti (una per risorsa); le altre sono
 * pezzi unici. Composizione FISSA: al gioco viene mescolata col seed.
 */
export const CALAMITY_DECK_COMPOSITION: readonly CalamityCard[] = [
  // Persistenti "per materiale" (5 ciascuna)
  ...RESOURCES.map((resource): CalamityCard => ({ kind: 'materialeDoppio', resource })),
  ...RESOURCES.map((resource): CalamityCard => ({ kind: 'materialeBloccato', resource })),
  ...RESOURCES.map((resource): CalamityCard => ({ kind: 'scambioDue', resource })),
  // Istantanea "per materiale" (5)
  ...RESOURCES.map((resource): CalamityCard => ({ kind: 'tuttiPiu2', resource })),
  // Persistenti uniche
  { kind: 'dragoFermo' },
  { kind: 'nienteSaga' },
  { kind: 'dragoPrimaDelTiro' },
  { kind: 'scambiTre' },
  { kind: 'abbondanza' },
  { kind: 'bufera' },
  { kind: 'assedio' },
  { kind: 'mareInTempesta' },
  { kind: 'mercatoOro' },
  // Istantanee uniche
  { kind: 'leaderScartaTutto' },
  { kind: 'tuttiScartanoMeta' },
  { kind: 'ultimoPesca4' },
  { kind: 'ultimoStrade2' },
  { kind: 'scartaFino7' },
  { kind: 'tuttiUnoDiTutto' },
  { kind: 'donoDegliDei' },
  { kind: 'bottino' },
  { kind: 'razzia' },
];

/** Con più di 7 carte in mano, un 7 costringe a scartarne la metà. */
export const HAND_LIMIT = 7;

export const GRANDE_VIA_MIN = 5; // sentieri minimi per "La Grande Via"
export const FURIA_MIN = 3; // berserker minimi per la "Furia dei Berserker"
export const BONUS_GLORY = 2; // Punti Gloria di ciascun bonus

export const DEFAULT_TARGET_GLORY = 10;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

/** Peso "pip" di un segnalino: numero di combinazioni di 2 dadi che lo producono / 1. */
export function pipWeight(token: number | null): number {
  if (token === null) return 0;
  return 6 - Math.abs(token - 7);
}
