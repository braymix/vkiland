/**
 * Flusso online: il login è già stato fatto all'entrata, qui si arriva con una
 * sessione valida. crea/unisciti con codice → lobby → partita. Il socket e il
 * RemoteGameController vivono in ref (sopravvivono ai render); la partita riusa
 * la GameScreen identica al locale.
 */
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_TARGET_GLORY, MAX_PLAYERS, type BotLevel, type PlayerColor } from '@vikiland/engine';
import type { LobbyState, PublicLobbySummary } from '@vikiland/server/protocol';
import { isApiError } from '@vikiland/server/protocol';
import { it, t } from '../i18n';
import { connectSocket, type OnlineSession, type ServerSocket } from '../online/connection';
import { RemoteGameController } from '../online/RemoteGameController';
import { FREE_PALETTE, shadesFor } from '../render/sprites/palettes';
import { TUTORIAL_ONLINE_CHAPTER } from '../i18n/tutorial';
import { Dialog } from '../components/dialogs/Dialog';
import { GameScreen } from './GameScreen';
import { TutorialScreen } from './TutorialScreen';

type Stage = 'home' | 'room' | 'game';

export function OnlineScreen({
  session,
  onBack,
  onInvalidSession,
}: {
  session: OnlineSession;
  onBack: () => void;
  /** Il token è scaduto lato server: si torna all'entrata per riaccedere. */
  onInvalidSession: () => void;
}) {
  const [stage, setStage] = useState<Stage>('home');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const socketRef = useRef<ServerSocket | null>(null);
  const controllerRef = useRef<RemoteGameController | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 4000);
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

  // Al mount: connette il socket della sessione (arriva dall'App, già loggata).
  // Se il token nel frattempo è scaduto, il server rifiuta e si torna all'entrata.
  useEffect(() => {
    const socket = connectSocket(session);
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      setBusy(false);
      if (err.message.includes('Sessione non valida')) {
        onInvalidSession();
        return;
      }
      showError(err.message);
    });
    socket.on('connect', () => {
      setBusy(false);
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

    return () => {
      controllerRef.current?.dispose();
      socket.disconnect();
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

  // Tutorial aperto sul capitolo «Giocare online».
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
    case 'home':
      return (
        <>
          <OnlineHome
            name={session.username}
            error={error}
            onBack={() => {
              socketRef.current?.disconnect();
              onBack();
            }}
            onOpenTutorial={() => setTutorialOpen(true)}
            onCreate={(timerSec, isPublic, seed, targetGloryPoints, avoidAdjacent68, calamities) => {
              const base = { avoidAdjacent68, targetGloryPoints, turnTimerSec: timerSec, isPublic, calamities };
              const config = seed.trim() ? { ...base, seed } : base;
              socketRef.current?.emit(
                'lobby:create',
                config,
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
    case 'room':
      if (!lobby) return null;
      return (
        <LobbyRoom
          lobby={lobby}
          myUserId={session.userId}
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
      const isHost = lobby?.hostUserId === session.userId;
      return (
        <>
          <GameScreen
            key={gameKey}
            makeController={() => controller}
            onExit={leaveLobby}
            onRematch={null}
          />
          {/* In basso a sinistra: TUTTI possono uscire dalla propria partita
              (il posto resta, si rientra col codice); SOLO l'host può anche
              terminarla per tutti. Entrambi con conferma. */}
          <div className="game-exit-bar">
            <button
              className="pxbtn pxbtn--ghost pxbtn--small"
              onClick={() => setLeaveOpen(true)}
            >
              ⇠ {it.esciPartita}
            </button>
            {isHost && (
              <button
                className="pxbtn pxbtn--danger pxbtn--small"
                onClick={() => setTerminateOpen(true)}
              >
                ✕ {it.terminaPartita}
              </button>
            )}
          </div>
          {leaveOpen && (
            <Dialog title={it.esciPartitaTitolo}>
              <p style={{ fontSize: 9, lineHeight: 1.9 }}>
                {t(it.esciPartitaTesto, { code: lobby?.code ?? '' })}
              </p>
              <div className="dialog-buttons">
                <button className="pxbtn pxbtn--ghost" onClick={() => setLeaveOpen(false)}>
                  {it.annulla}
                </button>
                <button
                  className="pxbtn"
                  onClick={() => {
                    setLeaveOpen(false);
                    leaveLobby();
                  }}
                >
                  {it.esciPartitaConferma}
                </button>
              </div>
            </Dialog>
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

function OnlineHome({
  name,
  error,
  onCreate,
  onJoin,
  onBack,
  onOpenTutorial,
  fetchPublic,
}: {
  name: string;
  error: string | null;
  onCreate: (
    timerSec: number,
    isPublic: boolean,
    seed: string,
    targetGloryPoints: number,
    avoidAdjacent68: boolean,
    calamities: boolean
  ) => void;
  onJoin: (code: string) => void;
  onBack: () => void;
  onOpenTutorial: () => void;
  fetchPublic: (cb: (rooms: PublicLobbySummary[]) => void) => void;
}) {
  const [code, setCode] = useState('');
  /** Secondi per turno scelti dall'utente ('' o 0 = nessun timer; max 600). */
  const [timerRaw, setTimerRaw] = useState('');
  const timerSec = Math.max(0, Math.min(600, Math.floor(Number(timerRaw) || 0)));
  const [isPublic, setIsPublic] = useState(false);
  /** Partite pubbliche aperte, aggiornate ogni 5 secondi. */
  const [publicRooms, setPublicRooms] = useState<PublicLobbySummary[]>([]);
  /** Configurazione della partita. */
  const [seed, setSeed] = useState('');
  const [targetPG, setTargetPG] = useState(10);
  const [avoid68, setAvoid68] = useState(true);
  const [calamities, setCalamities] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const bumpTarget = (delta: number) =>
    setTargetPG((n) => Math.max(5, Math.min(20, n + delta)));
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
            <button
              className="pxbtn"
              onClick={() => onCreate(timerSec, isPublic, seed, targetPG, avoid68, calamities)}
            >
              {it.creaPartita}
            </button>
          </div>
          <button
            className={`pxbtn pxbtn--ghost pxbtn--small`}
            onClick={() => setConfigOpen(!configOpen)}
            aria-expanded={configOpen}
          >
            {configOpen ? '▾' : '▸'} {it.configurazione}
          </button>
          {configOpen && (
            <div className="config-section">
              <div className="stepper-row">
                <span style={{ fontSize: 9 }}>
                  {it.puntiVittoria}{' '}
                  <span style={{ color: 'var(--ink-dim)', fontSize: 8 }}>
                    {t(it.standardN, { n: DEFAULT_TARGET_GLORY })}
                  </span>
                </span>
                <span className="stepper">
                  <button
                    className="pxbtn pxbtn--ghost pxbtn--small"
                    onClick={() => bumpTarget(-1)}
                    disabled={targetPG <= 5}
                  >
                    -
                  </button>
                  <span
                    style={{
                      minWidth: 26,
                      textAlign: 'center',
                      color: targetPG === DEFAULT_TARGET_GLORY ? 'inherit' : 'var(--accent)',
                    }}
                  >
                    {targetPG}
                  </span>
                  <button
                    className="pxbtn pxbtn--ghost pxbtn--small"
                    onClick={() => bumpTarget(+1)}
                    disabled={targetPG >= 20}
                  >
                    +
                  </button>
                </span>
              </div>
              <div className="setup-player">
                <input
                  type="text"
                  placeholder={it.seedOpzionale}
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  style={{ width: 240 }}
                />
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={avoid68}
                  onChange={(e) => setAvoid68(e.target.checked)}
                />
                {it.evita68}
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={calamities}
                  onChange={(e) => setCalamities(e.target.checked)}
                />
                ⚡ {it.calamita.conCalamita}
              </label>
              {calamities && (
                <div style={{ fontSize: 8, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
                  {it.calamita.spiega}
                </div>
              )}
            </div>
          )}
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
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button className="pxbtn pxbtn--ghost" onClick={onBack}>
          {it.indietro}
        </button>
      </div>
      <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={onOpenTutorial}>
        {it.comeFunzionaOnline}
      </button>
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
                  style={{ background: shadesFor(slot.color).main, cursor: 'pointer' }}
                  onClick={() => setPickerOpen(pickerOpen === i ? null : i)}
                  title={it.cambiaColore}
                  aria-label={it.cambiaColore}
                />
              ) : (
                <span className="player-chip" style={{ background: shadesFor(slot.color).main }} />
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
                {FREE_PALETTE.map((c) => {
                  const owner = lobby.slots.findIndex((q, qi) => qi !== i && q.color === c);
                  return (
                    <button
                      key={c}
                      className={`color-swatch ${slot.color === c ? 'color-swatch--active' : ''}`}
                      style={{ background: shadesFor(c).main }}
                      title={owner >= 0 ? t(it.scambiaColoreCon, { nome: lobby.slots[owner]!.name }) : c}
                      onClick={() => {
                        onSetColor(i, c);
                        setPickerOpen(null);
                      }}
                    >
                      {owner >= 0 ? lobby.slots[owner]!.name.charAt(0).toUpperCase() : ''}
                    </button>
                  );
                })}
                {/* Colore personalizzato (qualsiasi colore dalla tavolozza di sistema). */}
                <label className="color-swatch color-swatch--custom" title={it.coloreCustom}>
                  <input
                    type="color"
                    value={shadesFor(slot.color).main}
                    onChange={(e) => {
                      onSetColor(i, e.target.value);
                      setPickerOpen(null);
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        ))}
        {isHost && lobby.slots.length < MAX_PLAYERS && (
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
