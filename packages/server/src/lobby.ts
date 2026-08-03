/**
 * Lobby con codici invito. Una lobby diventa stanza di gioco (`GameRoom`)
 * quando l'host avvia; dopo l'avvio i posti restano legati agli utenti,
 * così la riconnessione ritrova il proprio posto.
 */
import { randomInt } from 'node:crypto';
import {
  MAX_CUSTOM_HEXES,
  MAX_PLAYERS,
  MIN_CUSTOM_HEXES,
  maxDesertCount,
  validateTeams,
} from '@vikiland/engine';
import type { Action, BotLevel, PlayerColor, PlayerCosmetics, PlayerId } from '@vikiland/engine';
import type {
  ApiError,
  GameUpdate,
  HandRequest,
  LobbyConfig,
  LobbyState,
  PublicLobbySummary,
  WatchableGameSummary,
  WatchResult,
} from './protocol';
import type { FinishedGameRecord } from './storage';
import { GameRoom, type RoomOptions, type Seat } from './room';

/** Senza caratteri ambigui (0/O, 1/I/L). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;
/** Posti massimi in una lobby (allineato al motore: 2–8 giocatori). */
const MAX_SLOTS = MAX_PLAYERS;
const BOT_NAMES = ['Astrid', 'Leif', 'Sigrid', 'Ragnhild', 'Olaf', 'Freya'];
/**
 * Ordine dei colori di DEFAULT del clan (palette libera: ognuno può poi
 * sceglierne uno qualsiasi col selettore). I primi sono i classici, così le
 * lobby partono coi colori di sempre, ma ce ne sono molti per evitare doppioni.
 */
const PALETTE: PlayerColor[] = [
  '#c0392b', '#2e6fb7', '#3e8f4e', '#d9a525', '#8e44ad', '#e67e22',
  '#16a085', '#e84393', '#34495e', '#1abc9c', '#e74c3c', '#2980b9',
  '#27ae60', '#f39c12', '#9b59b6', '#d35400', '#3498db', '#6c5ce7',
  '#00cec9', '#be2edd', '#a0522d', '#7f8c8d', '#2c3e50', '#fd79a8',
];

/** Un colore del clan valido è un esadecimale `#rrggbb`. */
function isHexColor(c: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(c);
}

export interface LobbyUser {
  id: string;
  name: string;
}

interface Slot {
  userId: string | null;
  name: string;
  isBot: boolean;
  botLevel: BotLevel | null;
  color: PlayerColor;
  connected: boolean;
  /** Modalità Squadra: indice di squadra del posto (0 di default). */
  team: number;
}

/** Primo colore della palette non ancora usato nella lobby. */
function firstFreeColor(slots: Slot[]): PlayerColor {
  return PALETTE.find((c) => !slots.some((s) => s.color === c)) ?? PALETTE[0]!;
}

export interface Lobby {
  code: string;
  hostUserId: string;
  config: LobbyConfig;
  slots: Slot[];
  started: boolean;
  room: GameRoom | null;
  /** Modalità Squadra: l'host ha assegnato le squadre a mano? (disattiva il ribilanciamento). */
  teamsTouched: boolean;
}

export interface LobbyManagerCallbacks {
  broadcastLobby(state: LobbyState): void;
  lobbyClosed(code: string, reason: string): void;
  /** Un utente specifico è stato tolto dalla lobby (espulso dall'host). */
  userRemoved(userId: string, code: string, reason: string): void;
  sendUpdate(userId: string, update: GameUpdate): void;
  sendRejected(userId: string, message: string, generation: number): void;
  gameFinished(record: FinishedGameRecord): void;
  /** Skin dell'account (lette FRESCHE all'avvio della partita); opzionale. */
  getCosmetics?(userId: string): PlayerCosmetics | undefined;
  /** Recapita a uno spettatore la sua vista aggiornata (opzionale). */
  sendSpectatorUpdate?(userId: string, update: GameUpdate): void;
  /** Recapita a un giocatore la richiesta di uno spettatore di vedergli la mano. */
  notifyHandRequest?(userId: string, req: HandRequest): void;
}

type Result = LobbyState | ApiError;

export class LobbyManager {
  private readonly lobbies = new Map<string, Lobby>();
  private readonly userLobby = new Map<string, string>();
  /** Spettatore → codice della partita che sta guardando. */
  private readonly userSpectating = new Map<string, string>();
  /** Spettatore → nome (per il popup di richiesta mano al giocatore). */
  private readonly spectatorNames = new Map<string, string>();

  constructor(
    private readonly callbacks: LobbyManagerCallbacks,
    private readonly roomOptions: RoomOptions = {}
  ) {}

  // -- ciclo di vita ---------------------------------------------------------

  create(user: LobbyUser, config: LobbyConfig): Result {
    if (this.userLobby.has(user.id)) this.leave(user.id);
    const code = this.newCode();
    const lobby: Lobby = {
      code,
      hostUserId: user.id,
      config: sanitizeConfig(config),
      slots: [
        { userId: user.id, name: user.name, isBot: false, botLevel: null, color: PALETTE[0]!, connected: true, team: 0 },
      ],
      started: false,
      room: null,
      teamsTouched: false,
    };
    this.lobbies.set(code, lobby);
    this.userLobby.set(user.id, code);
    return this.toState(lobby);
  }

  /** Ribilancia le squadre a rotazione (posto i → squadra i%N) se l'host non le ha toccate. */
  private rebalanceTeams(lobby: Lobby): void {
    if (lobby.teamsTouched) return;
    const n = Math.max(2, lobby.config.numTeams ?? 2);
    lobby.slots.forEach((s, i) => {
      s.team = i % n;
    });
  }

  join(codeRaw: string, user: LobbyUser): Result {
    const code = codeRaw.trim().toUpperCase();
    const lobby = this.lobbies.get(code);
    if (!lobby) return { error: 'Codice non trovato' };

    const existing = lobby.slots.find((s) => s.userId === user.id);
    if (existing) {
      // Riconnessione: ritrova il proprio posto.
      existing.connected = true;
      this.userLobby.set(user.id, code);
      this.broadcast(lobby);
      return this.toState(lobby);
    }
    if (lobby.started) return { error: 'Partita già iniziata' };
    if (lobby.slots.length >= MAX_SLOTS) return { error: 'Lobby piena' };
    if (this.userLobby.has(user.id)) this.leave(user.id);

    lobby.slots.push({
      userId: user.id,
      name: user.name,
      isBot: false,
      botLevel: null,
      color: firstFreeColor(lobby.slots),
      connected: true,
      team: 0,
    });
    this.rebalanceTeams(lobby);
    this.userLobby.set(user.id, code);
    this.broadcast(lobby);
    return this.toState(lobby);
  }

  leave(userId: string): void {
    const lobby = this.lobbyOfUser(userId);
    if (!lobby) return;
    this.userLobby.delete(userId);

    if (!lobby.started) {
      lobby.slots = lobby.slots.filter((s) => s.userId !== userId);
      if (userId === lobby.hostUserId || lobby.slots.every((s) => s.isBot)) {
        this.close(lobby, "L'host ha chiuso la lobby");
        return;
      }
      this.broadcast(lobby);
      return;
    }
    // A partita iniziata il posto resta (riconnessione possibile).
    const slot = lobby.slots.find((s) => s.userId === userId);
    if (slot) slot.connected = false;
    this.broadcast(lobby);
    this.collectIfAbandoned(lobby);
  }

  addBot(userId: string, level: BotLevel): Result {
    const lobby = this.lobbyOfUser(userId);
    if (!lobby) return { error: 'Non sei in una lobby' };
    if (lobby.hostUserId !== userId) return { error: 'Solo l’host può farlo' };
    if (lobby.started) return { error: 'Partita già iniziata' };
    if (lobby.slots.length >= MAX_SLOTS) return { error: 'Lobby piena' };
    const name =
      BOT_NAMES.find((n) => !lobby.slots.some((s) => s.name === n)) ??
      `Bot ${lobby.slots.length + 1}`;
    lobby.slots.push({
      userId: null,
      name,
      isBot: true,
      botLevel: level,
      color: firstFreeColor(lobby.slots),
      connected: true,
      team: 0,
    });
    this.rebalanceTeams(lobby);
    this.broadcast(lobby);
    return this.toState(lobby);
  }

  /**
   * Modalità Squadra: assegna un posto a una squadra. Può farlo il proprietario
   * del posto oppure l'host (per tutti). Segna le squadre come "toccate" così il
   * ribilanciamento automatico non le sovrascrive.
   */
  setTeam(userId: string, index: number, team: number): Result {
    const lobby = this.lobbyOfUser(userId);
    if (!lobby) return { error: 'Non sei in una lobby' };
    if (lobby.started) return { error: 'Partita già iniziata' };
    const slot = lobby.slots[index];
    if (!slot) return { error: 'Posto inesistente' };
    const isHost = lobby.hostUserId === userId;
    const isOwn = slot.userId === userId;
    if (!isOwn && !isHost) return { error: 'Non puoi cambiare questa squadra' };
    const n = Math.max(2, lobby.config.numTeams ?? 2);
    if (!Number.isInteger(team) || team < 0 || team >= n) return { error: 'Squadra non valida' };
    lobby.teamsTouched = true;
    slot.team = team;
    this.broadcast(lobby);
    return this.toState(lobby);
  }

  /**
   * Cambia il colore di un posto. Può farlo il proprietario del posto (il
   * proprio) oppure l'host (anche per i bot). Se il colore è già di un altro
   * posto, i due si SCAMBIANO (come nel setup locale): mai due uguali.
   */
  setColor(userId: string, index: number, color: PlayerColor): Result {
    const lobby = this.lobbyOfUser(userId);
    if (!lobby) return { error: 'Non sei in una lobby' };
    if (lobby.started) return { error: 'Partita già iniziata' };
    if (!isHexColor(color)) return { error: 'Colore non valido' };
    const norm = color.toLowerCase();
    const slot = lobby.slots[index];
    if (!slot) return { error: 'Posto inesistente' };
    const isHost = lobby.hostUserId === userId;
    const isOwn = slot.userId === userId;
    if (!isOwn && !(isHost && slot.isBot)) return { error: 'Non puoi cambiare questo colore' };
    if (slot.color === norm) return this.toState(lobby);
    // Scambio col posto che ha già quel colore (se esiste): mai due uguali.
    const other = lobby.slots.find((s) => s !== slot && s.color === norm);
    if (other) other.color = slot.color;
    slot.color = norm;
    this.broadcast(lobby);
    return this.toState(lobby);
  }

  /**
   * Cambia la configurazione di una lobby già creata (solo l'host, solo prima
   * dell'avvio). Così la scelta di calamità/PG/timer/seed resta modificabile
   * finché non si parte, esattamente come nel setup locale.
   */
  updateConfig(userId: string, config: LobbyConfig): Result {
    const lobby = this.lobbyOfUser(userId);
    if (!lobby) return { error: 'Non sei in una lobby' };
    if (lobby.hostUserId !== userId) return { error: 'Solo l’host può farlo' };
    if (lobby.started) return { error: 'Partita già iniziata' };
    const prevNumTeams = lobby.config.numTeams ?? 2;
    const prevTeamMode = lobby.config.teamMode ?? false;
    lobby.config = sanitizeConfig(config);
    // Un cambio del numero di squadre (o l'accensione della modalità) ribilancia.
    const numTeamsChanged = (lobby.config.numTeams ?? 2) !== prevNumTeams;
    const teamModeOn = (lobby.config.teamMode ?? false) && !prevTeamMode;
    if (numTeamsChanged || teamModeOn) lobby.teamsTouched = false;
    this.rebalanceTeams(lobby);
    this.broadcast(lobby);
    return this.toState(lobby);
  }

  removeSlot(userId: string, index: number): Result {
    const lobby = this.lobbyOfUser(userId);
    if (!lobby) return { error: 'Non sei in una lobby' };
    if (lobby.hostUserId !== userId) return { error: 'Solo l’host può farlo' };
    if (lobby.started) return { error: 'Partita già iniziata' };
    const slot = lobby.slots[index];
    if (!slot) return { error: 'Posto inesistente' };
    if (slot.userId === lobby.hostUserId) return { error: 'L’host non può rimuoversi' };
    if (slot.userId !== null) {
      this.userLobby.delete(slot.userId);
      this.callbacks.userRemoved(slot.userId, lobby.code, 'Sei stato rimosso dalla lobby');
    }
    lobby.slots.splice(index, 1);
    this.rebalanceTeams(lobby);
    this.broadcast(lobby);
    return this.toState(lobby);
  }

  start(userId: string): Result {
    const lobby = this.lobbyOfUser(userId);
    if (!lobby) return { error: 'Non sei in una lobby' };
    if (lobby.hostUserId !== userId) return { error: 'Solo l’host può farlo' };
    if (lobby.started) return { error: 'Partita già iniziata' };
    if (lobby.slots.length < 2) return { error: 'Servono almeno 2 giocatori' };

    // Modalità Squadra: le squadre devono essere di ugual dimensione.
    if (lobby.config.teamMode) {
      const teams = lobby.slots.map((s) => s.team);
      const msg = validateTeams(teams, lobby.slots.length);
      if (msg) return { error: msg };
    }

    const seats: Seat[] = lobby.slots.map((s) => {
      // Skin dell'inventario: lette dall'account ADESSO, così una modifica
      // fatta in lobby vale già per questa partita. I bot restano classici.
      const cosmetics = s.userId ? this.callbacks.getCosmetics?.(s.userId) : undefined;
      return {
        userId: s.userId,
        name: s.name,
        isBot: s.isBot,
        botLevel: s.botLevel,
        color: s.color,
        team: s.team,
        ...(cosmetics ? { cosmetics } : {}),
      };
    });
    const seed = lobby.config.seed?.trim() || `vikiland-online-${Date.now()}-${randomInt(1e9)}`;
    lobby.room = new GameRoom(
      lobby.code,
      seed,
      seats,
      lobby.config,
      {
        sendUpdate: (seat, update) => {
          const target = seats[seat]?.userId;
          if (target) this.callbacks.sendUpdate(target, update);
        },
        sendRejected: (seat, message, generation) => {
          const target = seats[seat]?.userId;
          if (target) this.callbacks.sendRejected(target, message, generation);
        },
        onFinished: (record) => this.callbacks.gameFinished(record),
        sendSpectatorUpdate: (specUserId, update) =>
          this.callbacks.sendSpectatorUpdate?.(specUserId, update),
      },
      this.roomOptions
    );
    lobby.started = true;
    this.broadcast(lobby);
    lobby.room.refreshAll();
    return this.toState(lobby);
  }

  /** L'host chiude la partita per tutti (anche mentre si gioca). */
  terminate(userId: string): ApiError | null {
    const lobby = this.lobbyOfUser(userId);
    if (!lobby) return { error: 'Non sei in una lobby' };
    if (lobby.hostUserId !== userId) return { error: 'Solo l’host può farlo' };
    this.close(lobby, "L'host ha terminato la partita");
    return null;
  }

  // -- partita ----------------------------------------------------------------

  handleAction(userId: string, action: Action): void {
    const lobby = this.lobbyOfUser(userId);
    const seat = lobby?.room?.seatOfUser(userId);
    if (!lobby?.room || seat === null || seat === undefined) return;
    lobby.room.handleAction(seat, action);
  }

  handleUndo(userId: string): void {
    const lobby = this.lobbyOfUser(userId);
    const seat = lobby?.room?.seatOfUser(userId);
    if (!lobby?.room || seat === null || seat === undefined) return;
    lobby.room.handleUndo(seat);
  }

  refreshGame(userId: string): void {
    // Prima come giocatore seduto; se non lo è, come eventuale spettatore.
    const lobby = this.lobbyOfUser(userId);
    const seat = lobby?.room?.seatOfUser(userId);
    if (lobby?.room && seat !== null && seat !== undefined) {
      lobby.room.refresh(seat);
      return;
    }
    const watched = this.lobbyOfSpectator(userId);
    if (watched?.room?.hasSpectator(userId)) watched.room.refreshSpectator(userId);
  }

  // -- spettatori --------------------------------------------------------------

  /** Le partite PUBBLICHE in corso che si possono guardare (non entrare). */
  listWatchable(): WatchableGameSummary[] {
    const out: WatchableGameSummary[] = [];
    for (const lobby of this.lobbies.values()) {
      if (!lobby.started || !lobby.room || !lobby.config.isPublic) continue;
      if (lobby.room.isFinished) continue;
      out.push({
        code: lobby.code,
        hostName: lobby.slots.find((s) => s.userId === lobby.hostUserId)?.name ?? '?',
        players: lobby.slots.length,
        turnNumber: lobby.room.turnNumber,
        spectators: this.spectatorsOf(lobby.code),
      });
    }
    return out;
  }

  /**
   * Entra come spettatore in una partita IN CORSO. Pubblica o privata: chi passa
   * il codice ha il permesso di guardare. Non occupa un posto.
   */
  watch(codeRaw: string, user: LobbyUser): WatchResult | ApiError {
    const code = codeRaw.trim().toUpperCase();
    const lobby = this.lobbies.get(code);
    if (!lobby) return { error: 'Codice non trovato' };
    if (!lobby.started || !lobby.room) return { error: 'La partita non è ancora iniziata' };
    // Chi è già SEDUTO in questa partita non è uno spettatore: torni al suo posto.
    if (lobby.room.seatOfUser(user.id) !== null) {
      return { error: 'Sei già un giocatore di questa partita' };
    }
    // Libera qualsiasi altra presenza (giocatore altrove o spettatore altrove).
    if (this.userLobby.has(user.id)) this.leave(user.id);
    if (this.userSpectating.has(user.id)) this.stopWatch(user.id);
    this.userSpectating.set(user.id, code);
    this.spectatorNames.set(user.id, user.name);
    lobby.room.addSpectator(user.id);
    return { code, state: this.toState(lobby) };
  }

  stopWatch(userId: string): void {
    const code = this.userSpectating.get(userId);
    if (!code) return;
    this.userSpectating.delete(userId);
    this.spectatorNames.delete(userId);
    const lobby = this.lobbies.get(code);
    lobby?.room?.removeSpectator(userId);
    // Partita finita e rimasta senza pubblico né giocatori connessi → si libera.
    if (lobby) this.collectIfAbandoned(lobby);
  }

  /** Uno spettatore chiede al giocatore in `seat` di vedergli la mano. */
  requestHand(spectatorUserId: string, seat: PlayerId): void {
    const lobby = this.lobbyOfSpectator(spectatorUserId);
    if (!lobby?.room || !lobby.room.hasSpectator(spectatorUserId)) return;
    const targetUserId = lobby.room.userIdOfSeat(seat);
    if (!targetUserId) return; // posto vuoto o bot: niente da chiedere
    this.callbacks.notifyHandRequest?.(targetUserId, {
      spectatorId: spectatorUserId,
      spectatorName: this.spectatorNames.get(spectatorUserId) ?? '?',
      seat,
    });
  }

  /** Il giocatore risponde: concede o nega la propria mano allo spettatore. */
  respondHand(playerUserId: string, spectatorId: string, allow: boolean): void {
    const lobby = this.lobbyOfUser(playerUserId);
    const seat = lobby?.room?.seatOfUser(playerUserId);
    if (!lobby?.room || seat === null || seat === undefined) return;
    lobby.room.setGrant(spectatorId, seat, allow);
  }

  lobbyOfSpectator(userId: string): Lobby | null {
    const code = this.userSpectating.get(userId);
    return code ? (this.lobbies.get(code) ?? null) : null;
  }

  private spectatorsOf(code: string): number {
    let n = 0;
    for (const c of this.userSpectating.values()) if (c === code) n++;
    return n;
  }

  // -- presenza ----------------------------------------------------------------

  /** Il socket layer notifica connessioni/disconnessioni dell'utente. */
  setConnected(userId: string, connected: boolean): void {
    const lobby = this.lobbyOfUser(userId);
    if (!lobby) return;
    const slot = lobby.slots.find((s) => s.userId === userId);
    if (!slot || slot.connected === connected) return;
    slot.connected = connected;
    this.broadcast(lobby);
    if (!connected) this.collectIfAbandoned(lobby);
  }

  lobbyOfUser(userId: string): Lobby | null {
    const code = this.userLobby.get(userId);
    return code ? (this.lobbies.get(code) ?? null) : null;
  }

  toState(lobby: Lobby): LobbyState {
    return {
      code: lobby.code,
      hostUserId: lobby.hostUserId,
      config: { ...lobby.config },
      slots: lobby.slots.map((s) => ({ ...s })),
      started: lobby.started,
      isPublic: lobby.config.isPublic,
    };
  }

  /** Le partite pubbliche a cui si può ancora entrare. */
  listPublic(): PublicLobbySummary[] {
    const out: PublicLobbySummary[] = [];
    for (const lobby of this.lobbies.values()) {
      if (!lobby.config.isPublic || lobby.started || lobby.slots.length >= MAX_SLOTS) continue;
      out.push({
        code: lobby.code,
        hostName: lobby.slots.find((s) => s.userId === lobby.hostUserId)?.name ?? '?',
        players: lobby.slots.length,
        maxPlayers: MAX_SLOTS,
        turnTimerSec: lobby.config.turnTimerSec,
      });
    }
    return out;
  }

  // -- interni -----------------------------------------------------------------

  private broadcast(lobby: Lobby): void {
    this.callbacks.broadcastLobby(this.toState(lobby));
  }

  private close(lobby: Lobby, reason: string): void {
    lobby.room?.dispose();
    for (const s of lobby.slots) {
      if (s.userId) this.userLobby.delete(s.userId);
    }
    // Sgancia anche gli spettatori di questa partita.
    for (const [userId, code] of this.userSpectating) {
      if (code === lobby.code) {
        this.userSpectating.delete(userId);
        this.spectatorNames.delete(userId);
      }
    }
    this.lobbies.delete(lobby.code);
    this.callbacks.lobbyClosed(lobby.code, reason);
  }

  /** Partita finita e nessun umano connesso → la stanza si può eliminare. */
  private collectIfAbandoned(lobby: Lobby): void {
    const anyConnected = lobby.slots.some((s) => !s.isBot && s.connected);
    if (!anyConnected && (lobby.room?.isFinished ?? false)) {
      this.close(lobby, 'Partita conclusa');
    }
  }

  private newCode(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < CODE_LEN; i++) {
        code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      }
      if (!this.lobbies.has(code)) return code;
    }
  }
}

/** Colori di default delle squadre (fino a 8). */
const TEAM_PALETTE_DEFAULT = ['#8e44ad', '#e67e22', '#16a085', '#34495e', '#c0392b', '#2e6fb7', '#3e8f4e', '#d9a525'];

function sanitizeTeamColors(colors: unknown, numTeams: number): string[] {
  const arr = Array.isArray(colors) ? colors : [];
  return Array.from({ length: numTeams }, (_, t) => {
    const c = typeof arr[t] === 'string' ? String(arr[t]).toLowerCase() : '';
    return isHexColor(c) ? c : TEAM_PALETTE_DEFAULT[t % TEAM_PALETTE_DEFAULT.length]!;
  });
}

function sanitizeConfig(c: LobbyConfig): LobbyConfig {
  const numTeams = clampInt(c.numTeams, 2, MAX_SLOTS, 2);
  const base: LobbyConfig = {
    avoidAdjacent68: Boolean(c.avoidAdjacent68),
    targetGloryPoints: clampInt(c.targetGloryPoints, 5, 20, 10),
    turnTimerSec: clampInt(c.turnTimerSec, 0, 600, 0),
    isPublic: Boolean(c.isPublic),
    calamities: Boolean(c.calamities),
    battle: Boolean(c.battle),
    capitale: Boolean(c.capitale),
    // Solo 'grande' o 'gigante' sono valori validi; qualsiasi altro = consigliata.
    ...(c.boardSize === 'grande' || c.boardSize === 'gigante' ? { boardSize: c.boardSize } : {}),
    // Forma tavola: solo 'rientranze' è un valore valido; altro = esagono classico
    // ('libera' è derivato dal motore quando c'è hexCount, non lo sceglie il client).
    ...(c.boardShape === 'rientranze' ? { boardShape: c.boardShape } : {}),
    // Campo libero: numero di caselle scelto a mano (clampato ai limiti); assente = preset.
    ...(c.hexCount != null
      ? { hexCount: clampInt(c.hexCount, MIN_CUSTOM_HEXES, MAX_CUSTOM_HEXES, MIN_CUSTOM_HEXES) }
      : {}),
    // Deserti scelti a mano; clamp lasco qui (≥1, serve al Drago), il motore lo
    // ri-clampa a [1, caselle-1] della tavola effettiva alla creazione.
    ...(c.desertCount != null
      ? { desertCount: clampInt(c.desertCount, 1, maxDesertCount(MAX_CUSTOM_HEXES), 1) }
      : {}),
    // Modalità Squadra: numero squadre, colori e bersaglio per-giocatore.
    ...(c.teamMode
      ? {
          teamMode: true,
          numTeams,
          teamColors: sanitizeTeamColors(c.teamColors, numTeams),
          teamTargetPerPlayer: clampInt(c.teamTargetPerPlayer, 3, 15, 8),
        }
      : {}),
  };
  return c.seed?.trim() ? { ...base, seed: c.seed.trim() } : base;
}

function clampInt(x: unknown, min: number, max: number, dflt: number): number {
  const n = Math.floor(Number(x));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}
