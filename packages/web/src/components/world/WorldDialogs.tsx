/** Dialoghi di «Vikings Around the World»: costi, banca, scambi, scarto, razzia, pedaggio. */
import { useState } from 'react';
import {
  BUILD_COSTS,
  PRODUCED_RESOURCES,
  WORLD_RESOURCES,
  bankRate,
  type PlayerId,
  type ResourceMap,
  type WorldPlayerView,
  type WorldResource,
} from '@vikiland/engine-world';
import { Dialog } from '../dialogs/Dialog';
import { fmt, wt } from '../../i18n/world';
import { colorOf } from '../../render/world/worldRenderer';
import { CostRow, RES_EMOJI, WorldStepper, emptyMap, sumMap } from './WorldUi';

export function CostsDialog({ onClose }: { onClose: () => void }) {
  const rows: [string, keyof typeof BUILD_COSTS, string][] = [
    [wt.strada, 'strada', '0'],
    [wt.villaggio, 'villaggio', '1'],
    [wt.citta, 'citta', '2'],
    [wt.sala, 'sala', '4'],
    [wt.porto, 'porto', '–'],
    [wt.mercato, 'mercato', '–'],
  ];
  return (
    <Dialog title={wt.costi}>
      <div className="w-costs">
        {rows.map(([label, key, pg]) => (
          <div key={key} className="w-costs-row">
            <span>{label}</span>
            <CostRow cost={BUILD_COSTS[key]} />
            <span className="w-dim">{pg} {wt.punti}</span>
          </div>
        ))}
      </div>
      <p className="w-rules">{wt.regoleTesto}</p>
      <div className="dialog-buttons">
        <button className="pxbtn" onClick={onClose}>
          {wt.chiudi}
        </button>
      </div>
    </Dialog>
  );
}

interface TradeProps {
  view: WorldPlayerView;
  onBank: (give: WorldResource, receive: WorldResource) => void;
  onPlayers: ((give: ResourceMap, receive: ResourceMap, to: PlayerId | null) => string | null) | null;
  onClose: () => void;
}

export function TradeDialog({ view, onBank, onPlayers, onClose }: TradeProps) {
  const [tab, setTab] = useState<'banca' | 'giocatori'>('banca');
  const hand = view.hand!;
  const [give, setGive] = useState<WorldResource>('legname');
  const [receive, setReceive] = useState<WorldResource>('orzo');
  const rate = give === receive ? null : bankRate(view, view.viewer!, give, receive);
  const can = !!rate && hand[give] >= rate.giveCount;

  const [g, setG] = useState<ResourceMap>(emptyMap());
  const [r, setR] = useState<ResourceMap>(emptyMap());
  const [to, setTo] = useState<PlayerId | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const others = view.players.filter((p) => p.id !== view.viewer);

  return (
    <Dialog title={wt.scambia}>
      <div className="w-tabs">
        <button className={`pxbtn pxbtn--small${tab === 'banca' ? '' : ' pxbtn--ghost'}`} onClick={() => setTab('banca')}>
          {wt.scambiaBanca}
        </button>
        {onPlayers && (
          <button className={`pxbtn pxbtn--small${tab === 'giocatori' ? '' : ' pxbtn--ghost'}`} onClick={() => setTab('giocatori')}>
            {wt.scambiaGiocatori}
          </button>
        )}
      </div>
      {tab === 'banca' ? (
        <>
          <div className="w-lab">{wt.dai}</div>
          <div className="w-pick">
            {WORLD_RESOURCES.map((x) => (
              <button
                key={x}
                className={`pxbtn pxbtn--small${give === x ? '' : ' pxbtn--ghost'}`}
                onClick={() => setGive(x)}
              >
                {RES_EMOJI[x]} {hand[x]}
              </button>
            ))}
          </div>
          <div className="w-lab">{wt.ricevi}</div>
          <div className="w-pick">
            {WORLD_RESOURCES.map((x) => (
              <button
                key={x}
                className={`pxbtn pxbtn--small${receive === x ? '' : ' pxbtn--ghost'}`}
                onClick={() => setReceive(x)}
              >
                {RES_EMOJI[x]}
              </button>
            ))}
          </div>
          <div className="w-rate">
            {rate ? fmt(wt.rapporto, { dai: `${rate.giveCount}${RES_EMOJI[give]}`, ricevi: `${rate.receiveCount}${RES_EMOJI[receive]}` }) : '—'}
          </div>
          <div className="dialog-buttons">
            <button className="pxbtn pxbtn--ghost" onClick={onClose}>
              {wt.chiudi}
            </button>
            <button className="pxbtn" disabled={!can} onClick={() => onBank(give, receive)}>
              {wt.scambia}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="w-lab">{wt.con}</div>
          <div className="w-pick">
            <button className={`pxbtn pxbtn--small${to === null ? '' : ' pxbtn--ghost'}`} onClick={() => setTo(null)}>
              {wt.tutti}
            </button>
            {others.map((p) => (
              <button
                key={p.id}
                className={`pxbtn pxbtn--small${to === p.id ? '' : ' pxbtn--ghost'}`}
                onClick={() => setTo(p.id)}
              >
                <span className="w-dot" style={{ background: colorOf(view, p.id) }} /> {p.name}
              </button>
            ))}
          </div>
          <div className="w-two">
            <div>
              <div className="w-lab">{wt.dai}</div>
              <WorldStepper value={g} onChange={setG} max={hand} />
            </div>
            <div>
              <div className="w-lab">{wt.ricevi}</div>
              <WorldStepper value={r} onChange={setR} />
            </div>
          </div>
          {msg && <div className="w-msg">{msg}</div>}
          <div className="dialog-buttons">
            <button className="pxbtn pxbtn--ghost" onClick={onClose}>
              {wt.chiudi}
            </button>
            <button
              className="pxbtn"
              disabled={sumMap(g) === 0 || sumMap(r) === 0}
              onClick={() => {
                const err = onPlayers!(g, r, to);
                if (err) setMsg(err);
                else onClose();
              }}
            >
              {wt.proponi}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}

export function DiscardDialog({
  hand,
  need,
  onConfirm,
}: {
  hand: ResourceMap;
  need: number;
  onConfirm: (r: ResourceMap) => void;
}) {
  const [sel, setSel] = useState<ResourceMap>(emptyMap());
  const n = sumMap(sel);
  return (
    <Dialog title={wt.logTassa}>
      <p className="w-rules">{fmt(wt.faseScarto, { n: need })}</p>
      <WorldStepper value={sel} onChange={setSel} max={hand} />
      <div className="dialog-buttons">
        <button className="pxbtn" disabled={n !== need} onClick={() => onConfirm(sel)}>
          {wt.scarta} ({n}/{need})
        </button>
      </div>
    </Dialog>
  );
}

export function RaidDialog({
  view,
  candidates,
  onPick,
}: {
  view: WorldPlayerView;
  candidates: PlayerId[];
  onPick: (p: PlayerId) => void;
}) {
  return (
    <Dialog title={wt.razzia}>
      <p className="w-rules">{wt.faseRazzia}</p>
      <div className="w-pick w-pick--col">
        {candidates.map((id) => {
          const p = view.players[id]!;
          return (
            <button key={id} className="pxbtn" onClick={() => onPick(id)}>
              <span className="w-dot" style={{ background: colorOf(view, id) }} /> {p.name} · {p.handCount}🎴
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}

/** Scelta dei materiali con cui pagare un pedaggio (quando l'argento non basta). */
export function TollDialog({
  hand,
  payee,
  rest,
  onPay,
  onCancel,
}: {
  hand: ResourceMap;
  payee: string;
  rest: number;
  onPay: (pay: ResourceMap) => void;
  onCancel: () => void;
}) {
  const [sel, setSel] = useState<ResourceMap>(emptyMap());
  const n = sumMap(sel);
  return (
    <Dialog title={fmt(wt.pedaggioTitolo, { nome: payee })}>
      <p className="w-rules">{fmt(wt.scegliPedaggio, { n: rest })}</p>
      <WorldStepper value={sel} onChange={setSel} max={hand} only={PRODUCED_RESOURCES} />
      <div className="dialog-buttons">
        <button className="pxbtn pxbtn--ghost" onClick={onCancel}>
          {wt.annulla}
        </button>
        <button className="pxbtn" disabled={n !== rest} onClick={() => onPay(sel)}>
          {wt.paga} ({n}/{rest})
        </button>
      </div>
    </Dialog>
  );
}
