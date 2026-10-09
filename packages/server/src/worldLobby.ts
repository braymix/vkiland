/**
 * Lobby e partite di «Vikings Around the World» (modalità nuova).
 *
 * Separata dalla lobby classica: stesse fondamenta (account, socket, codici
 * invito, timer di turno, bot sul server) ma motore e protocollo `world:*`.
 * Lo stato vive SOLO qui (server autoritativo); i client ricevono la propria
 * vista filtrata + le mosse legali. Le stanze sono in memoria: un riavvio del
 * server le azzera.
 */
import {
  applyAction,
  applyMapOverride,
  createGame,
  defaultConfig,
  filterEventsForPlayer,
  getDefaultAction,
  getLegalActions,
  getMapDefinition,
  getPlayerView,
  whoMustAct,
  DEFAULT_TARGET_POINTS,
  MAX_TARGET_POINTS,
  MIN_TARGET_POINTS,
  type MapOverride,
  type PlayerId,
  type WorldAction,
  type WorldEvent,
  type WorldGameState,
} from '@vikiland/engine-world';
import { createWorldBot, type WorldBot } from '@vikiland/bots';
import type {
  ApiError,
  WorldBotLevel,
  WorldLobbyConfig,
  WorldLobbyState,
  WorldPublicSummary,
  WorldSeatInfo,
  WorldUpdate,
} from './protocol';

const PALETTE = ['#d9534f', '#4a90d9', '#5cb85c', '#e7b94c', '#b86ad9', '#3cc8c8'];
const BOT_NAMES = ['Ragnar', 'Freydis', 'Leif', 'Astrid', 'Ivar', 'Sigrid'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface WorldLobbyHooks {
  broadcastState: (code: string, stateFor: (userId: string | null) => WorldLobbyState) => void;
  closed: (code: string, reason: string) => void;
  userRemoved: (userId: string, code: string, reason: string) => void;
  sendUpdate: (userId: string, update: WorldUpdate) => void;
  sendRejected: (userId: string, message: string) => void;
  getOverride: (mapId: string) => MapOverride | null;
}

export interface WorldTimings {
  botDelayMs: number;
  /** Quanto aspettare prima di giocare per un umano disconnesso. */
  disconnectedMs: number;
}

const DEFAULT_TIMINGS: WorldTimings = { botDelayMs: 700, disconnectedMs: 8000 };

interface Seat {
  userId: string | null;
  name: string;
  bot: WorldBotLevel | null;
  connected: boolean;
}

interface Room {
  code: string;
  hostId: string;
  config: WorldLobbyConfig;
  seats: Seat[];
  started: boolean;
  state: WorldGameState | null;
  bots: (WorldBot | null)[];
  timer: ReturnType<typeof setTimeout> | null;
  seq: number;
  lastEvents: WorldEvent[];
  botCounter: number;
}

export type Result<T> = T | ApiError;
const err = (error: string): ApiError => ({ error });
export const isErr = (x: unknown): x is ApiError => typeof x === 'object' && x !== null && 'error' in x;

export function sanitizeWorldConfig(c: Partial<WorldLobbyConfig> | undefined): WorldLobbyConfig {
  const target = Math.round(Number(c?.targetPoints ?? DEFAULT_TARGET_POINTS));
  const timer = Math.round(Number(c?.turnTimerSec ?? 0));
  const mapId = typeof c?.mapId === 'string' && getMapDefinition(c.mapId) ? c.mapId : 'mondo';
  return {
    targetPoints: Number.isFinite(target) ? Math.max(MIN_TARGET_POINTS, Math.min(MAX_TARGET_POINTS, target)) : DEFAULT_TARGET_POINTS,
    turnTimerSec: Number.isFinite(timer) ? Math.max(0, Math.min(300, timer)) : 0,
    isPublic: Boolean(c?.isPublic),
    materialiCasuali: Boolean(c?.materialiCasuali),
    mapId,
  };
}

export class WorldLobbyManager {
  private readonly rooms = new Map<string, Room>();
  private readonly byUser = new Map<string, string>();
  private readonly timings: WorldTimings;

  constructor(
    private readonly hooks: WorldLobbyHooks,
    timings: Partial<WorldTimings> = {}
  ) {
    this.timings = { ...DEFAULT_TIMINGS, ...timings };
  }

  // ------------------------------------------------------------- lookup
  roomOfUser(userId: string): Room | null {
    const code = this.byUser.get(userId);
    return code ? (this.rooms.get(code) ?? null) : null;
  }

  private maxPlayers(room: Room): number {
    return getMapDefinition(room.config.mapId)?.maxPlayers ?? 6;
  }
  private minPlayers(room: Room): number {
    return getMapDefinition(room.config.mapId)?.minPlayers ?? 2;
  }

  toState(room: Room, viewer: string | null): WorldLobbyState {
    const seats: WorldSeatInfo[] = room.seats.map((s, i) => ({
      name: s.name,
      color: PALETTE[i % PALETTE.length]!,
      bot: s.bot,
      connected: s.bot ? true : s.connected,
      isHost: s.userId === room.hostId,
      isYou: viewer !== null && s.userId === viewer,
    }));
    return {
      code: room.code,
      config: room.config,
      seats,
      started: room.started,
      minPlayers: this.minPlayers(room),
      maxPlayers: this.maxPlayers(room),
      hostName: room.seats.find((s) => s.userId === room.hostId)?.name ?? '',
    };
  }

  private broadcast(room: Room): void {
    this.hooks.broadcastState(room.code, (uid) => this.toState(room, uid));
  }

  // -------------------------------------------------------------- lobby
  create(user: { id: string; name: string }, config: Partial<WorldLobbyConfig>): Result<WorldLobbyState> {
    if (this.byUser.has(user.id)) return err('Sei già in una partita.');
    let code = '';
    do {
      code = Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!).join('');
    } while (this.rooms.has(code));
    const room: Room = {
      code,
      hostId: user.id,
      config: sanitizeWorldConfig(config),
      seats: [{ userId: user.id, name: user.name, bot: null, connected: true }],
      started: false,
      state: null,
      bots: [],
      timer: null,
      seq: 0,
      lastEvents: [],
      botCounter: 0,
    };
    this.rooms.set(code, room);
    this.byUser.set(user.id, code);
    return this.toState(room, user.id);
  }

  updateConfig(userId: string, config: Partial<WorldLobbyConfig>): Result<WorldLobbyState> {
    const room = this.roomOfUser(userId);
    if (!room) return err('Non sei in nessuna lobby.');
    if (room.hostId !== userId) return err('Solo l’host può cambiare le impostazioni.');
    if (room.started) return err('La partita è già iniziata.');
    room.config = sanitizeWorldConfig(config);
    this.broadcast(room);
    return this.toState(room, userId);
  }

  listPublic(): WorldPublicSummary[] {
    const out: WorldPublicSummary[] = [];
    for (const r of this.rooms.values()) {
      if (!r.config.isPublic || r.started || r.seats.length >= this.maxPlayers(r)) continue;
      out.push({
        code: r.code,
        hostName: r.seats.find((s) => s.userId === r.hostId)?.name ?? '',
        players: r.seats.length,
        maxPlayers: this.maxPlayers(r),
        turnTimerSec: r.config.turnTimerSec,
      });
    }
    return out;
  }

  join(code: string, user: { id: string; name: string }): Result<WorldLobbyState> {
    const room = this.rooms.get(String(code).trim().toUpperCase());
    if (!room) return err('Codice non valido.');
    const mine = this.roomOfUser(user.id);
    if (mine && mine !== room) return err('Sei già in un’altra partita.');
    const existing = room.seats.findIndex((s) => s.userId === user.id);
    if (existing >= 0) {
      room.seats[existing]!.connected = true;
      this.byUser.set(user.id, room.code);
      this.broadcast(room);
      return this.toState(room, user.id);
    }
    if (room.started) return err('La partita è già iniziata.');
    if (room.seats.length >= this.maxPlayers(room)) return err('La partita è al completo.');
    if (room.seats.some((s) => s.name.toLowerCase() === user.name.toLowerCase())) return err('Nome già presente.');
    room.seats.push({ userId: user.id, name: user.name, bot: null, connected: true });
    this.byUser.set(user.id, room.code);
    this.broadcast(room);
    return this.toState(room, user.id);
  }

  leave(userId: string): void {
    const room = this.roomOfUser(userId);
    if (!room) return;
    if (room.started) {
      // In partita non si libera il posto: resta (disconnesso) e gioca il server.
      const seat = room.seats.find((s) => s.userId === userId);
      if (seat) seat.connected = false;
      this.byUser.delete(userId);
      this.broadcast(room);
      this.schedule(room);
      return;
    }
    room.seats = room.seats.filter((s) => s.userId !== userId);
    this.byUser.delete(userId);
    if (room.hostId === userId) {
      const nextHost = room.seats.find((s) => s.userId !== null);
      if (!nextHost) return this.dispose(room, 'La lobby è stata chiusa.');
      room.hostId = nextHost.userId!;
    }
    this.broadcast(room);
  }

  addBot(userId: string, level: WorldBotLevel): Result<true> {
    const room = this.roomOfUser(userId);
    if (!room) return err('Non sei in nessuna lobby.');
    if (room.hostId !== userId) return err('Solo l’host può aggiungere bot.');
    if (room.started) return err('La partita è già iniziata.');
    if (room.seats.length >= this.maxPlayers(room)) return err('La partita è al completo.');
    const used = new Set(room.seats.map((s) => s.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot${room.seats.length + 1}`;
    room.seats.push({ userId: null, name, bot: level, connected: true });
    this.broadcast(room);
    return true;
  }

  removeSeat(userId: string, index: number): Result<true> {
    const room = this.roomOfUser(userId);
    if (!room) return err('Non sei in nessuna lobby.');
    if (room.hostId !== userId) return err('Solo l’host può rimuovere giocatori.');
    if (room.started) return err('La partita è già iniziata.');
    const seat = room.seats[index];
    if (!seat || seat.userId === room.hostId) return err('Posto non valido.');
    room.seats.splice(index, 1);
    if (seat.userId) {
      this.byUser.delete(seat.userId);
      this.hooks.userRemoved(seat.userId, room.code, 'Sei stato rimosso dalla lobby.');
    }
    this.broadcast(room);
    return true;
  }

  terminate(userId: string): ApiError | null {
    const room = this.roomOfUser(userId);
    if (!room) return err('Non sei in nessuna lobby.');
    if (room.hostId !== userId) return err('Solo l’host può chiudere la partita.');
    this.dispose(room, 'L’host ha chiuso la partita.');
    return null;
  }

  private dispose(room: Room, reason: string): void {
    if (room.timer) clearTimeout(room.timer);
    for (const s of room.seats) if (s.userId) this.byUser.delete(s.userId);
    this.rooms.delete(room.code);
    this.hooks.closed(room.code, reason);
  }

  // ------------------------------------------------------------ partita
  start(userId: string): Result<true> {
    const room = this.roomOfUser(userId);
    if (!room) return err('Non sei in nessuna lobby.');
    if (room.hostId !== userId) return err('Solo l’host può avviare la partita.');
    if (room.started) return err('La partita è già iniziata.');
    if (room.seats.length < this.minPlayers(room)) return err(`Servono almeno ${this.minPlayers(room)} giocatori.`);
    const def = getMapDefinition(room.config.mapId)!;
    const override = this.hooks.getOverride(room.config.mapId);
    const checked = applyMapOverride(def, override);
    try {
      room.state = createGame(
        defaultConfig({
          seed: `world-${room.code}-${Date.now()}`,
          targetPoints: room.config.targetPoints,
          mapId: room.config.mapId,
          materialiCasuali: room.config.materialiCasuali,
          players: room.seats.map((s, i) => ({
            name: s.name,
            color: PALETTE[i % PALETTE.length]!,
            ...(s.bot ? { bot: s.bot } : {}),
          })),
        }),
        { override: checked.ok ? override : null }
      );
    } catch (e) {
      return err(e instanceof Error ? e.message : 'Impossibile avviare la partita.');
    }
    room.bots = room.seats.map((s) => (s.bot ? createWorldBot(s.bot) : null));
    room.started = true;
    this.broadcast(room);
    this.afterChange(room, []);
    return true;
  }

  handleAction(userId: string, action: WorldAction): void {
    const room = this.roomOfUser(userId);
    if (!room || !room.started || !room.state) return;
    const seat = room.seats.findIndex((s) => s.userId === userId);
    if (seat < 0) return;
    if (!action || typeof action !== 'object' || (action as { player?: unknown }).player !== seat) {
      this.hooks.sendRejected(userId, 'Azione non valida.');
      return;
    }
    const res = applyAction(room.state, action);
    if (!res.ok) {
      this.hooks.sendRejected(userId, res.error.message);
      return;
    }
    room.state = res.state;
    this.afterChange(room, res.events);
  }

  refresh(userId: string): void {
    const room = this.roomOfUser(userId);
    if (!room) return;
    if (!room.started) {
      this.hooks.broadcastState(room.code, (uid) => this.toState(room, uid));
      return;
    }
    const seat = room.seats.findIndex((s) => s.userId === userId);
    if (seat >= 0) this.sendTo(room, seat, []);
  }

  setConnected(userId: string, connected: boolean): void {
    const room = this.roomOfUser(userId);
    if (!room) return;
    const seat = room.seats.find((s) => s.userId === userId);
    if (!seat) return;
    seat.connected = connected;
    this.broadcast(room);
    if (room.started) this.schedule(room);
  }

  // ------------------------------------------------------------ interni
  private afterChange(room: Room, events: WorldEvent[]): void {
    room.seq++;
    room.lastEvents = events;
    for (let i = 0; i < room.seats.length; i++) this.sendTo(room, i, events);
    this.schedule(room);
  }

  private thinking(room: Room): boolean {
    const s = room.state;
    if (!s || s.phase.type === 'fine') return false;
    return room.bots[whoMustAct(s)] != null;
  }

  private sendTo(room: Room, seat: PlayerId, events: WorldEvent[]): void {
    const s = room.state;
    const userId = room.seats[seat]?.userId;
    if (!s || !userId) return;
    this.hooks.sendUpdate(userId, {
      view: getPlayerView(s, seat),
      legal: getLegalActions(s, seat),
      events: filterEventsForPlayer(events, seat),
      seat,
      thinking: this.thinking(room),
      seq: room.seq,
    });
  }

  /** Programma la prossima mossa automatica: bot, umano disconnesso o scadenza del turno. */
  private schedule(room: Room): void {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
    const s = room.state;
    if (!s || s.phase.type === 'fine') return;
    const actor = whoMustAct(s);
    const seat = room.seats[actor]!;
    let delay: number | null = null;
    if (room.bots[actor]) delay = this.timings.botDelayMs;
    else if (!seat.connected) delay = this.timings.disconnectedMs;
    else if (room.config.turnTimerSec > 0) delay = room.config.turnTimerSec * 1000;
    // Un'offerta aperta verso un bot: risponde subito.
    if (s.phase.type === 'azioni' && s.pendingTrade) {
      const o = s.pendingTrade;
      const waitingBot = s.players.findIndex(
        (p) => p.id !== o.from && room.bots[p.id] && o.responses[p.id] === undefined && (o.to === null || o.to === p.id)
      );
      if (waitingBot >= 0) delay = Math.min(delay ?? Infinity, 400);
    }
    if (delay === null) return;
    room.timer = setTimeout(() => {
      room.timer = null;
      this.autoMove(room);
    }, delay);
  }

  private autoMove(room: Room): void {
    const s = room.state;
    if (!s || s.phase.type === 'fine' || !this.rooms.has(room.code)) return;
    // 1) Offerte aperte: i bot rispondono.
    if (s.phase.type === 'azioni' && s.pendingTrade) {
      const o = s.pendingTrade;
      for (const p of s.players) {
        const bot = room.bots[p.id];
        if (!bot || p.id === o.from || o.responses[p.id] !== undefined || (o.to !== null && o.to !== p.id)) continue;
        const legal = getLegalActions(s, p.id);
        const a = bot.decide({
          view: getPlayerView(s, p.id),
          legalActions: legal,
          player: p.id,
          rngSeed: `${room.code}:${room.botCounter++}`,
        });
        this.applyAuto(room, a, legal);
        return;
      }
    }
    const actor = whoMustAct(s);
    const legal = getLegalActions(s, actor);
    const bot = room.bots[actor];
    let action: WorldAction | null = null;
    if (bot && legal.length > 0) {
      action = bot.decide({
        view: getPlayerView(s, actor),
        legalActions: legal,
        player: actor,
        rngSeed: `${room.code}:${room.botCounter++}`,
      });
    } else {
      action = getDefaultAction(s);
    }
    if (action) this.applyAuto(room, action, legal);
  }

  private applyAuto(room: Room, action: WorldAction, legal: WorldAction[]): void {
    const s = room.state!;
    let res = applyAction(s, action);
    if (!res.ok) {
      // Mai bloccare la partita: ripiega su una mossa sicura.
      const fallback = getDefaultAction(s) ?? legal[legal.length - 1];
      if (!fallback) return;
      res = applyAction(s, fallback);
      if (!res.ok) return;
    }
    room.state = res.state;
    this.afterChange(room, res.events);
  }
}
