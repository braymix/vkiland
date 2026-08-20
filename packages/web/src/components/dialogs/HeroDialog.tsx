/**
 * Dialogo delle ABILITÀ EROE attivabili nella fase principale: lo scambio 2-a-1
 * del Mercante (Gest) e la trasformazione di un approdo del Signore dei Mari
 * (Njord). Le opzioni sono derivate dalle mosse legali, così restano sempre
 * coerenti col motore.
 */
import { useState } from 'react';
import {
  RESOURCES,
  heroDef,
  type Action,
  type LegalMove,
  type PlayerView,
  type PortKind,
  type Resource,
} from '@vikiland/engine';
import { it } from '../../i18n';
import { ResIcon } from '../icons';
import { Dialog } from './Dialog';

interface Props {
  view: PlayerView;
  legalActions: LegalMove[];
  onSubmit: (action: Action) => void;
  onClose: () => void;
}

const portLabel = (kind: PortKind): string => (kind === 'generico' ? '3:1' : kind);

export function HeroDialog({ view, legalActions, onSubmit, onClose }: Props) {
  const me = view.me!;
  const hero = view.players[me.id]?.hero ?? null;
  const def = heroDef(hero);
  const usesLeft = def?.useKey ? me.heroUses?.[def.useKey] ?? 0 : undefined;

  // --- Mercante (Gest): scambio 2-a-1 ---
  const mercanteMoves = legalActions.filter(
    (m): m is Extract<Action, { type: 'eroeMercante' }> => m.type === 'eroeMercante'
  );
  const giveOptions = [...new Set(mercanteMoves.map((m) => m.give))];
  const [give, setGive] = useState<Resource | null>(null);
  const receiveOptions = mercanteMoves.filter((m) => m.give === give).map((m) => m.receive);
  const [receive, setReceive] = useState<Resource | null>(null);

  // --- Signore dei Mari (Njord): trasforma un approdo ---
  const portMoves = legalActions.filter(
    (m): m is Extract<Action, { type: 'eroeMutaporto' }> => m.type === 'eroeMutaporto'
  );
  const portEdges = [...new Set(portMoves.map((m) => m.edge))];

  const isMercante = giveOptions.length > 0;
  const isMutaporto = portEdges.length > 0;

  return (
    <Dialog title={`${def?.name ?? ''} · ${def?.ability ?? it.eroi.abilita}`}>
      <p style={{ fontSize: 9, lineHeight: 1.6, color: 'var(--ink-dim)' }}>{def?.description}</p>
      {usesLeft !== undefined && (
        <p style={{ fontSize: 9, color: 'var(--accent)' }}>{it.eroi.usiRimasti.replace('{n}', String(usesLeft))}</p>
      )}

      {isMercante && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <div style={{ fontSize: 9 }}>{it.eroi.mercanteTitolo}</div>
          <div>
            <div style={{ fontSize: 8, color: 'var(--ink-dim)', marginBottom: 2 }}>2 ×</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {RESOURCES.map((r) => (
                <button
                  key={r}
                  className={`pxbtn pxbtn--ghost pxbtn--small ${give === r ? 'pxbtn--active' : ''}`}
                  disabled={!giveOptions.includes(r)}
                  onClick={() => {
                    setGive(r);
                    setReceive(null);
                  }}
                >
                  <ResIcon r={r} scale={2} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: 'var(--ink-dim)', marginBottom: 2 }}>→ 1 ×</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {RESOURCES.map((r) => (
                <button
                  key={r}
                  className={`pxbtn pxbtn--ghost pxbtn--small ${receive === r ? 'pxbtn--active' : ''}`}
                  disabled={give === null || !receiveOptions.includes(r)}
                  onClick={() => setReceive(r)}
                >
                  <ResIcon r={r} scale={2} />
                </button>
              ))}
            </div>
          </div>
          <button
            className="pxbtn"
            disabled={give === null || receive === null}
            onClick={() =>
              give && receive && onSubmit({ type: 'eroeMercante', player: me.id, give, receive })
            }
          >
            {it.eroi.conferma}
          </button>
        </div>
      )}

      {isMutaporto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <div style={{ fontSize: 9 }}>{it.eroi.mutaportoTipo}</div>
          {portEdges.map((edge) => {
            const port = view.board.ports.find((p) => p.edge === edge);
            const kinds = portMoves.filter((m) => m.edge === edge).map((m) => m.kind);
            return (
              <div key={edge} style={{ borderTop: '1px solid var(--frame, #333)', paddingTop: 6 }}>
                <div style={{ fontSize: 8, color: 'var(--ink-dim)', marginBottom: 3 }}>
                  {port ? portLabel(port.kind) : '?'} →
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {kinds.map((kind) => (
                    <button
                      key={kind}
                      className="pxbtn pxbtn--ghost pxbtn--small"
                      onClick={() => onSubmit({ type: 'eroeMutaporto', player: me.id, edge, kind })}
                    >
                      {kind === 'generico' ? '3:1' : <ResIcon r={kind as Resource} scale={2} />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isMercante && !isMutaporto && (
        <p style={{ fontSize: 9, color: 'var(--danger)' }}>{it.eroi.esaurita}</p>
      )}

      <div className="dialog-buttons" style={{ marginTop: 10 }}>
        <button className="pxbtn pxbtn--ghost" onClick={onClose}>
          {it.chiudi}
        </button>
      </div>
    </Dialog>
  );
}
