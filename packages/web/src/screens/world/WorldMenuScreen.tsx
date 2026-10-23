/** Sottomenu del Mondo: nuova partita, missioni, libro delle saghe, inventario — tutto SOLO suo. */
import { useEffect, useState } from 'react';
import { readyChestCount, pendingMissionCount, type WorldProgression } from '@vikiland/engine';
import { wt } from '../../i18n/world';
import { it } from '../../i18n';
import { inv } from '../../i18n/inventory';

/** Pallino rosso «da fare», col numero di azioni in sospeso (0 → non mostrato). */
function ActionBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="menu-badge" aria-label={inv.azioniDaFare(count)}>
      {count}
    </span>
  );
}

export function WorldMenuScreen({
  progression,
  onNewGame,
  onLibro,
  onInventory,
  onMissions,
  onBack,
}: {
  progression: WorldProgression;
  onNewGame: () => void;
  onLibro: () => void;
  onInventory: () => void;
  onMissions: () => void;
  onBack: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const missionsPending = pendingMissionCount(progression, now);
  const chestsPending = readyChestCount(progression, now);

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h1 className="menu-title">🌍 {wt.mondo}</h1>
      <div className="menu-sub">{wt.sottotitolo}</div>
      <div className="menu-buttons">
        <button className="pxbtn menu-mode menu-mode--world" onClick={onNewGame}>
          🌍 {wt.nuovaMondo}
        </button>
        <button className="pxbtn pxbtn--ghost" onClick={onMissions}>
          🗺️ {inv.missioniTitolo}
          <ActionBadge count={missionsPending} />
        </button>
        <button className="pxbtn pxbtn--ghost" onClick={onLibro}>
          {it.libroSaghe}
        </button>
        <button className="pxbtn pxbtn--ghost" onClick={onInventory}>
          🎒 {it.inventario}
          <ActionBadge count={chestsPending} />
        </button>
      </div>
      <button className="pxbtn pxbtn--ghost" onClick={onBack}>
        {it.indietro}
      </button>
    </div>
  );
}
