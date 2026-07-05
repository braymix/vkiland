/** Scambi tra giocatori: proposta, risposta e gestione dell'offerta aperta. */
import { useState } from 'react';
import {
  RESOURCES,
  hasAtLeast,
  totalResources,
  zeroResources,
  type Action,
  type PlayerView,
} from '@vikiland/engine';
import { it, t } from '../../i18n';
import { ResIcon } from '../icons';
import { Dialog, ResourceStepper } from './Dialog';

function ResourceList({ rc }: { rc: ReturnType<typeof zeroResources> }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {RESOURCES.filter((r) => rc[r] > 0).map((r) => (
        <span key={r} className="res-pill">
          <ResIcon r={r} scale={2} /> {rc[r]}
        </span>
      ))}
    </span>
  );
}

export function ProposeTradeDialog({
  view,
  onSubmit,
  onClose,
}: {
  view: PlayerView;
  onSubmit: (a: Action) => void;
  onClose: () => void;
}) {
  const me = view.me!;
  const [give, setGive] = useState(zeroResources());
  const [receive, setReceive] = useState(zeroResources());
  const [to, setTo] = useState<number | null>(null);
  const overlapping = RESOURCES.some((r) => give[r] > 0 && receive[r] > 0);
  const valid =
    totalResources(give) > 0 &&
    totalResources(receive) > 0 &&
    !overlapping &&
    hasAtLeast(me.resources, give);
  return (
    <Dialog title={it.proponiScambio}>
      <div style={{ fontSize: 9, color: 'var(--ink-dim)' }}>{it.dai}</div>
      <ResourceStepper value={give} onChange={setGive} max={me.resources} />
      <div style={{ fontSize: 9, color: 'var(--ink-dim)' }}>{it.ricevi}</div>
      <ResourceStepper value={receive} onChange={setReceive} />
      <div className="stepper-row">
        <span style={{ fontSize: 9, color: 'var(--ink-dim)' }}>{it.offertaA}</span>
        <select
          value={to === null ? 'tutti' : String(to)}
          onChange={(e) => setTo(e.target.value === 'tutti' ? null : Number(e.target.value))}
        >
          <option value="tutti">{it.tutti}</option>
          {view.players
            .filter((p) => p.id !== me.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </div>
      <div className="dialog-buttons">
        <button className="pxbtn pxbtn--ghost" onClick={onClose}>
          {it.annulla}
        </button>
        <button
          className="pxbtn"
          disabled={!valid}
          onClick={() => onSubmit({ type: 'proponiScambio', player: me.id, give, receive, to })}
        >
          {it.conferma}
        </button>
      </div>
    </Dialog>
  );
}

/** Dialogo per chi RICEVE un'offerta (diretta o aperta). */
export function RespondTradeDialog({
  view,
  canAccept,
  onSubmit,
}: {
  view: PlayerView;
  canAccept: boolean;
  onSubmit: (a: Action) => void;
}) {
  const offer = view.pendingTrade!;
  const me = view.me!;
  const proposer = view.players[offer.from]!.name;
  return (
    <Dialog title={t(it.offertaDi, { nome: proposer })}>
      <div className="stepper-row">
        <span style={{ fontSize: 9 }}>{it.ricevi}:</span>
        <ResourceList rc={offer.give} />
      </div>
      <div className="stepper-row">
        <span style={{ fontSize: 9 }}>{it.dai}:</span>
        <ResourceList rc={offer.receive} />
      </div>
      <div className="dialog-buttons">
        <button
          className="pxbtn pxbtn--danger"
          onClick={() =>
            onSubmit({ type: 'rispondiScambio', player: me.id, offerId: offer.id, accept: false })
          }
        >
          {it.rifiuta}
        </button>
        <button
          className="pxbtn"
          disabled={!canAccept}
          onClick={() =>
            onSubmit({ type: 'rispondiScambio', player: me.id, offerId: offer.id, accept: true })
          }
        >
          {it.accetta}
        </button>
      </div>
    </Dialog>
  );
}

/** Dialogo per il PROPONENTE di un'offerta aperta: conferma o annulla. */
export function ManageTradeDialog({
  view,
  onSubmit,
}: {
  view: PlayerView;
  onSubmit: (a: Action) => void;
}) {
  const offer = view.pendingTrade!;
  const me = view.me!;
  const accepted = view.players.filter((p) => offer.responses[p.id] === 'accettata');
  const pending = view.players.filter(
    (p) => p.id !== offer.from && offer.responses[p.id] === undefined
  );
  return (
    <Dialog title={it.proponiScambio}>
      <div className="stepper-row">
        <span style={{ fontSize: 9 }}>{it.dai}:</span>
        <ResourceList rc={offer.give} />
      </div>
      <div className="stepper-row">
        <span style={{ fontSize: 9 }}>{it.ricevi}:</span>
        <ResourceList rc={offer.receive} />
      </div>
      <div style={{ fontSize: 9, color: 'var(--ink-dim)' }}>
        {pending.length > 0 ? it.inAttesaRisposte : ''}
      </div>
      <div className="dialog-buttons" style={{ justifyContent: 'center' }}>
        {accepted.map((p) => (
          <button
            key={p.id}
            className="pxbtn"
            onClick={() =>
              onSubmit({ type: 'confermaScambio', player: me.id, offerId: offer.id, with: p.id })
            }
          >
            {t(it.concludiCon, { nome: p.name })}
          </button>
        ))}
        <button
          className="pxbtn pxbtn--danger"
          onClick={() => onSubmit({ type: 'annullaScambio', player: me.id, offerId: offer.id })}
        >
          {it.annulla}
        </button>
      </div>
    </Dialog>
  );
}
