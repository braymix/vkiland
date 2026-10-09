/** Editor mappe (solo amministratore): rinomina o togli territori; vale per le nuove partite. */
import { useEffect, useMemo, useState } from 'react';
import {
  MAPS,
  applyMapOverride,
  createGame,
  defaultConfig,
  getPlayerView,
  type MapOverride,
} from '@vikiland/engine-world';
import { WorldBoard } from '../../components/world/WorldBoard';
import { MapSelect } from '../../components/world/MapSelect';
import { wt } from '../../i18n/world';
import type { OnlineSession } from '../../online/connection';
import { apiGetMapOverride, apiSaveMapOverride } from '../../online/worldApi';

interface Props {
  session: OnlineSession;
  onBack: () => void;
}

const EMPTY = new Set<string>();
const NO_REACH = new Map<string, { cost: number; toll: number }>();

export function AdminMapsScreen({ session, onBack }: Props) {
  const [mapId, setMapId] = useState('mondo');
  const base = MAPS[mapId]!;
  const [names, setNames] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNames({});
    setRemoved([]);
    setSelected(null);
    void apiGetMapOverride(session.serverUrl, mapId, 6000).then((o) => {
      if (o) {
        setNames(o.names);
        setRemoved(o.removed);
      }
    });
  }, [session.serverUrl, mapId]);

  // Vista della mappa intera (senza override), per poter anche ripristinare.
  const view = useMemo(
    () =>
      getPlayerView(
        createGame(defaultConfig({ seed: 'editor', mapId, players: [{ name: 'a', color: '#d9534f' }, { name: 'b', color: '#4a90d9' }] })),
        null
      ),
    [mapId]
  );
  const dimmed = useMemo(() => new Set(removed), [removed]);
  const draft: MapOverride = { mapId, names, removed };
  const check = applyMapOverride(base, draft);
  const sel = selected ? base.territories.find((t) => t.id === selected) : null;
  const isRemoved = !!sel && removed.includes(sel.id);

  const save = async () => {
    setBusy(true);
    try {
      await apiSaveMapOverride(session, mapId, { names, removed });
      setMsg({ text: wt.salvato, ok: true });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    setBusy(true);
    try {
      await apiSaveMapOverride(session, mapId, { reset: true });
      setNames({});
      setRemoved([]);
      setMsg({ text: wt.salvato, ok: true });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-screen">
      <div className="w-top">
        <div className="w-lab">🗺️ {wt.editorMappe}</div>
        <MapSelect value={mapId} onChange={setMapId} />
        <div className="w-dim">{wt.editorInfo}</div>
      </div>
      <div className="w-boardwrap">
        <WorldBoard view={view} selected={selected} reachable={NO_REACH} highlights={EMPTY} dimmed={dimmed} onSelect={setSelected} />
        {sel && (
          <div className="w-sheet">
            <div className="w-sheet-head">
              <div className="w-sheet-title">{names[sel.id] ?? sel.name}</div>
              <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            <div className="w-dim">
              {sel.id} · {sel.continent}
              {isRemoved ? ` · ${wt.tolto}` : ''}
            </div>
            <div className="w-lab">{wt.rinomina}</div>
            <input
              className="w-input"
              maxLength={40}
              value={names[sel.id] ?? sel.name}
              onChange={(e) => setNames((n) => ({ ...n, [sel.id]: e.target.value }))}
            />
            <div className="w-sheet-actions" style={{ marginTop: 8 }}>
              <button
                className="pxbtn pxbtn--ghost"
                onClick={() => setRemoved((r) => (isRemoved ? r.filter((x) => x !== sel.id) : [...r, sel.id]))}
              >
                {isRemoved ? `↩ ${wt.ripristina}` : `🗑️ ${wt.togli}`}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="w-bottom">
        {!check.ok && (
          <div className="w-msg">
            {wt.mappaNonValida}: {check.error}
          </div>
        )}
        {msg && <div className="w-msg" style={{ color: msg.ok ? 'var(--ok)' : 'var(--danger)' }}>{msg.text}</div>}
        <div className="w-actions">
          <button className="pxbtn pxbtn--ghost" onClick={onBack}>
            {wt.indietro}
          </button>
          <button className="pxbtn pxbtn--danger pxbtn--small" disabled={busy} onClick={() => void reset()}>
            {wt.ripristinaTutto}
          </button>
          <button className="pxbtn" disabled={busy || !check.ok} onClick={() => void save()}>
            {wt.salva}
          </button>
        </div>
      </div>
    </div>
  );
}
