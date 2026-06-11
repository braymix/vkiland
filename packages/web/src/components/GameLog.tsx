/** Diario di bordo: gli ultimi eventi, in ordine inverso. */
import type { LogEntry } from '../game/LocalGameController';
import { it } from '../i18n/it';

export function GameLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="area-log pixel-frame">
      <div style={{ fontSize: 9, color: 'var(--ink-dim)', marginBottom: 4 }}>{it.diario}</div>
      <div className="game-log">
        {entries
          .slice(-40)
          .map((e) => (
            <div key={e.id}>{e.text}</div>
          ))}
      </div>
    </div>
  );
}
