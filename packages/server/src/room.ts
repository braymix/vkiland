/**
 * Stanza di gioco AUTORITATIVA. Lo stato completo vive solo qui: i client
 * mandano `Action` come intenzioni, il server le valida con lo stesso engine
 * del client (anti-cheat) e rimanda a ciascun posto la PROPRIA vista filtrata
 * e gli eventi filtrati. I bot girano lato server.
 */
import {
  applyAction,
  createGame,
  filterEventsForPlayer,
  getLegalActions,
  getPlayerView,
  type Action,
  type BotLevel,
  type GameEvent,
  type GameState,
  type PlayerColor,
  type PlayerCosmetics,
  type PlayerId,
} from '@vikiland/engine';
import { createBot, type Bot } from '@vikiland/bots';
import type { GameUpdate, LobbyConfig } from './protocol';
import type { FinishedGameRecord } from './storage';
import { defaultActionFor } from './defaultAction';

export interface Seat {
  userId: string | null;
  name: string;
  isBot: boolean;
  botLevel: BotLevel | null;
  color: PlayerColor;
  /** Skin dell'account (passthrough estetico verso il motore). */
  cosmetics?: PlayerCosmetics;
}

export interface RoomCallbacks {
  /** Recapita l'aggiornamento al giocatore umano seduto a `seat`. */
  sendUpdate(seat: PlayerId, update: GameUpdate): void;
  sendRejected(seat: PlayerId, message: string, generation: number): void;
  onFinished(record: FinishedGameRecord): void;
}

export interface RoomOptions {
  /** Ritardo dei bot [min,max] ms (nei test: [0,0]). */
  botDelayMs?: [number, number];
}

/** Le azioni ANNULLABILI: solo i piazzamenti di costruzioni (setup incluso). */
const UNDOABLE_BUILDS = new Set<Action['type']>([
  'piazzaVillaggioIniziale',
  'piazzaSentieroIniziale',
  'costruisciSentiero',
  'costruisciVillaggio',
  'costruisciRoccaforte',
  'piazzaSentieroGratis',
]);

/** Istantanea per annullare un piazzamento: stato PRIMA dell'azione. */
interface UndoEntry {
  state: GameState;
  lastAction: Action;
}

export class GameRoom {
  readonly code: string;
  readonly seed: string;
  readonly startedAt = Date.now();
  private state: GameState;
  private readonly seats: Seat[];
  private readonly config: LobbyConfig;
  private readonly bots = new Map<PlayerId, Bot>();
  private readonly callbacks: RoomCallbacks;
  private readonly botDelay: [number, number];
  private readonly actionLog: Action[] = [];
  private generation = 0;
  private turnDeadline: number | null = null;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private turnTimer: ReturnType<typeof setTimeout> | null = null;
  private finished = false;
  private disposed = false;
  /** Stack di annullamenti per il giocatore corrente. */
  private undoStack: UndoEntry[] = [];
  /** Ultimo giocatore che ha piazzato una costruzione. */
  private lastBuilderSeat: PlayerId | null = null;

  constructor(
    code: string,
    seed: string,
    seats: Seat[],
    config: LobbyConfig,
    callbacks: RoomCallbacks,
    opts: RoomOptions = {}
  ) {
    this.code = code;
    this.seed = seed;
    this.seats = seats;
    this.config = config;
    this.callbacks = callbacks;
    this.botDelay = opts.botDelayMs ?? [300, 700];
    this.state = createGame({
      seed,
      players: seats.map((s) => ({
        name: s.name,
        color: s.color,
        isBot: s.isBot,
        ...(s.botLevel ? { botLevel: s.botLevel } : {}),
        ...(s.cosmetics ? { cosmetics: s.cosmetics } : {}),
      })),
      avoidAdjacent68: config.avoidAdjacent68,
      targetGloryPoints: config.targetGloryPoints,
      calamities: config.calamities,
      battle: config.battle,
      ...(config.boardSize ? { boardSize: config.boardSize } : {}),
    });
    seats.forEach((s, i) => {
      if (s.isBot) this.bots.set(i, createBot(s.botLevel ?? 'normale'));
    });
    this.armTurnTimer();
    this.scheduleBots();
  }

  get isFinished(): boolean {
    return this.finished;
  }

  seatOfUser(userId: string): PlayerId | null {
    const i = this.seats.findIndex((s) => s.userId === userId);
    return i >= 0 ? i : null;
  }

  /** Azione di un client: convalida identità + regole, poi commit. */
  handleAction(seat: PlayerId, action: Action): void {
    if (this.disposed || this.finished) return;
    if (typeof action !== 'object' || action === null || action.player !== seat) {
      this.callbacks.sendRejected(seat, 'Azione non tua', this.generation);
      return;
    }
    let res: ReturnType<typeof applyAction>;
    try {
      res = applyAction(this.state, action);
    } catch {
      this.callbacks.sendRejected(seat, 'Azione malformata', this.generation);
      return;
    }
    if (!res.ok) {
      this.callbacks.sendRejected(seat, res.error.message, this.generation);
      return;
    }
    const isUndoable = UNDOABLE_BUILDS.has(action.type);
    if (isUndoable) {
      this.undoStack.push({ state: this.state, lastAction: action });
      this.lastBuilderSeat = seat;
    } else {
      this.undoStack = [];
    }
    this.actionLog.push(action);
    this.commit(res.state, res.events);
  }

  /** Annulla l'ultimo piazzamento del giocatore. */
  handleUndo(seat: PlayerId): void {
    if (this.disposed || this.finished) return;
    if (this.lastBuilderSeat !== seat) {
      this.callbacks.sendRejected(seat, 'Non hai costruzioni da annullare', this.generation);
      return;
    }
    const entry = this.undoStack.pop();
    if (!entry) {
      this.callbacks.sendRejected(seat, 'Non hai costruzioni da annullare', this.generation);
      return;
    }
    this.state = entry.state;
    this.generation += 1;
    this.armTurnTimer();
    this.callbacks.sendUpdate(seat, this.buildUpdate(seat, []));
    this.scheduleBots();
  }

  /** Rimanda l'ultimo stato a un posto (riconnessione / ingresso). */
  refresh(seat: PlayerId): void {
    if (this.disposed) return;
    this.callbacks.sendUpdate(seat, this.buildUpdate(seat, []));
  }

  refreshAll(): void {
    for (let seat = 0; seat < this.seats.length; seat++) {
      if (!this.seats[seat]!.isBot) this.refresh(seat);
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.botTimer !== null) clearTimeout(this.botTimer);
    if (this.turnTimer !== null) clearTimeout(this.turnTimer);
  }

  // -------------------------------------------------------------------------

  private commit(next: GameState, events: GameEvent[]): void {
    this.state = next;
    this.generation += 1;
    this.armTurnTimer();
    for (let seat = 0; seat < this.seats.length; seat++) {
      if (!this.seats[seat]!.isBot) {
        this.callbacks.sendUpdate(seat, this.buildUpdate(seat, events));
      }
    }
    if (this.state.phase.type === 'gameOver' && !this.finished) {
      this.finished = true;
      if (this.turnTimer !== null) clearTimeout(this.turnTimer);
      if (this.botTimer !== null) clearTimeout(this.botTimer);
      this.callbacks.onFinished({
        code: this.code,
        seed: this.seed,
        startedAt: this.startedAt,
        endedAt: Date.now(),
        players: this.seats.map((s) => ({ userId: s.userId, name: s.name, isBot: s.isBot })),
        winnerSeat: this.state.phase.winner,
        actionLog: [...this.actionLog],
      });
      return;
    }
    this.scheduleBots();
  }

  private buildUpdate(seat: PlayerId, events: GameEvent[]): GameUpdate {
    const over = this.state.phase.type === 'gameOver';
    return {
      view: getPlayerView(this.state, seat),
      seat,
      legalActions: getLegalActions(this.state, seat),
      events: filterEventsForPlayer(events, seat),
      generation: this.generation,
      turnDeadline: this.turnDeadline,
      finalState: over ? this.state : null,
    };
  }

  private nextBotActor(): PlayerId | null {
    if (this.state.phase.type === 'gameOver') return null;
    const offer = this.state.pendingTrade;
    for (const [pid] of this.bots) {
      if (getLegalActions(this.state, pid).length === 0) continue;
      // Il bot PROPONENTE aspetta le risposte di TUTTI prima di concludere
      // o ritirare: nessuno scambio si chiude mentre un umano ci pensa.
      if (offer && offer.from === pid) {
        const responders =
          offer.to === null
            ? this.state.players.filter((p) => p.id !== pid).map((p) => p.id)
            : [offer.to];
        // Niente «vince il primo che accetta»: il proponente conclude solo
        // quando TUTTI gli interpellati hanno risposto (gli umani compresi).
        const allResponded = responders.every((r) => offer.responses[r] !== undefined);
        if (!allResponded) continue;
      }
      return pid;
    }
    return null;
  }

  private scheduleBots(): void {
    if (this.disposed || this.finished) return;
    if (this.botTimer !== null) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    const actor = this.nextBotActor();
    if (actor === null) return;
    const [min, max] = this.botDelay;
    const delay = min + Math.random() * (max - min);
    const expected = this.generation;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (this.disposed || this.finished || this.generation !== expected) return;
      const pid = this.nextBotActor();
      if (pid === null) return;
      const legalActions = getLegalActions(this.state, pid);
      const bot = this.bots.get(pid)!;
      const action = bot.decide({
        view: getPlayerView(this.state, pid),
        legalActions,
        player: pid,
        rngSeed: `${this.seed}:${this.generation}:${pid}`,
      });
      const res = applyAction(this.state, action);
      if (!res.ok) {
        // Difesa identica al controller locale: mai bloccare la partita.
        const fallback = defaultActionFor(this.state, pid);
        if (!fallback) return;
        const forced = applyAction(this.state, fallback);
        if (forced.ok) {
          this.actionLog.push(fallback);
          this.commit(forced.state, forced.events);
        }
        return;
      }
      this.actionLog.push(action);
      this.commit(res.state, res.events);
    }, delay);
  }

  /** Timer di turno: allo scadere il server gioca la mossa di default per OGNI umano in attesa. */
  private armTurnTimer(): void {
    if (this.turnTimer !== null) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    this.turnDeadline = null;
    if (this.disposed || this.config.turnTimerSec <= 0) return;
    if (this.state.phase.type === 'gameOver') return;
    const humanWaiting = this.seats.some(
      (s, i) => !s.isBot && getLegalActions(this.state, i).length > 0
    );
    if (!humanWaiting) return;
    this.turnDeadline = Date.now() + this.config.turnTimerSec * 1000;
    this.turnTimer = setTimeout(() => {
      this.turnTimer = null;
      this.forceDefaultActions();
    }, this.config.turnTimerSec * 1000);
  }

  private forceDefaultActions(): void {
    if (this.disposed || this.finished) return;
    // Una sola mossa forzata: il commit riarma il timer per l'eventuale prossimo.
    for (let seat = 0; seat < this.seats.length; seat++) {
      if (this.seats[seat]!.isBot) continue;
      const action = defaultActionFor(this.state, seat);
      if (!action) continue;
      const res = applyAction(this.state, action);
      if (res.ok) {
        this.actionLog.push(action);
        this.commit(res.state, res.events);
        return;
      }
    }
  }
}
