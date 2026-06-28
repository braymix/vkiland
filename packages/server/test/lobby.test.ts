/** Lobby: codici invito, posti, avvio partita, riconnessione. */
import { describe, expect, it } from 'vitest';
import type { GameUpdate, LobbyState } from '../src/protocol';
import { LobbyManager, type LobbyManagerCallbacks } from '../src/lobby';
import { isApiError } from '../src/protocol';

const CFG = { avoidAdjacent68: true, targetGloryPoints: 10, turnTimerSec: 0, isPublic: false };

interface Recorded {
  lobbyStates: LobbyState[];
  closed: { code: string; reason: string }[];
  removed: { userId: string; reason: string }[];
  updates: Map<string, GameUpdate[]>;
}

function makeManager(): { manager: LobbyManager; rec: Recorded } {
  const rec: Recorded = { lobbyStates: [], closed: [], removed: [], updates: new Map() };
  const callbacks: LobbyManagerCallbacks = {
    broadcastLobby: (s) => rec.lobbyStates.push(s),
    lobbyClosed: (code, reason) => rec.closed.push({ code, reason }),
    userRemoved: (userId, _code, reason) => rec.removed.push({ userId, reason }),
    sendUpdate: (userId, u) => {
      const list = rec.updates.get(userId) ?? [];
      list.push(u);
      rec.updates.set(userId, list);
    },
    sendRejected: () => {},
    gameFinished: () => {},
  };
  return { manager: new LobbyManager(callbacks, { botDelayMs: [0, 0] }), rec };
}

const bjorn = { id: 'u-bjorn', name: 'Bjorn' };
const astrid = { id: 'u-astrid', name: 'Astrid' };

describe('LobbyManager', () => {
  it('crea una lobby con codice a 6 caratteri e fa entrare un secondo umano', () => {
    const { manager } = makeManager();
    const created = manager.create(bjorn, CFG);
    expect(isApiError(created)).toBe(false);
    if (isApiError(created)) return;
    expect(created.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(created.slots).toHaveLength(1);

    const joined = manager.join(created.code.toLowerCase(), astrid);
    expect(isApiError(joined)).toBe(false);
    if (!isApiError(joined)) expect(joined.slots).toHaveLength(2);

    expect(isApiError(manager.join('XXXXXX', { id: 'u3', name: 'Leif' }))).toBe(true);
  });

  it('ri-join dello stesso utente non duplica il posto (riconnessione)', () => {
    const { manager } = makeManager();
    const created = manager.create(bjorn, CFG);
    if (isApiError(created)) throw new Error('create fallita');
    manager.join(created.code, astrid);
    const again = manager.join(created.code, astrid);
    if (isApiError(again)) throw new Error('rejoin fallito');
    expect(again.slots).toHaveLength(2);
  });

  it('solo l’host aggiunge/rimuove bot e giocatori; il rimosso viene avvisato', () => {
    const { manager, rec } = makeManager();
    const created = manager.create(bjorn, CFG);
    if (isApiError(created)) throw new Error('create fallita');
    manager.join(created.code, astrid);

    expect(isApiError(manager.addBot(astrid.id, 'facile'))).toBe(true);
    const withBot = manager.addBot(bjorn.id, 'facile');
    if (isApiError(withBot)) throw new Error('addBot fallita');
    expect(withBot.slots).toHaveLength(3);
    expect(withBot.slots[2]!.isBot).toBe(true);

    // L'host rimuove Astrid (indice 1): lei riceve l'avviso.
    const afterKick = manager.removeSlot(bjorn.id, 1);
    if (isApiError(afterKick)) throw new Error('removeSlot fallita');
    expect(afterKick.slots).toHaveLength(2);
    expect(rec.removed.some((r) => r.userId === astrid.id)).toBe(true);
    expect(manager.lobbyOfUser(astrid.id)).toBeNull();
  });

  it('default dei colori distinti e cambio colore (proprio, bot dell’host, scambio)', () => {
    const { manager } = makeManager();
    const created = manager.create(bjorn, CFG);
    if (isApiError(created)) throw new Error('create fallita');
    manager.join(created.code, astrid);
    const withBot = manager.addBot(bjorn.id, 'facile');
    if (isApiError(withBot)) throw new Error('addBot fallita');
    // Colori assegnati di default in ordine (palette libera), tutti distinti.
    expect(withBot.slots.map((s) => s.color)).toEqual(['#c0392b', '#2e6fb7', '#3e8f4e']);

    // Astrid (posto 1, blu) prende il verde del bot → SCAMBIO: il bot diventa blu.
    const swapped = manager.setColor(astrid.id, 1, '#3e8f4e');
    if (isApiError(swapped)) throw new Error('setColor fallita');
    expect(swapped.slots[1]!.color).toBe('#3e8f4e');
    expect(swapped.slots[2]!.color).toBe('#2e6fb7');
    expect(swapped.slots[0]!.color).toBe('#c0392b');

    // Astrid può prendere un colore libero (viola), nessuno scambio.
    const free = manager.setColor(astrid.id, 1, '#8e44ad');
    if (isApiError(free)) throw new Error('setColor libero fallita');
    expect(free.slots[1]!.color).toBe('#8e44ad');
    expect(free.slots[2]!.color).toBe('#2e6fb7');

    // Un colore QUALSIASI (fuori palette) va bene: basta che sia esadecimale,
    // e viene normalizzato in minuscolo.
    const custom = manager.setColor(astrid.id, 1, '#123ABC');
    if (isApiError(custom)) throw new Error('setColor personalizzato fallita');
    expect(custom.slots[1]!.color).toBe('#123abc');

    // Astrid NON può cambiare il colore del bot (non è host).
    expect(isApiError(manager.setColor(astrid.id, 2, '#d9a525'))).toBe(true);
    // L'host invece sì.
    const hostBot = manager.setColor(bjorn.id, 2, '#d9a525');
    if (isApiError(hostBot)) throw new Error('host setColor bot fallita');
    expect(hostBot.slots[2]!.color).toBe('#d9a525');

    // Astrid non può cambiare il colore di un ALTRO umano (l'host).
    expect(isApiError(manager.setColor(astrid.id, 0, '#3e8f4e'))).toBe(true);
    // Colore non valido (non esadecimale) respinto.
    expect(isApiError(manager.setColor(bjorn.id, 0, 'arcobaleno'))).toBe(true);
  });

  it('si parte in almeno 2; all’avvio ogni umano riceve subito la sua vista', () => {
    const { manager, rec } = makeManager();
    const created = manager.create(bjorn, CFG);
    if (isApiError(created)) throw new Error('create fallita');
    expect(isApiError(manager.start(bjorn.id))).toBe(true); // da solo no

    manager.join(created.code, astrid);
    expect(isApiError(manager.start(astrid.id))).toBe(true); // non host
    const started = manager.start(bjorn.id);
    if (isApiError(started)) throw new Error('start fallita');
    expect(started.started).toBe(true);

    expect(rec.updates.get(bjorn.id)?.length).toBeGreaterThan(0);
    expect(rec.updates.get(astrid.id)?.length).toBeGreaterThan(0);
    // Ogni vista è dal punto di vista giusto.
    expect(rec.updates.get(bjorn.id)!.at(-1)!.view.me?.id).toBe(0);
    expect(rec.updates.get(astrid.id)!.at(-1)!.view.me?.id).toBe(1);
  });

  it('le azioni passano solo dal proprio posto e producono nuovi update', () => {
    const { manager, rec } = makeManager();
    const created = manager.create(bjorn, CFG);
    if (isApiError(created)) throw new Error('create fallita');
    manager.join(created.code, astrid);
    manager.start(bjorn.id);

    const last = rec.updates.get(bjorn.id)!.at(-1)!;
    const move = last.legalActions.find((m) => m.type === 'piazzaVillaggioIniziale');
    if (last.view.setupOrder[0] === 0) {
      expect(move).toBeDefined();
      manager.handleAction(bjorn.id, move as never);
      expect(rec.updates.get(bjorn.id)!.at(-1)!.generation).toBe(1);
    }
  });

  it('le partite PUBBLICHE appaiono in lista finché aperte; le private mai', () => {
    const { manager } = makeManager();
    const pub = manager.create(bjorn, { ...CFG, isPublic: true });
    if (isApiError(pub)) throw new Error('create fallita');
    manager.create(astrid, CFG); // privata

    const list = manager.listPublic();
    expect(list).toHaveLength(1);
    expect(list[0]!.code).toBe(pub.code);
    expect(list[0]!.hostName).toBe('Bjorn');
    expect(list[0]!.players).toBe(1);

    // Chiunque entra direttamente col codice della lista.
    const leif = { id: 'u-leif', name: 'Leif' };
    expect(isApiError(manager.join(list[0]!.code, leif))).toBe(false);
    expect(manager.listPublic()[0]!.players).toBe(2);

    // Piena (6) o avviata ⇒ sparisce dalla lista. Bjorn + Leif + 4 bot = 6.
    manager.addBot(bjorn.id, 'facile');
    manager.addBot(bjorn.id, 'facile');
    manager.addBot(bjorn.id, 'facile');
    manager.addBot(bjorn.id, 'facile');
    expect(manager.listPublic()).toHaveLength(0);
    const reopened = manager.removeSlot(bjorn.id, 5);
    if (isApiError(reopened)) throw new Error('removeSlot fallita');
    expect(manager.listPublic()).toHaveLength(1);
    manager.start(bjorn.id);
    expect(manager.listPublic()).toHaveLength(0);
  });

  it('se l’host esce prima dell’avvio la lobby si chiude per tutti', () => {
    const { manager, rec } = makeManager();
    const created = manager.create(bjorn, CFG);
    if (isApiError(created)) throw new Error('create fallita');
    manager.join(created.code, astrid);
    manager.leave(bjorn.id);
    expect(rec.closed).toHaveLength(1);
    expect(manager.lobbyOfUser(astrid.id)).toBeNull();
  });

  it('l’host può TERMINARE la partita in corso per tutti; gli altri no', () => {
    const { manager, rec } = makeManager();
    const created = manager.create(bjorn, CFG);
    if (isApiError(created)) throw new Error('create fallita');
    manager.join(created.code, astrid);
    manager.start(bjorn.id);

    // Un non-host non può.
    expect(manager.terminate(astrid.id)).not.toBeNull();
    expect(rec.closed).toHaveLength(0);

    // L'host sì, anche a partita avviata: chiusa per tutti.
    expect(manager.terminate(bjorn.id)).toBeNull();
    expect(rec.closed).toHaveLength(1);
    expect(rec.closed[0]!.reason).toContain('terminato');
    expect(manager.lobbyOfUser(bjorn.id)).toBeNull();
    expect(manager.lobbyOfUser(astrid.id)).toBeNull();
    // Il codice non è più valido.
    expect(isApiError(manager.join(created.code, { id: 'u3', name: 'Leif' }))).toBe(true);
  });

  it('a partita iniziata chi esce resta seduto (disconnesso) e può rientrare col codice', () => {
    const { manager } = makeManager();
    const created = manager.create(bjorn, CFG);
    if (isApiError(created)) throw new Error('create fallita');
    manager.join(created.code, astrid);
    manager.start(bjorn.id);

    manager.leave(astrid.id);
    const lobby = manager.lobbyOfUser(bjorn.id);
    expect(lobby?.slots.find((s) => s.userId === astrid.id)?.connected).toBe(false);

    const back = manager.join(created.code, astrid);
    expect(isApiError(back)).toBe(false);
    if (!isApiError(back)) {
      expect(back.started).toBe(true);
      expect(back.slots.find((s) => s.userId === astrid.id)?.connected).toBe(true);
    }
  });
});
