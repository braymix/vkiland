/**
 * Modello dati del gioco. Tutto lo stato è JSON-puro (niente Map/Set/Date/classi):
 * serializzabile per il salvataggio, il replay e l'invio in rete (Fase 3).
 */
import type { RngState } from './rng';
import type { HeroId } from './heroes';

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
   * RAZZIA (carta sviluppo, SEMPRE nel mazzo: 3 copie). Si gioca posandola su
   * una casella, che si illumina del colore del razziatore. Da quel momento e
   * fino al RITORNO del suo turno la produzione di QUELLA casella (quando esce
   * il suo numero) è dirottata: i proprietari non prendono nulla, la incassa
   * tutta il razziatore. Le altre caselle fruttano normalmente.
   */
  | 'razzia'
  /**
   * ASSALTO (modalità Battaglia): 2 copie aggiunte al mazzo solo se la Battaglia
   * è attiva. Giocarla vale come un attacco PESANTE GRATIS (nessuna risorsa) a
   * un edificio avversario raggiunto da una propria strada.
   */
  | 'assalto'
  /**
   * ASSALTO LEGGERO (modalità Battaglia): 3 copie aggiunte al mazzo solo se la
   * Battaglia è attiva. Giocarla vale come un attacco LEGGERO GRATIS: spezza una
   * strada avversaria all'estremità raggiunta da una propria strada.
   */
  | 'assaltoLeggero'
  /**
   * CAMBIA SORTE (modalità Calamità): 3 copie aggiunte al mazzo solo se le
   * Calamità sono attive. Giocarla sostituisce la calamità del giro con la
   * prossima calamità PERSISTENTE del mazzo (una scommessa: può andare meglio
   * o peggio).
   */
  | 'cambiaCalamita';

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
  | { kind: 'razzia' } // extra · chi ha più punti dà 1 risorsa a ciascun avversario
  | { kind: 'frana' }; // extra · chi ha più strade ne perde 1 marginale a sua scelta (mai le 2 iniziali)

export type CalamityKind = CalamityCard['kind'];

export interface CalamityState {
  /** Mazzo rimanente, già mescolato col seed; si pesca dalla fine. */
  deck: CalamityCard[];
  /** Calamità attiva nel giro corrente (null prima del 1° giro o a mazzo finito). */
  current: CalamityCard | null;
}

/**
 * RAZZIA in corso (carta sviluppo omonima). Un clan l'ha giocata su una
 * casella: fino al ritorno del SUO turno la produzione di QUELLA casella va a lui.
 */
export interface RazziaState {
  /** Chi ha giocato la Razzia: incassa la produzione della casella colpita finché è attiva. */
  player: PlayerId;
  /** Casella colpita: si illumina del colore del razziatore ed è la sola dirottata. */
  hex: HexId;
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

/**
 * Scelta esplicita della dimensione della tavola grande:
 *  - 'grande'  → 30 caselle (la gigante con due lati adiacenti in meno), consigliata 5–6;
 *  - 'gigante' → 37 caselle (esagono pieno), consigliata 7–8.
 * Assente = tavola consigliata dal numero di giocatori (piccola per 2–4).
 */
export type BoardSizeChoice = 'grande' | 'gigante';

/**
 * Forma della tavola, indipendente dalla taglia:
 *  - assente → esagono classico (convesso) della taglia scelta;
 *  - 'rientranze' → isola dalla forma CASUALE e non esagonale (golfi, penisole,
 *    insenature) con lo STESSO numero di caselle della taglia, dove si possono
 *    costruire PONTI per scavalcare i golfi larghi «una strada».
 *  - 'libera' → «campo libero»: isola COMPATTA con un numero di caselle scelto a
 *    mano (vedi `NewGameOptions.hexCount`). La topologia si ricava dalle caselle
 *    come per 'rientranze', ma la crescita compatta evita i golfi (di norma
 *    nessun ponte). Valore DERIVATO: lo imposta il motore, non l'interfaccia.
 */
export type BoardShapeChoice = 'rientranze' | 'libera';

export interface GameConfig {
  seed: string;
  players: PlayerConfig[];
  /** Se true, la generazione evita segnalini 6/8 su esagoni adiacenti. */
  avoidAdjacent68: boolean;
  targetGloryPoints: number;
  /**
   * CODICE della tavola (chiave della topologia): 2 = piccola (2–4), 3 = gigante
   * (7–8, esagono pieno raggio 3), 5 = grande (5–6, la gigante con 2 lati in meno).
   * Il nome resta `boardRadius` per compatibilità; per la piccola/gigante il
   * codice coincide col raggio geometrico.
   */
  boardRadius: number;
  /**
   * Forma della tavola. Assente = esagono convesso classico; 'rientranze' =
   * isola casuale con golfi e ponti (vedi `BoardShapeChoice`). Su questa forma
   * la topologia NON è ricavabile dal solo `boardRadius`: si ricostruisce dalle
   * caselle (`board.hexes`), che restano l'unica fonte di verità della forma.
   */
  boardShape?: BoardShapeChoice;
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
  /**
   * MODALITÀ CAPITALE (opzionale): abilita la costruzione della Capitale,
   * evoluzione di una Roccaforte. Se ne può costruire UNA SOLA per clan, vale 3
   * Punti Gloria, fa prendere 3 materiali al posto di 2 e non si può mai
   * distruggere (nemmeno in Battaglia). false = partita standard.
   */
  capitale: boolean;
  /**
   * MODALITÀ EROI (opzionale): ogni clan gioca con uno o PIÙ EROI (vedi
   * `heroes.ts`) dalle abilità passive o attivabili. Gli eroi scelti sono in
   * `PlayerState.heroes`. false = partita standard senza eroi.
   */
  heroes: boolean;
  /**
   * MODALITÀ CARTE COPERTE (opzionale): durante il setup (piazzamento dei due
   * insediamenti iniziali) i MATERIALI delle caselle restano nascosti — si
   * vedono solo i NUMERI. Finito il setup i terreni si rivelano e la partita
   * procede normalmente. È solo informazione: il motore conosce sempre i
   * terreni (produzione, generazione); a nasconderli è la vista (`getPlayerView`).
   * false = partita standard (terreni sempre visibili).
   */
  carteCoperte: boolean;
  /**
   * MODALITÀ SQUADRA (opzionale): un indice di squadra per giocatore
   * (`teams[i]` = squadra del giocatore i). Le squadre sono di ugual dimensione.
   * In squadra strade/approdi/Grande Via/Furia sono in comune e gli scambi solo
   * fra compagni. Assente = partita a tutti contro tutti (comportamento classico).
   */
  teams?: number[];
  /**
   * Colore di ciascuna squadra (esadecimale `#rrggbb`), indicizzato per squadra.
   * Le costruzioni prendono questo come colore principale; il colore personale
   * del giocatore (`PlayerConfig.color`) resta come «bandiera». Presente solo con
   * `teams`.
   */
  teamColors?: string[];
  /**
   * Nome di ciascuna squadra (indicizzato per squadra). Facoltativo: dove manca
   * (voce vuota o array assente) la UI ripiega su «Squadra A/B/…». Presente solo
   * con `teams`.
   */
  teamNames?: string[];
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
  /**
   * MODALITÀ CAPITALE (opzionale): la (unica) Capitale del clan, evoluzione di
   * una Roccaforte. Il vertice resta ANCHE in `strongholds` (per rete, approdi,
   * distanza…): questo array è solo il "di più" della Capitale (produce 3 e vale
   * 3 Punti Gloria invece di 2, e non si può mai distruggere). Al massimo una.
   */
  capitals: VertexId[];
  roads: EdgeId[];
  /**
   * I due insediamenti INIZIALI del clan (piazzati nel setup). In modalità
   * Battaglia sono "case indistruttibili": non si possono distruggere finché
   * restano casette. Se vengono promossi a roccaforte tornano attaccabili (e
   * l'attacco li riporta a casetta, di nuovo indistruttibile).
   */
  initialVillages: VertexId[];
  /**
   * I due sentieri INIZIALI del clan (piazzati nel setup). La calamità «Frana»
   * non li può mai far crollare: si spezzano solo le strade costruite dopo.
   */
  initialRoads: EdgeId[];
  /**
   * MODALITÀ EROI: gli eroi scelti dal clan (assente/vuoto fuori dalla modalità).
   * Ogni clan può giocare con PIÙ eroi (numero deciso dalle regole, «numero di
   * eroi»), tutti DISTINTI: le loro abilità si sommano. Interpretate dal motore
   * consultando `heroes.ts`.
   */
  heroes?: HeroId[];
  /**
   * MODALITÀ EROI: usi rimasti delle abilità a consumo «per partita»
   * (es. { mutaporto: 1 } per Njord, { mercante: 4 } per Gest). Assente se
   * l'eroe non ha abilità a consumo.
   */
  heroUses?: Record<string, number>;
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
      /**
       * MODALITÀ EROI (Apripista): sentieri iniziali ancora da piazzare per la
       * casa corrente prima di passare al giocatore successivo. Assente = 1
       * (comportamento classico); con Vegard vale 2.
       */
      roadsLeft?: number;
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
  | {
      /**
       * Calamità «Frana»: il giocatore con più strade sceglie quale sua strada
       * MARGINALE (all'estremità, mai una delle due iniziali) far crollare.
       */
      type: 'calamityFrana';
      player: PlayerId;
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
  /**
   * Modalità Squadra: numero di scambi fra compagni già conclusi in questo turno
   * (massimo 2). Si azzera all'inizio di ogni turno. Assente nelle partite
   * classiche (nessun limite di questo tipo).
   */
  teamTradesThisTurn?: number;
  longestRoad: { holder: PlayerId | null; length: number };
  largestArmy: { holder: PlayerId | null; count: number };
  /** Modalità Calamità: mazzo + carta del giro. Assente nelle partite standard. */
  calamities?: CalamityState;
  /**
   * RAZZIA attiva (carta sviluppo): dirotta al razziatore la produzione della
   * casella colpita finché non torna il suo turno. Assente/null = nessuna razzia.
   */
  razzia?: RazziaState | null;
  /**
   * MODALITÀ EROI (Comandante Ulfar): spostamenti del Drago ancora dovuti per il
   * Berserker appena giocato (2 → 1 → esaurito). Assente/0 = comportamento
   * classico (un solo spostamento).
   */
  heroBerserkerMovesLeft?: number;
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

/**
 * Terreno come appare in una VISTA. Di norma è un `TerrainType` reale; in
 * modalità Carte Coperte, durante il setup, il materiale è nascosto e vale
 * il sentinella `'coperta'` (si conosce solo il numero della casella). Il
 * motore non usa mai questo valore: esiste solo nelle viste filtrate.
 */
export type ViewTerrain = TerrainType | 'coperta';

/** Casella come appare in una vista (il terreno può essere `'coperta'`). */
export interface ViewHex extends Omit<Hex, 'terrain'> {
  terrain: ViewTerrain;
}

/** Tavola come appare in una vista (caselle con terreno eventualmente coperto). */
export interface ViewBoard extends Omit<Board, 'hexes'> {
  hexes: ViewHex[];
}

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
  /** Modalità Capitale: la Capitale del clan (evoluzione di una Roccaforte). */
  capitals: VertexId[];
  roads: EdgeId[];
  /** Punti Gloria visibili (esclusi gli Eroi nascosti). */
  gloryPointsPublic: number;
  /** MODALITÀ EROI: gli eroi scelti dal clan (pubblici: li vedono tutti). */
  heroes?: HeroId[];
  /** Skin del giocatore (pubbliche: le vedono tutti sul tabellone). */
  cosmetics?: PlayerCosmetics;
  /**
   * Mano RIVELATA a uno spettatore: presente SOLO nella vista di uno spettatore
   * e SOLO per i giocatori che gli hanno dato il permesso ("guarda partita").
   * Mai presente nella vista di un giocatore normale (le mani altrui restano
   * segrete). Assente = mano nascosta (si vedono solo i conteggi).
   */
  hand?: { resources: ResourceCount; sagaCards: SagaCard[] };
}

/** Vista completa di sé stessi. */
export interface PrivateSelf {
  id: PlayerId;
  resources: ResourceCount;
  sagaCards: SagaCard[];
  sagaCardsBoughtThisTurn: SagaCard[];
  /** Punti totali inclusi gli Eroi nascosti. */
  gloryPointsTotal: number;
  /** MODALITÀ EROI: usi rimasti delle proprie abilità a consumo (assente se nessuna). */
  heroUses?: Record<string, number>;
}

/**
 * Vista di gioco filtrata per un giocatore (o per uno spettatore).
 * È l'UNICA cosa che bot e client remoti (Fase 3) ricevono: l'informazione
 * nascosta (mani altrui, ordine del mazzo, stato RNG) non c'è proprio.
 */
export interface PlayerView {
  board: ViewBoard;
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
  /** Raggio geometrico della tavola: il renderer e i bot lo usano per la geometria (canvas, posizioni). */
  boardRadius: number;
  /** Forma della tavola (assente = esagono classico; 'rientranze' = isola con golfi/ponti). */
  boardShape?: BoardShapeChoice;
  /** Calamità attiva nel giro (null = nessuna in corso). */
  calamity: CalamityCard | null;
  /** Calamità ancora nel mazzo; null in modalità standard (per distinguere le due). */
  calamitiesLeft: number | null;
  /** Modalità Battaglia attiva: la UI abilita l'azione di attacco. */
  battle: boolean;
  /** Modalità Capitale attiva: la UI abilita la costruzione della Capitale. */
  capitale: boolean;
  /** Modalità Eroi attiva: la UI mostra gli eroi e le loro abilità attivabili. */
  heroes: boolean;
  /**
   * Modalità Carte Coperte attiva. Mentre `phase.type === 'setup'` i terreni di
   * `board.hexes` sono nascosti (`terrain === 'coperta'`, solo il numero è
   * visibile); finito il setup i terreni compaiono e si gioca normalmente.
   */
  carteCoperte: boolean;
  /**
   * Modalità Squadra: indice di squadra per giocatore (come `config.teams`).
   * Assente = partita a tutti contro tutti. La UI la usa per i colori e per
   * capire chi è compagno; le regole geometriche per la rete in comune.
   */
  teams?: number[];
  /** Colore di ciascuna squadra (per la resa: colore principale delle costruzioni). */
  teamColors?: string[];
  /** Nome di ciascuna squadra; voce vuota/assente ⇒ la UI usa «Squadra A/B/…». */
  teamNames?: string[];
  /**
   * RAZZIA in corso (carta sviluppo): la casella `hex` va illuminata del colore
   * del razziatore e la sua produzione è tutta sua. null = nessuna razzia.
   */
  razzia: RazziaState | null;
}
