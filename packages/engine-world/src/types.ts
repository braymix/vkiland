/**
 * Tipi di «Vikings Around the World»: mappa a territori, stato di gioco e vista.
 * Motore puro e separato dalla Modalità Classica (nessun import da @vikiland/engine).
 */
import type { WorldHeroId } from './heroes';
import type { RngState } from './rng';

// ---------------------------------------------------------------- risorse
export type ProducedResource = 'legname' | 'pietra' | 'lana' | 'orzo' | 'ferro';
export type WorldResource = ProducedResource | 'argento';
export type ResourceMap = Record<WorldResource, number>;
export type TerritoryKind = ProducedResource | 'deserto';

// ------------------------------------------------------------------ mappa
export interface TerritoryDef {
  id: string;
  /** Nome di default (sovrascrivibile dall'admin). */
  name: string;
  continent: string;
  kind: TerritoryKind;
  coastal: boolean;
  /** lon, lat: etichette, pedina, numero. */
  center: [number, number];
  /** lon, lat; più poligoni = isole. */
  polygons: [number, number][][];
}

/**
 * Tipo di collegamento fra territori:
 *  - `terra` → confine di terra: strada costruibile, movimento normale;
 *  - `mare` → tratto di mare: serve un Porto per salpare;
 *  - `muro` → muro del CASTELLO da «scavalcare»: niente strade, costo movimento
 *    alto (vedi `MOVE_COST_MURO`). Le porte/brecce di un castello sono invece
 *    collegamenti `terra` (varchi normali).
 */
export type LinkKind = 'terra' | 'mare' | 'muro';

export interface LinkDef {
  a: string;
  b: string;
  kind: LinkKind;
}

/**
 * Metadati della mappa CASTELLO: servono SOLO al renderer per disegnare mura,
 * fossato e i varchi. La LOGICA sta tutta nei collegamenti (porte = `terra`,
 * scale = `muro`); questo è grafica pre-calcolata dal generatore.
 */
export interface CastleMeta {
  rings: number;
  /** Anello di ogni territorio: 0 = Mastio, `rings` = Borgo (il più esterno). */
  ringOf: Record<string, number>;
  /** Segmenti di MURO (lon/lat): lati fra anelli interni SENZA varco. */
  walls: [[number, number], [number, number]][];
  /** Segmenti di FOSSATO (lon/lat): lati fra cortile esterno e borgo SENZA ponte. */
  moat: [[number, number], [number, number]][];
  /** Link che sono PORTE (varco di terra fra anelli); sul fossato sono ponti levatoi. */
  gates: string[];
  /** Sottoinsieme di `gates` che attraversa il fossato (ponti levatoi). */
  drawbridges: string[];
  /** Link che sono SCALE (collegamenti `muro` da scavalcare). */
  scale: string[];
  /** Link che sono PASSAGGI SEGRETI (terra fra anelli non adiacenti). */
  tunnels: string[];
}

export interface MapDefinition {
  id: string;
  name: string;
  scale: 'mondo' | 'continente' | 'nazione' | 'regione' | 'citta';
  projection: 'equirettangolare' | 'mercatore';
  territories: TerritoryDef[];
  links: LinkDef[];
  numberPool: number[];
  minPlayers: number;
  maxPlayers: number;
  /** Attribuzione dei dati (es. OpenStreetMap, ISTAT). */
  credits?: string;
  /** Presente solo per la mappa generata «Castello»: grafica di mura/fossato/varchi. */
  castle?: CastleMeta;
}

/** Override dell'admin (rinomina / togli territori). */
export interface MapOverride {
  mapId: string;
  names: Record<string, string>;
  removed: string[];
}

/** Collegamento congelato nella partita: ha un id stabile `a|b` (a < b). */
export interface FrozenLink extends LinkDef {
  id: string;
}

/** Mappa effettivamente usata dalla partita (override applicati, numeri assegnati). */
export interface FrozenMap {
  id: string;
  name: string;
  scale: MapDefinition['scale'];
  projection: MapDefinition['projection'];
  territories: TerritoryDef[];
  links: FrozenLink[];
  credits?: string;
  /** Grafica del castello (vedi `CastleMeta`), solo per la mappa generata. */
  castle?: CastleMeta;
}

// ------------------------------------------------------------- giocatori
export type PlayerId = number;
export type BotLevel = 'facile' | 'normale' | 'difficile' | 'esperto';

export interface WorldPlayerConfig {
  name: string;
  color: string;
  bot?: BotLevel;
  /** Eroe del clan (sempre attivo nel Mondo). Assente = nessun eroe. */
  hero?: WorldHeroId;
}

export interface WorldGameConfig {
  seed: string;
  players: WorldPlayerConfig[];
  /** Punti Gloria per vincere (8..15, default 12). */
  targetPoints: number;
  mapId: string;
  /** Mescola anche i materiali dei territori produttivi. */
  materialiCasuali: boolean;
  /** Evita 6 e 8 su territori collegati (default true). */
  avoidAdjacent68: boolean;
  /**
   * Mappa CASTELLO (`mapId === 'castello'`): numero di anelli/mura (2..4). La
   * mappa è generata proceduralmente dal seed. Ignorato per le altre mappe.
   */
  castleRings?: number;
}

export type BuildingKind = 'villaggio' | 'citta' | 'sala';

/** Un insediamento di un clan in un territorio (al massimo 2 per territorio, di clan diversi). */
export interface Settlement {
  owner: PlayerId;
  building: BuildingKind;
  porto: boolean;
  mercato: boolean;
}

export interface TerritoryState {
  id: string;
  number: number | null;
  /** In ordine di arrivo: il primo è «il padrone di casa» che incassa i pedaggi. */
  settlements: Settlement[];
}

export interface WorldPlayerState {
  id: PlayerId;
  name: string;
  color: string;
  bot?: BotLevel;
  hand: ResourceMap;
  jarl: string;
  movePointsLeft: number;
  /** Territori già «pagati» nel turno (compreso quello di partenza). */
  tollsPaidThisTurn: string[];
  /** Eroe del clan (sempre attivo nel Mondo). */
  hero?: WorldHeroId;
  /** Usi rimasti delle abilità a consumo (es. mercante, portoGratis). */
  heroUses?: Record<string, number>;
}

export interface TradeOffer {
  id: number;
  from: PlayerId;
  give: ResourceMap;
  receive: ResourceMap;
  to: PlayerId | null;
  responses: Partial<Record<PlayerId, 'accettata' | 'rifiutata'>>;
}

export type WorldPhase =
  | { type: 'setup'; expect: 'villaggio' | 'strada'; roadsLeft?: number }
  | { type: 'tiro' }
  | { type: 'scarto'; pending: PlayerId[] }
  | { type: 'razzia'; candidates: PlayerId[] }
  | { type: 'azioni' }
  | { type: 'fine'; winner: PlayerId };

export interface WorldGameState {
  kind: 'world';
  config: WorldGameConfig;
  map: FrozenMap;
  territories: Record<string, TerritoryState>;
  /** id collegamento (terra) -> proprietario della strada. */
  roads: Record<string, PlayerId>;
  players: WorldPlayerState[];
  currentPlayer: PlayerId;
  turnNumber: number;
  phase: WorldPhase;
  dice: [number, number] | null;
  setupOrder: PlayerId[];
  setupIndex: number;
  /** Ultimo villaggio piazzato nel setup (la strada deve toccarlo). */
  setupLastTerritory: string | null;
  pendingTrade: TradeOffer | null;
  tradeCounter: number;
  grandeVia: { holder: PlayerId | null; length: number };
  grandeViaggiatore: { holder: PlayerId | null; continents: number };
  rng: RngState;
}

// ------------------------------------------------------------------ vista
export interface WorldPublicPlayer {
  id: PlayerId;
  name: string;
  color: string;
  bot?: BotLevel;
  jarl: string;
  movePointsLeft: number;
  /** Territori già «pagati» nel turno (pedaggio non più dovuto). */
  tollsPaidThisTurn: string[];
  handCount: number;
  points: number;
  /** Eroe del clan (informazione pubblica, come nella Classica). */
  hero?: WorldHeroId;
  /** Usi rimasti delle abilità a consumo (pubblici: informazione innocua). */
  heroUses?: Record<string, number>;
}

export interface WorldPlayerView {
  kind: 'world';
  viewer: PlayerId | null;
  config: WorldGameConfig;
  map: FrozenMap;
  territories: Record<string, TerritoryState>;
  roads: Record<string, PlayerId>;
  players: WorldPublicPlayer[];
  /** Mano del giocatore che guarda (null = spettatore). */
  hand: ResourceMap | null;
  currentPlayer: PlayerId;
  turnNumber: number;
  phase: WorldPhase;
  dice: [number, number] | null;
  pendingTrade: TradeOffer | null;
  grandeVia: { holder: PlayerId | null; length: number };
  grandeViaggiatore: { holder: PlayerId | null; continents: number };
}
