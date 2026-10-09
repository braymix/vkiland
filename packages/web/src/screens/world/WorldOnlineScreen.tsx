/** Online di «Vikings Around the World»: crea/entra, lobby con bot e avvio, poi la partita. */
import { useEffect, useRef, useState } from 'react';
import type { ApiError, WorldBotLevel, WorldLobbyConfig, WorldLobbyState, WorldPublicSummary } from '@vikiland/server/protocol';
import { DEFAULT_TARGET_POINTS, MAX_TARGET_POINTS, MIN_TARGET_POINTS } from '@vikiland/engine-world';
import { connectSocket, type OnlineSession, type ServerSocket } from '../../online/connection';
import { RemoteWorldController } from '../../game/world/RemoteWorldController';
import { fmt, wt } from '../../i18n/world';
import { WorldGameScreen } from './WorldGameScreen';

interface Props {
  session: OnlineSession;
  onBack: () => void;
  onInvalidSession: () => void;
}

const isError = (x: unknown): x is ApiError => typeof x === 'object' && x !== null && 'error' in x;
const LEVELS: WorldBotLevel[] = ['facile', 'normale', 'difficile', 'esperto'];

export function WorldOnlineScreen({ session, onBack, onInvalidSession }: Props) {
  const socketRef = useRef<ServerSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lobby, setLobby] = useState<WorldLobbyState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [publicGames, setPublicGames] = useState<WorldPublicSummary[]>([]);
  const [code, setCode] = useState('');
  const [config, setConfig] = useState<WorldLobbyConfig>({
    targetPoints: DEFAULT_TARGET_POINTS,
    turnTimerSec: 0,
    isPublic: false,
    materialiCasuali: false,
    mapId: 'mondo',
  });
  const [controller, setController] = useState<RemoteWorldController | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const socket = connectSocket(session);
    socketRef.current = socket;
    const ctl = new RemoteWorldController(socket);
    setController(ctl);
    const off = ctl.subscribe(() => setReady(ctl.ready));
    socket.on('connect', () => {
      setConnected(true);
      setFailed(false);
      socket.emit('world:list', setPublicGames);
    });
    socket.on('connect_error', (e) => {
      setFailed(true);
      if (e.message.includes('Sessione')) onInvalidSession();
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('world:state', (s) => setLobby(s));
    socket.on('world:closed', (e) => {
      setLobby(null);
      setReady(false);
      setMessage(e.error);
    });
    socket.on('world:rejected', (r) => setMessage(r.message));
    return () => {
      off();
      ctl.dispose();
      socket.disconnect();
    };
    // la sessione non cambia durante la vita della schermata
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const socket = socketRef.current;
  const leave = () => {
    socket?.emit('world:leave');
    setLobby(null);
    setReady(false);
  };

  // --- partita in corso ---
  if (lobby?.started && controller && ready) {
    return (
      <WorldGameScreen
        makeController={() => controller}
        onRematch={null}
        onExit={() => {
          if (lobby && lobby.seats.some((s) => s.isYou && s.isHost)) socket?.emit('world:terminate');
          leave();
          onBack();
        }}
      />
    );
  }

  const create = () => {
    socket?.emit('world:create', config, (res) => {
      if (isError(res)) setMessage(res.error);
      else setLobby(res);
    });
  };
  const join = (c: string) => {
    socket?.emit('world:join', c.trim().toUpperCase(), (res) => {
      if (isError(res)) setMessage(res.error);
      else setLobby(res);
    });
  };
  const refreshList = () => socket?.emit('world:list', setPublicGames);
  const me = lobby?.seats.find((s) => s.isYou);
  const amHost = !!me?.isHost;

  const patchConfig = (patch: Partial<WorldLobbyConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    if (lobby && amHost) socket?.emit('world:updateConfig', next, () => {});
  };
  const cfg = lobby?.config ?? config;

  return (
    <div className="screen w-new">
      <h1 className="menu-title" style={{ fontSize: 16 }}>
        🌐 {wt.mondo} · {wt.online}
      </h1>
      {!connected && <div className="w-rules">{failed ? wt.nonRaggiungibile2 : wt.connessione}</div>}
      {message && (
        <div className="w-msg" onClick={() => setMessage(null)}>
          {message}
        </div>
      )}

      {!lobby && connected && (
        <div className="w-form">
          <div className="w-lab">{wt.creaPartita}</div>
          <ConfigForm config={config} onChange={patchConfig} />
          <button className="pxbtn" onClick={create}>
            ⛵ {wt.creaPartita}
          </button>
          <div className="w-lab">{wt.entraConCodice}</div>
          <div className="w-seat">
            <input
              className="w-input"
              value={code}
              maxLength={5}
              placeholder={wt.codice}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button className="pxbtn" disabled={code.trim().length < 5} onClick={() => join(code)}>
              {wt.entra}
            </button>
          </div>
          <div className="w-lab">
            {wt.partitePubbliche}{' '}
            <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={refreshList}>
              ↻
            </button>
          </div>
          {publicGames.length === 0 && <div className="w-dim">{wt.nessunaPartita}</div>}
          {publicGames.map((g) => (
            <button key={g.code} className="pxbtn pxbtn--ghost" onClick={() => join(g.code)}>
              {g.hostName} · {g.players}/{g.maxPlayers} {g.turnTimerSec ? `· ${g.turnTimerSec}s` : ''}
            </button>
          ))}
        </div>
      )}

      {lobby && (
        <div className="w-form">
          <div className="w-lab">
            {wt.lobby} · {lobby.code}
          </div>
          <div className="w-dim">{wt.condividiCodice}</div>
          {lobby.seats.map((s, i) => (
            <div key={i} className="w-seat">
              <span className="w-dot" style={{ background: s.color }} />
              <span className="w-input" style={{ border: 'none', background: 'transparent' }}>
                {s.bot ? '🤖 ' : ''}
                {s.name}
                {s.isHost ? ` · ${wt.host}` : ''}
                {s.isYou ? ` · ${wt.tu}` : ''}
                {!s.connected ? ` · ${wt.disconnesso}` : ''}
              </span>
              {amHost && !s.isHost && (
                <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => socket?.emit('world:removeSeat', i)}>
                  ✕
                </button>
              )}
            </div>
          ))}
          {amHost && lobby.seats.length < lobby.maxPlayers && (
            <div className="w-pick">
              {LEVELS.map((l) => (
                <button key={l} className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => socket?.emit('world:addBot', l)}>
                  🤖 {wt[l]}
                </button>
              ))}
            </div>
          )}
          {amHost ? (
            <ConfigForm config={cfg} onChange={patchConfig} />
          ) : (
            <div className="w-dim">
              {fmt(wt.puntiVittoria + ': {n}', { n: cfg.targetPoints })}
            </div>
          )}
          <button
            className="pxbtn"
            disabled={!amHost || lobby.seats.length < lobby.minPlayers}
            onClick={() => socket?.emit('world:start')}
          >
            {amHost ? `⛵ ${wt.avvia}` : wt.soloHost}
          </button>
          <button className="pxbtn pxbtn--ghost" onClick={leave}>
            {wt.esciLobby}
          </button>
          {amHost && (
            <button className="pxbtn pxbtn--danger" onClick={() => socket?.emit('world:terminate')}>
              {wt.chiudiPartita}
            </button>
          )}
        </div>
      )}

      <div className="dialog-buttons">
        <button
          className="pxbtn pxbtn--ghost"
          onClick={() => {
            if (lobby) leave();
            onBack();
          }}
        >
          {wt.indietro}
        </button>
      </div>
    </div>
  );
}

function ConfigForm({ config, onChange }: { config: WorldLobbyConfig; onChange: (p: Partial<WorldLobbyConfig>) => void }) {
  return (
    <>
      <div className="w-lab">
        {wt.puntiVittoria}: {config.targetPoints}
      </div>
      <input
        type="range"
        min={MIN_TARGET_POINTS}
        max={MAX_TARGET_POINTS}
        value={config.targetPoints}
        onChange={(e) => onChange({ targetPoints: Number(e.target.value) })}
      />
      <div className="w-lab">{wt.timer}</div>
      <select className="w-input" value={config.turnTimerSec} onChange={(e) => onChange({ turnTimerSec: Number(e.target.value) })}>
        <option value={0}>{wt.nessunTimer}</option>
        {[30, 60, 90, 120].map((n) => (
          <option key={n} value={n}>
            {n}s
          </option>
        ))}
      </select>
      <label className="w-check">
        <input type="checkbox" checked={config.isPublic} onChange={(e) => onChange({ isPublic: e.target.checked })} /> {wt.pubblica}
      </label>
      <label className="w-check">
        <input
          type="checkbox"
          checked={config.materialiCasuali}
          onChange={(e) => onChange({ materialiCasuali: e.target.checked })}
        />{' '}
        {wt.materialiCasuali}
      </label>
    </>
  );
}
