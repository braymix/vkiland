/** Le proprie Carte Saga: elenco, descrizioni e gioco (con scelta parametri). */
import { useState } from 'react';
import {
  RESOURCES,
  type Action,
  type LegalMove,
  type PlayerView,
  type Resource,
  type SagaCard,
} from '@vikiland/engine';
import { it } from '../../i18n';
import { ResIcon, SagaIcon } from '../icons';
import { Dialog } from './Dialog';

interface Props {
  view: PlayerView;
  legalActions: LegalMove[];
  onSubmit: (action: Action) => void;
  onClose: () => void;
  /** Battaglia: gioca la carta ASSALTO scegliendo l'edificio sulla mappa. */
  onEnterAssalto: () => void;
  /** Battaglia: gioca la carta ASSALTO LEGGERO scegliendo la strada sulla mappa. */
  onEnterAssaltoLeggero: () => void;
}

export function SagaCardsDialog({
  view,
  legalActions,
  onSubmit,
  onClose,
  onEnterAssalto,
  onEnterAssaltoLeggero,
}: Props) {
  const me = view.me!;
  const [picking, setPicking] = useState<'banchetto' | 'tributo' | null>(null);
  const [banchettoPick, setBanchettoPick] = useState<Resource[]>([]);

  const canPlay = (card: SagaCard): boolean => {
    switch (card) {
      case 'berserker':
        return legalActions.some((m) => m.type === 'giocaBerserker');
      case 'costruttoriDiSentieri':
        return legalActions.some((m) => m.type === 'giocaCostruttori');
      case 'banchetto':
        return legalActions.some((m) => m.type === 'giocaBanchetto');
      case 'tributo':
        return legalActions.some((m) => m.type === 'giocaTributo');
      case 'assalto':
        return legalActions.some((m) => m.type === 'giocaAssalto');
      case 'assaltoLeggero':
        return legalActions.some((m) => m.type === 'giocaAssaltoLeggero');
      case 'cambiaCalamita':
        return legalActions.some((m) => m.type === 'giocaCambiaCalamita');
      default:
        return false;
    }
  };

  const play = (card: SagaCard) => {
    if (card === 'berserker') onSubmit({ type: 'giocaBerserker', player: me.id });
    else if (card === 'costruttoriDiSentieri') onSubmit({ type: 'giocaCostruttori', player: me.id });
    else if (card === 'banchetto') setPicking('banchetto');
    else if (card === 'tributo') setPicking('tributo');
    // ASSALTO/ASSALTO LEGGERO: si sceglie il bersaglio sulla mappa, si chiude il dialogo.
    else if (card === 'assalto') onEnterAssalto();
    else if (card === 'assaltoLeggero') onEnterAssaltoLeggero();
    // CAMBIA SORTE: effetto immediato, nessun bersaglio.
    else if (card === 'cambiaCalamita') onSubmit({ type: 'giocaCambiaCalamita', player: me.id });
  };

  if (picking === 'banchetto') {
    return (
      <Dialog title={`${it.cartaSaga.banchetto} — ${it.scegliRisorse}`}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {RESOURCES.map((r) => (
            <button
              key={r}
              className="pxbtn pxbtn--ghost"
              disabled={view.bank[r] < 1}
              onClick={() => {
                const next = [...banchettoPick, r];
                if (next.length === 2) {
                  onSubmit({
                    type: 'giocaBanchetto',
                    player: me.id,
                    resources: [next[0]!, next[1]!],
                  });
                  setPicking(null);
                  setBanchettoPick([]);
                } else {
                  setBanchettoPick(next);
                }
              }}
            >
              <ResIcon r={r} scale={3} />
            </button>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--ink-dim)' }}>
          {banchettoPick.length}/2
        </div>
        <div className="dialog-buttons">
          <button
            className="pxbtn pxbtn--ghost"
            onClick={() => {
              setPicking(null);
              setBanchettoPick([]);
            }}
          >
            {it.indietro}
          </button>
        </div>
      </Dialog>
    );
  }

  if (picking === 'tributo') {
    return (
      <Dialog title={`${it.cartaSaga.tributo} — ${it.scegliRisorse}`}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {RESOURCES.map((r) => (
            <button
              key={r}
              className="pxbtn pxbtn--ghost"
              onClick={() => {
                onSubmit({ type: 'giocaTributo', player: me.id, resource: r });
                setPicking(null);
              }}
            >
              <ResIcon r={r} scale={3} />
            </button>
          ))}
        </div>
        <div className="dialog-buttons">
          <button className="pxbtn pxbtn--ghost" onClick={() => setPicking(null)}>
            {it.indietro}
          </button>
        </div>
      </Dialog>
    );
  }

  const renderCard = (card: SagaCard, idx: number, playable: boolean) => (
    <div key={`${card}-${idx}`} className="stepper-row" style={{ gap: 10 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <SagaIcon card={card} scale={3} />
        <span>
          <div style={{ fontSize: 10 }}>{it.cartaSaga[card]}</div>
          <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>{it.descrizioneCarta[card]}</div>
        </span>
      </span>
      {card !== 'sagaDegliEroi' && (
        <button
          className="pxbtn pxbtn--small"
          disabled={!playable || !canPlay(card)}
          onClick={() => play(card)}
        >
          {it.gioca}
        </button>
      )}
    </div>
  );

  return (
    <Dialog title={it.leTueCarte}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {me.sagaCards.length === 0 && me.sagaCardsBoughtThisTurn.length === 0 && (
          <div style={{ fontSize: 9, color: 'var(--ink-dim)' }}>—</div>
        )}
        {me.sagaCards.map((c, i) => renderCard(c, i, true))}
        {me.sagaCardsBoughtThisTurn.length > 0 && (
          <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>{it.carteNonGiocabili}</div>
        )}
        {me.sagaCardsBoughtThisTurn.map((c, i) => renderCard(c, i + 100, false))}
      </div>
      <div className="dialog-buttons">
        <button className="pxbtn pxbtn--ghost" onClick={onClose}>
          {it.chiudi}
        </button>
      </div>
    </Dialog>
  );
}
