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
  ...Array<TerrainType>(6).fill('lana'),
  ...Array<TerrainType>(8).fill('orzo'),
  ...Array<TerrainType>(7).fill('pietra'),
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
 * 30 terreni della tavola GRANDE (5–6 giocatori): la gigante con due lati
 * adiacenti in meno. 2 tundra (deserti) + 28 produttive.
 */
export const TERRAIN_POOL_GRANDE: readonly TerrainType[] = [
  ...Array<TerrainType>(6).fill('legname'),
  ...Array<TerrainType>(6).fill('lana'),
  ...Array<TerrainType>(6).fill('orzo'),
  ...Array<TerrainType>(5).fill('pietra'),
  ...Array<TerrainType>(5).fill('ferro'),
  'tundra', 'tundra',
];

/** 28 segnalini per le 28 caselle produttive della tavola grande (campana, 6/8 ×3). */
export const TOKEN_POOL_GRANDE: readonly number[] = [
  2, 2,
  3, 3, 3,
  4, 4, 4,
  5, 5, 5,
  6, 6, 6,
  8, 8, 8,
  9, 9, 9,
  10, 10, 10,
  11, 11, 11,
  12, 12,
];

export type Buildable = 'sentiero' | 'villaggio' | 'roccaforte' | 'capitale' | 'cartaSaga';

export const BUILD_COSTS: Readonly<Record<Buildable, ResourceCount>> = {
  sentiero: { legname: 1, pietra: 1, lana: 0, orzo: 0, ferro: 0 },
  villaggio: { legname: 1, pietra: 1, lana: 1, orzo: 1, ferro: 0 },
  roccaforte: { legname: 0, pietra: 0, lana: 0, orzo: 2, ferro: 3 },
  // Capitale (modalità opzionale): evoluzione della Roccaforte.
  // 3 ferro, 2 orzo, 1 pietra (mattone rosso), 1 legname, 1 lana (pecora).
  capitale: { legname: 1, pietra: 1, lana: 1, orzo: 2, ferro: 3 },
  cartaSaga: { legname: 0, pietra: 0, lana: 1, orzo: 1, ferro: 1 },
};

/** Se ne può costruire UNA SOLA per clan (modalità Capitale). */
export const PIECE_LIMITS = { villaggio: 5, roccaforte: 4, capitale: 1, sentiero: 15 } as const;

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

/** Mazzo Carte Saga: 28 carte. */
export const SAGA_DECK_COMPOSITION: readonly SagaCard[] = [
  ...Array<SagaCard>(14).fill('berserker'),
  ...Array<SagaCard>(5).fill('sagaDegliEroi'),
  ...Array<SagaCard>(2).fill('costruttoriDiSentieri'),
  ...Array<SagaCard>(2).fill('banchetto'),
  ...Array<SagaCard>(2).fill('tributo'),
  ...Array<SagaCard>(3).fill('razzia'),
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

/** Tavola GRANDE (5–6 giocatori): la gigante con due lati adiacenti in meno (30 caselle). */
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

// ---------------------------------------------------------------------------
// Campo personalizzabile: numero di caselle e numero di deserti (tundra) liberi
// ---------------------------------------------------------------------------

/** Limiti del «campo libero» (numero di caselle scelto a mano). */
export const MIN_CUSTOM_HEXES = 7; // esagono pieno di raggio 1
export const MAX_CUSTOM_HEXES = 61; // esagono pieno di raggio 4

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Numero di caselle di un esagono pieno di raggio r: 1 + 3r(r+1) (7, 19, 37, 61…). */
function fullHexCount(r: number): number {
  return 1 + 3 * r * (r + 1);
}

/** Raggio geometrico minimo che contiene `n` caselle (per centrare il canvas). */
export function radiusForHexCount(n: number): number {
  let r = 1;
  while (fullHexCount(r) < n) r++;
  return r;
}

/**
 * Deserti (tundra) di DEFAULT per un campo di `total` caselle: 1 fino alla
 * taglia della piccola, 2 come grande/gigante, 3 sui campi molto grandi. Serve
 * a prevalorizzare il campo «Deserti» e da fallback quando non è scelto a mano.
 */
export function defaultDesertCount(total: number): number {
  if (total <= 24) return 1;
  if (total <= 45) return 2;
  return 3;
}

/** Massimo di deserti ammessi su `total` caselle: almeno 1 produttiva deve restare. */
export function maxDesertCount(total: number): number {
  return Math.max(1, total - 1);
}

/** Ripartisce `total` unità fra classi coi `weights` dati (metodo del resto maggiore). */
function apportion(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const base = raw.map((x) => Math.floor(x));
  let rem = total - base.reduce((a, b) => a + b, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < order.length && rem > 0; k++, rem--) base[order[k]!.i]!++;
  return base;
}

/** Pesi di distribuzione delle 5 risorse produttive (come la piccola: 4/4/4/3/3). */
const RESOURCE_WEIGHTS: readonly (readonly [Resource, number])[] = [
  ['legname', 4],
  ['orzo', 4],
  ['lana', 4],
  ['pietra', 3],
  ['ferro', 3],
];

/**
 * Sacchetto terreni di `total` caselle: `deserts` tundra + le restanti
 * produttive distribuite fra le 5 risorse secondo i pesi classici (resto
 * assegnato per resto maggiore, in ordine deterministico).
 */
export function buildTerrainPool(total: number, deserts: number): TerrainType[] {
  const productive = Math.max(0, total - deserts);
  const counts = apportion(productive, RESOURCE_WEIGHTS.map(([, w]) => w));
  const pool: TerrainType[] = [];
  RESOURCE_WEIGHTS.forEach(([res], i) => {
    for (let k = 0; k < counts[i]!; k++) pool.push(res);
  });
  for (let k = 0; k < deserts; k++) pool.push('tundra');
  return pool;
}

/** I 10 valori dei segnalini (2..12, mai 7) coi loro pesi «a campana» (combinazioni di 2 dadi). */
const TOKEN_VALUES: readonly number[] = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
const TOKEN_WEIGHTS: readonly number[] = [1, 2, 3, 4, 5, 5, 4, 3, 2, 1];

/** Sacchetto di `count` segnalini a campana (2..12, mai 7), il più bilanciato possibile. */
export function buildTokenPool(count: number): number[] {
  const counts = apportion(count, TOKEN_WEIGHTS);
  const pool: number[] = [];
  TOKEN_VALUES.forEach((v, i) => {
    for (let k = 0; k < counts[i]!; k++) pool.push(v);
  });
  return pool;
}

/** Numero di approdi per un campo di `total` caselle (≈ una ogni tre caselle). */
function portCountForHexes(total: number): number {
  return Math.max(3, Math.round(total * 0.3));
}

/** Tipi degli approdi: ~metà generici, gli altri uno per risorsa a rotazione. */
export function buildPortKinds(count: number): PortKind[] {
  const generic = Math.round(count * 0.45);
  const kinds: PortKind[] = [];
  for (let i = 0; i < generic; i++) kinds.push('generico');
  for (let i = 0; generic + i < count; i++) kinds.push(RESOURCES[i % RESOURCES.length]!);
  return kinds;
}

/** Capienza della banca per un campo di `total` caselle (scala con le produttive). */
export function customBankPerResource(total: number, deserts: number): number {
  const productive = total - deserts;
  return Math.round(BANK_PER_RESOURCE + Math.max(0, productive - 18) * 0.6);
}

/** Personalizzazioni della tavola indipendenti dalla taglia preset. */
export interface BoardCustomization {
  /** Campo libero: numero totale di caselle scelto a mano (assente = taglia preset). */
  hexCount?: number;
  /** Numero di deserti (tundra); assente = default della taglia. Minimo 1 (serve al Drago). */
  desertCount?: number;
}

/** Tavola risolta: lo spec dei sacchetti + se è un «campo libero» (topologia dalle caselle). */
export interface ResolvedBoard {
  spec: BoardSpec;
  /** true = isola compatta di N caselle (forma dalle caselle); false = taglia preset a esagono fisso. */
  freeForm: boolean;
}

/**
 * Tavola EFFETTIVA con le personalizzazioni (numero di caselle / di deserti):
 *  - se `hexCount` è impostato si costruisce un «campo libero» (isola compatta
 *    di quel numero di caselle, con sacchetti generati a misura);
 *  - altrimenti si parte dalla taglia preset e, SOLO se il numero di deserti è
 *    scelto e diverso dal naturale, se ne rigenerano terreni e segnalini
 *    (stessa forma/topologia: cambia solo la composizione dei terreni).
 * Senza personalizzazioni ritorna esattamente lo spec preset (partite identiche).
 */
export function resolveBoardSpecCustom(
  playerCount: number,
  boardSize: BoardSizeChoice | undefined,
  custom: BoardCustomization = {}
): ResolvedBoard {
  if (typeof custom.hexCount === 'number' && Number.isFinite(custom.hexCount)) {
    const total = clampInt(custom.hexCount, MIN_CUSTOM_HEXES, MAX_CUSTOM_HEXES);
    const deserts = clampInt(custom.desertCount ?? defaultDesertCount(total), 1, maxDesertCount(total));
    const spec: BoardSpec = {
      code: radiusForHexCount(total),
      terrainPool: buildTerrainPool(total, deserts),
      tokenPool: buildTokenPool(total - deserts),
      portRingIndices: [], // ignorati: il campo libero distribuisce gli approdi sull'anello reale
      portKinds: buildPortKinds(portCountForHexes(total)),
      bankPerResource: customBankPerResource(total, deserts),
    };
    return { spec, freeForm: true };
  }

  const base = resolveBoardSpec(playerCount, boardSize);
  const total = base.terrainPool.length;
  const natural = base.terrainPool.filter((t) => t === 'tundra').length;
  if (custom.desertCount == null) return { spec: base, freeForm: false };
  const deserts = clampInt(custom.desertCount, 1, maxDesertCount(total));
  if (deserts === natural) return { spec: base, freeForm: false };
  const spec: BoardSpec = {
    ...base,
    terrainPool: buildTerrainPool(total, deserts),
    tokenPool: buildTokenPool(total - deserts),
  };
  return { spec, freeForm: false };
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
  { kind: 'frana' },
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
