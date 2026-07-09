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
import { describeEvent, describeStartingOrder, dragonComplaints } from './logFormat';
import { nextHumanActor } from './hotseat';
import { accumulateStats, emptyStats, type GameStats } from './stats';
import type { GameController, GameSnapshot, LogEntry } from './controller';

export type { GameSnapshot, LogEntry } from './controller';

export interface GameSetup {
  seed: string;
  players: PlayerConfig[];
  avoidAdjacent68: boolean;
  targetGloryPoints: number;
  /** Modalità Calamità: una carta per giro (default false). */
  calamities: boolean;
  /** Modalità Battaglia: attacchi agli edifici avversari (default false). */
  battle: boolean;
}

const BOT_DELAY_MIN = 450;
const BOT_DELAY_MAX = 850;
const MAX_LOG = 120;

/** Le azioni ANNULLABILI: solo i piazzamenti di costruzioni (setup incluso). */
const UNDOABLE_BUILDS = new Set<Action['type']>([
  'piazzaVillaggioIniziale',
  'piazzaSentieroIniziale',
  'costruisciSentiero',
  'costruisciVillaggio',
  'costruisciRoccaforte',
  'piazzaSentieroGratis',
]);

/** Istantanea per annullare un piazzamento: stato e diario PRIMA dell'azione. */
interface UndoEntry {
  state: GameState;
  log: LogEntry[];
  logCounter: number;
  stats: GameStats;
}

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
  private lastRoll: GameSnapshot['lastRoll'] = null;
  private rollCounter = 0;
  private stats: GameStats;
  /** Pila di annullamenti dei piazzamenti consecutivi dell'umano (l'ultimo in cima). */
  private undoStack: UndoEntry[] = [];

  constructor(setup: GameSetup) {
    this.state = createGame(setup);
    this.stats = emptyStats(setup.players.length);
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
    // Se è un piazzamento di costruzione MIO, salvo lo stato per poterlo
    // annullare. Qualunque altra mia azione (tiro, scambio, fine turno…)
    // "consolida" i piazzamenti e chiude la finestra di annullamento.
    const undoable = UNDOABLE_BUILDS.has(action.type) && action.player === this.viewpoint;
    const before: UndoEntry | null = undoable
      ? {
          state: this.state,
          log: [...this.log],
          logCounter: this.logCounter,
          stats: structuredClone(this.stats),
        }
      : null;
    const res = applyAction(this.state, action);
    if (!res.ok) return res.error;
    if (before) this.undoStack.push(before);
    else this.undoStack = [];
    this.commit(res.state, res.events);
    return null;
  };

  /**
   * Annulla l'ULTIMO piazzamento di costruzione dell'umano (anche nel setup):
   * ripristina stato, diario e statistiche di PRIMA dell'azione. Possibile solo
   * finché nessun altro ha agito (un bot o un altro umano svuotano la pila).
   */
  undo = (): void => {
    if (this.handoff !== null) return;
    const entry = this.undoStack.pop();
    if (!entry) return;
    this.state = entry.state;
    this.log = entry.log;
    this.logCounter = entry.logCounter;
    this.stats = entry.stats;
    this.handoff = null; // lo stato ripristinato è di nuovo "il tuo turno"
    this.generation += 1;
    this.snapshot = this.buildSnapshot();
    for (const cb of this.listeners) cb();
    this.scheduleBots();
  };

  /** Il nuovo giocatore conferma di avere il dispositivo: la sua vista si rivela. */
  confirmHandoff = (): void => {
    if (this.handoff === null) return;
    this.viewpoint = this.handoff;
    this.handoff = null;
    this.undoStack = []; // turno di un altro umano: niente più annullamenti
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
      accumulateStats(this.stats, e);
      const text = describeEvent(e, next);
      if (text) this.log.push({ id: this.logCounter++, text });
      // Il popup del tiro si aggancia all'evento (anche per i bot).
      if (e.type === 'dadiTirati') {
        this.lastRoll = { id: ++this.rollCounter, dice: [e.dice[0], e.dice[1]], total: e.total };
      }
      // Easter egg: i bot bloccati dal Drago si lamentano nel diario.
      if (e.type === 'dragoMosso') {
        for (const line of dragonComplaints(e, next, new Set(this.bots.keys()), next.config.boardRadius)) {
          this.log.push({ id: this.logCounter++, text: line });
        }
      }
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
      lastRoll: this.lastRoll,
      stats: this.stats,
      canUndo:
        this.undoStack.length > 0 &&
        this.handoff === null &&
        this.state.phase.type !== 'gameOver',
    };
  }

  /** Trova il prossimo bot che ha mosse da fare (scarti simultanei inclusi). */
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
      // Un bot sta per agire: la finestra di annullamento dell'umano si chiude.
      this.undoStack = [];
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
