/** Schermata di vittoria: classifica con il dettaglio dei Punti Gloria. */
import { scoreBreakdown, type GameState } from '@vikiland/engine';
import { it, t } from '../i18n/it';
import { PLAYER_COLORS } from '../render/sprites/palettes';

interface Props {
  state: GameState;
  onExit: () => void;
  onRematch: () => void;
}

export function VictoryScreen({ state, onExit, onRematch }: Props) {
  if (state.phase.type !== 'gameOver') return null;
  const winner = state.players[state.phase.winner]!;
  const rows = state.players
    .map((p) => scoreBreakdown(state, p.id))
    .sort((a, b) => b.totale - a.totale);

  return (
    <div className="dialog-backdrop">
      <div className="dialog pixel-frame" style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: 13, textAlign: 'center' }}>
          {t(it.vittoriaTitolo, { nome: winner.name })}
        </h2>
        <div style={{ fontSize: 9, color: 'var(--ink-dim)', textAlign: 'center' }}>
          {it.dettaglioPunti}
        </div>
        <table className="victory-table">
          <thead>
            <tr>
              <th></th>
              <th>{it.villaggi}</th>
              <th>{it.roccaforti}</th>
              <th>{it.bonusGrandeVia}</th>
              <th>{it.bonusFuria}</th>
              <th>{it.eroiNascosti}</th>
              <th>{it.totale}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const p = state.players[b.player]!;
              return (
                <tr key={b.player}>
                  <td style={{ textAlign: 'left' }}>
                    <span
                      className="player-chip"
                      style={{
                        background: PLAYER_COLORS[p.color].main,
                        display: 'inline-block',
                        marginRight: 6,
                      }}
                    />
                    {p.name}
                  </td>
                  <td>{b.villaggi}</td>
                  <td>{b.roccaforti}</td>
                  <td>{b.grandeVia || '–'}</td>
                  <td>{b.furia || '–'}</td>
                  <td>{b.eroiNascosti || '–'}</td>
                  <td>
                    <b>{b.totale}</b>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="dialog-buttons" style={{ justifyContent: 'center' }}>
          <button className="pxbtn pxbtn--ghost" onClick={onExit}>
            {it.tornaAlMenu}
          </button>
          <button className="pxbtn" onClick={onRematch}>
            {it.rivincita}
          </button>
        </div>
      </div>
    </div>
  );
}
