/** Dialog per scegliere il livello del bot prima di aggiungerlo. */
import { useState } from 'react';
import type { BotLevel } from '@vikiland/engine';
import { it } from '../../i18n';
import { Dialog } from './Dialog';

export function AddBotDialog({
  onAdd,
  onCancel,
}: {
  onAdd: (level: BotLevel) => void;
  onCancel: () => void;
}) {
  const [level, setLevel] = useState<BotLevel>('normale');
  return (
    <Dialog title={it.difficolta}>
      <div style={{ textAlign: 'center' }}>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as BotLevel)}
          style={{
            padding: 8,
            marginBottom: 16,
            fontSize: 12,
            backgroundColor: 'var(--bg-control)',
            color: 'var(--ink)',
            border: '1px solid var(--ink-dim)',
            borderRadius: 2,
            width: '100%',
          }}
        >
          <option value="facile">{it.facile}</option>
          <option value="normale">{it.normale}</option>
          <option value="difficile">{it.difficile}</option>
          <option value="esperto">{it.esperto}</option>
        </select>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="pxbtn pxbtn--small" onClick={() => onAdd(level)}>
            {it.aggiungi}
          </button>
          <button className="pxbtn pxbtn--small pxbtn--ghost" onClick={onCancel}>
            {it.annulla}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
