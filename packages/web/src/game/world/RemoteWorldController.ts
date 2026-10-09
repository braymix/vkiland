/**
 * Controller ONLINE di «Vikings Around the World»: lo stato autorevole vive sul
 * server; qui arrivano la propria vista, le mosse legali e gli eventi (diario).
 */
import type { PlayerId, ResourceMap, ValidationError, WorldAction } from '@vikiland/engine-world';
import type { WorldUpdate } from '@vikiland/server/protocol';
import type { ServerSocket } from '../../online/connection';
import { formatWorldEvent } from './logFormat';
import type { WorldController, WorldLogEntry, WorldSnapshot } from './LocalWorldController';

const MAX_LOG = 80;

export class RemoteWorldController implements WorldController {
  private readonly listeners = new Set<() => void>();
  private snapshot: WorldSnapshot | null = null;
  private log: WorldLogEntry[] = [];
  private logId = 0;
  private errorId = 0;
  private error: WorldSnapshot['error'] = null;

  private readonly onUpdate = (u: WorldUpdate): void => {
    const ctx = {
      playerName: (id: number) => u.view.players[id]?.name ?? `#${id}`,
      map: u.view.map,
    };
    for (const e of u.events) {
      const text = formatWorldEvent(e, ctx);
      if (text) this.log.push({ id: ++this.logId, text });
    }
    if (this.log.length > MAX_LOG) this.log = this.log.slice(-MAX_LOG);
    this.snapshot = {
      view: u.view,
      viewpoint: u.seat,
      legal: u.legal,
      log: this.log,
      handoff: null,
      thinking: u.thinking,
      winner: u.view.phase.type === 'fine' ? u.view.phase.winner : null,
      lastEvents: u.events,
      seq: u.seq,
      error: this.error,
    };
    this.emit();
  };

  private readonly onRejected = (r: { message: string }): void => {
    this.error = { id: ++this.errorId, message: r.message };
    if (this.snapshot) {
      this.snapshot = { ...this.snapshot, error: this.error };
      this.emit();
    }
  };

  constructor(private readonly socket: ServerSocket) {
    socket.on('world:update', this.onUpdate);
    socket.on('world:rejected', this.onRejected);
    socket.emit('world:refresh');
  }

  /** true dopo il primo aggiornamento: solo allora la schermata può montare. */
  get ready(): boolean {
    return this.snapshot !== null;
  }

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getSnapshot = (): WorldSnapshot => {
    if (!this.snapshot) throw new Error('RemoteWorldController non ancora pronto');
    return this.snapshot;
  };

  dispatch(action: WorldAction): ValidationError | null {
    this.socket.emit('world:action', action);
    return null;
  }

  proposeTrade(from: PlayerId, give: ResourceMap, receive: ResourceMap, to: PlayerId | null): ValidationError | null {
    this.socket.emit('world:action', { type: 'proponiScambio', player: from, give, receive, to });
    return null;
  }

  confirmHandoff(): void {
    /* nessun passaggio di dispositivo online */
  }

  dispose(): void {
    this.socket.off('world:update', this.onUpdate);
    this.socket.off('world:rejected', this.onRejected);
    this.listeners.clear();
  }

  private emit(): void {
    for (const cb of [...this.listeners]) cb();
  }
}
