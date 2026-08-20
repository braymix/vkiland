/** Stanza autoritativa: partita completa, identità, timer di turno. */
import { describe, expect, it } from 'vitest';
import type { Action, PlayerColor } from '@vikiland/engine';
import type { GameUpdate, LobbyConfig } from '../src/protocol';
import { GameRoom, type Seat } from '../src/room';

const CFG: LobbyConfig = { avoidAdjacent68: true, targetGloryPoints: 10, turnTimerSec: 0, isPublic: false, calamities: false, battle: false, capitale: false };

/** Attende che `pred` diventi vero (polling), o fallisce dopo `timeoutMs`. */
function waitFor(pred: () => boolean, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = (): void => {
      if (pred()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout in attesa della condizione'));
      setTimeout(tick, 5);
    };
    tick();
  });
}

const bot = (name: string, color: PlayerColor = 'blu'): Seat => ({
  userId: null,
  name,
  isBot: true,
  botLevel: 'normale',
  color,
});
const human = (id: string, name: string, color: PlayerColor = 'rosso'): Seat => ({
  userId: id,
  name,
  isBot: false,
  botLevel: null,
  color,
});

describe('GameRoom', () => {
  it('una stanza di soli bot gioca da sola fino alla vittoria', async () => {
    const room = new GameRoom(
      'TEST01',
      'seed-room-bots',
      [bot('A', 'rosso'), bot('B', 'blu'), bot('C', 'verde')],
      CFG,
      { sendUpdate: () => {}, sendRejected: () => {} },
      { botDelayMs: [0, 0] }
    );
    await waitFor(() => room.isFinished, 30000);
    expect(room.winnerSeat).toBeGreaterThanOrEqual(0);
    expect(room.winnerSeat).toBeLessThan(3);
    room.dispose();
  }, 30000);

  it('umano pilotato dalle viste: gioca solo mosse legali ricevute e la partita termina', async () => {
    let error: unknown = null;
    const room: GameRoom = new GameRoom(
      'TEST02',
      'seed-room-human',
      [human('u1', 'Bjorn'), bot('B'), bot('C', 'verde')],
      CFG,
      {
        sendUpdate: (seat, update: GameUpdate) => {
          // Il "client" risponde in microtask con la prima mossa concreta.
          if (update.finalState) return;
          const move = update.legalActions.find(
            (m): m is Action => m.type !== 'scartaDescr' && m.type !== 'proponiScambioDescr'
          );
          if (!move) return;
          queueMicrotask(() => {
            try {
              room.handleAction(seat, move);
            } catch (e) {
              error = e;
            }
          });
        },
        sendRejected: () => {},
      },
      { botDelayMs: [0, 0] }
    );
    // Come fa la lobby all'avvio: invio delle viste iniziali.
    room.refreshAll();
    await waitFor(() => room.isFinished || error !== null, 30000);
    if (error) throw error;
    expect(room.winnerSeat).toBeGreaterThanOrEqual(0);
    room.dispose();
  }, 30000);

  it("rifiuta un'azione con player diverso dal posto (anti-impersonificazione)", () => {
    const rejected: string[] = [];
    const room = new GameRoom(
      'TEST03',
      'seed-room-cheat',
      [human('u1', 'Bjorn'), bot('B')],
      CFG,
      {
        sendUpdate: () => {},
        sendRejected: (_seat, message) => rejected.push(message),
      },
      { botDelayMs: [0, 0] }
    );
    room.handleAction(0, { type: 'tiraDadi', player: 1 });
    expect(rejected).toContain('Azione non tua');
    room.dispose();
  });

  it('col timer attivo il server forza la mossa di default per l’umano fermo', async () => {
    const updates: GameUpdate[] = [];
    const room = new GameRoom(
      'TEST04',
      'seed-room-timer',
      [human('u1', 'Bjorn'), bot('B')],
      { ...CFG, turnTimerSec: 1 },
      {
        sendUpdate: (_seat, u) => updates.push(u),
        sendRejected: () => {},
      },
      { botDelayMs: [0, 0] }
    );
    // L'umano non fa nulla: dopo ~1s il server piazza per lui (setup).
    await new Promise((r) => setTimeout(r, 1400));
    room.dispose();
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.some((u) => u.generation >= 1)).toBe(true);
    // Il timer è riarmato per il passo successivo dell'umano.
    expect(updates.at(-1)!.turnDeadline).not.toBeNull();
  }, 10000);

  it('refresh rimanda la vista corrente al posto richiesto', () => {
    const updates: GameUpdate[] = [];
    const room = new GameRoom(
      'TEST05',
      'seed-room-refresh',
      [human('u1', 'Bjorn'), bot('B')],
      CFG,
      {
        sendUpdate: (_seat, u) => updates.push(u),
        sendRejected: () => {},
      },
      { botDelayMs: [0, 0] }
    );
    room.refresh(0);
    expect(updates.length).toBe(1);
    expect(updates[0]!.seat).toBe(0);
    expect(updates[0]!.view.me?.id).toBe(0);
    // La vista è filtrata: niente segreti di stato nel payload.
    expect('rngState' in (updates[0]!.view as object)).toBe(false);
    room.dispose();
  });
});
