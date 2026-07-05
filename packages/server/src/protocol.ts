/**
 * Protocollo client ↔ server (Fase 3 — online).
 *
 * Questi tipi sono importati TYPE-ONLY anche dal client web: un'unica fonte
 * di verità per eventi socket e DTO. Il server è autoritativo: i client
 * inviano `Action` come INTENZIONI; lo stato vero vive solo sul server.
 */
import type {
  Action,
  BotLevel,
  GameEvent,
  GameState,
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
  /** Seme della mappa (opzionale: undefined = casuale). */
  seed?: string;
}

/** Riga della lista delle partite pubbliche aperte. */
export interface PublicLobbySummary {
  code: string;
  hostName: string;
  players: number;
  maxPlayers: number;
  turnTimerSec: number;
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
  /** Posto a sedere del destinatario. */
  seat: PlayerId;
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
// Mappa eventi socket (server → client e client → server)
// ---------------------------------------------------------------------------

export interface ServerToClientEvents {
  'lobby:state': (state: LobbyState) => void;
  'lobby:error': (e: ApiError) => void;
  'lobby:closed': (e: ApiError) => void;
  'game:update': (u: GameUpdate) => void;
  'game:rejected': (r: ActionRejected) => void;
}

export interface ClientToServerEvents {
  'lobby:create': (config: LobbyConfig, cb: (res: LobbyState | ApiError) => void) => void;
  /** Lista delle partite pubbliche aperte (non iniziate, con posti liberi). */
  'lobby:list': (cb: (rooms: PublicLobbySummary[]) => void) => void;
  'lobby:join': (code: string, cb: (res: LobbyState | ApiError) => void) => void;
  'lobby:leave': () => void;
  'lobby:addBot': (level: BotLevel) => void;
  'lobby:removeSlot': (index: number) => void;
  /** Cambia il colore di un posto (il proprio sempre; i bot solo l'host). */
  'lobby:setColor': (index: number, color: PlayerColor) => void;
  'lobby:start': () => void;
  /** Solo l'host: chiude la partita/lobby per TUTTI, anche a partita in corso. */
  'lobby:terminate': () => void;
  'game:action': (action: Action) => void;
  /** Richiesta esplicita dell'ultimo stato (es. dopo riconnessione). */
  'game:refresh': () => void;
}

export function isApiError(x: unknown): x is ApiError {
  return typeof x === 'object' && x !== null && 'error' in x;
}
