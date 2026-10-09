/** Mini-tutorial di «Vikings Around the World»: sei schermate. */
import { useState } from 'react';
import { wt } from '../../i18n/world';

const SLIDES = [
  { icon: '🧙', t: 'tut1T', b: 'tut1B' },
  { icon: '👣', t: 'tut2T', b: 'tut2B' },
  { icon: '🪙', t: 'tut3T', b: 'tut3B' },
  { icon: '⚖️', t: 'tut4T', b: 'tut4B' },
  { icon: '🔨', t: 'tut5T', b: 'tut5B' },
  { icon: '🏆', t: 'tut6T', b: 'tut6B' },
] as const;

export function WorldTutorialScreen({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i]!;
  const last = i === SLIDES.length - 1;
  return (
    <div className="screen" style={{ justifyContent: 'center', gap: 14 }}>
      <h1 className="menu-title" style={{ fontSize: 14 }}>
        📖 {wt.tutorial}
      </h1>
      <div className="w-tut pixel-frame">
        <div className="w-tut-ico">{s.icon}</div>
        <h2>{wt[s.t]}</h2>
        <p className="w-rules" style={{ color: 'var(--ink)' }}>
          {wt[s.b]}
        </p>
        <div className="w-dim">
          {i + 1} / {SLIDES.length}
        </div>
      </div>
      <div className="dialog-buttons">
        <button className="pxbtn pxbtn--ghost" onClick={() => (i === 0 ? onClose() : setI(i - 1))}>
          {i === 0 ? wt.chiudi : wt.indietro}
        </button>
        <button className="pxbtn" onClick={() => (last ? onClose() : setI(i + 1))}>
          {last ? wt.fatto : wt.avanti}
        </button>
      </div>
    </div>
  );
}
