/** Scelta della vittima del Drago. */
import type { Action, PlayerId, PlayerView } from '@vikiland/engine';
import { it } from '../../i18n';
import { PLAYER_COLORS } from '../../render/sprites/palettes';
import { Dialog } from './Dialog';

interface Props {
  view: PlayerView;
  candidates: PlayerId[];
  onSubmit: (action: Action) => void;
}

export function StealDialog({ view, candidates, onSubmit }: Props) {
  const me = view.me!;
  return (
    <Dialog title={it.scegliVittima}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {candidates.map((pid) => {
          const p = view.players[pid]!;
          return (
            <button
              key={pid}
              className="pxbtn pxbtn--ghost"
              onClick={() => onSubmit({ type: 'ruba', player: me.id, target: pid })}
            >
              <span
                className="player-chip"
                style={{ background: PLAYER_COLORS[p.color].main, display: 'inline-block', marginRight: 8 }}
              />
              {p.name} — PG {p.gloryPointsPublic} · carte {p.resourceCardCount}
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
