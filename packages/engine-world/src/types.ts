/**
 * Tipi di «Vikings Around the World»: mappa a territori, stato di gioco e vista.
 * Motore puro e separato dalla Modalità Classica (nessun import da @vikiland/engine).
 */
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

export interface LinkDef {
  a: string;
  b: string;
  kind: 'terra' | 'mare';
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
}

// ------------------------------------------------------------- giocatori
export type PlayerId = number;
export type BotLevel = 'facile' | 'normale' | 'difficile' | 'esperto';

export interface WorldPlayerConfig {
  name: string;
  color: string;
  bot?: BotLevel;
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
  | { type: 'setup'; expect: 'villaggio' | 'strada' }
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
