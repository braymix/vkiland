/**
 * Controller locale di «Vikings Around the World»: tiene lo stato, fa giocare i
 * bot con un piccolo ritardo, gestisce il passaggio del dispositivo in hot-seat
 * e offre alla UI una vista + le mosse legali (la stessa forma di quella che
 * arriverà dal server online).
 */
import {
  applyAction,
  createGame,
  defaultConfig,
  filterEventsForPlayer,
  getLegalActions,
  getPlayerView,
  whoMustAct,
  type BotLevel,
  type PlayerId,
  type ResourceMap,
  type ValidationError,
  type WorldAction,
  type WorldEvent,
  type WorldGameState,
  type WorldPlayerView,
  type MapOverride,
} from '@vikiland/engine-world';
import { createWorldBot, type WorldBot } from '@vikiland/bots';
import { formatWorldEvent } from './logFormat';

export interface WorldSeatSetup {
  name: string;
  color: string;
  bot: BotLevel | null;
}

export interface WorldSetup {
  seed: string;
  players: WorldSeatSetup[];
  targetPoints: number;
  materialiCasuali: boolean;
  mapId: string;
  override?: MapOverride | null;
}

export interface WorldLogEntry {
  id: number;
  text: string;
}

export interface WorldSnapshot {
  view: WorldPlayerView;
  viewpoint: PlayerId;
  legal: WorldAction[];
  log: WorldLogEntry[];
  /** Giocatore a cui passare il dispositivo (copre tutto finché non conferma). */
  handoff: PlayerId | null;
  /** Un bot sta pensando. */
  thinking: boolean;
  winner: PlayerId | null;
  /** Eventi dell'ultima azione (per animazioni/dadi). */
  lastEvents: WorldEvent[];
  seq: number;
}

const BOT_DELAY_MS = 650;

/** Ciò che serve alla schermata di gioco: lo stesso contratto varrà per il controller online. */
export interface WorldController {
  subscribe(cb: () => void): () => void;
  getSnapshot(): WorldSnapshot;
  dispatch(action: WorldAction): ValidationError | null;
  confirmHandoff(): void;
  dispose(): void;
  /** Scambio con altri giocatori (assente = non disponibile). */
  proposeTrade?(from: PlayerId, give: ResourceMap, receive: ResourceMap, to: PlayerId | null): ValidationError | null;
}

export class LocalWorldController implements WorldController {
  private state: WorldGameState;
  private readonly seats: WorldSeatSetup[];
  private readonly bots: (WorldBot | null)[];
  private readonly humans: PlayerId[];
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private viewpoint: PlayerId;
  private handoff: PlayerId | null = null;
  private log: WorldLogEntry[] = [];
  private logId = 0;
  private lastEvents: WorldEvent[] = [];
  private seq = 0;
  private snapshot: WorldSnapshot;
  private botCounter = 0;
  private readonly seed: string;

  constructor(setup: WorldSetup) {
    this.seed = setup.seed;
    this.seats = setup.players;
    this.state = createGame(
      defaultConfig({
        seed: setup.seed,
        targetPoints: setup.targetPoints,
        mapId: setup.mapId,
        materialiCasuali: setup.materialiCasuali,
        players: setup.players.map((p) => ({ name: p.name, color: p.color, ...(p.bot ? { bot: p.bot } : {}) })),
      }),
      { override: setup.override ?? null }
    );
    this.bots = setup.players.map((p) => (p.bot ? createWorldBot(p.bot) : null));
    this.humans = setup.players.map((p, i) => (p.bot ? -1 : i)).filter((i) => i >= 0);
    this.viewpoint = this.humans[0] ?? 0;
    this.snapshot = this.buildSnapshot();
    queueMicrotask(() => this.advance());
  }

  // ------------------------------------------------------------ interfaccia
  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getSnapshot(): WorldSnapshot {
    return this.snapshot;
  }

  /** Mossa del giocatore umano (il `player` dell'azione deve essere il suo posto). */
  dispatch(action: WorldAction): ValidationError | null {
    if (this.disposed || this.handoff !== null) return { code: 'ATTESA', message: 'Attendi.' };
    if (this.bots[action.player]) return { code: 'NON_UMANO', message: 'Non è un giocatore umano.' };
    const r = this.apply(action);
    if (!r) return null;
    return r;
  }

  /**
   * Scambio fra giocatori: con un bot decide lui; fra umani sullo stesso
   * dispositivo si intende «a voce» e si conclude subito. `with = null` = tutti.
   */
  proposeTrade(from: PlayerId, give: ResourceMap, receive: ResourceMap, to: PlayerId | null): ValidationError | null {
    const err = this.apply({ type: 'proponiScambio', player: from, give, receive, to });
    if (err) return err;
    const offer = this.state.pendingTrade;
    if (!offer) return null;
    const others = this.state.players.filter((p) => p.id !== from && (to === null || to === p.id));
    for (const o of others) {
      if (this.state.pendingTrade?.id !== offer.id) break;
      const legalNow = getLegalActions(this.state, o.id);
      const bot = this.bots[o.id];
      let accept: boolean;
      if (bot) {
        const a = bot.decide({
          view: getPlayerView(this.state, o.id),
          legalActions: legalNow,
          player: o.id,
          rngSeed: `${this.seed}:trade:${this.botCounter++}`,
        });
        accept = a.type === 'rispondiScambio' && a.accept;
      } else {
        // Altro umano sullo stesso dispositivo: l'accordo è «a voce».
        accept = to !== null;
      }
      this.apply({ type: 'rispondiScambio', player: o.id, offerId: offer.id, accept });
    }
    const pending = this.state.pendingTrade;
    if (pending && pending.id === offer.id) {
      const acceptor = Object.entries(pending.responses).find(([, v]) => v === 'accettata');
      if (acceptor) {
        return this.apply({ type: 'confermaScambio', player: from, offerId: offer.id, with: Number(acceptor[0]) });
      }
      this.apply({ type: 'annullaScambio', player: from, offerId: offer.id });
      return { code: 'NESSUNO_ACCETTA', message: 'Nessuno ha accettato.' };
    }
    return { code: 'NESSUNO_ACCETTA', message: 'Nessuno ha accettato.' };
  }

  confirmHandoff(): void {
    if (this.handoff === null) return;
    this.viewpoint = this.handoff;
    this.handoff = null;
    this.refresh();
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.listeners.clear();
  }

  // --------------------------------------------------------------- interni
  private apply(action: WorldAction): ValidationError | null {
    const r = applyAction(this.state, action);
    if (!r.ok) return r.error;
    this.state = r.state;
    this.lastEvents = r.events;
    const ctx = {
      playerName: (id: number) => this.state.players[id]?.name ?? `#${id}`,
      map: this.state.map,
    };
    for (const e of filterEventsForPlayer(r.events, this.viewpoint)) {
      const text = formatWorldEvent(e, ctx);
      if (text) this.log.push({ id: ++this.logId, text });
    }
    if (this.log.length > 60) this.log = this.log.slice(-60);
    this.seq++;
    this.advance();
    return null;
  }

  private actorNow(): PlayerId | null {
    const s = this.state;
    if (s.phase.type === 'fine') return null;
    return whoMustAct(s);
  }

  /** Aggiorna viewpoint/handoff e fa muovere i bot. */
  private advance(): void {
    if (this.disposed) return;
    const actor = this.actorNow();
    if (actor !== null && !this.bots[actor] && this.humans.length > 1 && actor !== this.viewpoint && this.handoff === null) {
      this.handoff = actor;
    } else if (actor !== null && !this.bots[actor] && this.humans.length === 1) {
      this.viewpoint = this.humans[0]!;
    }
    this.refresh();
    if (this.timer || actor === null || !this.bots[actor]) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.disposed) return;
      this.botMove();
    }, BOT_DELAY_MS);
  }

  private botMove(): void {
    const actor = this.actorNow();
    if (actor === null) return;
    const bot = this.bots[actor];
    if (!bot) return;
    const legal = getLegalActions(this.state, actor);
    if (legal.length === 0) return;
    const action = bot.decide({
      view: getPlayerView(this.state, actor),
      legalActions: legal,
      player: actor,
      rngSeed: `${this.seed}:bot:${this.botCounter++}`,
    });
    const err = this.apply(action);
    if (err) {
      // Un bot non dovrebbe mai sbagliare: ripiega su una mossa legale qualsiasi.
      this.apply(legal[legal.length - 1]!);
    }
  }

  private buildSnapshot(): WorldSnapshot {
    const view = getPlayerView(this.state, this.viewpoint);
    const phase = this.state.phase;
    // Le mosse legali si offrono solo se tocca al punto di vista (o deve scartare).
    const legal = this.handoff === null ? getLegalActions(this.state, this.viewpoint) : [];
    return {
      view,
      viewpoint: this.viewpoint,
      legal,
      log: this.log,
      handoff: this.handoff,
      thinking: (() => {
        const a = this.actorNow();
        return a !== null && !!this.bots[a];
      })(),
      winner: phase.type === 'fine' ? phase.winner : null,
      lastEvents: this.lastEvents,
      seq: this.seq,
    };
  }

  private refresh(): void {
    this.snapshot = this.buildSnapshot();
    for (const cb of [...this.listeners]) cb();
  }
}
