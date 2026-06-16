/**
 * Diario di bordo: cronologico dall'alto verso il basso, ultime attività IN
 * FONDO. Trucco da chat: il DOM è invertito (più recente per primo) e il CSS
 * usa column-reverse — così il browser tiene lo scroll agganciato in fondo
 * da solo quando arrivano righe nuove.
 */
import type { LogEntry } from '../game/LocalGameController';
import { it } from '../i18n';

export function GameLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="area-log pixel-frame">
      <div style={{ fontSize: 9, color: 'var(--ink-dim)', marginBottom: 4 }}>{it.diario}</div>
      <div className="game-log">
        {entries
          .slice(-40)
          .reverse()
          .map((e) => (
            <div key={e.id}>{e.text}</div>
          ))}
      </div>
    </div>
  );
}
