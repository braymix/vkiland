/**
 * Barra dello SPETTATORE (funzionalità «Guarda partita»): sostituisce
 * ActionBar + HandPanel quando si sta solo guardando. Non offre azioni di
 * gioco; per ogni giocatore mostra un pulsante «Vedi la mano» che chiede il
 * permesso. Se il giocatore acconsente, la mano appare qui (risorse + carte).
 */
import { RESOURCES, type PlayerId, type PlayerView } from '@vikiland/engine';
import { it, t } from '../i18n';
import { shadesFor } from '../render/sprites/palettes';
import { ResIcon } from './icons';

interface Props {
  view: PlayerView;
  /** Posti a cui ho già chiesto la mano, in attesa di risposta. */
  pending: ReadonlySet<PlayerId>;
  onRequestHand: (seat: PlayerId) => void;
}

export function SpectatorBar({ view, pending, onRequestHand }: Props) {
  return (
    <div className="area-hand pixel-frame">
      <div style={{ fontSize: 9, color: 'var(--accent)', marginBottom: 6 }}>
        👁 {it.spettatore.staiGuardando}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {view.turnOrder.map((pid) => view.players[pid]!).map((p) => {
          const hand = p.hand;
          return (
            <div
              key={p.id}
              className="hand-row"
              style={{ alignItems: 'center', flexWrap: 'wrap', gap: 6 }}
            >
              <span className="player-chip" style={{ background: shadesFor(p.color).main }} />
              <span className="seat-name" style={{ flex: '0 0 auto', minWidth: 60 }}>
                {p.name}
                {p.isBot && <span style={{ color: 'var(--ink-dim)' }}> (bot)</span>}
              </span>
              {hand ? (
                <>
                  {RESOURCES.map((r) => (
                    <span
                      key={r}
                      className={`res-pill ${hand.resources[r] === 0 ? 'res-pill--zero' : ''}`}
                    >
                      <ResIcon r={r} scale={3} />
                      <span>{hand.resources[r]}</span>
                    </span>
                  ))}
                  <span style={{ fontSize: 8, color: 'var(--ink-dim)' }}>
                    {it.carte} ({hand.sagaCards.length})
                  </span>
                </>
              ) : pending.has(p.id) ? (
                <span style={{ fontSize: 9, color: 'var(--ink-dim)' }}>
                  {it.spettatore.inAttesa}
                </span>
              ) : p.isBot ? (
                <span style={{ fontSize: 9, color: 'var(--ink-dim)' }}>
                  {it.spettatore.manoNascosta}
                </span>
              ) : (
                <button
                  className="pxbtn pxbtn--ghost pxbtn--small"
                  onClick={() => onRequestHand(p.id)}
                >
                  👁 {it.spettatore.chiediMano}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 8, color: 'var(--ink-dim)', marginTop: 4 }}>
        {t(it.mazzoRimasto, { n: view.sagaDeckCount })}
      </div>
    </div>
  );
}
