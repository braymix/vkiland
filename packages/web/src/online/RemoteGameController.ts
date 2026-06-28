/**
 * Controller di partita ONLINE: stessa interfaccia del LocalGameController,
 * ma lo stato autorevole vive sul server. Qui arrivano solo:
 *   - la PROPRIA vista filtrata + le mosse legali (game:update),
 *   - gli eventi filtrati (per il diario),
 *   - i rifiuti (game:rejected) mostrati come errori non bloccanti.
 * Il dispatch inoltra l'azione come INTENZIONE; la conferma è l'update.
 */
import type { Action, ValidationError } from '@vikiland/engine';
import type { GameUpdate } from '@vikiland/server/protocol';
import type { GameController, GameSnapshot, LogEntry } from '../game/controller';
import { describeEvent, describeStartingOrder, dragonComplaints } from '../game/logFormat';
import { accumulateStats, emptyStats, type GameStats } from '../game/stats';
import type { ServerSocket } from './connection';

const MAX_LOG = 120;

export class RemoteGameController implements GameController {
  private readonly listeners = new Set<() => void>();
  private snapshot: GameSnapshot | null = null;
  private log: LogEntry[] = [];
  private logCounter = 0;
  private errorCounter = 0;
  private lastRoll: GameSnapshot['lastRoll'] = null;
  private rollCounter = 0;
  private stats: GameStats | null = null;
  private readonly socket: ServerSocket;
  private readonly onUpdate = (u: GameUpdate): void => this.applyUpdate(u);
  private readonly onRejected = (r: { message: string }): void => {
    if (!this.snapshot) return;
    this.snapshot = {
      ...this.snapshot,
      remoteError: { id: ++this.errorCounter, message: r.message },
    };
    this.emit();
  };

  constructor(socket: ServerSocket) {
    this.socket = socket;
    socket.on('game:update', this.onUpdate);
    socket.on('game:rejected', this.onRejected);
    socket.emit('game:refresh');
  }

  /** true dopo il primo update: solo allora la GameScreen può montare. */
  get ready(): boolean {
    return this.snapshot !== null;
  }

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getSnapshot = (): GameSnapshot => {
    if (!this.snapshot) throw new Error('RemoteGameController non ancora pronto');
    return this.snapshot;
  };

  dispatch = (action: Action): ValidationError | null => {
    this.socket.emit('game:action', action);
    return null; // l'eventuale rifiuto arriva con game:rejected
  };

  confirmHandoff = (): void => {
    // Online ogni giocatore ha il proprio schermo: nessun passaggio di mano.
  };

  dispose = (): void => {
    this.socket.off('game:update', this.onUpdate);
    this.socket.off('game:rejected', this.onRejected);
    this.listeners.clear();
  };

  private applyUpdate(u: GameUpdate): void {
    // Scarta update arretrati (possibili dopo una riconnessione).
    if (this.snapshot && u.generation < this.snapshot.generation) return;
    // Primo update: il diario si apre col tiro per l'ordine di partenza.
    if (this.snapshot === null && this.log.length === 0) {
      for (const text of describeStartingOrder(u.view)) {
        this.log.push({ id: this.logCounter++, text });
      }
    }
    if (this.stats === null) this.stats = emptyStats(u.view.players.length);
    const botIds = new Set(u.view.players.filter((p) => p.isBot).map((p) => p.id));
    for (const e of u.events) {
      accumulateStats(this.stats, e);
      const text = describeEvent(e, u.view);
      if (text) this.log.push({ id: this.logCounter++, text });
      if (e.type === 'dadiTirati') {
        this.lastRoll = { id: ++this.rollCounter, dice: [e.dice[0], e.dice[1]], total: e.total };
      }
      // Easter egg: i bot bloccati dal Drago si lamentano (stessa frase
      // su tutti i client: la scelta è deterministica).
      if (e.type === 'dragoMosso') {
        for (const line of dragonComplaints(e, u.view, botIds, u.view.boardRadius)) {
          this.log.push({ id: this.logCounter++, text: line });
        }
      }
    }
    if (this.log.length > MAX_LOG) this.log = this.log.slice(-MAX_LOG);
    this.snapshot = {
      view: u.view,
      viewpoint: u.seat,
      humans: [u.seat],
      handoff: null,
      legalActions: u.legalActions,
      log: [...this.log],
      generation: u.generation,
      finalState: u.finalState,
      remoteError: this.snapshot?.remoteError ?? null,
      turnDeadline: u.turnDeadline,
      lastRoll: this.lastRoll,
      stats: this.stats,
    };
    this.emit();
  }

  private emit(): void {
    for (const cb of this.listeners) cb();
  }
}
