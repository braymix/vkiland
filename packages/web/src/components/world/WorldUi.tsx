/** Pezzi di interfaccia condivisi di «Vikings Around the World». */
import { WORLD_RESOURCES, type ResourceMap, type WorldPlayerView, type WorldResource } from '@vikiland/engine-world';
import { wt } from '../../i18n/world';
import { colorOf } from '../../render/world/worldRenderer';

export const RES_EMOJI: Record<WorldResource, string> = {
  legname: '🪵',
  pietra: '🧱',
  lana: '🐑',
  orzo: '🌾',
  ferro: '⛏️',
  argento: '🪙',
};

export function ResChip({ r, n, dim }: { r: WorldResource; n?: number; dim?: boolean }) {
  return (
    <span className="w-res" title={wt[r]} style={dim ? { opacity: 0.45 } : undefined}>
      <span className="w-res-ico">{RES_EMOJI[r]}</span>
      {n !== undefined && <span className="w-res-n">{n}</span>}
    </span>
  );
}

/** Costo di una costruzione come fila di icone. */
export function CostRow({ cost, hand }: { cost: ResourceMap; hand?: ResourceMap | null }) {
  return (
    <span className="w-cost">
      {WORLD_RESOURCES.filter((r) => cost[r] > 0).map((r) => (
        <span key={r} className="w-cost-i" style={hand && hand[r] < cost[r] ? { color: 'var(--danger)' } : undefined}>
          {cost[r]}
          {RES_EMOJI[r]}
        </span>
      ))}
    </span>
  );
}

interface StepperProps {
  value: ResourceMap;
  onChange: (next: ResourceMap) => void;
  max?: ResourceMap | null;
  /** Risorse mostrate (default: tutte e 6). */
  only?: readonly WorldResource[];
}

export function WorldStepper({ value, onChange, max, only = WORLD_RESOURCES }: StepperProps) {
  const bump = (r: WorldResource, d: number) => {
    let n = Math.max(0, value[r] + d);
    if (max) n = Math.min(n, max[r]);
    onChange({ ...value, [r]: n });
  };
  return (
    <div className="w-stepper">
      {only.map((r) => (
        <div key={r} className="w-stepper-row">
          <span className="w-stepper-lab">
            <span className="w-res-ico">{RES_EMOJI[r]}</span> {wt[r]}
            {max ? <span className="w-dim"> ({max[r]})</span> : null}
          </span>
          <span className="w-stepper-ctl">
            <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => bump(r, -1)}>
              -
            </button>
            <span className="w-stepper-n">{value[r]}</span>
            <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => bump(r, +1)}>
              +
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

export function emptyMap(): ResourceMap {
  return { legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 0, argento: 0 };
}
export function sumMap(r: ResourceMap): number {
  return WORLD_RESOURCES.reduce((a, k) => a + r[k], 0);
}

/** Barra dei giocatori: colore, nome, PG, carte, punti movimento. */
export function PlayersBar({ view }: { view: WorldPlayerView }) {
  return (
    <div className="w-players">
      {view.players.map((p) => (
        <div
          key={p.id}
          className={`w-player${p.id === view.currentPlayer ? ' w-player--on' : ''}${p.id === view.viewer ? ' w-player--me' : ''}`}
        >
          <span className="w-dot" style={{ background: colorOf(view, p.id) }} />
          <span className="w-pname">{p.bot ? '🤖 ' : ''}{p.name}</span>
          <span className="w-pstat">
            {p.points}
            {wt.punti} · {p.handCount}🎴
            {p.id === view.currentPlayer && view.phase.type === 'azioni' ? ` · ${p.movePointsLeft}👣` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Mano del giocatore: le 6 risorse. */
export function HandBar({ hand }: { hand: ResourceMap | null }) {
  if (!hand) return null;
  return (
    <div className="w-hand">
      {WORLD_RESOURCES.map((r) => (
        <ResChip key={r} r={r} n={hand[r]} dim={hand[r] === 0} />
      ))}
    </div>
  );
}
