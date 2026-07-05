/**
 * Persistenza su file JSON (sviluppo). L'interfaccia `Storage` è il punto di
 * sostituzione previsto per un DB vero (Drizzle: SQLite/PostgreSQL) senza
 * toccare il resto del server.
 *
 * PUNTO DI ESTENSIONE (Fase 4): qui si aggiungerà la tabella `entitlements`
 * (cosmetici/premium) accanto a utenti e partite.
 */
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Action, PlayerCosmetics } from '@vikiland/engine';

export interface UserRecord {
  id: string;
  /** Nome utente = nome in gioco (unico, confronto case-insensitive). */
  username: string;
  /** `scrypt$N$r$p$saltHex$hashHex` */
  passwordHash: string;
  createdAt: number;
  /** Inventario: skin scelte dall'account (Drago, roccaforti). */
  cosmetics?: PlayerCosmetics;
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: number;
}

/** Partita conclusa: seed + log azioni = replay deterministico completo. */
export interface FinishedGameRecord {
  code: string;
  seed: string;
  startedAt: number;
  endedAt: number;
  players: { userId: string | null; name: string; isBot: boolean }[];
  winnerSeat: number;
  actionLog: Action[];
}

export interface Storage {
  getUserByUsername(username: string): UserRecord | null;
  getUserById(id: string): UserRecord | null;
  createUser(user: UserRecord): void;
  /** Sovrascrive il record dell'utente (stesso id). */
  updateUser(user: UserRecord): void;
  getSession(token: string): SessionRecord | null;
  createSession(session: SessionRecord): void;
  deleteSession(token: string): void;
  /** Revoca TUTTE le sessioni di un utente (es. dopo cambio password). */
  deleteSessionsByUser(userId: string): void;
  appendFinishedGame(game: FinishedGameRecord): void;
}

interface JsonDb {
  users: UserRecord[];
  sessions: SessionRecord[];
}

export class JsonFileStorage implements Storage {
  private readonly dbPath: string;
  private readonly gamesPath: string;
  private db: JsonDb;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.dbPath = join(dataDir, 'db.json');
    this.gamesPath = join(dataDir, 'games.jsonl');
    this.db = existsSync(this.dbPath)
      ? (JSON.parse(readFileSync(this.dbPath, 'utf8')) as JsonDb)
      : { users: [], sessions: [] };
    this.migrate();
  }

  /** Vecchi record (era email+displayName): il nome in gioco diventa username. */
  private migrate(): void {
    const seen = new Set<string>();
    let touched = false;
    this.db.users = this.db.users.map((raw) => {
      const legacy = raw as UserRecord & { displayName?: string; email?: string };
      const username = legacy.username ?? legacy.displayName ?? 'vichingo';
      let candidate = username;
      let n = 2;
      while (seen.has(candidate.toLowerCase())) candidate = `${username}${n++}`.slice(0, 12);
      seen.add(candidate.toLowerCase());
      if (legacy.username !== candidate || 'email' in legacy || 'displayName' in legacy) {
        touched = true;
        return {
          id: legacy.id,
          username: candidate,
          passwordHash: legacy.passwordHash,
          createdAt: legacy.createdAt,
        };
      }
      return raw;
    });
    if (touched) this.flush();
  }

  private flush(): void {
    writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2));
  }

  getUserByUsername(username: string): UserRecord | null {
    const norm = username.trim().toLowerCase();
    return this.db.users.find((u) => u.username.toLowerCase() === norm) ?? null;
  }

  getUserById(id: string): UserRecord | null {
    return this.db.users.find((u) => u.id === id) ?? null;
  }

  createUser(user: UserRecord): void {
    this.db.users.push(user);
    this.flush();
  }

  updateUser(user: UserRecord): void {
    this.db.users = this.db.users.map((u) => (u.id === user.id ? user : u));
    this.flush();
  }

  getSession(token: string): SessionRecord | null {
    return this.db.sessions.find((s) => s.token === token) ?? null;
  }

  createSession(session: SessionRecord): void {
    this.db.sessions.push(session);
    this.flush();
  }

  deleteSession(token: string): void {
    this.db.sessions = this.db.sessions.filter((s) => s.token !== token);
    this.flush();
  }

  deleteSessionsByUser(userId: string): void {
    this.db.sessions = this.db.sessions.filter((s) => s.userId !== userId);
    this.flush();
  }

  appendFinishedGame(game: FinishedGameRecord): void {
    appendFileSync(this.gamesPath, JSON.stringify(game) + '\n');
  }
}

/** Storage volatile per i test. */
export class MemoryStorage implements Storage {
  private users: UserRecord[] = [];
  private sessions: SessionRecord[] = [];
  readonly finishedGames: FinishedGameRecord[] = [];

  getUserByUsername(username: string): UserRecord | null {
    const norm = username.trim().toLowerCase();
    return this.users.find((u) => u.username.toLowerCase() === norm) ?? null;
  }
  getUserById(id: string): UserRecord | null {
    return this.users.find((u) => u.id === id) ?? null;
  }
  createUser(user: UserRecord): void {
    this.users.push(user);
  }
  updateUser(user: UserRecord): void {
    this.users = this.users.map((u) => (u.id === user.id ? user : u));
  }
  getSession(token: string): SessionRecord | null {
    return this.sessions.find((s) => s.token === token) ?? null;
  }
  createSession(session: SessionRecord): void {
    this.sessions.push(session);
  }
  deleteSession(token: string): void {
    this.sessions = this.sessions.filter((s) => s.token !== token);
  }
  deleteSessionsByUser(userId: string): void {
    this.sessions = this.sessions.filter((s) => s.userId !== userId);
  }
  appendFinishedGame(game: FinishedGameRecord): void {
    this.finishedGames.push(game);
  }
}
