/** Pannello della propria mano: risorse e Carte Saga. */
import { RESOURCES, type PlayerView } from '@vikiland/engine';
import { it, t } from '../i18n/it';
import { ResIcon } from './icons';

interface Props {
  view: PlayerView;
  onOpenCards: () => void;
}

export function HandPanel({ view, onOpenCards }: Props) {
  const me = view.me;
  if (!me) return null;
  const totalCards = me.sagaCards.length + me.sagaCardsBoughtThisTurn.length;
  return (
    <div className="area-hand pixel-frame">
      <div style={{ fontSize: 9, color: 'var(--ink-dim)', marginBottom: 6 }}>
        {it.leTueRisorse} · {me.gloryPointsTotal} {it.puntiGloria}
      </div>
      <div className="hand-row">
        {RESOURCES.map((r) => (
          <span key={r} className={`res-pill ${me.resources[r] === 0 ? 'res-pill--zero' : ''}`}>
            <ResIcon r={r} scale={3} />
            <span>{me.resources[r]}</span>
          </span>
        ))}
        <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={onOpenCards}>
          {it.carte} ({totalCards})
        </button>
        <span style={{ fontSize: 8, color: 'var(--ink-dim)' }}>
          {t(it.mazzoRimasto, { n: view.sagaDeckCount })}
        </span>
      </div>
    </div>
  );
}
