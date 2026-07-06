/**
 * Nuova partita — flusso unico ridisegnato che sostituisce `SetupScreen` E
 * `OnlineScreen`. Un solo schermo con un segmento in alto (Stesso device /
 * Online): sotto, la lista dei posti da riempire, le regole in un preset
 * richiudibile e un grande pulsante «Avvia».
 *
 * Nessuna funzionalità persa rispetto alle due schermate precedenti:
 * - Locale: 2–4 posti Tu/Bot, colori con scambio, livelli bot, punti gloria,
 *   seed, evita 6/8, calamità, cosmetici locali, hot-seat.
 * - Online: crea/unisciti, codice invito, elenco partite pubbliche, lobby con
 *   host/bot/rimozione/colori/disconnessi, timer turno, pubblica/privata, seed,
 *   calamità, avvio, uscita e terminazione (dal pannello ☰ in partita).
 */
import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_TARGET_GLORY,
  MAX_PLAYERS,
  type BotLevel,
  type PlayerColor,
  type PlayerCosmetics,
} from '@vikiland/engine';
import type { LobbyConfig, LobbyState, PublicLobbySummary } from '@vikiland/server/protocol';
import { isApiError } from '@vikiland/server/protocol';
import { it, t } from '../i18n';
import type { GameSetup } from '../game/LocalGameController';
import { getLocalCosmetics } from '../game/localCosmetics';
import { apiGetCosmetics, connectSocket, type OnlineSession, type ServerSocket } from '../online/connection';
import { RemoteGameController } from '../online/RemoteGameController';
import { FREE_PALETTE, shadesFor } from '../render/sprites/palettes';
import { TUTORIAL_ONLINE_CHAPTER } from '../i18n/tutorial';
import { AddBotDialog } from '../components/dialogs/AddBotDialog';
import type { ManageInfo } from '../components/ManageSheet';
import { GameScreen } from './GameScreen';
import { TutorialScreen } from './TutorialScreen';

const BOT_NAMES = ['Astrid', 'Leif', 'Sigrid', 'Ragnhild', 'Olaf', 'Freya'];

type Mode = 'locale' | 'online';

interface LocalSeat {
  name: string;
  isBot: boolean;
  botLevel: BotLevel;
  color: PlayerColor;
}

interface Props {
  /** Sessione online: se assente, l'online chiede di accedere. */
  session: OnlineSession | null;
  initialMode: Mode;
  onBack: () => void;
  /** Avvio locale: l'App monta la GameScreen locale. */
  onStartLocal: (setup: GameSetup) => void;
  /** Il token è scaduto lato server: si torna all'entrata per riaccedere. */
  onInvalidSession: () => void;
  /** Si vuole giocare online ma senza account: porta all'entrata. */
  onNeedAccount: () => void;
}

const botLevelLabel = (l: BotLevel) =>
  l === 'facile' ? it.facile : l === 'normale' ? it.normale : l === 'difficile' ? it.difficile : it.esperto;

export function NewGameScreen({
  session,
  initialMode,
  onBack,
  onStartLocal,
  onInvalidSession,
  onNeedAccount,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);

  // --- Regole (condivise fra i due flussi; l'online le sincronizza col server) ---
  const [targetPG, setTargetPG] = useState(DEFAULT_TARGET_GLORY);
  const [calamities, setCalamities] = useState(false);
  const [avoid68, setAvoid68] = useState(true);
  const [seed, setSeed] = useState('');
  const [timerRaw, setTimerRaw] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const timerSec = Math.max(0, Math.min(600, Math.floor(Number(timerRaw) || 0)));

  // --- Posti locali (hot-seat) ---
  // Il posto umano parte col nickname dell'account loggato (se c'è), sempre
  // modificabile; senza account resta il nome di default.
  const [seats, setSeats] = useState<LocalSeat[]>(() => [
    { name: session?.username ?? 'Bjorn', isBot: false, botLevel: 'normale', color: FREE_PALETTE[0]! },
    { name: 'Astrid', isBot: true, botLevel: 'normale', color: FREE_PALETTE[1]! },
    { name: 'Leif', isBot: true, botLevel: 'facile', color: FREE_PALETTE[2]! },
  ]);
  const [editSeat, setEditSeat] = useState<number | null>(null);
  const [startingLocal, setStartingLocal] = useState(false);

  // --- Online: socket, lobby, partita ---
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [stage, setStage] = useState<'setup' | 'game'>('setup');
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicLobbySummary[]>([]);
  const [pickerOnline, setPickerOnline] = useState<number | null>(null);
  const [addBotOpen, setAddBotOpen] = useState(false);
  const socketRef = useRef<ServerSocket | null>(null);
  const controllerRef = useRef<RemoteGameController | null>(null);
  const connectedOnce = useRef(false);
  const [gameKey, setGameKey] = useState(0);

  const isHost = lobby === null || lobby.hostUserId === session?.userId;
  const editable = isHost && (lobby === null || !lobby.started);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 4000);
  };

  // --- Connessione socket (lazy: solo quando serve l'online, una volta sola) ---
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

  const connectOnline = () => {
    if (connectedOnce.current || !session) return;
    connectedOnce.current = true;
    setBusy(true);
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
    socket.on('connect', () => setBusy(false));
    socket.on('lobby:state', (state) => {
      setLobby(state);
      if (state.started) ensureController();
      else setStage('setup');
    });
    socket.on('lobby:closed', (e) => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
      setLobby(null);
      setStage('setup');
      showError(t(it.lobbyChiusa, { motivo: e.error }));
    });
  };

  // All'avvio in modalità online (o al passaggio a online), connetti il socket.
  useEffect(() => {
    if (mode === 'online' && session) connectOnline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, session]);

  // Pulizia: chiude controller e socket quando la schermata sparisce.
  useEffect(() => {
    return () => {
      controllerRef.current?.dispose();
      socketRef.current?.disconnect();
    };
  }, []);

  // Lista partite pubbliche: solo online, prima di entrare in una lobby.
  useEffect(() => {
    if (mode !== 'online' || lobby) return;
    let alive = true;
    const refresh = () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('lobby:list', (rooms) => alive && setPublicRooms(rooms));
      }
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [mode, lobby, busy]);

  // Sincronizza le regole locali dalla config della lobby quando entri/cambi lobby.
  useEffect(() => {
    if (!lobby) return;
    setTimerRaw(lobby.config.turnTimerSec > 0 ? String(lobby.config.turnTimerSec) : '');
    setIsPublic(lobby.config.isPublic);
    setSeed(lobby.config.seed ?? '');
    setTargetPG(lobby.config.targetGloryPoints);
    setAvoid68(lobby.config.avoidAdjacent68);
    setCalamities(lobby.config.calamities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby?.code]);

  // --- Sincronizzazione config online ---
  const patch = (change: Partial<LobbyConfig>) => {
    if (!lobby) return;
    const next: LobbyConfig = {
      avoidAdjacent68: change.avoidAdjacent68 ?? avoid68,
      targetGloryPoints: change.targetGloryPoints ?? targetPG,
      turnTimerSec: change.turnTimerSec ?? timerSec,
      isPublic: change.isPublic ?? isPublic,
      calamities: change.calamities ?? calamities,
      ...((change.seed ?? seed).trim() ? { seed: (change.seed ?? seed).trim() } : {}),
    };
    socketRef.current?.emit('lobby:updateConfig', next, (res) => {
      if (isApiError(res)) return showError(res.error);
      setLobby(res);
    });
  };

  const configFromRules = (): LobbyConfig => ({
    avoidAdjacent68: avoid68,
    targetGloryPoints: targetPG,
    turnTimerSec: timerSec,
    isPublic,
    calamities,
    ...(seed.trim() ? { seed: seed.trim() } : {}),
  });

  // --- Azioni online ---
  const createLobby = () => {
    socketRef.current?.emit('lobby:create', configFromRules(), (res) => {
      if (isApiError(res)) return showError(res.error);
      setLobby(res);
    });
  };
  const joinLobby = (code: string) => {
    socketRef.current?.emit('lobby:join', code, (res) => {
      if (isApiError(res)) return showError(res.error);
      setLobby(res);
      if (res.started) ensureController();
    });
  };
  const leaveLobby = () => {
    socketRef.current?.emit('lobby:leave');
    controllerRef.current?.dispose();
    controllerRef.current = null;
    setLobby(null);
    setStage('setup');
  };

  // --- Azioni locali ---
  const humanCount = seats.filter((s) => !s.isBot).length;

  const updateSeat = (i: number, patchSeat: Partial<LocalSeat>) =>
    setSeats(seats.map((s, idx) => (idx === i ? { ...s, ...patchSeat } : s)));

  const addLocalSeat = () => {
    if (seats.length >= MAX_PLAYERS) return;
    const name = BOT_NAMES.find((n) => !seats.some((s) => s.name === n)) ?? 'Ragnhild';
    const color =
      FREE_PALETTE.find((c) => !seats.some((s) => s.color === c)) ??
      FREE_PALETTE[seats.length % FREE_PALETTE.length]!;
    setSeats([...seats, { name, isBot: true, botLevel: 'normale', color }]);
  };

  const removeLocalSeat = (i: number) => {
    if (seats.length <= 2) return;
    setSeats(seats.filter((_, idx) => idx !== i));
    setEditSeat(null);
  };

  /** Sceglie un colore per il posto i, scambiandolo se già in uso (mai duplicati). */
  const pickLocalColor = (i: number, color: PlayerColor) => {
    const mine = seats[i]!.color;
    setSeats(
      seats.map((s, idx) => {
        if (idx === i) return { ...s, color };
        if (s.color === color) return { ...s, color: mine };
        return s;
      })
    );
  };

  const startLocal = async () => {
    if (startingLocal) return;
    setStartingLocal(true);
    // I cosmetici dell'account SOVRASCRIVONO sempre quelli locali: se sei
    // loggato usiamo l'inventario FRESCO dal server (così le modifiche appena
    // fatte si vedono subito), con ripiego sul dispositivo se irraggiungibile.
    let cosmetics: PlayerCosmetics;
    if (session) {
      cosmetics = await apiGetCosmetics(session).catch(() => getLocalCosmetics());
    } else {
      cosmetics = getLocalCosmetics();
    }
    const hasCosmetics = Object.keys(cosmetics).length > 0;
    onStartLocal({
      seed: seed.trim() || `vikiland-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      players: seats.map((s, i) => ({
        name: s.name.trim() || `Vichingo ${i + 1}`,
        color: s.color,
        isBot: s.isBot,
        botLevel: s.botLevel,
        ...(!s.isBot && hasCosmetics ? { cosmetics } : {}),
      })),
      avoidAdjacent68: avoid68,
      targetGloryPoints: targetPG,
      calamities,
    });
  };

  // === Partita online in corso: la stessa GameScreen del locale, col ☰ gestione ===
  if (mode === 'online' && stage === 'game') {
    const controller = controllerRef.current;
    if (!controller?.ready) return null;
    const manage: ManageInfo = {
      online: true,
      code: lobby?.code ?? null,
      isHost: lobby?.hostUserId === session?.userId,
      players: (lobby?.slots ?? []).map((s) => ({
        name: s.name,
        isBot: s.isBot,
        color: s.color,
        connected: s.connected,
        isHost: s.userId === lobby?.hostUserId,
      })),
      onLeave: leaveLobby,
      onTerminate:
        lobby?.hostUserId === session?.userId
          ? () => socketRef.current?.emit('lobby:terminate')
          : null,
    };
    return (
      <GameScreen
        key={gameKey}
        makeController={() => controller}
        onExit={leaveLobby}
        onRematch={null}
        manage={manage}
      />
    );
  }

  // === Impostazione partita (setup unico locale/online) ===
  const bumpTarget = (delta: number) => {
    const next = Math.max(5, Math.min(20, targetPG + delta));
    setTargetPG(next);
    if (mode === 'online') patch({ targetGloryPoints: next });
  };

  // «Classica» finché tutto è ai valori di default; altrimenti «Su misura».
  const rulesAreClassic =
    targetPG === DEFAULT_TARGET_GLORY &&
    !calamities &&
    avoid68 &&
    !seed.trim() &&
    (mode === 'locale' || (timerSec === 0 && !isPublic));

  // Passa all'online: senza account resta in vista, mostrando il pannello
  // «serve un account» con il pulsante Accedi (che porta all'entrata).
  const goOnline = () => setMode('online');

  const canRecolorSlot = (slot: LobbyState['slots'][number]) =>
    slot.userId === session?.userId || (isHost && slot.isBot);

  return (
    <div className="screen newgame">
      {/* Header: back + titolo */}
      <div className="newgame-head">
        <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={onBack} aria-label={it.indietro}>
          ◂
        </button>
        <h2 className="newgame-title">{it.nuovaPartita}</h2>
        <span style={{ width: 32 }} />
      </div>

      {/* Segmento modalità */}
      <div className="mode-seg" role="tablist">
        <button
          className={`mode-seg__btn ${mode === 'locale' ? 'mode-seg__btn--on' : ''}`}
          role="tab"
          aria-selected={mode === 'locale'}
          onClick={() => setMode('locale')}
        >
          {it.stessoDevice}
        </button>
        <button
          className={`mode-seg__btn ${mode === 'online' ? 'mode-seg__btn--on' : ''}`}
          role="tab"
          aria-selected={mode === 'online'}
          onClick={goOnline}
        >
          {it.multigiocatore}
        </button>
      </div>
      <p className="newgame-hint">
        {mode === 'locale' ? it.nuovaPartitaHintLocale : it.nuovaPartitaHintOnline}
      </p>

      {mode === 'online' && !session && (
        <div className="pixel-frame newgame-need-account">
          <div>{it.serveAccountOnline}</div>
          <button className="pxbtn pxbtn--small" onClick={onNeedAccount}>
            {it.accedi}
          </button>
        </div>
      )}

      {mode === 'online' && busy && (
        <div className="menu-sub">{it.connessioneInCorso}</div>
      )}

      {/* ---- Corpo LOCALE ---- */}
      {mode === 'locale' && (
        <div className="newgame-body">
          <div className="seat-list pixel-frame">
            {seats.map((s, i) => {
              const tag = s.isBot
                ? `${it.bot} · ${botLevelLabel(s.botLevel)}`
                : i === 0
                  ? it.ruoloTu
                  : it.ruoloAmico;
              return (
                <div key={i}>
                  <button
                    className={`seat-row ${editSeat === i ? 'seat-row--open' : ''}`}
                    onClick={() => setEditSeat(editSeat === i ? null : i)}
                  >
                    <span className="seat-chip" style={{ background: shadesFor(s.color).main }} />
                    <span className="seat-name">{s.name}</span>
                    <span className="seat-tag">{tag}</span>
                  </button>
                  {editSeat === i && (
                    <div className="seat-editor">
                      <div className="seat-editor-row">
                        <input
                          type="text"
                          value={s.name}
                          maxLength={12}
                          onChange={(e) => updateSeat(i, { name: e.target.value })}
                        />
                        <button
                          className="pxbtn pxbtn--ghost pxbtn--small"
                          onClick={() => updateSeat(i, { isBot: !s.isBot })}
                        >
                          {s.isBot ? it.bot : it.umano}
                        </button>
                        {s.isBot && (
                          <select
                            value={s.botLevel}
                            onChange={(e) => updateSeat(i, { botLevel: e.target.value as BotLevel })}
                          >
                            <option value="facile">{it.facile}</option>
                            <option value="normale">{it.normale}</option>
                            <option value="difficile">{it.difficile}</option>
                            <option value="esperto">{it.esperto}</option>
                          </select>
                        )}
                        {seats.length > 2 && (
                          <button
                            className="pxbtn pxbtn--danger pxbtn--small"
                            onClick={() => removeLocalSeat(i)}
                            aria-label={it.rimuovi}
                          >
                            X
                          </button>
                        )}
                      </div>
                      <div className="color-picker">
                        {FREE_PALETTE.map((c) => {
                          const owner = seats.findIndex((q, qi) => qi !== i && q.color === c);
                          return (
                            <button
                              key={c}
                              className={`color-swatch ${s.color === c ? 'color-swatch--active' : ''}`}
                              style={{ background: shadesFor(c).main }}
                              title={owner >= 0 ? t(it.scambiaColoreCon, { nome: seats[owner]!.name }) : c}
                              onClick={() => pickLocalColor(i, c)}
                            >
                              {owner >= 0 ? seats[owner]!.name.charAt(0).toUpperCase() : ''}
                            </button>
                          );
                        })}
                        <label className="color-swatch color-swatch--custom" title={it.coloreCustom}>
                          <input
                            type="color"
                            value={shadesFor(s.color).main}
                            onChange={(e) => pickLocalColor(i, e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {seats.length < MAX_PLAYERS && (
              <button className="seat-row seat-row--add" onClick={addLocalSeat}>
                {it.aggiungiPosto}
              </button>
            )}
          </div>

          <RulesPreset
            online={false}
            editable
            open={rulesOpen}
            onToggle={() => setRulesOpen(!rulesOpen)}
            classic={rulesAreClassic}
            targetPG={targetPG}
            bumpTarget={bumpTarget}
            calamities={calamities}
            setCalamities={(v) => setCalamities(v)}
            avoid68={avoid68}
            setAvoid68={(v) => setAvoid68(v)}
            seed={seed}
            setSeed={(v) => setSeed(v)}
            moreOpen={moreOpen}
            setMoreOpen={setMoreOpen}
            timerRaw={timerRaw}
            setTimerRaw={setTimerRaw}
            commitTimer={() => {}}
            isPublic={isPublic}
            setIsPublic={() => {}}
          />

          <button
            className="pxbtn newgame-start"
            onClick={() => void startLocal()}
            disabled={humanCount === 0 || startingLocal}
          >
            ▶ {it.avvia}
          </button>
          {humanCount === 0 && (
            <span style={{ fontSize: 9, color: 'var(--danger)' }}>{it.serveUnUmano}</span>
          )}
        </div>
      )}

      {/* ---- Corpo ONLINE ---- */}
      {mode === 'online' && session && !busy && (
        <div className="newgame-body">
          {/* Codice invito (solo dentro una lobby) */}
          {lobby && <InviteCard code={lobby.code} />}

          {/* Prima di una lobby: crea / unisciti / pubbliche */}
          {!lobby && (
            <div className="pixel-frame newgame-join">
              <button className="pxbtn" onClick={createLobby}>
                {it.creaPartita}
              </button>
              <div className="newgame-or">— {it.unisciti} —</div>
              <div className="setup-player" style={{ justifyContent: 'center' }}>
                <input
                  type="text"
                  placeholder={it.codiceInvito}
                  value={joinCode}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', width: 120 }}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <button
                  className="pxbtn pxbtn--small"
                  onClick={() => joinLobby(joinCode)}
                  disabled={joinCode.trim().length < 6}
                >
                  {it.entra}
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
                        {room.turnTimerSec > 0 ? ` · ⏳${t(it.secondiAbbr, { n: room.turnTimerSec })}` : ''}
                      </span>
                    </span>
                    <button className="pxbtn pxbtn--small" onClick={() => joinLobby(room.code)}>
                      {it.entra}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Dentro una lobby: lista posti dai giocatori/bot del server */}
          {lobby && (
            <div className="seat-list pixel-frame">
              {lobby.slots.map((slot, i) => {
                const tag = slot.isBot
                  ? it.bot
                  : slot.userId === session.userId
                    ? it.ruoloTu
                    : it.ruoloAmico;
                return (
                  <div key={i}>
                    <div className={`seat-row seat-row--static ${pickerOnline === i ? 'seat-row--open' : ''}`}>
                      {canRecolorSlot(slot) ? (
                        <button
                          className="seat-chip seat-chip--btn"
                          style={{ background: shadesFor(slot.color).main }}
                          onClick={() => setPickerOnline(pickerOnline === i ? null : i)}
                          aria-label={it.cambiaColore}
                        />
                      ) : (
                        <span className="seat-chip" style={{ background: shadesFor(slot.color).main }} />
                      )}
                      <span className="seat-name">
                        {slot.name}
                        {slot.userId === lobby.hostUserId && (
                          <span style={{ color: 'var(--accent)' }}> ({it.hostTag})</span>
                        )}
                        {!slot.isBot && !slot.connected && (
                          <span style={{ color: 'var(--danger)' }}> ({it.disconnessoTag})</span>
                        )}
                      </span>
                      <span className="seat-tag">{tag}</span>
                      {isHost && slot.userId !== session.userId && (
                        <button
                          className="pxbtn pxbtn--danger pxbtn--small"
                          onClick={() => socketRef.current?.emit('lobby:removeSlot', i)}
                          aria-label={it.rimuovi}
                        >
                          X
                        </button>
                      )}
                    </div>
                    {pickerOnline === i && canRecolorSlot(slot) && (
                      <div className="seat-editor">
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
                                  socketRef.current?.emit('lobby:setColor', i, c);
                                  setPickerOnline(null);
                                }}
                              >
                                {owner >= 0 ? lobby.slots[owner]!.name.charAt(0).toUpperCase() : ''}
                              </button>
                            );
                          })}
                          <label className="color-swatch color-swatch--custom" title={it.coloreCustom}>
                            <input
                              type="color"
                              value={shadesFor(slot.color).main}
                              onChange={(e) => {
                                socketRef.current?.emit('lobby:setColor', i, e.target.value);
                                setPickerOnline(null);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {isHost && lobby.slots.length < MAX_PLAYERS && (
                <button className="seat-row seat-row--add" onClick={() => setAddBotOpen(true)}>
                  {it.aggiungiBotPosto}
                </button>
              )}
              {error && <div style={{ fontSize: 9, color: 'var(--danger)' }}>{error}</div>}
              {!isHost && <div style={{ fontSize: 9, color: 'var(--ink-dim)' }}>{it.inAttesaHost}</div>}
            </div>
          )}

          <RulesPreset
            online
            editable={editable}
            open={rulesOpen}
            onToggle={() => setRulesOpen(!rulesOpen)}
            classic={rulesAreClassic}
            targetPG={targetPG}
            bumpTarget={bumpTarget}
            calamities={calamities}
            setCalamities={(v) => {
              setCalamities(v);
              patch({ calamities: v });
            }}
            avoid68={avoid68}
            setAvoid68={(v) => {
              setAvoid68(v);
              patch({ avoidAdjacent68: v });
            }}
            seed={seed}
            setSeed={setSeed}
            commitSeed={() => patch({ seed: seed.trim() })}
            moreOpen={moreOpen}
            setMoreOpen={setMoreOpen}
            timerRaw={timerRaw}
            setTimerRaw={setTimerRaw}
            commitTimer={() => patch({ turnTimerSec: timerSec })}
            isPublic={isPublic}
            setIsPublic={(v) => {
              setIsPublic(v);
              patch({ isPublic: v });
            }}
          />

          {/* Azioni online */}
          {lobby ? (
            <div className="newgame-actions">
              <button className="pxbtn pxbtn--ghost" onClick={leaveLobby}>
                {it.esciLobby}
              </button>
              {isHost && (
                <button
                  className="pxbtn newgame-start"
                  onClick={() => socketRef.current?.emit('lobby:start')}
                  disabled={lobby.slots.length < 2}
                >
                  ▶ {it.avviaPartita}
                </button>
              )}
            </div>
          ) : (
            <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => setTutorialOpen(true)}>
              {it.comeFunzionaOnline}
            </button>
          )}
        </div>
      )}

      {addBotOpen && (
        <AddBotDialog
          onAdd={(level) => {
            socketRef.current?.emit('lobby:addBot', level);
            setAddBotOpen(false);
          }}
          onCancel={() => setAddBotOpen(false)}
        />
      )}
      {tutorialOpen && (
        <TutorialScreen
          initialChapter={TUTORIAL_ONLINE_CHAPTER}
          onClose={() => setTutorialOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function InviteCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="invite-card">
      <span className="invite-label">{it.codiceInvito}</span>
      <span className="invite-code">{code}</span>
      <button className="pxbtn pxbtn--small" onClick={copy}>
        {copied ? it.copiato : it.copia}
      </button>
    </div>
  );
}

interface RulesPresetProps {
  online: boolean;
  editable: boolean;
  open: boolean;
  onToggle: () => void;
  classic: boolean;
  targetPG: number;
  bumpTarget: (delta: number) => void;
  calamities: boolean;
  setCalamities: (v: boolean) => void;
  avoid68: boolean;
  setAvoid68: (v: boolean) => void;
  seed: string;
  setSeed: (v: string) => void;
  commitSeed?: () => void;
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
  timerRaw: string;
  setTimerRaw: (v: string) => void;
  commitTimer: () => void;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
}

/** Preset regole richiudibile: PG, calamità, (online) timer, e «Altro». */
function RulesPreset(p: RulesPresetProps) {
  return (
    <div className="rules-preset pixel-frame">
      <button className="rules-head" onClick={p.onToggle} aria-expanded={p.open}>
        <span>
          {it.regoleEtichetta}:{' '}
          <b style={{ color: 'var(--accent)' }}>
            {p.classic ? it.regoleClassica : it.regolePersonalizzate}
          </b>
        </span>
        <span className="rules-edit">
          {it.modificaRegole} {p.open ? '▾' : '▸'}
        </span>
      </button>
      {p.open && (
        <div className="rules-body">
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
                onClick={() => p.bumpTarget(-1)}
                disabled={!p.editable || p.targetPG <= 5}
              >
                -
              </button>
              <span
                style={{
                  minWidth: 26,
                  textAlign: 'center',
                  color: p.targetPG === DEFAULT_TARGET_GLORY ? 'inherit' : 'var(--accent)',
                }}
              >
                {p.targetPG}
              </span>
              <button
                className="pxbtn pxbtn--ghost pxbtn--small"
                onClick={() => p.bumpTarget(+1)}
                disabled={!p.editable || p.targetPG >= 20}
              >
                +
              </button>
            </span>
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={p.calamities}
              disabled={!p.editable}
              onChange={(e) => p.setCalamities(e.target.checked)}
            />
            ⚡ {it.calamita.conCalamita}
          </label>
          {p.calamities && (
            <div style={{ fontSize: 8, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
              {it.calamita.spiega}
            </div>
          )}

          {p.online && (
            <div className="stepper-row">
              <span style={{ fontSize: 9 }}>{it.timerTurno}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={600}
                  step={5}
                  placeholder="0"
                  value={p.timerRaw}
                  disabled={!p.editable}
                  onChange={(e) => p.setTimerRaw(e.target.value)}
                  onBlur={p.commitTimer}
                  style={{ width: 70 }}
                />
                <span style={{ fontSize: 8, color: 'var(--ink-dim)' }}>{it.secondiAbbr.replace('{n}', '')}</span>
              </span>
            </div>
          )}

          <button
            className="pxbtn pxbtn--ghost pxbtn--small"
            onClick={() => p.setMoreOpen(!p.moreOpen)}
            aria-expanded={p.moreOpen}
          >
            {p.moreOpen ? '▾' : '▸'} {it.altreRegole}
          </button>
          {p.moreOpen && (
            <div className="config-section">
              <input
                type="text"
                placeholder={it.seedOpzionale}
                value={p.seed}
                disabled={!p.editable}
                onChange={(e) => p.setSeed(e.target.value)}
                onBlur={p.commitSeed}
                style={{ width: '100%' }}
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={p.avoid68}
                  disabled={!p.editable}
                  onChange={(e) => p.setAvoid68(e.target.checked)}
                />
                {it.evita68}
              </label>
              {p.online && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={p.isPublic}
                    disabled={!p.editable}
                    onChange={(e) => p.setIsPublic(e.target.checked)}
                  />
                  {it.partitaPubblicaToggle}
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
