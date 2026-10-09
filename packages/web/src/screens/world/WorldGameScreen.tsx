/** Schermata di gioco di «Vikings Around the World». */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactElement } from 'react';
import {
  BUILD_COSTS,
  planMove,
  tollDue,
  mapIndex,
  otherEnd,
  type PlayerId,
  type ResourceMap,
  type WorldAction,
  type WorldPlayerView,
} from '@vikiland/engine-world';
import { fmt, wt } from '../../i18n/world';
import type { WorldController } from '../../game/world/LocalWorldController';
import { WorldBoard, type WorldBoardHandle } from '../../components/world/WorldBoard';
import { CostRow, HandBar, PlayersBar, RES_EMOJI, sumMap } from '../../components/world/WorldUi';
import {
  CostsDialog,
  DiscardDialog,
  RaidDialog,
  TollDialog,
  TradeDialog,
} from '../../components/world/WorldDialogs';
import { colorOf } from '../../render/world/worldRenderer';

interface Props {
  makeController: () => WorldController;
  onExit: () => void;
  onRematch: (() => void) | null;
}

type Dlg = null | 'costi' | 'scambi' | { toll: { to: string; payee: string; rest: number } };

type BuildKind = 'villaggio' | 'citta' | 'sala' | 'porto' | 'mercato';
const BUILD_ORDER: BuildKind[] = ['villaggio', 'citta', 'sala', 'porto', 'mercato'];

export function WorldGameScreen({ makeController, onExit, onRematch }: Props) {
  const ctlRef = useRef<WorldController | null>(null);
  if (!ctlRef.current) ctlRef.current = makeController();
  const ctl = ctlRef.current;
  useEffect(() => () => ctl.dispose(), [ctl]);
  const snap = useSyncExternalStore(ctl.subscribe.bind(ctl), ctl.getSnapshot.bind(ctl));
  const { view, legal, viewpoint: me } = snap;

  const boardRef = useRef<WorldBoardHandle>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const idx = useMemo(() => mapIndex(view.map), [view.map]);
  const phase = view.phase;
  const myTurn = view.currentPlayer === me;
  const hand = view.hand;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((m) => (m === msg ? null : m)), 2200);
  };
  const send = (a: WorldAction): boolean => {
    const err = ctl.dispatch(a);
    if (err) {
      flash(err.message);
      return false;
    }
    return true;
  };

  // ---- derivati dalle mosse legali ----
  const legalOf = <T extends WorldAction['type']>(t: T) =>
    legal.filter((a): a is Extract<WorldAction, { type: T }> => a.type === t);

  const reachable = useMemo(() => {
    const m = new Map<string, { cost: number; toll: number }>();
    if (phase.type !== 'azioni' || !myTurn) return m;
    for (const a of legal) {
      if (a.type !== 'muovi') continue;
      const plan = planMove(view, me, a.to);
      if (!plan.ok) continue;
      m.set(a.to, { cost: plan.plan.cost, toll: tollDue(view, me, a.to)?.amount ?? 0 });
    }
    return m;
  }, [legal, view, me, phase.type, myTurn]);

  const highlights = useMemo(() => {
    const h = new Set<string>();
    for (const a of legal) {
      if (a.type === 'piazzaVillaggioIniziale') h.add(a.territory);
      if (a.type === 'piazzaStradaIniziale') {
        const l = idx.link.get(a.link);
        if (l) {
          h.add(l.a);
          h.add(l.b);
        }
      }
    }
    return h;
  }, [legal, idx]);

  // Centra sul Jarl all'inizio del proprio turno.
  const lastTurn = useRef(-1);
  useEffect(() => {
    if (phase.type !== 'setup' && view.turnNumber !== lastTurn.current && myTurn && view.players[me]) {
      lastTurn.current = view.turnNumber;
      boardRef.current?.centerOn(view.players[me]!.jarl);
    }
  }, [view.turnNumber, myTurn, me, view.players, phase.type]);

  // Il «7»: se devo scartare/razziare, mostro il dialogo giusto.
  const needDiscard = phase.type === 'scarto' && phase.pending.includes(me);
  const discardCount = needDiscard && hand ? Math.floor(sumMap(hand) / 2) : 0;
  const needRaid = phase.type === 'razzia' && myTurn;

  // ---- territorio selezionato ----
  const selDef = selected ? idx.territory.get(selected) : null;
  const selState = selected ? view.territories[selected] : null;

  function moveTo(to: string) {
    const due = tollDue(view, me, to);
    if (due && hand) {
      const silver = Math.min(hand.argento, due.amount);
      const rest = due.amount - silver;
      const materials = sumMap({ ...hand, argento: 0 });
      const kinds = (['legname', 'pietra', 'lana', 'orzo', 'ferro'] as const).filter((r) => hand[r] > 0).length;
      if (rest > 0 && materials > rest && kinds > 1) {
        setDlg({ toll: { to, payee: view.players[due.payee]!.name, rest } });
        return;
      }
    }
    send({ type: 'muovi', player: me, to });
    setSelected(null);
  }

  function sheet() {
    if (!selected || !selDef || !selState || !hand) return null;
    const owner = selState.owner !== null ? view.players[selState.owner] : null;
    const isMyJarl = view.players[me]?.jarl === selected;
    const actions: ReactElement[] = [];
    const reach = reachable.get(selected);

    if (phase.type === 'setup' && myTurn) {
      for (const a of legalOf('piazzaVillaggioIniziale')) {
        if (a.territory === selected) {
          actions.push(
            <button key="sv" className="pxbtn" onClick={() => send(a) && setSelected(null)}>
              🏠 {wt.poniVillaggio}
            </button>
          );
        }
      }
      for (const a of legalOf('piazzaStradaIniziale')) {
        const l = idx.link.get(a.link)!;
        if (l.a === selected || l.b === selected) {
          actions.push(
            <button key={a.link} className="pxbtn" onClick={() => send(a) && setSelected(null)}>
              🛤️ {fmt(wt.stradaVerso, { nome: selDef.name })}
            </button>
          );
        }
      }
    }
    if (phase.type === 'azioni' && myTurn) {
      if (reach) {
        actions.push(
          <button key="mv" className="pxbtn" onClick={() => moveTo(selected)}>
            👣 {wt.muoviQui} · {fmt(wt.costoMov, { n: reach.cost })}
            {reach.toll > 0 ? ` · ${fmt(wt.pedaggio, { n: reach.toll })}` : ''}
          </button>
        );
      }
      const mine = selState.owner === me;
      const relevant: BuildKind[] = [];
      if (selState.owner === null && selDef.kind !== 'deserto' && isMyJarl) relevant.push('villaggio');
      if (mine && selState.building === 'villaggio') relevant.push('citta');
      if (mine && selState.building === 'citta') relevant.push('sala');
      if (mine && selDef.coastal && !selState.porto) relevant.push('porto');
      if (mine && !selState.mercato) relevant.push('mercato');
      for (const what of BUILD_ORDER.filter((k) => relevant.includes(k))) {
        const can = legal.some((a) => a.type === 'costruisci' && a.what === what && a.territory === selected);
        actions.push(
          <button
            key={what}
            className="pxbtn"
            disabled={!can}
            onClick={() => send({ type: 'costruisci', player: me, what, territory: selected }) && setSelected(null)}
          >
            🔨 {wt[what]} <CostRow cost={BUILD_COSTS[what]} hand={hand} />
          </button>
        );
      }
      if (mine || isMyJarl) {
        for (const l of idx.linksOf.get(selected) ?? []) {
          if (l.kind !== 'terra' || view.roads[l.id] !== undefined) continue;
          const other = view.map.territories.find((t) => t.id === otherEnd(l, selected))!;
          const can = legal.some((a) => a.type === 'costruisciStrada' && a.link === l.id);
          actions.push(
            <button
              key={l.id}
              className="pxbtn pxbtn--ghost"
              disabled={!can}
              onClick={() => send({ type: 'costruisciStrada', player: me, link: l.id })}
            >
              🛤️ {fmt(wt.stradaVerso, { nome: other.name })} <CostRow cost={BUILD_COSTS.strada} hand={hand} />
            </button>
          );
        }
      }
    }

    return (
      <div className="w-sheet">
        <div className="w-sheet-head">
          <span className="w-sheet-ico">{selDef.kind === 'deserto' ? '🏜️' : RES_EMOJI[selDef.kind]}</span>
          <div className="w-sheet-title">
            <div>{selDef.name}</div>
            <div className="w-dim">
              {selDef.continent} · {selDef.kind === 'deserto' ? wt.deserto : wt[selDef.kind]}
              {selState.number !== null ? ` · ${wt.numero} ${selState.number}` : ''}
            </div>
          </div>
          <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => setSelected(null)}>
            ✕
          </button>
        </div>
        <div className="w-sheet-info">
          {owner ? (
            <>
              <span className="w-dot" style={{ background: colorOf(view, owner.id) }} />{' '}
              {fmt(wt.proprietario, { nome: owner.name })}
              {selState.building ? ` · ${wt[selState.building]}` : ''}
              {selState.porto ? ' · ⚓' : ''}
              {selState.mercato ? ' · 🪙' : ''}
            </>
          ) : (
            wt.libero
          )}
          {isMyJarl ? ` · ${wt.qui}` : ''}
        </div>
        <div className="w-sheet-actions">{actions}</div>
      </div>
    );
  }

  // ---- messaggio di stato ----
  function statusText(): string {
    const cur = view.players[view.currentPlayer]!;
    if (phase.type === 'fine') return fmt(wt.vince, { nome: view.players[phase.winner]!.name, n: view.players[phase.winner]!.points });
    if (!myTurn && phase.type !== 'scarto') return fmt(wt.attesa, { nome: cur.name });
    switch (phase.type) {
      case 'setup':
        return phase.expect === 'strada'
          ? wt.faseSetupStrada
          : Object.values(view.territories).some((t) => t.owner === me)
            ? wt.faseSetupVillaggio2
            : wt.faseSetupVillaggio;
      case 'tiro':
        return wt.faseTiro;
      case 'scarto':
        return needDiscard ? fmt(wt.faseScarto, { n: discardCount }) : fmt(wt.attesa, { nome: cur.name });
      case 'razzia':
        return wt.faseRazzia;
      case 'azioni':
        return wt.faseAzioni;
    }
    return '';
  }

  const incoming = view.pendingTrade && view.pendingTrade.from !== me ? view.pendingTrade : null;
  const lastLog = snap.log.slice(-3);

  return (
    <div className="w-screen">
      <div className="w-top">
        <PlayersBar view={view} />
        <div className="w-status">
          {view.dice && phase.type !== 'setup' ? (
            <span className="w-dice">
              🎲 {view.dice[0]} + {view.dice[1]} = {view.dice[0] + view.dice[1]}
            </span>
          ) : null}
          <span>{statusText()}</span>
        </div>
      </div>

      <div className="w-boardwrap">
        <WorldBoard ref={boardRef} view={view} selected={selected} reachable={reachable} highlights={highlights} onSelect={setSelected} />
        <div className="w-zoom">
          <button className="pxbtn pxbtn--small" onClick={() => boardRef.current?.zoomBy(1.4)}>＋</button>
          <button className="pxbtn pxbtn--small" onClick={() => boardRef.current?.zoomBy(1 / 1.4)}>－</button>
          <button className="pxbtn pxbtn--small" onClick={() => boardRef.current?.centerOn(view.players[me]!.jarl)}>🧭</button>
          <button className="pxbtn pxbtn--small" onClick={() => boardRef.current?.fit()}>🌍</button>
        </div>
        {snap.log.length > 0 && (
        <button className="w-log" onClick={() => setLogOpen((o) => !o)}>
          {(logOpen ? snap.log.slice(-14) : lastLog).map((l) => (
            <div key={l.id}>{l.text}</div>
          ))}
        </button>
        )}
        {toast && <div className="w-toast">{toast}</div>}
        {snap.thinking && <div className="w-thinking">…</div>}
        {sheet()}
        {incoming && hand && (
          <div className="w-offer">
            <div>
              {view.players[incoming.from]!.name}: <CostRow cost={incoming.give} /> → <CostRow cost={incoming.receive} />
            </div>
            <div className="w-offer-btns">
              <button
                className="pxbtn pxbtn--small"
                onClick={() => send({ type: 'rispondiScambio', player: me, offerId: incoming.id, accept: true })}
              >
                ✓
              </button>
              <button
                className="pxbtn pxbtn--small pxbtn--ghost"
                onClick={() => send({ type: 'rispondiScambio', player: me, offerId: incoming.id, accept: false })}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="w-bottom">
        <HandBar hand={hand} />
        <div className="w-actions">
          <button className="pxbtn pxbtn--small pxbtn--ghost" onClick={() => setDlg('costi')}>ℹ️ {wt.costi}</button>
          {phase.type === 'tiro' && myTurn && (
            <button className="pxbtn" onClick={() => send({ type: 'tiraDadi', player: me })}>
              🎲 {wt.tira}
            </button>
          )}
          {phase.type === 'azioni' && myTurn && (
            <>
              <button className="pxbtn pxbtn--small" onClick={() => setDlg('scambi')}>⚖️ {wt.scambia}</button>
              <button className="pxbtn" onClick={() => send({ type: 'fineTurno', player: me })}>
                ⏭ {wt.fineTurno}
              </button>
            </>
          )}
          <button className="pxbtn pxbtn--small pxbtn--ghost" onClick={onExit}>☰</button>
        </div>
      </div>

      {dlg === 'costi' && <CostsDialog onClose={() => setDlg(null)} />}
      {dlg === 'scambi' && (
        <TradeDialog
          view={view}
          onClose={() => setDlg(null)}
          onBank={(give, receive) => {
            send({ type: 'scambioBanca', player: me, give, receive });
          }}
          onPlayers={
            ctl.proposeTrade
              ? (g: ResourceMap, r: ResourceMap, to: PlayerId | null) => ctl.proposeTrade!(me, g, r, to)?.message ?? null
              : null
          }
        />
      )}
      {dlg && typeof dlg === 'object' && (
        <TollDialog
          hand={hand!}
          payee={dlg.toll.payee}
          rest={dlg.toll.rest}
          onCancel={() => setDlg(null)}
          onPay={(pay) => {
            const to = dlg.toll.to;
            setDlg(null);
            send({ type: 'muovi', player: me, to, pay });
            setSelected(null);
          }}
        />
      )}
      {needDiscard && hand && (
        <DiscardDialog hand={hand} need={discardCount} onConfirm={(r) => send({ type: 'scarta', player: me, resources: r })} />
      )}
      {needRaid && phase.type === 'razzia' && (
        <RaidDialog view={view} candidates={phase.candidates} onPick={(t) => send({ type: 'ruba', player: me, target: t })} />
      )}
      {snap.handoff !== null && <Handoff view={view} to={snap.handoff} onConfirm={() => ctl.confirmHandoff()} />}
      {phase.type === 'fine' && <Victory view={view} onExit={onExit} onRematch={onRematch} />}
    </div>
  );
}

function Handoff({ view, to, onConfirm }: { view: WorldPlayerView; to: PlayerId; onConfirm: () => void }) {
  const p = view.players[to]!;
  return (
    <div className="handoff-screen">
      <div className="menu-sub">{wt.passa}</div>
      <span className="player-chip" style={{ background: colorOf(view, to), width: 28, height: 28, flex: '0 0 auto' }} />
      <h2 style={{ color: 'var(--accent)', fontSize: 16, textAlign: 'center' }}>{p.name}</h2>
      <button className="pxbtn" onClick={onConfirm}>
        {fmt(wt.pronto, { nome: p.name })}
      </button>
    </div>
  );
}

function Victory({ view, onExit, onRematch }: { view: WorldPlayerView; onExit: () => void; onRematch: (() => void) | null }) {
  const ranking = [...view.players].sort((a, b) => b.points - a.points);
  const winner = view.phase.type === 'fine' ? view.players[view.phase.winner]! : ranking[0]!;
  return (
    <div className="dialog-backdrop">
      <div className="dialog pixel-frame">
        <h2>🏆 {wt.vittoria}</h2>
        <p className="w-rules">{fmt(wt.vince, { nome: winner.name, n: winner.points })}</p>
        <div className="w-costs">
          {ranking.map((p) => (
            <div key={p.id} className="w-costs-row">
              <span>
                <span className="w-dot" style={{ background: colorOf(view, p.id) }} /> {p.name}
              </span>
              <span>
                {p.points} {wt.punti}
              </span>
            </div>
          ))}
        </div>
        <div className="dialog-buttons">
          {onRematch && (
            <button className="pxbtn" onClick={onRematch}>
              {wt.rivincita}
            </button>
          )}
          <button className="pxbtn pxbtn--ghost" onClick={onExit}>
            {wt.esci}
          </button>
        </div>
      </div>
    </div>
  );
}
