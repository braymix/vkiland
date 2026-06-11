/**
 * Controller della partita LOCALE: possiede lo stato autorevole, applica le
 * azioni tramite il motore e fa giocare i bot con un piccolo ritardo umano.
 *
 * La UI vi si abbona via useSyncExternalStore. In Fase 3 un
 * `RemoteGameController` con la STESSA interfaccia parlerà col server:
 * la UI non cambierà.
 */
import {
  applyAction,
  createGame,
  filterEventsForPlayer,
  getLegalActions,
  getPlayerView,
  type Action,
  type GameEvent,
  type GameState,
  type LegalMove,
  type PlayerConfig,
  type PlayerId,
  type PlayerView,
  type ValidationError,
} from '@vikiland/engine';
import { createBot, type Bot } from '@vikiland/bots';
import { describeEvent } from './logFormat';

export interface GameSetup {
  seed: string;
  players: PlayerConfig[];
  avoidAdjacent68: boolean;
  targetGloryPoints: number;
}

export interface LogEntry {
  id: number;
  text: string;
}

/** Fotografia immutabile per React. */
export interface GameSnapshot {
  state: GameState;
  /** Vista del giocatore umano "al tavolo" (Fase 1: sempre il giocatore 0). */
  view: PlayerView;
  humanPlayer: PlayerId;
  legalActions: LegalMove[];
  log: LogEntry[];
  generation: number;
}

const BOT_DELAY_MIN = 450;
const BOT_DELAY_MAX = 850;
const MAX_LOG = 120;

export class LocalGameController {
  private state: GameState;
  private readonly bots = new Map<PlayerId, Bot>();
  private readonly listeners = new Set<() => void>();
  private snapshot: GameSnapshot;
  private log: LogEntry[] = [];
  private logCounter = 0;
  private generation = 0;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  readonly humanPlayer: PlayerId;

  constructor(setup: GameSetup) {
    this.state = createGame(setup);
    setup.players.forEach((p, id) => {
      if (p.isBot) this.bots.set(id, createBot(p.botLevel ?? 'normale'));
    });
    // Fase 1: il primo umano della lista è chi guarda lo schermo.
    this.humanPlayer = setup.players.findIndex((p) => !p.isBot);
    this.snapshot = this.buildSnapshot();
    this.scheduleBots();
  }

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getSnapshot = (): GameSnapshot => this.snapshot;

  /** Azione dell'umano: rifiutata dal motore ⇒ la UI mostra il motivo. */
  dispatch = (action: Action): ValidationError | null => {
    const res = applyAction(this.state, action);
    if (!res.ok) return res.error;
    this.commit(res.state, res.events);
    return null;
  };

  dispose = (): void => {
    this.disposed = true;
    if (this.botTimer !== null) clearTimeout(this.botTimer);
    this.listeners.clear();
  };

  private commit(next: GameState, events: GameEvent[]): void {
    this.state = next;
    // Il diario mostra gli eventi come li vede l'umano (segreti filtrati).
    const visible = filterEventsForPlayer(events, this.humanPlayer);
    for (const e of visible) {
      const text = describeEvent(e, next);
      if (text) this.log.push({ id: this.logCounter++, text });
    }
    if (this.log.length > MAX_LOG) this.log = this.log.slice(-MAX_LOG);
    this.generation += 1;
    this.snapshot = this.buildSnapshot();
    for (const cb of this.listeners) cb();
    this.scheduleBots();
  }

  private buildSnapshot(): GameSnapshot {
    return {
      state: this.state,
      view: getPlayerView(this.state, this.humanPlayer),
      humanPlayer: this.humanPlayer,
      legalActions:
        this.humanPlayer >= 0 ? getLegalActions(this.state, this.humanPlayer) : [],
      log: [...this.log],
      generation: this.generation,
    };
  }

  /** Trova il prossimo bot che ha mosse da fare (scarti simultanei inclusi). */
  private nextBotActor(): PlayerId | null {
    if (this.state.phase.type === 'gameOver') return null;
    for (const [pid] of this.bots) {
      if (getLegalActions(this.state, pid).length > 0) return pid;
    }
    return null;
  }

  private scheduleBots(): void {
    if (this.disposed) return;
    if (this.botTimer !== null) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    const actor = this.nextBotActor();
    if (actor === null) return;
    const delay = BOT_DELAY_MIN + Math.random() * (BOT_DELAY_MAX - BOT_DELAY_MIN);
    const expected = this.generation;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (this.disposed || this.generation !== expected) return;
      const pid = this.nextBotActor();
      if (pid === null) return;
      const legalActions = getLegalActions(this.state, pid);
      const bot = this.bots.get(pid)!;
      const action = bot.decide({
        view: getPlayerView(this.state, pid),
        legalActions,
        player: pid,
        rngSeed: `${this.state.config.seed}:${this.generation}:${pid}`,
      });
      const res = applyAction(this.state, action);
      if (!res.ok) {
        // Difesa: un bot non deve mai proporre mosse illegali; se accade,
        // si forza la prima mossa legale per non bloccare la partita.
        console.error('Bot ha proposto una mossa illegale', action, res.error);
        const fallback = legalActions.find(
          (m): m is Action => m.type !== 'scartaDescr' && m.type !== 'proponiScambioDescr'
        );
        if (!fallback) return;
        const forced = applyAction(this.state, fallback);
        if (forced.ok) this.commit(forced.state, forced.events);
        return;
      }
      this.commit(res.state, res.events);
    }, delay);
  }
}
