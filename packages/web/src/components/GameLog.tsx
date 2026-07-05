/**
 * Diario di bordo: collassabile, di default chiuso. Cronologico dall'alto verso il basso,
 * ultime attività IN FONDO. Trucco da chat: il DOM è invertito (più recente per primo)
 * e il CSS usa column-reverse — così il browser tiene lo scroll agganciato in fondo.
 */
import type { LogEntry } from '../game/LocalGameController';
import { it } from '../i18n';

export function GameLog({
  entries,
  open,
  onToggle,
}: {
  entries: LogEntry[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="area-log pixel-frame">
      <button
        className="pxbtn pxbtn--small"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          justifyContent: 'space-between',
          marginBottom: open ? 4 : 0,
        }}
        onClick={onToggle}
      >
        <span>{open ? '▾' : '▸'} {it.diario}</span>
      </button>
      {open && (
        <div className="game-log">
          {entries
            .slice(-40)
            .reverse()
            .map((e) => (
              <div key={e.id}>{e.text}</div>
            ))}
        </div>
      )}
    </div>
  );
}
