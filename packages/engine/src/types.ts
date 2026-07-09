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
  | 'tributo'
  /**
   * ASSALTO (modalità Battaglia): 3 copie aggiunte al mazzo solo se la Battaglia
   * è attiva. Giocarla vale come un attacco GRATIS (nessuna risorsa) a un
   * edificio avversario raggiunto da una propria strada.
   */
  | 'assalto';

/**
 * Carta CALAMITÀ (modalità opzionale). Una si rivela all'inizio di ogni giro
 * e vale SOLO per quel giro. Il discriminante è `kind` (per non confondersi col
 * `type` di azioni/fasi/eventi). Due famiglie:
 *  - PERSISTENTI: modificano le regole per tutto il giro (produzione, scambi,
 *    costruzioni, Drago, Carte Saga) — consultate da production/rules/validate.
 *  - ISTANTANEE: si risolvono subito alla rivelazione (scarti, guadagni), a
 *    volte aprendo una breve fase interattiva.
 */
export type CalamityCard =
  // --- Persistenti (valgono per tutto il giro) ---
  | { kind: 'materialeDoppio'; resource: Resource } // 1 · quel materiale si prende doppio
  | { kind: 'materialeBloccato'; resource: Resource } // 2 · quel materiale non si prende
  | { kind: 'dragoFermo' } // 3 · il Drago non si può spostare
  | { kind: 'nienteSaga' } // 4 · non si giocano Carte Saga
  | { kind: 'dragoPrimaDelTiro' } // 5 · a ogni turno si sposta il Drago prima di tirare
  | { kind: 'scambiTre' } // 6 · tutti gli scambi con la banca 3:1
  | { kind: 'scambioDue'; resource: Resource } // 7 · scambi di quel materiale 2:1
  | { kind: 'abbondanza' } // extra · TUTTI i materiali si prendono doppi
  | { kind: 'bufera' } // extra · non si costruiscono sentieri
  | { kind: 'assedio' } // extra · non si costruiscono roccaforti
  | { kind: 'mareInTempesta' } // extra · vietati gli scambi con la banca
  | { kind: 'mercatoOro' } // extra · tutti gli scambi con la banca 2:1
  // --- Istantanee (si risolvono all'inizio del giro) ---
  | { kind: 'leaderScartaTutto' } // 8 · chi ha più punti scarta tutte le risorse
  | { kind: 'tuttiScartanoMeta' } // 9 · tutti scartano metà delle risorse
  | { kind: 'ultimoPesca4' } // 10 · chi ha meno punti guadagna 4 risorse a scelta
  | { kind: 'ultimoStrade2' } // 11 · chi ha meno strade ne piazza 2 gratis
  | { kind: 'tuttiPiu2'; resource: Resource } // 12 · tutti guadagnano 2 di quel materiale
  | { kind: 'scartaFino7' } // 13 · chi ha più di 7 risorse scarta fino a 7
  | { kind: 'tuttiUnoDiTutto' } // 14 · tutti guadagnano 1 di ogni materiale
  | { kind: 'donoDegliDei' } // extra · tutti pescano 1 Carta Saga
  | { kind: 'bottino' } // extra · chi ha meno punti pesca 1 Carta Saga
  | { kind: 'razzia' }; // extra · chi ha più punti dà 1 risorsa a ciascun avversario

export type CalamityKind = CalamityCard['kind'];

export interface CalamityState {
  /** Mazzo rimanente, già mescolato col seed; si pesca dalla fine. */
  deck: CalamityCard[];
  /** Calamità attiva nel giro corrente (null prima del 1° giro o a mazzo finito). */
  current: CalamityCard | null;
}
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

/**
 * Colori personalizzati del Drago che NON dipendono dal colore del giocatore:
 * il corpo prende sempre il colore di chi l'ha mosso, questi sono gli accenti
 * (esadecimali `#rrggbb`). Assenti ⇒ i colori classici del tema.
 */
export interface DragonColors {
  /** Occhi del Drago. */
  eyes?: string;
  /** Fiamme/soffio del Drago. */
  fire?: string;
}

/**
 * Colori personalizzati della roccaforte che NON sono le bandiere del clan:
 * le bandiere restano tinte del colore del giocatore (per riconoscerlo), questi
 * accenti (esadecimali `#rrggbb`) riguardano la pietra. Assenti ⇒ colori classici.
 */
export interface StrongholdColors {
  /** Pietra della fortezza (la tonalità scura è derivata automaticamente). */
  stone?: string;
}

/**
 * Cosmetici (skin) del giocatore: PASSTHROUGH opaco legato all'account.
 * Il motore non li interpreta mai — li trasporta solo fino alla vista, dove
 * il renderer sceglie gli sprite. Id sconosciuti ⇒ aspetto classico.
 */
export interface PlayerCosmetics {
  /** Aspetto del Drago QUANDO è questo giocatore ad averlo spostato. */
  dragon?: string;
  /** Aspetto delle roccaforti di questo giocatore. */
  stronghold?: string;
  /** Ritocchi ai colori NON legati al giocatore del Drago (occhi, fiamme). */
  dragonColors?: DragonColors;
  /** Ritocchi ai colori NON legati alle bandiere della roccaforte (pietra). */
  strongholdColors?: StrongholdColors;
}

export interface PlayerConfig {
  name: string;
  color: PlayerColor;
  isBot: boolean;
  botLevel?: BotLevel;
  /** Skin scelte dall'account (facoltative, solo estetica). */
  cosmetics?: PlayerCosmetics;
}

export interface GameConfig {
  seed: string;
  players: PlayerConfig[];
  /** Se true, la generazione evita segnalini 6/8 su esagoni adiacenti. */
  avoidAdjacent68: boolean;
  targetGloryPoints: number;
  /** Raggio della tavola (2 = piccola/2–4 giocatori, 3 = grande/5–6). */
  boardRadius: number;
  /** Modalità Calamità: una carta per giro. false = partita standard. */
  calamities: boolean;
  /**
   * Modalità Battaglia: se attiva, un clan che ha raggiunto con una propria
   * strada la rete di un avversario può pagare per attaccarla. Due attacchi:
   *  - PESANTE: distrugge una casetta o declassa una roccaforte a casetta;
   *  - LEGGERO: spezza una strada avversaria all'estremità.
   * false = partita standard.
   */
  battle: boolean;
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
  /**
   * I due insediamenti INIZIALI del clan (piazzati nel setup). In modalità
   * Battaglia sono "case indistruttibili": non si possono distruggere finché
   * restano casette. Se vengono promossi a roccaforte tornano attaccabili (e
   * l'attacco li riporta a casetta, di nuovo indistruttibile).
   */
  initialVillages: VertexId[];
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
  | { type: 'moveDragon'; cause: 'sette' | 'berserker' | 'calamita' }
  | { type: 'steal'; candidates: PlayerId[]; cause: 'sette' | 'berserker' | 'calamita' }
  | { type: 'main' }
  | {
      /** Sentieri gratuiti della carta Costruttori di Sentieri. */
      type: 'freeRoads';
      remaining: number;
    }
  // --- Fasi interattive delle CALAMITÀ istantanee (inizio giro) ---
  | {
      /** Scarto simultaneo imposto da una calamità (metà / fino a 7). */
      type: 'calamityDiscard';
      mustDiscard: Record<PlayerId, number>;
    }
  | {
      /** Guadagno "a scelta" imposto da una calamità: quante risorse per giocatore. */
      type: 'calamityGain';
      mustGain: Record<PlayerId, number>;
    }
  | {
      /** Sentieri gratis della calamità: coda di giocatori, ciascuno ne piazza `remaining`. */
      type: 'calamityRoads';
      queue: PlayerId[];
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
  /** Modalità Calamità: mazzo + carta del giro. Assente nelle partite standard. */
  calamities?: CalamityState;
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
  /** Skin del giocatore (pubbliche: le vedono tutti sul tabellone). */
  cosmetics?: PlayerCosmetics;
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
  /** Raggio della tavola: il renderer e i bot lo usano per la topologia giusta. */
  boardRadius: number;
  /** Calamità attiva nel giro (null = nessuna in corso). */
  calamity: CalamityCard | null;
  /** Calamità ancora nel mazzo; null in modalità standard (per distinguere le due). */
  calamitiesLeft: number | null;
  /** Modalità Battaglia attiva: la UI abilita l'azione di attacco. */
  battle: boolean;
}
