/** Pannello della propria mano: risorse e Carte Saga. */
import { RESOURCES, type PlayerView } from '@vikiland/engine';
import { it, t } from '../i18n';
import { ResIcon } from './icons';

interface Props {
  view: PlayerView;
  onOpenCards: () => void;
  onOpenBuildings: () => void;
}

export function HandPanel({ view, onOpenCards, onOpenBuildings }: Props) {
  const me = view.me;
  if (!me) return null;
  const totalCards = me.sagaCards.length + me.sagaCardsBoughtThisTurn.length;
  // Modalità squadra: le mani dei compagni sono visibili (l'engine le rivela).
  const mates = view.teams ? view.players.filter((p) => p.id !== me.id && p.hand) : [];
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
        <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={onOpenBuildings}>
          {it.costruzioni}
        </button>
        <span style={{ fontSize: 8, color: 'var(--ink-dim)' }}>
          {t(it.mazzoRimasto, { n: view.sagaDeckCount })}
        </span>
      </div>
      {mates.length > 0 && (
        <div style={{ marginTop: 6, borderTop: '1px solid var(--frame-line, #0003)', paddingTop: 4 }}>
          <div style={{ fontSize: 8, color: 'var(--accent)', marginBottom: 3 }}>{it.squadra.manoCompagni}</div>
          {mates.map((p) => (
            <div key={p.id} className="hand-row" style={{ alignItems: 'center', gap: 5 }}>
              <span className="seat-name" style={{ flex: '0 0 auto', minWidth: 54, fontSize: 9 }}>
                {p.name}
              </span>
              {RESOURCES.map((r) => (
                <span key={r} className={`res-pill ${p.hand!.resources[r] === 0 ? 'res-pill--zero' : ''}`}>
                  <ResIcon r={r} scale={2} />
                  <span>{p.hand!.resources[r]}</span>
                </span>
              ))}
              <span style={{ fontSize: 8, color: 'var(--ink-dim)' }}>
                {it.carte} ({p.hand!.sagaCards.length})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
