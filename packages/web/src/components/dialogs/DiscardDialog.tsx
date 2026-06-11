/** Scarto obbligatorio dopo un 7: selezione con contatore {x}/{n}. */
import { useState } from 'react';
import { totalResources, zeroResources, type Action, type PlayerView } from '@vikiland/engine';
import { it, t } from '../../i18n/it';
import { Dialog, ResourceStepper } from './Dialog';

interface Props {
  view: PlayerView;
  amount: number;
  onSubmit: (action: Action) => void;
}

export function DiscardDialog({ view, amount, onSubmit }: Props) {
  const [selection, setSelection] = useState(zeroResources());
  const me = view.me!;
  const selected = totalResources(selection);
  return (
    <Dialog title={t(it.scartaCarte, { n: amount })}>
      <ResourceStepper value={selection} onChange={setSelection} max={me.resources} />
      <div style={{ textAlign: 'center', fontSize: 12 }}>
        {selected}/{amount}
      </div>
      <div className="dialog-buttons">
        <button
          className="pxbtn"
          disabled={selected !== amount}
          onClick={() => onSubmit({ type: 'scarta', player: me.id, resources: selection })}
        >
          {it.conferma}
        </button>
      </div>
    </Dialog>
  );
}
