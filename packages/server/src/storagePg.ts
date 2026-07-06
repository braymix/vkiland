/**
 * Persistenza su PostgreSQL (es. filess.io) — DATI DUREVOLI anche su host con
 * disco effimero (Render free). Strategia: CACHE IN MEMORIA CON WRITE-THROUGH.
 *
 *   - all'avvio (`init`) carichiamo utenti e sessioni dal DB in memoria;
 *   - TUTTE le letture restano SINCRONE (dalla memoria): così l'interfaccia
 *     `Storage` non cambia e il resto del server (auth/lobby) non va toccato —
 *     la lobby legge i cosmetici nel mezzo della creazione partita e non può
 *     aspettare una query;
 *   - le scritture aggiornano la memoria all'istante e vengono propagate al DB
 *     in BACKGROUND, in ordine (una coda) e con log degli errori: un singhiozzo
 *     del database non blocca né fa crashare il gioco.
 *
 * Le partite finite sono append-only e non vengono rilette dal server: le
 * scriviamo soltanto (nessuna copia in memoria).
 */
import type {
  FinishedGameRecord,
  SessionRecord,
  Storage,
  UserRecord,
} from './storage';

/** Sottoinsieme del Pool di `pg` che ci serve (facilita i test con un finto DB). */
export interface PgLike {
  query(text: string, params?: readonly unknown[]): Promise<{ rows: unknown[] }>;
  end(): Promise<void>;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: string | number;
  cosmetics: unknown;
}
interface SessionRow {
  token: string;
  user_id: string;
  created_at: string | number;
}

function rowToUser(r: UserRow): UserRecord {
  const user: UserRecord = {
    id: r.id,
    username: r.username,
    passwordHash: r.password_hash,
    createdAt: Number(r.created_at),
  };
  // `cosmetics` è JSONB: pg lo restituisce già come oggetto (o null).
  if (r.cosmetics) user.cosmetics = r.cosmetics as NonNullable<UserRecord['cosmetics']>;
  return user;
}

export class PostgresStorage implements Storage {
  private readonly users = new Map<string, UserRecord>(); // per id
  private readonly sessions = new Map<string, SessionRecord>(); // per token
  /** Coda di scrittura: serializza le query e ne cattura gli errori. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly db: PgLike) {}

  /**
   * Apre il pool verso PostgreSQL, crea le tabelle se mancano e carica i dati
   * in memoria. `pg` è caricato dinamicamente: chi non usa il DB non lo importa.
   */
  static async connect(connectionString: string): Promise<PostgresStorage> {
    const mod = (await import('pg')) as unknown as {
      Pool?: new (c: unknown) => PgLike;
      default?: { Pool: new (c: unknown) => PgLike };
    };
    const Pool = mod.Pool ?? mod.default?.Pool;
    if (!Pool) throw new Error('Driver "pg" non disponibile');
    const ssl = sslConfig();
    const pool = new Pool({
      // Quando NON vogliamo SSL, ripuliamo la stringa da eventuali
      // `sslmode`/`ssl`: alcuni host (filess.io) NON supportano SSL e un
      // `sslmode=require` nell'URL manderebbe in crash l'avvio.
      connectionString: ssl ? connectionString : stripSslParams(connectionString),
      // Poche connessioni: i free tier (filess.io) ne concedono un numero basso
      // e la cache in memoria fa sì che ci servano solo per le scritture/avvio.
      max: Number(process.env['DB_POOL_MAX'] ?? 3),
      ssl,
    });
    const store = new PostgresStorage(pool);
    try {
      await store.init();
    } catch (err) {
      await pool.end().catch(() => {});
      throw describeConnectError(err, ssl !== false);
    }
    return store;
  }

  async init(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        cosmetics JSONB
      )`);
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )`);
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS finished_games (
        id BIGSERIAL PRIMARY KEY,
        code TEXT,
        seed TEXT NOT NULL,
        started_at BIGINT NOT NULL,
        ended_at BIGINT NOT NULL,
        players JSONB NOT NULL,
        winner_seat INT NOT NULL,
        action_log JSONB NOT NULL
      )`);

    const u = await this.db.query('SELECT * FROM users');
    for (const row of u.rows) {
      const user = rowToUser(row as UserRow);
      this.users.set(user.id, user);
    }
    const s = await this.db.query('SELECT * FROM sessions');
    for (const row of s.rows) {
      const r = row as SessionRow;
      this.sessions.set(r.token, { token: r.token, userId: r.user_id, createdAt: Number(r.created_at) });
    }
  }

  /** Accoda una scrittura sul DB, preservando l'ordine e loggando gli errori. */
  private enqueue(run: () => Promise<unknown>): void {
    this.queue = this.queue.then(run).catch((err) => {
      console.error('[db] scrittura fallita (i dati restano in memoria):', err);
    });
  }

  /** Attende lo svuotamento della coda (utile per uno shutdown pulito o i test). */
  async flush(): Promise<void> {
    await this.queue;
  }

  async close(): Promise<void> {
    await this.flush();
    await this.db.end();
  }

  // --- Letture: sincrone, dalla memoria ------------------------------------

  getUserByUsername(username: string): UserRecord | null {
    const norm = username.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === norm) return u;
    }
    return null;
  }

  getUserById(id: string): UserRecord | null {
    return this.users.get(id) ?? null;
  }

  getSession(token: string): SessionRecord | null {
    return this.sessions.get(token) ?? null;
  }

  // --- Scritture: memoria immediata + write-through in background ----------

  createUser(user: UserRecord): void {
    this.users.set(user.id, user);
    this.upsertUser(user);
  }

  updateUser(user: UserRecord): void {
    this.users.set(user.id, user);
    this.upsertUser(user);
  }

  private upsertUser(user: UserRecord): void {
    const cosmetics = user.cosmetics ? JSON.stringify(user.cosmetics) : null;
    this.enqueue(() =>
      this.db.query(
        `INSERT INTO users (id, username, password_hash, created_at, cosmetics)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           password_hash = EXCLUDED.password_hash,
           created_at = EXCLUDED.created_at,
           cosmetics = EXCLUDED.cosmetics`,
        [user.id, user.username, user.passwordHash, user.createdAt, cosmetics]
      )
    );
  }

  createSession(session: SessionRecord): void {
    this.sessions.set(session.token, session);
    this.enqueue(() =>
      this.db.query(
        `INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)
         ON CONFLICT (token) DO NOTHING`,
        [session.token, session.userId, session.createdAt]
      )
    );
  }

  deleteSession(token: string): void {
    this.sessions.delete(token);
    this.enqueue(() => this.db.query('DELETE FROM sessions WHERE token = $1', [token]));
  }

  deleteSessionsByUser(userId: string): void {
    for (const [token, s] of this.sessions) {
      if (s.userId === userId) this.sessions.delete(token);
    }
    this.enqueue(() => this.db.query('DELETE FROM sessions WHERE user_id = $1', [userId]));
  }

  appendFinishedGame(game: FinishedGameRecord): void {
    this.enqueue(() =>
      this.db.query(
        `INSERT INTO finished_games (code, seed, started_at, ended_at, players, winner_seat, action_log)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          game.code,
          game.seed,
          game.startedAt,
          game.endedAt,
          JSON.stringify(game.players),
          game.winnerSeat,
          JSON.stringify(game.actionLog),
        ]
      )
    );
  }
}

/**
 * Config SSL. Molti host gestiti (incl. alcuni free) espongono un certificato
 * self-signed: con `DATABASE_SSL=true` cifriamo la connessione senza verificare
 * la CA. Di default niente SSL (connessione diretta, come filess.io — che NON
 * supporta SSL). NB: `DATABASE_SSL=true` su filess.io fa fallire l'avvio.
 */
function sslConfig(): false | { rejectUnauthorized: boolean } {
  const mode = (process.env['DATABASE_SSL'] ?? '').trim().toLowerCase();
  if (mode === 'true' || mode === 'require' || mode === '1') {
    return { rejectUnauthorized: false };
  }
  return false;
}

/**
 * Rimuove i parametri `sslmode`/`ssl` dalla connection string: quando abbiamo
 * deciso di NON usare SSL, un `sslmode=require` residuo nell'URL riabiliterebbe
 * SSL alle spalle di `ssl:false` e su host senza SSL manderebbe in crash.
 */
export function stripSslParams(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('ssl');
    return url.toString();
  } catch {
    // Non è un URL parsabile: rimozione best-effort dei parametri via regex.
    return connectionString.replace(/([?&])(sslmode|ssl)=[^&]*/gi, '$1').replace(/[?&]$/, '');
  }
}

/**
 * Traduce un errore di connessione al primo avvio in un messaggio ATTIVABILE
 * (la causa più comune è la configurazione SSL sbagliata su filess.io & co.).
 */
function describeConnectError(err: unknown, sslOn: boolean): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/does not support SSL/i.test(msg) && sslOn) {
    return new Error(
      `Connessione al DB fallita: l'host non supporta SSL ma DATABASE_SSL è attivo. ` +
        `Rimuovi DATABASE_SSL (o mettilo a "false") — filess.io non usa SSL. Dettaglio: ${msg}`
    );
  }
  if (/(SSL|self.signed|certificate)/i.test(msg) && !sslOn) {
    return new Error(
      `Connessione al DB fallita per SSL: l'host lo richiede. Imposta DATABASE_SSL=true. Dettaglio: ${msg}`
    );
  }
  return new Error(
    `Connessione al DB fallita: controlla DATABASE_URL (utente/password/host/porta/nome DB). Dettaglio: ${msg}`
  );
}
