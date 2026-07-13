/**
 * Interfaccia comune dei controller di partita: la UI (GameScreen) non sa se
 * gioca in locale (`LocalGameController`, Fasi 1-2) o online
 * (`RemoteGameController`, Fase 3) — stessa fotografia, stessi metodi.
 */
import type {
  Action,
  GameState,
  LegalMove,
  PlayerId,
  PlayerView,
  ValidationError,
} from '@vikiland/engine';
import type { GameStats } from './stats';

export interface LogEntry {
  id: number;
  text: string;
}

/** Fotografia immutabile per React (useSyncExternalStore). */
export interface GameSnapshot {
  /** Vista (filtrata) dell'umano che sta guardando lo schermo. */
  view: PlayerView;
  /** Il posto dell'umano al tavolo/al monitor. */
  viewpoint: PlayerId;
  humans: PlayerId[];
  /** Hot-seat: a chi va passato il dispositivo (sempre null online). */
  handoff: PlayerId | null;
  legalActions: LegalMove[];
  log: LogEntry[];
  generation: number;
  /** Stato COMPLETO solo a partita finita (per la schermata di vittoria). */
  finalState: GameState | null;
  /** Errore arrivato dal server (online); in locale gli errori sono sincroni. */
  remoteError: { id: number; message: string } | null;
  /** Scadenza del timer di turno (epoch ms) se attivo (online). */
  turnDeadline: number | null;
  /** Ultimo tiro di dadi (id crescente per ri-animare anche numeri uguali). */
  lastRoll: { id: number; dice: [number, number]; total: number } | null;
  /** Statistiche cumulate della partita (per la schermata di fine partita). */
  stats: GameStats;
  /**
   * Si può annullare l'ULTIMO piazzamento di costruzione (sentiero/villaggio/
   * roccaforte, anche nel setup)? Vero solo se è stato l'umano che guarda lo
   * schermo a piazzarlo e da allora nessun altro ha agito. Online: possibile se
   * è il turno del giocatore che guarda lo schermo.
   */
  canUndo: boolean;
  /**
   * true = si sta GUARDANDO la partita da spettatore (nessuna mano propria,
   * nessuna azione). Assente/false nelle partite giocate normalmente.
   */
  spectator?: boolean;
  /**
   * Richiesta pendente di uno spettatore che vuole vedere la propria mano:
   * il giocatore deve rispondere (permetti/nega). null/assente = nessuna.
   */
  handRequest?: { spectatorId: string; spectatorName: string } | null;
}

export interface GameController {
  subscribe(cb: () => void): () => void;
  getSnapshot(): GameSnapshot;
  /** Locale: errore sincrono o null. Online: sempre null (errori via snapshot). */
  dispatch(action: Action): ValidationError | null;
  /** Annulla l'ultimo piazzamento di costruzione (no-op se non si può). */
  undo(): void;
  confirmHandoff(): void;
  dispose(): void;
  /** Spettatore: chiede al giocatore in `seat` di vedergli la mano (solo online). */
  requestHand?(seat: PlayerId): void;
  /** Giocatore: risponde alla richiesta di uno spettatore (solo online). */
  respondHand?(spectatorId: string, allow: boolean): void;
}
