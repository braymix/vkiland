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
import type { Action } from '@vikiland/engine';

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  /** `scrypt$N$r$p$saltHex$hashHex` */
  passwordHash: string;
  createdAt: number;
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
  getUserByEmail(email: string): UserRecord | null;
  getUserById(id: string): UserRecord | null;
  createUser(user: UserRecord): void;
  getSession(token: string): SessionRecord | null;
  createSession(session: SessionRecord): void;
  deleteSession(token: string): void;
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
  }

  private flush(): void {
    writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2));
  }

  getUserByEmail(email: string): UserRecord | null {
    const norm = email.trim().toLowerCase();
    return this.db.users.find((u) => u.email === norm) ?? null;
  }

  getUserById(id: string): UserRecord | null {
    return this.db.users.find((u) => u.id === id) ?? null;
  }

  createUser(user: UserRecord): void {
    this.db.users.push(user);
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

  appendFinishedGame(game: FinishedGameRecord): void {
    appendFileSync(this.gamesPath, JSON.stringify(game) + '\n');
  }
}

/** Storage volatile per i test. */
export class MemoryStorage implements Storage {
  private users: UserRecord[] = [];
  private sessions: SessionRecord[] = [];
  readonly finishedGames: FinishedGameRecord[] = [];

  getUserByEmail(email: string): UserRecord | null {
    const norm = email.trim().toLowerCase();
    return this.users.find((u) => u.email === norm) ?? null;
  }
  getUserById(id: string): UserRecord | null {
    return this.users.find((u) => u.id === id) ?? null;
  }
  createUser(user: UserRecord): void {
    this.users.push(user);
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
  appendFinishedGame(game: FinishedGameRecord): void {
    this.finishedGames.push(game);
  }
}
