/**
 * Schermo OPACO di passaggio del dispositivo (hot-seat): copre l'intera
 * partita finché il prossimo umano non conferma — così nessuno vede la mano
 * o i dialoghi dell'altro.
 */
import type { PlayerView } from '@vikiland/engine';
import { it, t } from '../i18n/it';
import { PLAYER_COLORS } from '../render/sprites/palettes';

interface Props {
  view: PlayerView;
  /** Id del giocatore a cui passare il dispositivo. */
  to: number;
  onConfirm: () => void;
}

export function PassDeviceScreen({ view, to, onConfirm }: Props) {
  const p = view.players[to];
  if (!p) return null;
  const colors = PLAYER_COLORS[p.color];
  return (
    <div className="handoff-screen">
      <div className="menu-sub">{it.passaDispositivo}</div>
      <span
        className="player-chip"
        style={{ background: colors.main, width: 28, height: 28, flex: '0 0 auto' }}
      />
      <h2 style={{ color: 'var(--accent)', fontSize: 16, textAlign: 'center' }}>
        {t(it.toccaA, { nome: p.name })}
      </h2>
      <button className="pxbtn" onClick={onConfirm}>
        {t(it.sonoPronto, { nome: p.name })}
      </button>
    </div>
  );
}
