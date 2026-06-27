/**
 * Modello dati del gioco. Tutto lo stato è JSON-puro (niente Map/Set/Date/classi):
 * serializzabile per il salvataggio, il replay e l'invio in rete (Fase 3).
 */
import type { RngState } from './rng';

export type Resource = 'legname' | 'pietra' | 'lana' | 'orzo' | 'ferro';
export type TerrainType = Resource | 'tundra';
export type ResourceCount = Record<Resource, number>;
export type SagaCard =
  | 'berserker'
  | 'sagaDegliEroi'
  | 'costruttoriDiSentieri'
  | 'banchetto'
  | 'tributo';
/**
 * Colore del clan: un esadecimale `#rrggbb` (palette libera, qualsiasi colore).
 * In passato era uno di cinque nomi fissi; ora il motore lo tratta come stringa
 * opaca — a interpretarlo è solo il renderer.
 */
export type PlayerColor = string;

export type HexId = string;
export type VertexId = string;
export type EdgeId = string;
/** Indice del giocatore nell'array `players` (0..3). */
export type PlayerId = number;

export interface Hex {
  id: HexId;
  q: number;
  r: number;
  terrain: TerrainType;
  /** Segnalino numerico 2..12 (mai 7); null solo sulla tundra. */
  token: number | null;
}

export type PortKind = 'generico' | Resource;

export interface Port {
  /** Spigolo costiero su cui si trova l'approdo: lo "possiede" chi ha un edificio su uno dei 2 vertici. */
  edge: EdgeId;
  kind: PortKind;
  ratio: 2 | 3;
}

export interface Board {
  hexes: Hex[];
  ports: Port[];
  /** Esagono attualmente occupato dal Drago (niente produzione lì). */
  dragonHex: HexId;
  /** Chi ha spostato il Drago per ultimo (per colorarlo); null all'inizio. */
  dragonMovedBy: PlayerId | null;
}

export type BotLevel = 'facile' | 'normale' | 'difficile' | 'esperto';

export interface PlayerConfig {
  name: string;
  color: PlayerColor;
  isBot: boolean;
  botLevel?: BotLevel;
}

export interface GameConfig {
  seed: string;
  players: PlayerConfig[];
  /** Se true, la generazione evita segnalini 6/8 su esagoni adiacenti. */
  avoidAdjacent68: boolean;
  targetGloryPoints: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  resources: ResourceCount;
  /** Carte Saga giocabili (acquistate nei turni precedenti). */
  sagaCards: SagaCard[];
  /** Carte comprate in questo turno: non giocabili fino al prossimo. */
  sagaCardsBoughtThisTurn: SagaCard[];
  /** Berserker giocati in totale (per la Furia dei Berserker). */
  playedBerserkers: number;
  villages: VertexId[];
  strongholds: VertexId[];
  roads: EdgeId[];
  // PUNTO DI ESTENSIONE: qui in Fase 4 verrà aggiunto un campo opzionale
  // `cosmetics` (id palette/skin scelti dal giocatore) che l'engine si limita
  // a trasportare senza interpretarlo.
}

export interface TradeOffer {
  id: number;
  from: PlayerId;
  /** Cosa OFFRE il proponente. */
  give: ResourceCount;
  /** Cosa CHIEDE il proponente (ciò che l'altro giocatore cede). */
  receive: ResourceCount;
  /** Destinatario specifico, oppure null = offerta aperta a tutti. */
  to: PlayerId | null;
  responses: Partial<Record<PlayerId, 'accettata' | 'rifiutata'>>;
}

export type Phase =
  | {
      type: 'setup';
      expecting: 'villaggio' | 'sentiero';
      /** Ultimo villaggio piazzato: il sentiero iniziale deve toccarlo. */
      lastVillage: VertexId | null;
    }
  | { type: 'preRoll' }
  | {
      /** Scarto simultaneo dopo un 7: mappa giocatore → carte da scartare. */
      type: 'discard';
      mustDiscard: Record<PlayerId, number>;
    }
  | { type: 'moveDragon'; cause: 'sette' | 'berserker' }
  | { type: 'steal'; candidates: PlayerId[]; cause: 'sette' | 'berserker' }
  | { type: 'main' }
  | {
      /** Sentieri gratuiti della carta Costruttori di Sentieri. */
      type: 'freeRoads';
      remaining: number;
    }
  | { type: 'gameOver'; winner: PlayerId };

export interface GameState {
  version: 1;
  config: GameConfig;
  rngState: RngState;
  board: Board;
  players: PlayerState[];
  bank: ResourceCount;
  /** Mazzo già mescolato; si pesca dalla fine. L'ordine è informazione nascosta. */
  sagaDeck: SagaCard[];
  currentPlayer: PlayerId;
  turnNumber: number;
  phase: Phase;
  /** Ultimo tiro (per la UI); null prima del primo tiro. */
  dice: [number, number] | null;
  rolledThisTurn: boolean;
  /** Già giocata una carta Saga in questo turno? (massimo 1, esclusi gli Eroi). */
  devCardPlayedThisTurn: boolean;
  /**
   * Ordine di gioco deciso dai dadi alla creazione della partita (il più alto
   * inizia, spareggi ritirati): viene mantenuto per TUTTA la partita.
   */
  turnOrder: PlayerId[];
  /** Tiri per l'ordine di partenza: round successivi solo per gli spareggi. */
  startingRolls: { player: PlayerId; dice: [number, number] }[][];
  /** Ordine a serpentina del setup, già espanso da turnOrder: es. [2,0,1,1,0,2]. */
  setupOrder: PlayerId[];
  setupIndex: number;
  pendingTrade: TradeOffer | null;
  tradeCounter: number;
  longestRoad: { holder: PlayerId | null; length: number };
  largestArmy: { holder: PlayerId | null; count: number };
}

// ---------------------------------------------------------------------------
// Viste strutturali minime per le regole geometriche
// ---------------------------------------------------------------------------

/**
 * Sottoinsieme strutturale dello stato sufficiente per le regole su pezzi e
 * percorsi: lo soddisfano sia `GameState` sia `PlayerView` (i pezzi sono
 * informazione pubblica). Permette ai bot di ragionare sulla vista filtrata
 * con le stesse funzioni del motore.
 */
export interface PiecesView {
  players: ReadonlyArray<{
    id: PlayerId;
    villages: VertexId[];
    strongholds: VertexId[];
    roads: EdgeId[];
  }>;
}

/** Come PiecesView, con in più gli approdi (per i rapporti di scambio). */
export interface TradeRatioView extends PiecesView {
  board: { ports: Port[] };
}

// ---------------------------------------------------------------------------
// Viste filtrate (informazione nascosta)
// ---------------------------------------------------------------------------

/** Ciò che TUTTI vedono di un giocatore. */
export interface PublicPlayer {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  isBot: boolean;
  /** Numero totale di carte risorsa in mano (non la composizione). */
  resourceCardCount: number;
  /** Numero totale di Carte Saga in mano (non quali). */
  sagaCardCount: number;
  playedBerserkers: number;
  villages: VertexId[];
  strongholds: VertexId[];
  roads: EdgeId[];
  /** Punti Gloria visibili (esclusi gli Eroi nascosti). */
  gloryPointsPublic: number;
}

/** Vista completa di sé stessi. */
export interface PrivateSelf {
  id: PlayerId;
  resources: ResourceCount;
  sagaCards: SagaCard[];
  sagaCardsBoughtThisTurn: SagaCard[];
  /** Punti totali inclusi gli Eroi nascosti. */
  gloryPointsTotal: number;
}

/**
 * Vista di gioco filtrata per un giocatore (o per uno spettatore).
 * È l'UNICA cosa che bot e client remoti (Fase 3) ricevono: l'informazione
 * nascosta (mani altrui, ordine del mazzo, stato RNG) non c'è proprio.
 */
export interface PlayerView {
  board: Board;
  bank: ResourceCount;
  sagaDeckCount: number;
  players: PublicPlayer[];
  me: PrivateSelf | null;
  currentPlayer: PlayerId;
  turnNumber: number;
  phase: Phase;
  dice: [number, number] | null;
  rolledThisTurn: boolean;
  devCardPlayedThisTurn: boolean;
  turnOrder: PlayerId[];
  startingRolls: { player: PlayerId; dice: [number, number] }[][];
  setupOrder: PlayerId[];
  setupIndex: number;
  pendingTrade: TradeOffer | null;
  longestRoad: { holder: PlayerId | null; length: number };
  largestArmy: { holder: PlayerId | null; count: number };
  targetGloryPoints: number;
}
