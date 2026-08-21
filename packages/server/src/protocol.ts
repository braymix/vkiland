/**
 * Protocollo client ↔ server (Fase 3 — online).
 *
 * Questi tipi sono importati TYPE-ONLY anche dal client web: un'unica fonte
 * di verità per eventi socket e DTO. Il server è autoritativo: i client
 * inviano `Action` come INTENZIONI; lo stato vero vive solo sul server.
 */
import type {
  Action,
  BoardShapeChoice,
  BoardSizeChoice,
  BotLevel,
  GameEvent,
  GameState,
  HeroId,
  LegalMove,
  PlayerColor,
  PlayerId,
  PlayerView,
} from '@vikiland/engine';

// ---------------------------------------------------------------------------
// REST (autenticazione)
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  /** Il nome utente è anche il nome in gioco (1–12 caratteri, unico). */
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
}

export interface ApiError {
  error: string;
}

// ---------------------------------------------------------------------------
// Lobby
// ---------------------------------------------------------------------------

export interface LobbyConfig {
  avoidAdjacent68: boolean;
  targetGloryPoints: number;
  /** Secondi per turno (0 = nessun timer). Allo scadere il server gioca una mossa di default. */
  turnTimerSec: number;
  /** true = elencata tra le partite pubbliche: chiunque può entrare senza codice. */
  isPublic: boolean;
  /** Modalità Calamità: una carta per giro. */
  calamities: boolean;
  /** Modalità Battaglia: attacchi agli edifici avversari raggiunti. */
  battle: boolean;
  /** Modalità Capitale: la Capitale, evoluzione della Roccaforte (una sola per clan). */
  capitale: boolean;
  /** Modalità Eroi: ogni clan gioca con uno o più eroi (scelti per-posto in `LobbySlot.heroes`). */
  heroes?: boolean;
  /**
   * Modalità Eroi: «numero di eroi» per clan (quanti eroi DISTINTI ciascun
   * giocatore sceglie). Assente = 1 (comportamento classico). Presente solo con
   * `heroes`.
   */
  heroesPerPlayer?: number;
  /**
   * Scelta esplicita della tavola grande ('grande' 29 caselle / 'gigante' 37);
   * assente = tavola consigliata dal numero di giocatori (piccola per 2–4).
   */
  boardSize?: BoardSizeChoice;
  /**
   * Forma della tavola: 'rientranze' = isola casuale (golfi, penisole, ponti)
   * con lo stesso numero di caselle della taglia. Assente = esagono classico.
   */
  boardShape?: BoardShapeChoice;
  /**
   * «Campo libero»: numero TOTALE di caselle scelto a mano. Se presente vince
   * sulla taglia/forma preset (isola compatta di tante caselle). Assente = preset.
   */
  hexCount?: number;
  /**
   * Numero di DESERTI (tundra); assente = default della taglia. Minimo 1
   * (il Drago parte da un deserto).
   */
  desertCount?: number;
  /** Seme della mappa (opzionale: undefined = casuale). */
  seed?: string;
  /** Modalità Squadra attiva. Le squadre (per-posto) vivono in `LobbySlot.team`. */
  teamMode?: boolean;
  /** Numero di squadre (di ugual dimensione). Usato solo con `teamMode`. */
  numTeams?: number;
  /** Colore di ciascuna squadra (indicizzato per squadra). Usato solo con `teamMode`. */
  teamColors?: string[];
  /** Nome di ciascuna squadra (facoltativo, indicizzato per squadra). Usato solo con `teamMode`. */
  teamNames?: string[];
  /** Bersaglio Punti Gloria PER GIOCATORE in squadra (default 8; combinato = ×giocatori-per-squadra). */
  teamTargetPerPlayer?: number;
}

/** Riga della lista delle partite pubbliche aperte. */
export interface PublicLobbySummary {
  code: string;
  hostName: string;
  players: number;
  maxPlayers: number;
  turnTimerSec: number;
}

/**
 * Riga della lista delle partite PUBBLICHE già in corso, che si possono solo
 * GUARDARE (non entrare): compaiono sotto le partite pubbliche aperte.
 */
export interface WatchableGameSummary {
  code: string;
  hostName: string;
  players: number;
  /** Giro corrente della partita (per far capire "a che punto è"). */
  turnNumber: number;
  /** Quanti spettatori la stanno già guardando. */
  spectators: number;
}

/** Esito dell'entrata come spettatore: la partita da guardare (o un errore). */
export interface WatchResult {
  code: string;
  /** Stato della lobby/partita (posti, colori, host) per la UI dello spettatore. */
  state: LobbyState;
}

/**
 * Richiesta di uno spettatore di vedere la mano di un giocatore. Il server la
 * recapita SOLO al giocatore bersaglio, che risponde col permesso (sì/no).
 */
export interface HandRequest {
  /** Utente spettatore che ha chiesto (identità per rispondere in modo mirato). */
  spectatorId: string;
  /** Nome dello spettatore, per il popup del giocatore. */
  spectatorName: string;
  /** Posto del giocatore a cui si chiede il permesso (il suo). */
  seat: PlayerId;
}

export interface LobbySlot {
  /** null per i bot. */
  userId: string | null;
  name: string;
  isBot: boolean;
  botLevel: BotLevel | null;
  /** Colore del clan, scelto nella lobby (mai due uguali). */
  color: PlayerColor;
  /** Connessione socket attiva (per mostrare chi è presente). */
  connected: boolean;
  /** Modalità Squadra: indice di squadra di questo posto (0 se non attiva). */
  team: number;
  /** Modalità Eroi: eroi scelti dal posto (vuoto = nessuno ancora). */
  heroes?: HeroId[];
}

export interface LobbyState {
  code: string;
  hostUserId: string;
  config: LobbyConfig;
  slots: LobbySlot[];
  /** true quando la partita è partita (la lobby diventa stanza di gioco). */
  started: boolean;
  isPublic: boolean;
}

// ---------------------------------------------------------------------------
// Partita: aggiornamenti per-giocatore (già filtrati dal server)
// ---------------------------------------------------------------------------

export interface GameUpdate {
  /** Vista filtrata del giocatore destinatario. */
  view: PlayerView;
  /**
   * Posto a sedere del destinatario. Per uno SPETTATORE vale -1 (non è seduto):
   * la UI lo riconosce da `spectator` e disabilita ogni azione.
   */
  seat: PlayerId;
  /**
   * true = questo aggiornamento è per uno SPETTATORE (vista senza la propria
   * mano, nessuna mossa legale; le mani altrui appaiono solo se rivelate).
   */
  spectator?: boolean;
  /** Mosse legali del destinatario (calcolate dal server). */
  legalActions: LegalMove[];
  /** Eventi dell'ultimo passo, filtrati per il destinatario (per il diario). */
  events: GameEvent[];
  generation: number;
  /** Scadenza del timer di turno (epoch ms) oppure null. */
  turnDeadline: number | null;
  /** Stato COMPLETO, presente solo a partita finita (per la schermata vittoria). */
  finalState: GameState | null;
}

/** Rifiuto di un'azione (il client la mostra come errore non bloccante). */
export interface ActionRejected {
  message: string;
  generation: number;
}

// ---------------------------------------------------------------------------
// Chat di partita (lobby + gioco in corso)
// ---------------------------------------------------------------------------

/**
 * Messaggio di chat inoltrato dal server a tutti i presenti nella stanza
 * (giocatori seduti e spettatori). Il testo è già ripulito e limitato lato
 * server; il client si limita a mostrarlo.
 */
export interface ChatMessage {
  /** Id progressivo assegnato dal server (chiave stabile per la lista). */
  id: number;
  /** Autore (per riconoscere «i miei» messaggi lato client). */
  userId: string;
  /** Nome mostrato del mittente. */
  name: string;
  /** Posto del mittente (0…n-1) oppure -1 se è uno spettatore. */
  seat: PlayerId;
  /** Colore del clan del mittente (assente per gli spettatori). */
  color?: PlayerColor;
  /** true = il mittente sta guardando la partita da spettatore. */
  spectator: boolean;
  /** Testo del messaggio (ripulito e troncato dal server). */
  text: string;
  /** Momento dell'invio (epoch ms). */
  ts: number;
}

// ---------------------------------------------------------------------------
// Mappa eventi socket (server → client e client → server)
// ---------------------------------------------------------------------------

export interface ServerToClientEvents {
  'lobby:state': (state: LobbyState) => void;
  'lobby:error': (e: ApiError) => void;
  'lobby:closed': (e: ApiError) => void;
  'game:update': (u: GameUpdate) => void;
  'game:rejected': (r: ActionRejected) => void;
  /** Uno spettatore chiede di vedere la tua mano: mostra il popup di permesso. */
  'spectator:handRequest': (req: HandRequest) => void;
  /** Nuovo messaggio di chat da mostrare (per tutti i presenti nella stanza). */
  'chat:message': (msg: ChatMessage) => void;
}

export interface ClientToServerEvents {
  'lobby:create': (config: LobbyConfig, cb: (res: LobbyState | ApiError) => void) => void;
  /** Solo l'host, solo prima dell'avvio: cambia la configurazione della lobby già creata. */
  'lobby:updateConfig': (config: LobbyConfig, cb: (res: LobbyState | ApiError) => void) => void;
  /** Lista delle partite pubbliche aperte (non iniziate, con posti liberi). */
  'lobby:list': (cb: (rooms: PublicLobbySummary[]) => void) => void;
  /** Lista delle partite pubbliche IN CORSO, che si possono solo guardare. */
  'lobby:listWatchable': (cb: (games: WatchableGameSummary[]) => void) => void;
  'lobby:join': (code: string, cb: (res: LobbyState | ApiError) => void) => void;
  /**
   * Entra come SPETTATORE in una partita in corso (pubblica, oppure privata se
   * si conosce il codice). Non occupa un posto: si guarda soltanto.
   */
  'lobby:watch': (code: string, cb: (res: WatchResult | ApiError) => void) => void;
  /** Smette di guardare la partita che si stava seguendo da spettatore. */
  'lobby:stopWatch': () => void;
  'lobby:leave': () => void;
  'lobby:addBot': (level: BotLevel) => void;
  'lobby:removeSlot': (index: number) => void;
  /** Cambia il colore di un posto (il proprio sempre; i bot solo l'host). */
  'lobby:setColor': (index: number, color: PlayerColor) => void;
  /** Modalità Squadra: assegna un posto a una squadra (il proprio, oppure l'host per tutti). */
  'lobby:setTeam': (index: number, team: number) => void;
  /** Modalità Eroi: imposta gli eroi di un posto (il proprio; l'host anche per i bot). */
  'lobby:setHeroes': (index: number, heroes: HeroId[]) => void;
  'lobby:start': () => void;
  /** Solo l'host: chiude la partita/lobby per TUTTI, anche a partita in corso. */
  'lobby:terminate': () => void;
  'game:action': (action: Action) => void;
  /** Richiesta esplicita dell'ultimo stato (es. dopo riconnessione). */
  'game:refresh': () => void;
  /** Annulla l'ultimo piazzamento del giocatore. */
  'game:undo': () => void;
  /** Spettatore: chiede al giocatore seduto in `seat` di vedergli la mano. */
  'spectator:requestHand': (seat: PlayerId) => void;
  /** Giocatore: risponde alla richiesta di uno spettatore (permette o nega). */
  'spectator:respondHand': (spectatorId: string, allow: boolean) => void;
  /** Invia un messaggio di chat alla stanza (lobby o partita in corso). */
  'chat:send': (text: string) => void;
}

export function isApiError(x: unknown): x is ApiError {
  return typeof x === 'object' && x !== null && 'error' in x;
}
