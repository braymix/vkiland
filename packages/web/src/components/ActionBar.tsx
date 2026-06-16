/** Barra delle azioni contestuale alla fase del turno. */
import type { LegalMove, PlayerView } from '@vikiland/engine';
import { it } from '../i18n';

export type BuildMode = 'sentiero' | 'villaggio' | 'roccaforte' | null;

interface Props {
  view: PlayerView;
  legalActions: LegalMove[];
  isMyTurn: boolean;
  mode: BuildMode;
  setMode: (m: BuildMode) => void;
  onRoll: () => void;
  onEndTurn: () => void;
  onBuyCard: () => void;
  onOpenBank: () => void;
  onOpenPropose: () => void;
  onOpenCards: () => void;
  errorText: string | null;
}

export function ActionBar(props: Props) {
  const { view, legalActions, isMyTurn, mode, setMode } = props;
  const has = (type: LegalMove['type']) => legalActions.some((m) => m.type === type);

  const buildButton = (m: Exclude<BuildMode, null>, label: string, enabled: boolean) => (
    <button
      className={`pxbtn pxbtn--ghost ${mode === m ? 'pxbtn--active' : ''}`}
      disabled={!enabled}
      onClick={() => setMode(mode === m ? null : m)}
    >
      {label}
    </button>
  );

  let content: React.ReactNode = null;
  if (view.phase.type === 'preRoll' && isMyTurn) {
    content = (
      <>
        <button className="pxbtn" onClick={props.onRoll} disabled={!has('tiraDadi')}>
          {it.tiraIDadi}
        </button>
        {has('giocaBerserker') && (
          <button className="pxbtn pxbtn--ghost" onClick={props.onOpenCards}>
            {it.carte}
          </button>
        )}
      </>
    );
  } else if (view.phase.type === 'main' && isMyTurn && view.pendingTrade === null) {
    content = (
      <>
        {buildButton('sentiero', it.sentiero, has('costruisciSentiero'))}
        {buildButton('villaggio', it.villaggio, has('costruisciVillaggio'))}
        {buildButton('roccaforte', it.roccaforte, has('costruisciRoccaforte'))}
        <button
          className="pxbtn pxbtn--ghost"
          disabled={!has('compraCartaSaga')}
          onClick={() => {
            setMode(null);
            props.onBuyCard();
          }}
        >
          + {it.compraCarta}
        </button>
        <button
          className="pxbtn pxbtn--ghost"
          disabled={!has('scambioBanca')}
          onClick={() => {
            setMode(null);
            props.onOpenBank();
          }}
        >
          {it.scambiaBanca}
        </button>
        <button
          className="pxbtn pxbtn--ghost"
          disabled={!has('proponiScambioDescr')}
          onClick={() => {
            setMode(null);
            props.onOpenPropose();
          }}
        >
          {it.proponiScambio}
        </button>
        <button className="pxbtn" disabled={!has('fineTurno')} onClick={props.onEndTurn}>
          {it.fineTurno}
        </button>
      </>
    );
  }

  return (
    <div className="area-actions pixel-frame">
      <div className="action-bar">{content}</div>
      {props.errorText && (
        <div className="phase-banner" style={{ color: 'var(--danger)' }}>
          {props.errorText}
        </div>
      )}
    </div>
  );
}
