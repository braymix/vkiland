/**
 * Flusso online: account → crea/unisciti con codice → lobby → partita.
 * Il socket e il RemoteGameController vivono in ref (sopravvivono ai render);
 * la partita riusa la GameScreen identica al locale.
 */
import { useEffect, useRef, useState } from 'react';
import type { BotLevel } from '@vikiland/engine';
import type { LobbyState } from '@vikiland/server/protocol';
import { isApiError } from '@vikiland/server/protocol';
import { it, t } from '../i18n/it';
import {
  apiLogin,
  apiMe,
  apiRegister,
  checkServerHealth,
  connectSocket,
  defaultServerUrl,
  loadSession,
  saveSession,
  type OnlineSession,
  type ServerSocket,
} from '../online/connection';
import { RemoteGameController } from '../online/RemoteGameController';
import { PLAYER_COLORS } from '../render/sprites/palettes';
import { GameScreen } from './GameScreen';

type Stage = 'login' | 'home' | 'room' | 'game';

export function OnlineScreen({ onBack }: { onBack: () => void }) {
  const [stage, setStage] = useState<Stage>('login');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const sessionRef = useRef<OnlineSession | null>(null);
  const socketRef = useRef<ServerSocket | null>(null);
  const controllerRef = useRef<RemoteGameController | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 4000);
  };

  /** Collega il socket della sessione e aggancia gli eventi di lobby/partita. */
  const attachSocket = (session: OnlineSession) => {
    sessionRef.current = session;
    const socket = connectSocket(session);
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      showError(err.message);
      setBusy(false);
      if (err.message.includes('Sessione non valida')) {
        saveSession(null);
        setStage('login');
      }
    });
    socket.on('connect', () => {
      setBusy(false);
      setStage((s) => (s === 'login' ? 'home' : s));
    });
    socket.on('lobby:state', (state) => {
      setLobby(state);
      if (state.started) {
        ensureController();
      } else {
        setStage('room');
      }
    });
    socket.on('lobby:closed', (e) => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
      setLobby(null);
      setStage('home');
      showError(t(it.lobbyChiusa, { motivo: e.error }));
    });
  };

  /** Crea il controller remoto al primo bisogno e monta la partita quando è pronto. */
  const ensureController = () => {
    if (controllerRef.current) {
      if (controllerRef.current.ready) setStage('game');
      return;
    }
    const socket = socketRef.current;
    if (!socket) return;
    const controller = new RemoteGameController(socket);
    controllerRef.current = controller;
    const unsub = controller.subscribe(() => {
      if (controller.ready) {
        unsub();
        setGameKey((k) => k + 1);
        setStage('game');
      }
    });
  };

  // Al mount: riprova la sessione salvata (riconnessione rapida).
  useEffect(() => {
    const saved = loadSession();
    if (!saved) {
      setBusy(false);
      return;
    }
    void apiMe(saved).then((ok) => {
      if (ok) attachSocket(saved);
      else {
        saveSession(null);
        setBusy(false);
      }
    });
    return () => {
      controllerRef.current?.dispose();
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaveLobby = () => {
    socketRef.current?.emit('lobby:leave');
    controllerRef.current?.dispose();
    controllerRef.current = null;
    setLobby(null);
    setStage('home');
  };

  const logout = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    saveSession(null);
    sessionRef.current = null;
    setStage('login');
  };

  if (busy) {
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <div className="menu-sub">{it.connessioneInCorso}</div>
      </div>
    );
  }

  switch (stage) {
    case 'login':
      return (
        <LoginForm
          onBack={onBack}
          onError={showError}
          error={error}
          onLoggedIn={(session) => {
            saveSession(session);
            setBusy(true);
            attachSocket(session);
          }}
        />
      );
    case 'home':
      return (
        <OnlineHome
          name={sessionRef.current?.displayName ?? ''}
          error={error}
          onBack={() => {
            socketRef.current?.disconnect();
            onBack();
          }}
          onLogout={logout}
          onCreate={(timerSec) => {
            socketRef.current?.emit(
              'lobby:create',
              { avoidAdjacent68: true, targetGloryPoints: 10, turnTimerSec: timerSec },
              (res) => {
                if (isApiError(res)) return showError(res.error);
                setLobby(res);
                setStage('room');
              }
            );
          }}
          onJoin={(code) => {
            socketRef.current?.emit('lobby:join', code, (res) => {
              if (isApiError(res)) return showError(res.error);
              setLobby(res);
              setStage('room');
              // Rientro in una partita già avviata: la vista arriverà col refresh.
              if (res.started) ensureController();
            });
          }}
        />
      );
    case 'room':
      if (!lobby) return null;
      return (
        <LobbyRoom
          lobby={lobby}
          myUserId={sessionRef.current?.userId ?? ''}
          error={error}
          onLeave={leaveLobby}
          onAddBot={(level) => socketRef.current?.emit('lobby:addBot', level)}
          onRemoveSlot={(i) => socketRef.current?.emit('lobby:removeSlot', i)}
          onStart={() => socketRef.current?.emit('lobby:start')}
        />
      );
    case 'game': {
      const controller = controllerRef.current;
      if (!controller?.ready) return null;
      return (
        <GameScreen
          key={gameKey}
          makeController={() => controller}
          onExit={leaveLobby}
          onRematch={null}
        />
      );
    }
  }
}

// ---------------------------------------------------------------------------

function LoginForm({
  onLoggedIn,
  onError,
  onBack,
  error,
}: {
  onLoggedIn: (s: OnlineSession) => void;
  onError: (m: string) => void;
  onBack: () => void;
  error: string | null;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [serverUrl, setServerUrl] = useState(defaultServerUrl());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');

  // Ping del server (con debounce mentre si digita): senza backend l'MVP
  // resta giocabile in locale e qui lo si dice chiaramente.
  useEffect(() => {
    setHealth('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      void checkServerHealth(serverUrl.trim()).then((ok) => {
        if (!cancelled) setHealth(ok ? 'ok' : 'down');
      });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [serverUrl]);

  const submit = async () => {
    setSending(true);
    try {
      const url = serverUrl.trim().replace(/\/+$/, '');
      const session =
        mode === 'login'
          ? await apiLogin(url, email, password)
          : await apiRegister(url, email, password, name);
      onLoggedIn(session);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Errore di rete');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>{it.multigiocatore}</h2>
      <div className="setup-grid pixel-frame" style={{ maxWidth: 360 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`pxbtn pxbtn--small ${mode === 'login' ? '' : 'pxbtn--ghost'}`}
            onClick={() => setMode('login')}
          >
            {it.accedi}
          </button>
          <button
            className={`pxbtn pxbtn--small ${mode === 'register' ? '' : 'pxbtn--ghost'}`}
            onClick={() => setMode('register')}
          >
            {it.registrati}
          </button>
        </div>
        <input
          type="text"
          placeholder={it.serverUrl}
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
        />
        {health === 'checking' && (
          <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>{it.serverVerifica}</div>
        )}
        {health === 'ok' && (
          <div style={{ fontSize: 8, color: 'var(--ok)' }}>✓ {it.serverOk}</div>
        )}
        {health === 'down' && (
          <div style={{ fontSize: 8, color: 'var(--danger)', lineHeight: 1.6 }}>
            {it.serverGiu}
          </div>
        )}
        <input
          type="email"
          placeholder={it.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder={it.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'register' && (
          <input
            type="text"
            placeholder={it.nomeInGioco}
            maxLength={12}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        {error && <div style={{ fontSize: 9, color: 'var(--danger)' }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="pxbtn pxbtn--ghost" onClick={onBack}>
          {it.indietro}
        </button>
        <button className="pxbtn" onClick={() => void submit()} disabled={sending}>
          {mode === 'login' ? it.accedi : it.registrati}
        </button>
      </div>
    </div>
  );
}

function OnlineHome({
  name,
  error,
  onCreate,
  onJoin,
  onLogout,
  onBack,
}: {
  name: string;
  error: string | null;
  onCreate: (timerSec: number) => void;
  onJoin: (code: string) => void;
  onLogout: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [timerSec, setTimerSec] = useState(0);

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>{t(it.ciao, { nome: name })}</h2>
      <div className="setup-grid pixel-frame" style={{ maxWidth: 360 }}>
        <div className="setup-player">
          <span style={{ fontSize: 9 }}>{it.timerTurno}</span>
          <select value={timerSec} onChange={(e) => setTimerSec(Number(e.target.value))}>
            <option value={0}>{it.nessunTimer}</option>
            <option value={60}>60s</option>
            <option value={120}>120s</option>
          </select>
          <button className="pxbtn" onClick={() => onCreate(timerSec)}>
            {it.creaPartita}
          </button>
        </div>
        <div className="setup-player">
          <input
            type="text"
            placeholder={it.codiceInvito}
            value={code}
            maxLength={6}
            style={{ textTransform: 'uppercase', width: 120 }}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="pxbtn" onClick={() => onJoin(code)} disabled={code.trim().length < 6}>
            {it.unisciti}
          </button>
        </div>
        {error && <div style={{ fontSize: 9, color: 'var(--danger)' }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="pxbtn pxbtn--ghost" onClick={onBack}>
          {it.indietro}
        </button>
        <button className="pxbtn pxbtn--ghost" onClick={onLogout}>
          {it.esciAccount}
        </button>
      </div>
    </div>
  );
}

function LobbyRoom({
  lobby,
  myUserId,
  error,
  onLeave,
  onAddBot,
  onRemoveSlot,
  onStart,
}: {
  lobby: LobbyState;
  myUserId: string;
  error: string | null;
  onLeave: () => void;
  onAddBot: (level: BotLevel) => void;
  onRemoveSlot: (i: number) => void;
  onStart: () => void;
}) {
  const isHost = lobby.hostUserId === myUserId;
  const colors = (['rosso', 'blu', 'verde', 'giallo'] as const).map((c) => PLAYER_COLORS[c].main);
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>
        {t(it.lobbyTitolo, { code: lobby.code })}
      </h2>
      <div className="menu-sub" style={{ fontSize: 9 }}>
        {it.condividiCodice}
      </div>
      <div className="setup-grid pixel-frame" style={{ maxWidth: 400 }}>
        {lobby.slots.map((slot, i) => (
          <div key={i} className="setup-player">
            <span className="player-chip" style={{ background: colors[i] }} />
            <span style={{ flex: 1, fontSize: 10 }}>
              {slot.name}
              {slot.isBot && <span style={{ color: 'var(--ink-dim)' }}> (bot)</span>}
              {slot.userId === lobby.hostUserId && (
                <span style={{ color: 'var(--accent)' }}> ({it.hostTag})</span>
              )}
              {!slot.isBot && !slot.connected && (
                <span style={{ color: 'var(--danger)' }}> ({it.disconnessoTag})</span>
              )}
            </span>
            {isHost && slot.userId !== myUserId && (
              <button className="pxbtn pxbtn--danger pxbtn--small" onClick={() => onRemoveSlot(i)}>
                X
              </button>
            )}
          </div>
        ))}
        {isHost && lobby.slots.length < 4 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => onAddBot('normale')}>
              {it.aggiungiBot} ({it.normale})
            </button>
            <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => onAddBot('facile')}>
              {it.aggiungiBot} ({it.facile})
            </button>
          </div>
        )}
        {error && <div style={{ fontSize: 9, color: 'var(--danger)' }}>{error}</div>}
        {!isHost && <div style={{ fontSize: 9, color: 'var(--ink-dim)' }}>{it.inAttesaHost}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="pxbtn pxbtn--ghost" onClick={onLeave}>
          {it.esciLobby}
        </button>
        {isHost && (
          <button className="pxbtn" onClick={onStart} disabled={lobby.slots.length < 2}>
            {it.avviaPartita}
          </button>
        )}
      </div>
    </div>
  );
}
