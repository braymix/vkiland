/**
 * PostgresStorage: cache in memoria con write-through. Usiamo un finto `PgLike`
 * (nessun database vero) per verificare che le LETTURE arrivino dalla memoria e
 * che ogni SCRITTURA aggiorni la memoria all'istante e finisca in coda verso il
 * DB con la query attesa.
 */
import { describe, expect, it } from 'vitest';
import { PostgresStorage, stripSslParams, type PgLike } from '../src/storagePg';

interface Call {
  text: string;
  params: readonly unknown[];
}

/** DB finto: registra le query e serve righe pre-caricate alle SELECT. */
class FakePg implements PgLike {
  calls: Call[] = [];
  constructor(
    private readonly seed: { users?: unknown[]; sessions?: unknown[] } = {}
  ) {}

  query(text: string, params: readonly unknown[] = []): Promise<{ rows: unknown[] }> {
    this.calls.push({ text, params });
    if (/select .* from users/i.test(text)) return Promise.resolve({ rows: this.seed.users ?? [] });
    if (/select .* from sessions/i.test(text)) return Promise.resolve({ rows: this.seed.sessions ?? [] });
    return Promise.resolve({ rows: [] });
  }
  end(): Promise<void> {
    return Promise.resolve();
  }

  /** Quante query registrate contengono il frammento dato. */
  count(fragment: RegExp): number {
    return this.calls.filter((c) => fragment.test(c.text)).length;
  }
  last(fragment: RegExp): Call | undefined {
    return [...this.calls].reverse().find((c) => fragment.test(c.text));
  }
}

describe('PostgresStorage (write-through su memoria)', () => {
  it('init crea le tabelle e carica utenti/sessioni in memoria', async () => {
    const fake = new FakePg({
      users: [
        { id: 'u1', username: 'Ragnar', password_hash: 'h', created_at: '10', cosmetics: { dragon: 'trex' } },
      ],
      sessions: [{ token: 't1', user_id: 'u1', created_at: '20' }],
    });
    const store = new PostgresStorage(fake);
    await store.init();

    expect(fake.count(/create table if not exists users/i)).toBe(1);
    expect(fake.count(/create table if not exists sessions/i)).toBe(1);
    expect(fake.count(/create table if not exists finished_games/i)).toBe(1);

    // Letture dalla memoria (sincrone), incluso il JSONB dei cosmetici.
    expect(store.getUserById('u1')?.username).toBe('Ragnar');
    expect(store.getUserById('u1')?.createdAt).toBe(10); // BIGINT → number
    expect(store.getUserById('u1')?.cosmetics).toEqual({ dragon: 'trex' });
    expect(store.getUserByUsername('ragnar')?.id).toBe('u1'); // case-insensitive
    expect(store.getSession('t1')?.userId).toBe('u1');
  });

  it('createUser/updateUser: memoria immediata + upsert accodato', async () => {
    const fake = new FakePg();
    const store = new PostgresStorage(fake);
    await store.init();

    store.createUser({ id: 'u2', username: 'Bjorn', passwordHash: 'h', createdAt: 5 });
    // Visibile SUBITO, prima ancora che la query tocchi il DB.
    expect(store.getUserById('u2')?.username).toBe('Bjorn');

    store.updateUser({ id: 'u2', username: 'Bjorn', passwordHash: 'h', createdAt: 5, cosmetics: { stronghold: 'torre' } });
    expect(store.getUserById('u2')?.cosmetics).toEqual({ stronghold: 'torre' });

    await store.flush();
    // Entrambe passano dall'upsert (INSERT ... ON CONFLICT DO UPDATE).
    expect(fake.count(/insert into users[\s\S]*on conflict/i)).toBe(2);
    const upsert = fake.last(/insert into users/i)!;
    expect(upsert.params[1]).toBe('Bjorn');
    expect(upsert.params[4]).toBe(JSON.stringify({ stronghold: 'torre' })); // cosmetics serializzati
  });

  it('sessioni: create/delete aggiornano memoria e DB', async () => {
    const fake = new FakePg();
    const store = new PostgresStorage(fake);
    await store.init();

    store.createSession({ token: 'a', userId: 'u1', createdAt: 1 });
    store.createSession({ token: 'b', userId: 'u1', createdAt: 2 });
    store.createSession({ token: 'c', userId: 'u9', createdAt: 3 });
    expect(store.getSession('a')?.userId).toBe('u1');

    store.deleteSession('a');
    expect(store.getSession('a')).toBeNull();
    expect(store.getSession('b')?.userId).toBe('u1');

    store.deleteSessionsByUser('u1');
    expect(store.getSession('b')).toBeNull();
    expect(store.getSession('c')?.userId).toBe('u9'); // altro utente: resta

    await store.flush();
    expect(fake.count(/insert into sessions/i)).toBe(3);
    expect(fake.count(/delete from sessions where token/i)).toBe(1);
    expect(fake.count(/delete from sessions where user_id/i)).toBe(1);
  });

  it('appendFinishedGame accoda un insert in finished_games', async () => {
    const fake = new FakePg();
    const store = new PostgresStorage(fake);
    await store.init();

    store.appendFinishedGame({
      code: 'ABCD',
      seed: 's',
      startedAt: 1,
      endedAt: 2,
      players: [{ userId: 'u1', name: 'A', isBot: false }],
      winnerSeat: 0,
      actionLog: [],
    });
    await store.flush();
    expect(fake.count(/insert into finished_games/i)).toBe(1);
    const call = fake.last(/insert into finished_games/i)!;
    expect(call.params[0]).toBe('ABCD');
    expect(call.params[4]).toBe(JSON.stringify([{ userId: 'u1', name: 'A', isBot: false }]));
  });

  it('stripSslParams toglie sslmode/ssl per non riabilitare SSL su host senza SSL', () => {
    expect(stripSslParams('postgresql://u:p@host:5432/db?sslmode=require')).toBe(
      'postgresql://u:p@host:5432/db'
    );
    expect(stripSslParams('postgresql://u:p@host:5432/db?ssl=true&x=1')).toBe(
      'postgresql://u:p@host:5432/db?x=1'
    );
    // Senza parametri SSL la stringa resta invariata (host/porta/db intatti).
    expect(stripSslParams('postgresql://u:p@host:5432/db')).toBe('postgresql://u:p@host:5432/db');
  });

  it('un errore di scrittura non propaga (i dati restano in memoria)', async () => {
    const boom: PgLike = {
      query: (text) =>
        /insert/i.test(text) ? Promise.reject(new Error('DB giù')) : Promise.resolve({ rows: [] }),
      end: () => Promise.resolve(),
    };
    const store = new PostgresStorage(boom);
    await store.init();
    store.createUser({ id: 'u3', username: 'Ivar', passwordHash: 'h', createdAt: 7 });
    // Nessuna eccezione risale; la memoria è comunque coerente.
    await expect(store.flush()).resolves.toBeUndefined();
    expect(store.getUserById('u3')?.username).toBe('Ivar');
  });
});
