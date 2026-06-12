/** Schermata di vittoria: coriandoli, vincitore in GRANDE e classifica. */
import { scoreBreakdown, type GameState } from '@vikiland/engine';
import { it } from '../i18n/it';
import { PLAYER_COLORS } from '../render/sprites/palettes';
import { ConfettiCanvas } from '../components/ConfettiCanvas';
import { UiIcon } from '../components/icons';

interface Props {
  state: GameState;
  onExit: () => void;
  /** null = rivincita non disponibile (partite online). */
  onRematch: (() => void) | null;
}

export function VictoryScreen({ state, onExit, onRematch }: Props) {
  if (state.phase.type !== 'gameOver') return null;
  const winner = state.players[state.phase.winner]!;
  const winnerColors = PLAYER_COLORS[winner.color];
  const rows = state.players
    .map((p) => scoreBreakdown(state, p.id))
    .sort((a, b) => b.totale - a.totale);

  // Coriandoli nei colori dei clan in partita + oro e bianco.
  const confettiColors = [
    ...state.players.map((p) => PLAYER_COLORS[p.color].main),
    '#e7b94c',
    '#f0e9d6',
  ];

  return (
    <div className="dialog-backdrop victory-backdrop">
      <ConfettiCanvas colors={confettiColors} />
      <div className="victory-stage">
        <div className="victory-hero">
          <div className="victory-stars">
            <UiIcon kind="stella" scale={4} />
            <UiIcon kind="stella" scale={6} />
            <UiIcon kind="stella" scale={4} />
          </div>
          <div className="victory-name" style={{ color: winnerColors.light }}>
            {winner.name}
          </div>
          <div className="victory-sub">{it.vittoriaSub}</div>
        </div>

        <div className="dialog pixel-frame victory-card" style={{ maxWidth: 600 }}>
          <div style={{ fontSize: 9, color: 'var(--ink-dim)', textAlign: 'center' }}>
            {it.dettaglioPunti}
          </div>
          <div className="victory-table-wrap">
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
          </div>
          <div className="dialog-buttons" style={{ justifyContent: 'center' }}>
            <button className="pxbtn pxbtn--ghost" onClick={onExit}>
              {it.tornaAlMenu}
            </button>
            {onRematch && (
              <button className="pxbtn" onClick={onRematch}>
                {it.rivincita}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
