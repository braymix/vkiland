/** Contenitore generico dei dialoghi pixel-style + stepper di risorse. */
import type { ReactNode } from 'react';
import { RESOURCES, type Resource, type ResourceCount } from '@vikiland/engine';
import { ResIcon } from '../icons';

export function Dialog({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog pixel-frame">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

interface StepperProps {
  value: ResourceCount;
  onChange: (next: ResourceCount) => void;
  /** Massimo per risorsa (es. la propria mano); assente = illimitato. */
  max?: ResourceCount;
}

/** Selettore di quantità per ognuna delle 5 risorse. */
export function ResourceStepper({ value, onChange, max }: StepperProps) {
  const bump = (r: Resource, delta: number) => {
    const next = { ...value, [r]: Math.max(0, value[r] + delta) };
    if (max && next[r] > max[r]) next[r] = max[r];
    onChange(next);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {RESOURCES.map((r) => (
        <div key={r} className="stepper-row">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ResIcon r={r} scale={3} />
            <span style={{ fontSize: 9, color: 'var(--ink-dim)' }}>
              {max ? `(${max[r]})` : ''}
            </span>
          </span>
          <span className="stepper">
            <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => bump(r, -1)}>
              -
            </button>
            <span style={{ minWidth: 20, textAlign: 'center' }}>{value[r]}</span>
            <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => bump(r, +1)}>
              +
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
