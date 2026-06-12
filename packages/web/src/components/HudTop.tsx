/** Testata di gioco: dadi, messaggio di fase e strip dei giocatori. */
import { useEffect, useState } from 'react';
import type { PlayerView } from '@vikiland/engine';
import { PLAYER_COLORS } from '../render/sprites/palettes';
import { it, t } from '../i18n/it';
import { UiIcon } from './icons';

function phaseMessage(view: PlayerView): string {
  const nome = view.players[view.currentPlayer]?.name ?? '';
  switch (view.phase.type) {
    case 'setup': {
      const attivo = view.players[view.setupOrder[view.setupIndex] ?? 0]?.name ?? '';
      return view.phase.expecting === 'villaggio'
        ? t(it.faseSetupVillaggio, { nome: attivo })
        : t(it.faseSetupSentiero, { nome: attivo });
    }
    case 'preRoll':
      return t(it.faseTiroAtteso, { nome });
    case 'discard': {
      const names = Object.keys(view.phase.mustDiscard)
        .map((pid) => view.players[Number(pid)]?.name ?? '')
        .join(', ');
      const n = Object.values(view.phase.mustDiscard)[0] ?? 0;
      return t(it.faseScarto, { nome: names, n });
    }
    case 'moveDragon':
      return t(it.faseDrago, { nome });
    case 'steal':
      return t(it.faseFurto, { nome });
    case 'freeRoads':
      return t(it.faseSentieriGratis, { nome, n: view.phase.remaining });
    case 'main':
      return t(it.faseMain, { nome });
    case 'gameOver':
      return t(it.vittoriaTitolo, { nome: view.players[view.phase.winner]?.name ?? '' });
  }
}

/** Conto alla rovescia del timer di turno (partite online). */
function TurnTimerBadge({ deadline }: { deadline: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((x) => x + 1), 500);
    return () => clearInterval(timer);
  }, []);
  const sec = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  return (
    <span
      className="turn-timer"
      style={{ color: sec <= 10 ? 'var(--danger)' : 'var(--ink-dim)', whiteSpace: 'nowrap' }}
    >
      ⏳{sec}s
    </span>
  );
}

export function HudTop({
  view,
  onOpenCosts,
  onOpenMap,
  turnDeadline = null,
}: {
  view: PlayerView;
  onOpenCosts: () => void;
  onOpenMap: () => void;
  turnDeadline?: number | null;
}) {
  return (
    <div className="area-hud pixel-frame">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div className="dice">
          <span className="die">{view.dice?.[0] ?? '-'}</span>
          <span className="die">{view.dice?.[1] ?? '-'}</span>
        </div>
        <div className="phase-banner" style={{ flex: 1 }}>
          {phaseMessage(view)}
        </div>
        {turnDeadline !== null && <TurnTimerBadge deadline={turnDeadline} />}
        <button
          className="pxbtn pxbtn--ghost pxbtn--small"
          onClick={onOpenMap}
          title="Mappa a schermo intero"
          aria-label="Mappa"
        >
          🗺
        </button>
        <button
          className="pxbtn pxbtn--ghost pxbtn--small"
          onClick={onOpenCosts}
          title={it.bugiardino}
          aria-label={it.bugiardino}
        >
          ?
        </button>
      </div>
      <div>
        {/* Strip nell'ORDINE DI GIOCO deciso dai dadi, non per posto. */}
        {view.turnOrder.map((pid) => view.players[pid]!).map((p) => {
          const colors = PLAYER_COLORS[p.color];
          const isCurrent = p.id === view.currentPlayer;
          const pg =
            view.me && p.id === view.me.id ? view.me.gloryPointsTotal : p.gloryPointsPublic;
          return (
            <div key={p.id} className={`player-row ${isCurrent ? 'player-row--current' : ''}`}>
              <span className="player-chip" style={{ background: colors.main }} />
              <span className="player-name">
                {p.name}
                {p.isBot ? <span style={{ color: 'var(--ink-dim)' }}> (bot)</span> : ''}
              </span>
              {view.longestRoad.holder === p.id && <span className="badge">VIA</span>}
              {view.largestArmy.holder === p.id && <span className="badge">FURIA</span>}
              <span className="player-stat">
                <UiIcon kind="stella" /> <b>{pg}</b>
              </span>
              <span className="player-stat">
                <UiIcon kind="cartaRetro" /> {p.resourceCardCount}
              </span>
              <span className="player-stat">
                <UiIcon kind="pergamena" /> {p.sagaCardCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
