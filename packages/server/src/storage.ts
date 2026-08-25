/**
 * Persistenza: l'interfaccia `Storage` (sincrona) è il punto di sostituzione.
 * Implementazioni disponibili:
 *   - `JsonFileStorage` — file JSON su disco (sviluppo; effimero su Render free);
 *   - `MemoryStorage`   — volatile, per i test;
 *   - `PostgresStorage` (in `storagePg.ts`) — DB DUREVOLE via `DATABASE_URL`,
 *     con cache in memoria + write-through così le letture restano sincrone.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PlayerCosmetics, PlayerProgression } from '@vikiland/engine';

export interface UserRecord {
  id: string;
  /** Nome utente = nome in gioco (unico, confronto case-insensitive). */
  username: string;
  /** `scrypt$N$r$p$saltHex$hashHex` */
  passwordHash: string;
  createdAt: number;
  /** Inventario: skin scelte dall'account (Drago, roccaforti). */
  cosmetics?: PlayerCosmetics;
  /** Progressione: casse, frammenti, eroi sbloccati e flag «tester». */
  progression?: PlayerProgression;
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: number;
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
  /**
   * Lista GLOBALE di parole censurate (moderazione). La gestisce solo
   * l'amministratore; il client la usa per mascherare i nomi in visualizzazione.
   */
  getCensoredWords(): string[];
  setCensoredWords(words: string[]): void;
}

interface JsonDb {
  users: UserRecord[];
  sessions: SessionRecord[];
  /** Impostazioni globali (es. lista parole censurate). */
  settings?: { censoredWords?: string[] };
}

export class JsonFileStorage implements Storage {
  private readonly dbPath: string;
  private db: JsonDb;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.dbPath = join(dataDir, 'db.json');
    this.db = existsSync(this.dbPath)
      ? (JSON.parse(readFileSync(this.dbPath, 'utf8')) as JsonDb)
      : { users: [], sessions: [], settings: { censoredWords: [] } };
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
    // Casse: ogni account creato PRIMA di questa funzionalità (quindi senza
    // progressione salvata) diventa «tester» — ha ogni eroe già disponibile,
    // come ringraziamento. I nuovi account nascono già con una progressione.
    this.db.users = this.db.users.map((u) => {
      if (u.progression === undefined) {
        touched = true;
        return { ...u, progression: { tester: true } };
      }
      return u;
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

  getCensoredWords(): string[] {
    return this.db.settings?.censoredWords ?? [];
  }

  setCensoredWords(words: string[]): void {
    this.db.settings = { ...(this.db.settings ?? {}), censoredWords: words };
    this.flush();
  }
}

/** Storage volatile per i test. */
export class MemoryStorage implements Storage {
  private users: UserRecord[] = [];
  private sessions: SessionRecord[] = [];
  private censoredWords: string[] = [];

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
  getCensoredWords(): string[] {
    return this.censoredWords;
  }
  setCensoredWords(words: string[]): void {
    this.censoredWords = words;
  }
}
