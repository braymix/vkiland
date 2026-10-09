import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorldLobbyManager, isErr, sanitizeWorldConfig, type WorldLobbyHooks } from '../src/worldLobby';
import { sanitizeMapOverride } from '../src/admin';
import { MemoryStorage } from '../src/storage';
import type { WorldUpdate } from '../src/protocol';

function setup(override: ReturnType<WorldLobbyHooks['getOverride']> = null) {
  const updates: { userId: string; update: WorldUpdate }[] = [];
  const rejected: { userId: string; message: string }[] = [];
  const closed: string[] = [];
  const removed: string[] = [];
  const mgr = new WorldLobbyManager(
    {
      broadcastState: () => {},
      closed: (code, reason) => closed.push(`${code}:${reason}`),
      userRemoved: (userId) => removed.push(userId),
      sendUpdate: (userId, update) => updates.push({ userId, update }),
      sendRejected: (userId, message) => rejected.push({ userId, message }),
      getOverride: () => override,
    },
    { botDelayMs: 50, disconnectedMs: 100 }
  );
  const last = (userId: string) => [...updates].reverse().find((u) => u.userId === userId)?.update ?? null;
  return { mgr, updates, rejected, closed, removed, last };
}

const A = { id: 'a', name: 'Ada' };
const B = { id: 'b', name: 'Bo' };

describe('lobby del mondo', () => {
  it('crea, fa entrare, aggiunge bot e rispetta i permessi dell\'host', () => {
    const { mgr } = setup();
    const created = mgr.create(A, { targetPoints: 99, isPublic: true });
    if (isErr(created)) throw new Error(created.error);
    expect(created.config.targetPoints).toBe(15); // limitato
    expect(created.seats).toHaveLength(1);
    expect(mgr.listPublic()).toHaveLength(1);

    const joined = mgr.join(created.code.toLowerCase(), B);
    if (isErr(joined)) throw new Error(joined.error);
    expect(joined.seats.map((s) => s.name)).toEqual(['Ada', 'Bo']);
    expect(joined.seats[1]!.isYou).toBe(true);

    expect(isErr(mgr.addBot('b', 'normale'))).toBe(true); // non host
    expect(mgr.addBot('a', 'normale')).toBe(true);
    expect(isErr(mgr.start('b'))).toBe(true);
    expect(isErr(mgr.join('ZZZZZ', { id: 'c', name: 'Cy' }))).toBe(true);
  });

  it('non permette di entrare due volte in partite diverse né di superare i posti', () => {
    const { mgr } = setup();
    const r1 = mgr.create(A, {});
    const r2 = mgr.create(B, {});
    if (isErr(r1) || isErr(r2)) throw new Error('create');
    expect(isErr(mgr.create(A, {}))).toBe(true);
    expect(isErr(mgr.join(r2.code, A))).toBe(true);
    for (let i = 0; i < 5; i++) mgr.addBot('a', 'facile');
    expect(isErr(mgr.addBot('a', 'facile'))).toBe(true); // 6 posti al massimo
  });

  it('servono almeno 2 giocatori per partire', () => {
    const { mgr } = setup();
    mgr.create(A, {});
    expect(isErr(mgr.start('a'))).toBe(true);
  });

  it('mappe d\'area: la lobby usa i posti della mappa scelta e parte con quella mappa', () => {
    const { mgr, last } = setup();
    const c = mgr.create(A, { mapId: 'italia' });
    if (isErr(c)) throw new Error('create');
    expect(c.config.mapId).toBe('italia');
    expect(c.maxPlayers).toBe(4); // 19 territori produttivi → 4 giocatori
    for (let i = 0; i < 3; i++) expect(mgr.addBot('a', 'facile')).toBe(true);
    expect(isErr(mgr.addBot('a', 'facile'))).toBe(true);
    expect(mgr.start('a')).toBe(true);
    expect(last('a')!.view.map.id).toBe('italia');
  });

  it('config: sanitizeWorldConfig limita punti, timer e mappa', () => {
    expect(sanitizeWorldConfig({ targetPoints: 1, turnTimerSec: 9999, mapId: 'x' })).toMatchObject({
      targetPoints: 8,
      turnTimerSec: 300,
      mapId: 'mondo',
    });
  });

  it('terminate: solo l\'host chiude, tutti vengono avvisati', () => {
    const { mgr, closed } = setup();
    const c = mgr.create(A, {});
    if (isErr(c)) throw new Error('create');
    mgr.join(c.code, B);
    expect(mgr.terminate('b')).not.toBeNull();
    expect(mgr.terminate('a')).toBeNull();
    expect(closed).toHaveLength(1);
    expect(mgr.roomOfUser('a')).toBeNull();
  });

  it('l\'host che esce passa il ruolo a un altro giocatore; senza umani la lobby si chiude', () => {
    const { mgr, closed } = setup();
    const c = mgr.create(A, {});
    if (isErr(c)) throw new Error('create');
    mgr.join(c.code, B);
    mgr.leave('a');
    expect(mgr.roomOfUser('b')!.hostId).toBe('b');
    mgr.leave('b');
    expect(closed).toHaveLength(1);
  });
});

describe('partita del mondo sul server', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('all\'avvio ogni umano riceve vista + mosse legali; gli altri non vedono le sue carte', () => {
    const { mgr, last } = setup();
    const c = mgr.create(A, {});
    if (isErr(c)) throw new Error('create');
    mgr.join(c.code, B);
    expect(mgr.start('a')).toBe(true);
    const ua = last('a')!;
    const ub = last('b')!;
    expect(ua.seat).toBe(0);
    expect(ub.seat).toBe(1);
    expect(ua.legal.some((x) => x.type === 'piazzaVillaggioIniziale')).toBe(true);
    expect(ub.legal).toEqual([]); // non è il suo turno
    expect(ua.view.hand).not.toBeNull();
    expect(JSON.stringify(ub.view)).not.toContain('"rng"');
  });

  it('rifiuta azioni fuori turno, di un altro posto o illegali', () => {
    const { mgr, rejected } = setup();
    const c = mgr.create(A, {});
    if (isErr(c)) throw new Error('create');
    mgr.join(c.code, B);
    mgr.start('a');
    mgr.handleAction('b', { type: 'piazzaVillaggioIniziale', player: 1, territory: 'italia' }); // non tocca a lui
    mgr.handleAction('b', { type: 'piazzaVillaggioIniziale', player: 0, territory: 'italia' }); // posto altrui
    mgr.handleAction('a', { type: 'tiraDadi', player: 0 }); // fase sbagliata
    expect(rejected.map((r) => r.userId)).toEqual(['b', 'b', 'a']);
    mgr.handleAction('a', { type: 'piazzaVillaggioIniziale', player: 0, territory: 'italia' });
    expect(rejected).toHaveLength(3);
  });

  it('un umano disconnesso viene giocato dal server e la partita non si blocca', async () => {
    const { mgr, last } = setup();
    const c = mgr.create(A, {});
    if (isErr(c)) throw new Error('create');
    mgr.addBot('a', 'normale');
    mgr.addBot('a', 'normale');
    mgr.start('a');
    mgr.setConnected('a', false);
    await vi.advanceTimersByTimeAsync(120_000);
    const seq1 = mgr.roomOfUser('a')!.seq;
    expect(seq1).toBeGreaterThan(20);
    expect(last('a')!.view.turnNumber).toBeGreaterThan(0);
  });

  it('timer di turno: allo scadere gioca la mossa di default', async () => {
    const { mgr, last } = setup();
    const c = mgr.create(A, { turnTimerSec: 5 });
    if (isErr(c)) throw new Error('create');
    mgr.addBot('a', 'normale');
    mgr.start('a');
    expect(last('a')!.view.phase.type).toBe('setup');
    await vi.advanceTimersByTimeAsync(5_100);
    // l'umano non ha giocato: il server ha piazzato il villaggio per lui
    expect(Object.values(last('a')!.view.territories).some((t) => t.settlements.some((x) => x.owner === 0))).toBe(true);
  });

  it('una partita con un umano passivo e bot arriva a un vincitore', async () => {
    const { mgr, last } = setup();
    const c = mgr.create(A, { targetPoints: 8 });
    if (isErr(c)) throw new Error('create');
    mgr.addBot('a', 'normale');
    mgr.addBot('a', 'normale');
    mgr.start('a');
    mgr.setConnected('a', false);
    let guard = 0;
    while (last('a')!.view.phase.type !== 'fine' && guard++ < 6000) await vi.advanceTimersByTimeAsync(120);
    expect(last('a')!.view.phase.type).toBe('fine');
  });

  it('riconnessione: join con lo stesso utente restituisce il posto e rimanda la vista', () => {
    const { mgr, updates } = setup();
    const c = mgr.create(A, {});
    if (isErr(c)) throw new Error('create');
    mgr.addBot('a', 'normale');
    mgr.start('a');
    mgr.leave('a'); // esce a partita avviata: il posto resta
    const before = updates.length;
    const res = mgr.join(c.code, A);
    expect(isErr(res)).toBe(false);
    mgr.refresh('a');
    expect(updates.length).toBeGreaterThan(before);
  });

  it('l\'override admin (rinomina/rimuovi) vale per la partita', () => {
    const o = { mapId: 'mondo', names: { italia: 'Italica' }, removed: ['giappone'] };
    const { mgr, last } = setup(o);
    const c = mgr.create(A, {});
    if (isErr(c)) throw new Error('create');
    mgr.addBot('a', 'normale');
    mgr.start('a');
    const v = last('a')!.view;
    expect(v.map.territories).toHaveLength(31);
    expect(v.map.territories.find((t) => t.id === 'italia')!.name).toBe('Italica');
  });
});

describe('storage e sanitizzazione degli override', () => {
  it('MemoryStorage salva e ripristina un override', () => {
    const st = new MemoryStorage();
    st.setMapOverride({ mapId: 'mondo', names: { italia: 'X' }, removed: [] }, 'mondo');
    expect(st.getMapOverrides()['mondo']!.names['italia']).toBe('X');
    st.setMapOverride(null, 'mondo');
    expect(st.getMapOverrides()['mondo']).toBeUndefined();
  });

  it('sanitizeMapOverride: tiene solo id noti, nomi validi; rifiuta mappe ingiocabili e parole censurate', () => {
    const ok = sanitizeMapOverride({ names: { italia: '  Italica  ', nope: 'x', cina: '' }, removed: ['giappone', 'boh'] }, 'mondo');
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.override.names).toEqual({ italia: 'Italica' });
      expect(ok.override.removed).toEqual(['giappone']);
    }
    expect(sanitizeMapOverride({ removed: ['sud_est_asia'] }, 'mondo').ok).toBe(false); // isola l'Australia
    expect(sanitizeMapOverride({ names: { italia: 'Parolaccia' } }, 'mondo', ['parolac']).ok).toBe(false);
    expect(sanitizeMapOverride({}, 'sconosciuta').ok).toBe(false);
    expect(sanitizeMapOverride({ names: { italia: 'x'.repeat(41) } }, 'mondo')).toMatchObject({ ok: true });
  });
});
