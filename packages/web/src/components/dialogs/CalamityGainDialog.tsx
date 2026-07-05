/** Guadagno "a scelta" imposto da una calamità: selezione dalla banca, {x}/{n}. */
import { useState } from 'react';
import { totalResources, zeroResources, type Action, type PlayerView } from '@vikiland/engine';
import { it, t } from '../../i18n';
import { Dialog, ResourceStepper } from './Dialog';

interface Props {
  view: PlayerView;
  amount: number;
  onSubmit: (action: Action) => void;
}

export function CalamityGainDialog({ view, amount, onSubmit }: Props) {
  const [selection, setSelection] = useState(zeroResources());
  const me = view.me!;
  const selected = totalResources(selection);
  return (
    <Dialog title={t(it.calamita.guadagna, { n: amount })}>
      {/* Il tetto per risorsa è ciò che la banca ha davvero. */}
      <ResourceStepper value={selection} onChange={setSelection} max={view.bank} />
      <div style={{ textAlign: 'center', fontSize: 12 }}>
        {selected}/{amount}
      </div>
      <div className="dialog-buttons">
        <button
          className="pxbtn"
          disabled={selected !== amount}
          onClick={() => onSubmit({ type: 'guadagnaCalamita', player: me.id, resources: selection })}
        >
          {it.conferma}
        </button>
      </div>
    </Dialog>
  );
}
