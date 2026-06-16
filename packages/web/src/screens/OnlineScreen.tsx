/**
 * Flusso online: account → crea/unisciti con codice → lobby → partita.
 * Il socket e il RemoteGameController vivono in ref (sopravvivono ai render);
 * la partita riusa la GameScreen identica al locale.
 */
import { useEffect, useRef, useState } from 'react';
import type { BotLevel, PlayerColor } from '@vikiland/engine';
import type { LobbyState, PublicLobbySummary } from '@vikiland/server/protocol';
import { isApiError } from '@vikiland/server/protocol';
import { it, t } from '../i18n';
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
import { TUTORIAL_ONLINE_CHAPTER } from '../i18n/tutorial';
import { Dialog } from '../components/dialogs/Dialog';
import { AccountScreen } from './AccountScreen';
import { GameScreen } from './GameScreen';
import { TutorialScreen } from './TutorialScreen';

type Stage = 'login' | 'home' | 'room' | 'game' | 'account';

export function OnlineScreen({ onBack }: { onBack: () => void }) {
  const [stage, setStage] = useState<Stage>('login');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const sessionRef = useRef<OnlineSession | null>(null);
  /** Bump per ri-renderizzare quando la sessione nella ref cambia (token/nome). */
  const [, setSessionVersion] = useState(0);
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

  // Tutorial aperto sul capitolo «Giocare online» da login e home.
  const tutorialOverlay = tutorialOpen ? (
    <TutorialScreen
      initialChapter={TUTORIAL_ONLINE_CHAPTER}
      onClose={() => setTutorialOpen(false)}
    />
  ) : null;

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
        <>
          <LoginForm
            onBack={onBack}
            onError={showError}
            error={error}
            onOpenTutorial={() => setTutorialOpen(true)}
            onLoggedIn={(session) => {
              saveSession(session);
              setBusy(true);
              attachSocket(session);
            }}
          />
          {tutorialOverlay}
        </>
      );
    case 'home':
      return (
        <>
        <OnlineHome
          name={sessionRef.current?.username ?? ''}
          error={error}
          onBack={() => {
            socketRef.current?.disconnect();
            onBack();
          }}
          onOpenTutorial={() => setTutorialOpen(true)}
          onAccount={() => setStage('account')}
          onLogout={logout}
          onCreate={(timerSec, isPublic) => {
            socketRef.current?.emit(
              'lobby:create',
              { avoidAdjacent68: true, targetGloryPoints: 10, turnTimerSec: timerSec, isPublic },
              (res) => {
                if (isApiError(res)) return showError(res.error);
                setLobby(res);
                setStage('room');
              }
            );
          }}
          fetchPublic={(cb) => {
            if (socketRef.current?.connected) socketRef.current.emit('lobby:list', cb);
            else cb([]);
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
        {tutorialOverlay}
        </>
      );
    case 'account':
      if (!sessionRef.current) return null;
      return (
        <AccountScreen
          session={sessionRef.current}
          onBack={() => setStage('home')}
          onSessionUpdate={(fresh) => {
            // Nome o token cambiati: si salva e si riconnette il socket
            // (il server tiene il nome dal handshake; il vecchio token
            // dopo un cambio password è revocato).
            saveSession(fresh);
            socketRef.current?.disconnect();
            attachSocket(fresh);
            setSessionVersion((v) => v + 1);
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
          onSetColor={(i, color) => socketRef.current?.emit('lobby:setColor', i, color)}
          onStart={() => socketRef.current?.emit('lobby:start')}
        />
      );
    case 'game': {
      const controller = controllerRef.current;
      if (!controller?.ready) return null;
      const isHost = lobby?.hostUserId === sessionRef.current?.userId;
      return (
        <>
          <GameScreen
            key={gameKey}
            makeController={() => controller}
            onExit={leaveLobby}
            onRematch={null}
          />
          {/* Solo l'host: chiude la partita per TUTTI (con conferma). */}
          {isHost && (
            <button
              className="pxbtn pxbtn--danger pxbtn--small terminate-btn"
              onClick={() => setTerminateOpen(true)}
            >
              ✕ {it.terminaPartita}
            </button>
          )}
          {terminateOpen && (
            <Dialog title={it.terminaTitolo}>
              <p style={{ fontSize: 9, lineHeight: 1.9 }}>{it.terminaTesto}</p>
              <div className="dialog-buttons">
                <button className="pxbtn pxbtn--ghost" onClick={() => setTerminateOpen(false)}>
                  {it.annulla}
                </button>
                <button
                  className="pxbtn pxbtn--danger"
                  onClick={() => {
                    setTerminateOpen(false);
                    socketRef.current?.emit('lobby:terminate');
                  }}
                >
                  {it.terminaConferma}
                </button>
              </div>
            </Dialog>
          )}
        </>
      );
    }
  }
}

// ---------------------------------------------------------------------------

function LoginForm({
  onLoggedIn,
  onError,
  onBack,
  onOpenTutorial,
  error,
}: {
  onLoggedIn: (s: OnlineSession) => void;
  onError: (m: string) => void;
  onBack: () => void;
  onOpenTutorial: () => void;
  error: string | null;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [serverUrl, setServerUrl] = useState(defaultServerUrl());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');
  /** L'URL del server confonde i piu': resta dietro un expander (default chiuso). */
  const [serverOpen, setServerOpen] = useState(false);

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
          ? await apiLogin(url, username, password)
          : await apiRegister(url, username, password);
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
          placeholder={it.nomeUtente}
          maxLength={12}
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder={it.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'register' && (
          <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>{it.nomeUtenteHint}</div>
        )}
        <button
          className="pxbtn pxbtn--ghost pxbtn--small"
          onClick={() => setServerOpen(!serverOpen)}
          aria-expanded={serverOpen}
        >
          {serverOpen ? '▾' : '▸'} {it.serverExpander}
        </button>
        {serverOpen && (
          <div className="config-section">
            <input
              type="text"
              placeholder={it.serverUrl}
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
          </div>
        )}
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
      <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={onOpenTutorial}>
        {it.comeFunzionaOnline}
      </button>
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
  onOpenTutorial,
  onAccount,
  fetchPublic,
}: {
  name: string;
  error: string | null;
  onCreate: (timerSec: number, isPublic: boolean) => void;
  onJoin: (code: string) => void;
  onLogout: () => void;
  onBack: () => void;
  onOpenTutorial: () => void;
  onAccount: () => void;
  fetchPublic: (cb: (rooms: PublicLobbySummary[]) => void) => void;
}) {
  const [code, setCode] = useState('');
  /** Secondi per turno scelti dall'utente ('' o 0 = nessun timer; max 600). */
  const [timerRaw, setTimerRaw] = useState('');
  const timerSec = Math.max(0, Math.min(600, Math.floor(Number(timerRaw) || 0)));
  const [isPublic, setIsPublic] = useState(false);
  /** Partite pubbliche aperte, aggiornate ogni 5 secondi. */
  const [publicRooms, setPublicRooms] = useState<PublicLobbySummary[]>([]);
  useEffect(() => {
    let alive = true;
    const refresh = () => fetchPublic((rooms) => alive && setPublicRooms(rooms));
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>{t(it.ciao, { nome: name })}</h2>
      <div className="setup-grid pixel-frame" style={{ maxWidth: 360 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 9 }}>{it.timerSecondi}</span>
          <div className="setup-player">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              step={5}
              placeholder="0"
              value={timerRaw}
              onChange={(e) => setTimerRaw(e.target.value)}
              style={{ width: 90 }}
            />
            <span style={{ fontSize: 8, color: 'var(--ink-dim)' }}>
              {timerSec === 0 ? it.nessunTimer : t(it.secondiAbbr, { n: timerSec })}
            </span>
            <button className="pxbtn" onClick={() => onCreate(timerSec, isPublic)}>
              {it.creaPartita}
            </button>
          </div>
          <label className="check" style={{ fontSize: 9 }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            {it.partitaPubblicaToggle}
          </label>
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

        <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4 }}>
          {it.partitePubbliche}
        </div>
        {publicRooms.length === 0 ? (
          <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>{it.nessunaPubblica}</div>
        ) : (
          publicRooms.map((room) => (
            <div key={room.code} className="setup-player">
              <span style={{ flex: 1, fontSize: 9 }}>
                {room.hostName}
                <span style={{ color: 'var(--ink-dim)', fontSize: 8 }}>
                  {' · '}
                  {t(it.postiNsuM, { n: room.players, m: room.maxPlayers })}
                  {room.turnTimerSec > 0
                    ? ` · ⏳${t(it.secondiAbbr, { n: room.turnTimerSec })}`
                    : ''}
                </span>
              </span>
              <button className="pxbtn pxbtn--small" onClick={() => onJoin(room.code)}>
                {it.entra}
              </button>
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="pxbtn pxbtn--ghost" onClick={onBack}>
          {it.indietro}
        </button>
        <button className="pxbtn pxbtn--ghost" onClick={onAccount}>
          {it.account}
        </button>
        <button className="pxbtn pxbtn--ghost" onClick={onLogout}>
          {it.esciAccount}
        </button>
      </div>
      <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={onOpenTutorial}>
        {it.comeFunzionaOnline}
      </button>
    </div>
  );
}

const CLAN_COLORS: PlayerColor[] = ['rosso', 'blu', 'verde', 'giallo', 'viola'];

function LobbyRoom({
  lobby,
  myUserId,
  error,
  onLeave,
  onAddBot,
  onRemoveSlot,
  onSetColor,
  onStart,
}: {
  lobby: LobbyState;
  myUserId: string;
  error: string | null;
  onLeave: () => void;
  onAddBot: (level: BotLevel) => void;
  onRemoveSlot: (i: number) => void;
  onSetColor: (i: number, color: PlayerColor) => void;
  onStart: () => void;
}) {
  const isHost = lobby.hostUserId === myUserId;
  const [botLevel, setBotLevel] = useState<BotLevel>('normale');
  // Posto col picker dei colori aperto (null = nessuno).
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);
  // Puoi cambiare il TUO colore; l'host può cambiare anche quello dei bot.
  const canRecolor = (slot: LobbyState['slots'][number]) =>
    slot.userId === myUserId || (isHost && slot.isBot);
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>
        {t(it.lobbyTitolo, { code: lobby.code })}
      </h2>
      <div className="menu-sub" style={{ fontSize: 9 }}>
        {it.condividiCodice}
      </div>
      <div style={{ fontSize: 9, color: 'var(--ink-dim)' }}>
        {lobby.isPublic ? it.visibilitaPubblica : it.visibilitaPrivata}
        {' · '}
        {t(it.timerLobby, {
          s:
            lobby.config.turnTimerSec > 0
              ? t(it.secondiAbbr, { n: lobby.config.turnTimerSec })
              : it.nessunTimer,
        })}
      </div>
      <div className="setup-grid pixel-frame" style={{ maxWidth: 400 }}>
        {lobby.slots.map((slot, i) => (
          <div key={i}>
            <div className="setup-player">
              {canRecolor(slot) ? (
                <button
                  className="player-chip"
                  style={{ background: PLAYER_COLORS[slot.color].main, cursor: 'pointer' }}
                  onClick={() => setPickerOpen(pickerOpen === i ? null : i)}
                  title={it.cambiaColore}
                  aria-label={it.cambiaColore}
                />
              ) : (
                <span className="player-chip" style={{ background: PLAYER_COLORS[slot.color].main }} />
              )}
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
            {pickerOpen === i && canRecolor(slot) && (
              <div className="color-picker">
                {CLAN_COLORS.map((c) => {
                  const owner = lobby.slots.findIndex((q, qi) => qi !== i && q.color === c);
                  return (
                    <button
                      key={c}
                      className={`color-swatch ${slot.color === c ? 'color-swatch--active' : ''}`}
                      style={{ background: PLAYER_COLORS[c].main }}
                      title={
                        owner >= 0
                          ? t(it.scambiaColoreCon, { nome: lobby.slots[owner]!.name })
                          : it.nomeColore[c]
                      }
                      onClick={() => {
                        onSetColor(i, c);
                        setPickerOpen(null);
                      }}
                    >
                      {owner >= 0 ? lobby.slots[owner]!.name.charAt(0).toUpperCase() : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {isHost && lobby.slots.length < 4 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={botLevel} onChange={(e) => setBotLevel(e.target.value as BotLevel)}>
              <option value="facile">{it.facile}</option>
              <option value="normale">{it.normale}</option>
              <option value="difficile">{it.difficile}</option>
              <option value="esperto">{it.esperto}</option>
            </select>
            <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => onAddBot(botLevel)}>
              {it.aggiungiBot}
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
