/**
 * Controller della partita LOCALE: possiede lo stato autorevole, applica le
 * azioni tramite il motore e fa giocare i bot con un piccolo ritardo umano.
 *
 * Hot-seat (Fase 2): più umani sullo stesso dispositivo. Il controller traccia
 * il "viewpoint" (l'umano che sta guardando lo schermo) e, quando deve agire
 * un ALTRO umano, sospende la rivelazione con `handoff`: la UI copre tutto con
 * la PassDeviceScreen finché il nuovo giocatore non conferma di avere in mano
 * il dispositivo. Con un solo umano non avviene mai (esperienza Fase 1).
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
  type PlayerConfig,
  type PlayerId,
  type ValidationError,
  type Viewer,
} from '@vikiland/engine';
import { createBot, type Bot } from '@vikiland/bots';
import { describeEvent, describeStartingOrder } from './logFormat';
import { nextHumanActor } from './hotseat';
import type { GameController, GameSnapshot, LogEntry } from './controller';

export type { GameSnapshot, LogEntry } from './controller';

export interface GameSetup {
  seed: string;
  players: PlayerConfig[];
  avoidAdjacent68: boolean;
  targetGloryPoints: number;
}

const BOT_DELAY_MIN = 450;
const BOT_DELAY_MAX = 850;
const MAX_LOG = 120;

export class LocalGameController implements GameController {
  private state: GameState;
  private readonly bots = new Map<PlayerId, Bot>();
  private readonly listeners = new Set<() => void>();
  private snapshot: GameSnapshot;
  private log: LogEntry[] = [];
  private logCounter = 0;
  private generation = 0;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  readonly humans: PlayerId[];
  /** Con 2+ umani il diario è condiviso: si filtra come 'spettatore' (nessun segreto). */
  private readonly logViewer: Viewer;
  private viewpoint: PlayerId;
  private handoff: PlayerId | null = null;

  constructor(setup: GameSetup) {
    this.state = createGame(setup);
    setup.players.forEach((p, id) => {
      if (p.isBot) this.bots.set(id, createBot(p.botLevel ?? 'normale'));
    });
    this.humans = setup.players.flatMap((p, id) => (p.isBot ? [] : [id]));
    this.logViewer = this.humans.length === 1 ? this.humans[0]! : 'spettatore';
    // Il diario si apre con il tiro dei dadi per l'ordine di partenza.
    for (const text of describeStartingOrder(this.state)) {
      this.log.push({ id: this.logCounter++, text });
    }
    // Il dispositivo parte in mano al primo umano che deve agire.
    this.viewpoint = nextHumanActor(this.state, this.humans, this.humans[0] ?? 0) ?? this.humans[0] ?? 0;
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

  /** Il nuovo giocatore conferma di avere il dispositivo: la sua vista si rivela. */
  confirmHandoff = (): void => {
    if (this.handoff === null) return;
    this.viewpoint = this.handoff;
    this.handoff = null;
    this.generation += 1;
    this.snapshot = this.buildSnapshot();
    for (const cb of this.listeners) cb();
  };

  dispose = (): void => {
    this.disposed = true;
    if (this.botTimer !== null) clearTimeout(this.botTimer);
    this.listeners.clear();
  };

  private commit(next: GameState, events: GameEvent[]): void {
    this.state = next;
    // Il diario mostra gli eventi senza i segreti che il tavolo non deve vedere.
    const visible = filterEventsForPlayer(events, this.logViewer);
    for (const e of visible) {
      const text = describeEvent(e, next);
      if (text) this.log.push({ id: this.logCounter++, text });
    }
    if (this.log.length > MAX_LOG) this.log = this.log.slice(-MAX_LOG);
    // Tocca a un altro umano? Si congela la vista e si chiede il passaggio di mano.
    const nextHuman = nextHumanActor(this.state, this.humans, this.viewpoint);
    this.handoff = nextHuman !== null && nextHuman !== this.viewpoint ? nextHuman : null;
    this.generation += 1;
    this.snapshot = this.buildSnapshot();
    for (const cb of this.listeners) cb();
    this.scheduleBots();
  }

  private buildSnapshot(): GameSnapshot {
    return {
      view: getPlayerView(this.state, this.viewpoint),
      viewpoint: this.viewpoint,
      humans: [...this.humans],
      handoff: this.handoff,
      // Durante il passaggio di mano la UI sottostante non deve offrire mosse.
      legalActions: this.handoff === null ? getLegalActions(this.state, this.viewpoint) : [],
      log: [...this.log],
      generation: this.generation,
      finalState: this.state.phase.type === 'gameOver' ? this.state : null,
      remoteError: null,
      turnDeadline: null,
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
