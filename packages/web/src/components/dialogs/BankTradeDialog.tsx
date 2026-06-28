/** Scambio con banca/approdi: il rapporto è calcolato automaticamente. */
import { useState } from 'react';
import {
  RESOURCES,
  bankTradeRatio,
  type Action,
  type PlayerView,
  type Resource,
} from '@vikiland/engine';
import { it, t } from '../../i18n';
import { ResIcon } from '../icons';
import { Dialog } from './Dialog';

interface Props {
  view: PlayerView;
  onSubmit: (action: Action) => void;
  onClose: () => void;
}

export function BankTradeDialog({ view, onSubmit, onClose }: Props) {
  const me = view.me!;
  const [give, setGive] = useState<Resource | null>(null);
  const [receive, setReceive] = useState<Resource | null>(null);
  const ratio = give ? bankTradeRatio(view, me.id, give, view.boardRadius) : null;
  const canGive = (r: Resource) => me.resources[r] >= bankTradeRatio(view, me.id, r, view.boardRadius);
  const valid =
    give !== null &&
    receive !== null &&
    give !== receive &&
    canGive(give) &&
    view.bank[receive] >= 1;

  const picker = (
    label: string,
    selected: Resource | null,
    setter: (r: Resource) => void,
    enabled: (r: Resource) => boolean
  ) => (
    <div>
      <div style={{ fontSize: 9, color: 'var(--ink-dim)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {RESOURCES.map((r) => (
          <button
            key={r}
            className={`pxbtn pxbtn--ghost pxbtn--small ${selected === r ? 'pxbtn--active' : ''}`}
            disabled={!enabled(r)}
            onClick={() => setter(r)}
          >
            <ResIcon r={r} scale={2} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog title={it.scambiaBanca}>
      {picker(it.dai, give, setGive, canGive)}
      {picker(it.ricevi, receive, setReceive, (r) => view.bank[r] >= 1 && r !== give)}
      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--accent)' }}>
        {ratio !== null ? t(it.rapporto, { n: ratio }) : '—'}
      </div>
      <div className="dialog-buttons">
        <button className="pxbtn pxbtn--ghost" onClick={onClose}>
          {it.annulla}
        </button>
        <button
          className="pxbtn"
          disabled={!valid}
          onClick={() =>
            onSubmit({ type: 'scambioBanca', player: me.id, give: give!, receive: receive! })
          }
        >
          {it.conferma}
        </button>
      </div>
    </Dialog>
  );
}
