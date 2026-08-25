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
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DEFAULT_TARGET_GLORY,
  MAX_CUSTOM_HEXES,
  MAX_PLAYERS,
  MIN_CUSTOM_HEXES,
  defaultDesertCount,
  maxDesertCount,
  resolveBoardSpec,
  ALL_HEROES,
  unlockedHeroIds,
  heroDef,
  type BoardShapeChoice,
  type BoardSizeChoice,
  type BotLevel,
  type HeroId,
  type PlayerColor,
  type PlayerCosmetics,
  type PlayerProgression,
} from '@vikiland/engine';
import type {
  LobbyConfig,
  LobbyState,
  PublicLobbySummary,
  WatchableGameSummary,
} from '@vikiland/server/protocol';
import { isApiError } from '@vikiland/server/protocol';
import { it, t } from '../i18n';
import type { GameSetup } from '../game/LocalGameController';
import { getLocalCosmetics } from '../game/localCosmetics';
import { teamLabelShort } from '../game/teamLabel';
import { useCensor } from '../game/censor';
import { apiGetCosmetics, connectSocket, type OnlineSession, type ServerSocket } from '../online/connection';
import { RemoteGameController } from '../online/RemoteGameController';
import { useChat } from '../online/useChat';
import { ChatPanel } from '../components/ChatPanel';
import { FREE_PALETTE, shadesFor } from '../render/sprites/palettes';
import { TUTORIAL_ONLINE_CHAPTER } from '../i18n/tutorial';
import { AddBotDialog } from '../components/dialogs/AddBotDialog';
import { HeroPicker } from '../components/HeroPicker';
import { HeroArt } from '../components/HeroArt';
import type { ManageInfo } from '../components/ManageSheet';
import { GameScreen } from './GameScreen';
import { TutorialScreen } from './TutorialScreen';

const BOT_NAMES = ['Astrid', 'Leif', 'Sigrid', 'Ragnhild', 'Olaf', 'Freya'];

/** Numero massimo di eroi per clan (l'intera raccolta): niente doppioni. */
const MAX_HEROES = ALL_HEROES.length;
/** Preset del «numero di eroi» offerti come scorciatoie. */
const HERO_COUNT_PRESETS = [1, 3, 5, 7];

/** Colori di default delle squadre (fino a 4 squadre). */
const TEAM_PALETTE = ['#8e44ad', '#e67e22', '#16a085', '#34495e'];
/** Lettera identificativa di una squadra (A, B, C, …). */
const teamLetter = (t: number) => String.fromCharCode(65 + t);

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
  /** Progressione: quali eroi sono sbloccati (scelta eroe bloccata/consentita). */
  progression: PlayerProgression;
  /** Fine partita al 100%: assegna la cassa (inoltrata alla GameScreen online). */
  onGameComplete: () => void;
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

/** Tavola CONSIGLIATA dal solo numero di giocatori: 5–6 grande, 7–8 gigante, altrimenti piccola. */
const autoBoardSize = (count: number): BoardSizeChoice | null =>
  count >= 7 ? 'gigante' : count >= 5 ? 'grande' : null;

/** Interi arrotondati e limitati a [min, max] (con fallback al minimo se non numerico). */
const clampInt = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? Math.round(n) : min));

/** Numero di caselle del «campo libero» dal testo digitato (o `fallback` se vuoto). */
const computeHexCount = (on: boolean, raw: string, fallback: number): number | undefined =>
  on ? clampInt(parseInt(raw, 10) || fallback, MIN_CUSTOM_HEXES, MAX_CUSTOM_HEXES) : undefined;

/** Deserti dal testo digitato (o il default della taglia se vuoto), limitati a [1, caselle-1]. */
const computeDesertCount = (raw: string, total: number): number => {
  const def = defaultDesertCount(total);
  const n = raw.trim() ? parseInt(raw, 10) || def : def;
  return clampInt(n, 1, maxDesertCount(total));
};

/** Intestazione di categoria dentro il pannello regole. */
const CAT_STYLE: CSSProperties = {
  fontSize: 9,
  color: 'var(--accent)',
  marginTop: 8,
  textTransform: 'uppercase',
  letterSpacing: 1,
};
/** Nota esplicativa sotto un check. */
const NOTE_STYLE: CSSProperties = { fontSize: 8, color: 'var(--ink-dim)', lineHeight: 1.5 };

export function NewGameScreen({
  session,
  progression,
  onGameComplete,
  initialMode,
  onBack,
  onStartLocal,
  onInvalidSession,
  onNeedAccount,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);

  // --- Regole (condivise fra i due flussi; l'online le sincronizza col server) ---
  const { censor } = useCensor();
  const [targetPG, setTargetPG] = useState(DEFAULT_TARGET_GLORY);
  const [calamities, setCalamities] = useState(false);
  const [battle, setBattle] = useState(false);
  const [capitale, setCapitale] = useState(false);
  // Modalità Eroi: eroi scelti per ogni posto (uno o più, tutti distinti).
  const [heroesMode, setHeroesMode] = useState(false);
  const [seatHeroes, setSeatHeroes] = useState<HeroId[][]>([[], [], []]);
  const [heroPickerSeat, setHeroPickerSeat] = useState<number | null>(null);
  // «Numero di eroi» per clan: preset 3/5/7 oppure «libero» (numero a mano).
  const [heroesCount, setHeroesCount] = useState(1);
  const [heroesLibero, setHeroesLibero] = useState(false);
  const heroesPerPlayer = Math.max(1, Math.min(MAX_HEROES, Math.floor(heroesCount) || 1));
  const [avoid68, setAvoid68] = useState(true);
  const [seed, setSeed] = useState('');
  const [timerRaw, setTimerRaw] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  // Tavola grande scelta: null = consigliata dal numero di giocatori (piccola
  // per 2–4). `boardSizeTouched` blocca la prevalorizzazione automatica una
  // volta che l'utente sceglie a mano.
  const [boardSize, setBoardSize] = useState<BoardSizeChoice | null>(null);
  const [boardSizeTouched, setBoardSizeTouched] = useState(false);
  // Forma della tavola: null = esagono classico; 'rientranze' = isola con golfi.
  const [boardShape, setBoardShape] = useState<BoardShapeChoice | null>(null);
  // Campo libero: numero di caselle scelto a mano (vince su taglia/forma preset).
  const [liberoOn, setLiberoOn] = useState(false);
  const [caselleRaw, setCaselleRaw] = useState('');
  // Deserti (tundra) scelti a mano; vuoto = default della taglia (prevalorizzato).
  const [desertiRaw, setDesertiRaw] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
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

  // --- Modalità Squadra (locale + online) ---
  const [teamMode, setTeamMode] = useState(false);
  const [numTeams, setNumTeams] = useState(2);
  const [seatTeams, setSeatTeams] = useState<number[]>([0, 1, 0]);
  const [teamsTouched, setTeamsTouched] = useState(false);
  const [teamColors, setTeamColors] = useState<string[]>([...TEAM_PALETTE]);
  const [teamNames, setTeamNames] = useState<string[]>(['', '', '', '']);
  const [teamTarget, setTeamTarget] = useState(8);

  // Assegnazione LOCALE di default a rotazione (squadre bilanciate) finché
  // l'utente non ritocca a mano; un cambio del numero di squadre ribilancia.
  useEffect(() => {
    if (!teamsTouched) setSeatTeams(seats.map((_, i) => i % numTeams));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats.length, numTeams, teamsTouched]);

  // Insieme degli eroi utilizzabili nella prevalorizzazione: quelli SBLOCCATI
  // (se nessuno è sbloccato, ripiego sull'intera raccolta per non lasciare i
  // posti vuoti nei contesti senza progressione).
  const heroPool = (): HeroId[] => {
    const unlocked = unlockedHeroIds(progression);
    return unlocked.length ? unlocked : ALL_HEROES.map((h) => h.id);
  };
  /** `n` eroi casuali DISTINTI presi dal pool disponibile. */
  const randomHeroesList = (n: number): HeroId[] => {
    const pool = [...heroPool()];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, Math.max(0, Math.min(pool.length, n)));
  };
  /** Porta una lista di eroi a `n` distinti: tiene i validi e completa a caso. */
  const fillHeroesList = (current: readonly HeroId[], n: number): HeroId[] => {
    const pool = heroPool();
    const out = current.filter((h, i) => pool.includes(h) && current.indexOf(h) === i).slice(0, n);
    if (out.length < n) {
      for (const id of randomHeroesList(pool.length)) {
        if (out.length >= n) break;
        if (!out.includes(id)) out.push(id);
      }
    }
    return out;
  };

  // Modalità Eroi: mantiene gli eroi allineati ai posti e al «numero di eroi»
  // (i posti ricevono eroi casuali distinti quando la modalità è attiva).
  useEffect(() => {
    setSeatHeroes((prev) =>
      seats.map((_, i) => (heroesMode ? fillHeroesList(prev[i] ?? [], heroesPerPlayer) : []))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats.length, heroesMode, heroesPerPlayer]);

  /** Attiva/disattiva la modalità Eroi, prevalorizzando gli eroi dei posti. */
  const applyHeroesMode = (v: boolean) => {
    setHeroesMode(v);
    if (v) setSeatHeroes((prev) => seats.map((_, i) => fillHeroesList(prev[i] ?? [], heroesPerPlayer)));
  };
  const setSeatHeroList = (i: number, heroes: HeroId[]) =>
    setSeatHeroes((prev) => prev.map((h, idx) => (idx === i ? heroes : h)));

  /** Cambia il «numero di eroi» per clan (preset o libero); in online lo propaga. */
  const applyHeroesCount = (n: number) => {
    const capped = Math.max(1, Math.min(MAX_HEROES, Math.floor(n) || 1));
    setHeroesCount(capped);
    if (mode === 'online') patch({ heroes: true, heroesPerPlayer: capped });
  };
  /** Sceglie un preset (3/5/7) del numero di eroi. */
  const pickHeroesPreset = (n: number) => {
    setHeroesLibero(false);
    applyHeroesCount(n);
  };

  // --- Online: socket, lobby, partita ---
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [stage, setStage] = useState<'setup' | 'game'>('setup');
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicLobbySummary[]>([]);
  const [watchableRooms, setWatchableRooms] = useState<WatchableGameSummary[]>([]);
  // true = si è entrati come SPETTATORE (guarda partita), non come giocatore.
  const [spectating, setSpectating] = useState(false);
  const [pickerOnline, setPickerOnline] = useState<number | null>(null);
  const [addBotOpen, setAddBotOpen] = useState(false);
  const socketRef = useRef<ServerSocket | null>(null);
  const controllerRef = useRef<RemoteGameController | null>(null);
  const connectedOnce = useRef(false);
  const [gameKey, setGameKey] = useState(0);
  // Chat online: la cronologia vive qui, così sopravvive al passaggio lobby→partita.
  const chat = useChat(socketRef.current);

  const isHost = lobby === null || lobby.hostUserId === session?.userId;
  const editable = isHost && (lobby === null || !lobby.started);

  // Numero di giocatori corrente: posti locali (hot-seat) o slot della lobby online.
  const playerCount = mode === 'online' ? (lobby?.slots.length ?? seats.length) : seats.length;

  // --- Campo personalizzabile: valori derivati (caselle e deserti) ---
  // Caselle della taglia preset corrente (piccola 19 / grande 30 / gigante 37):
  // è il fallback del «campo libero» e la base per il default dei deserti.
  const presetTotal = resolveBoardSpec(playerCount, boardSize ?? undefined).terrainPool.length;
  const hexCountVal = computeHexCount(liberoOn, caselleRaw, presetTotal);
  const effectiveTotal = hexCountVal ?? presetTotal;
  const defaultDeserts = defaultDesertCount(effectiveTotal);
  const maxDeserts = maxDesertCount(effectiveTotal);
  // Valore mostrato nel campo Deserti: il default della taglia se non digitato.
  const desertiShown = desertiRaw !== '' ? desertiRaw : String(defaultDeserts);
  const desertCountVal = computeDesertCount(desertiShown, effectiveTotal);
  // Si trasmette il numero di deserti SOLO se diverso dal default (altrimenti
  // resta il comportamento classico, byte-per-byte identico per lo stesso seme).
  const desertCountSend = desertCountVal !== defaultDeserts ? desertCountVal : undefined;

  // --- Modalità Squadra: valori derivati (validi sia in locale sia online) ---
  // In online l'assegnazione dei posti alle squadre è autorevole lato server
  // (`lobby.slots[].team`); in locale è lo stato `seatTeams`.
  const teamCtxCount = mode === 'online' && lobby ? lobby.slots.length : seats.length;
  const teamCtxAssign =
    mode === 'online' && lobby ? lobby.slots.map((s) => s.team ?? 0) : seatTeams;
  const validTeamCounts = Array.from({ length: teamCtxCount }, (_, i) => i + 1).filter(
    (n) => n >= 2 && teamCtxCount % n === 0
  );
  const teamSizeVal = Math.floor(teamCtxCount / numTeams);
  const teamSizes = Array.from({ length: numTeams }, (_, t) => teamCtxAssign.filter((x) => x === t).length);
  const teamsBalanced =
    teamCtxCount > 0 &&
    teamCtxCount % numTeams === 0 &&
    teamSizes.every((s) => s === teamSizes[0]) &&
    teamSizes.every((s) => s >= 1);
  // Assegnazione LOCALE di un posto a una squadra (l'online usa `lobby:setTeam`).
  const pickSeatTeam = (i: number, t: number) => {
    setTeamsTouched(true);
    setSeatTeams((prev) => prev.map((v, idx) => (idx === i ? t : v)));
  };

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
        socketRef.current.emit('lobby:listWatchable', (games) => alive && setWatchableRooms(games));
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
    setBattle(lobby.config.battle);
    setCapitale(lobby.config.capitale);
    setHeroesMode(lobby.config.heroes ?? false);
    // «Numero di eroi»: settaggio autorevole dell'host (default 1).
    {
      const n = lobby.config.heroesPerPlayer ?? 1;
      setHeroesCount(n);
      setHeroesLibero(!HERO_COUNT_PRESETS.includes(n));
    }
    // La scelta esplicita dell'host vince; se assente, la prevalorizzazione
    // automatica resta attiva (boardSizeTouched = false).
    setBoardSize(lobby.config.boardSize ?? autoBoardSize(lobby.slots.length));
    setBoardSizeTouched(lobby.config.boardSize != null);
    setBoardShape(lobby.config.boardShape ?? null);
    // Campo libero e deserti: settaggi autorevoli dell'host.
    setLiberoOn(lobby.config.hexCount != null);
    setCaselleRaw(lobby.config.hexCount != null ? String(lobby.config.hexCount) : '');
    setDesertiRaw(lobby.config.desertCount != null ? String(lobby.config.desertCount) : '');
    // Modalità squadra: settaggi autorevoli dell'host.
    setTeamMode(lobby.config.teamMode ?? false);
    setNumTeams(lobby.config.numTeams ?? 2);
    setTeamTarget(lobby.config.teamTargetPerPlayer ?? 8);
    if (lobby.config.teamColors) {
      setTeamColors((prev) => {
        const next = [...prev];
        lobby.config.teamColors!.forEach((c, i) => {
          next[i] = c;
        });
        return next;
      });
    }
    if (lobby.config.teamNames) {
      setTeamNames((prev) => {
        const next = [...prev];
        lobby.config.teamNames!.forEach((nm, i) => {
          next[i] = nm;
        });
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby?.code]);

  // Prevalorizzazione intelligente della tavola: finché l'utente non sceglie a
  // mano (boardSizeTouched), la dimensione segue il numero di giocatori.
  useEffect(() => {
    if (!boardSizeTouched) setBoardSize(autoBoardSize(playerCount));
  }, [playerCount, boardSizeTouched]);

  // --- Sincronizzazione config online ---
  // La dimensione tavola non è in `change` (può valere null = piccola): si passa
  // a parte, con ripiego sullo stato corrente per gli altri patch.
  const patch = (
    change: Partial<LobbyConfig>,
    boardSizeVal: BoardSizeChoice | null = boardSize,
    boardShapeVal: BoardShapeChoice | null = boardShape,
    hexCountV: number | undefined = hexCountVal,
    desertCountV: number | undefined = desertCountSend
  ) => {
    if (!lobby) return;
    const next: LobbyConfig = {
      avoidAdjacent68: change.avoidAdjacent68 ?? avoid68,
      targetGloryPoints: change.targetGloryPoints ?? targetPG,
      turnTimerSec: change.turnTimerSec ?? timerSec,
      isPublic: change.isPublic ?? isPublic,
      calamities: change.calamities ?? calamities,
      battle: change.battle ?? battle,
      capitale: change.capitale ?? capitale,
      ...((change.heroes ?? heroesMode)
        ? { heroes: true, heroesPerPlayer: change.heroesPerPlayer ?? heroesPerPlayer }
        : {}),
      ...(boardSizeVal ? { boardSize: boardSizeVal } : {}),
      ...(boardShapeVal ? { boardShape: boardShapeVal } : {}),
      ...(hexCountV != null ? { hexCount: hexCountV } : {}),
      ...(desertCountV != null ? { desertCount: desertCountV } : {}),
      ...((change.seed ?? seed).trim() ? { seed: (change.seed ?? seed).trim() } : {}),
      ...teamConfigPart(change),
    };
    socketRef.current?.emit('lobby:updateConfig', next, (res) => {
      if (isApiError(res)) return showError(res.error);
      setLobby(res);
    });
  };

  // Porzione «squadra» della LobbyConfig, coerente con lo stato corrente (o col
  // patch in arrivo). Assente quando la modalità squadra è spenta.
  const teamConfigPart = (change: Partial<LobbyConfig> = {}): Partial<LobbyConfig> => {
    const tm = change.teamMode ?? teamMode;
    if (!tm) return {};
    const nt = change.numTeams ?? numTeams;
    return {
      teamMode: true,
      numTeams: nt,
      teamColors: (change.teamColors ?? teamColors).slice(0, nt),
      teamNames: (change.teamNames ?? teamNames).slice(0, nt),
      teamTargetPerPlayer: change.teamTargetPerPlayer ?? teamTarget,
    };
  };

  const configFromRules = (): LobbyConfig => ({
    avoidAdjacent68: avoid68,
    targetGloryPoints: targetPG,
    turnTimerSec: timerSec,
    isPublic,
    calamities,
    battle,
    capitale,
    ...(heroesMode ? { heroes: true, heroesPerPlayer } : {}),
    ...(boardSize ? { boardSize } : {}),
    ...(boardShape ? { boardShape } : {}),
    ...(hexCountVal != null ? { hexCount: hexCountVal } : {}),
    ...(desertCountSend != null ? { desertCount: desertCountSend } : {}),
    ...(seed.trim() ? { seed: seed.trim() } : {}),
    ...teamConfigPart(),
  });

  // --- Handler modalità squadra (in online propagano al server via patch) ---
  const isOnline = mode === 'online';
  const applyTeamMode = (v: boolean) => {
    setTeamMode(v);
    if (isOnline) patch({ teamMode: v });
  };
  const applyNumTeams = (n: number) => {
    setNumTeams(n);
    setTeamsTouched(false);
    if (isOnline) patch({ teamMode: true, numTeams: n });
  };
  const applyTeamColor = (t: number, color: string) => {
    const next = teamColors.map((c, idx) => (idx === t ? color : c));
    setTeamColors(next);
    if (isOnline) patch({ teamMode: true, teamColors: next });
  };
  const applyTeamName = (t: number, name: string) => {
    const capped = name.slice(0, 24);
    const next = Array.from({ length: Math.max(teamNames.length, t + 1) }, (_, idx) =>
      idx === t ? capped : teamNames[idx] ?? ''
    );
    setTeamNames(next);
    if (isOnline) patch({ teamMode: true, teamNames: next });
  };
  const applyTeamTarget = (v: number) => {
    setTeamTarget(v);
    if (isOnline) patch({ teamMode: true, teamTargetPerPlayer: v });
  };

  // Blocco «Modalità squadra» reso DENTRO la categoria Modalità del preset regole
  // (accanto a calamità e battaglia). In locale è sempre modificabile; online solo
  // per l'host prima dell'avvio.
  const teamSlot = (
    <TeamSettingsPanel
      teamMode={teamMode}
      editable={isOnline ? editable : true}
      onToggle={applyTeamMode}
      validTeamCounts={validTeamCounts}
      numTeams={numTeams}
      onPickNumTeams={applyNumTeams}
      teamColors={teamColors}
      onSetTeamColor={applyTeamColor}
      teamNames={teamNames}
      onSetTeamName={applyTeamName}
      teamTarget={teamTarget}
      onSetTeamTarget={applyTeamTarget}
      teamSizeVal={teamSizeVal}
      teamsBalanced={teamsBalanced}
    />
  );

  /** Sceglie la tavola grande; nulla scelta = piccola (solo 2–4). A ≥5 resta sempre una grande. */
  const pickBoardSize = (choice: BoardSizeChoice) => {
    setBoardSizeTouched(true);
    const nextVal: BoardSizeChoice | null =
      boardSize === choice ? (playerCount >= 5 ? choice : null) : choice;
    setBoardSize(nextVal);
    if (mode === 'online') patch({}, nextVal);
  };

  /** Attiva/disattiva la forma «con rientranze» (isola casuale con golfi e ponti). */
  const toggleBoardShape = () => {
    const nextVal: BoardShapeChoice | null = boardShape === 'rientranze' ? null : 'rientranze';
    setBoardShape(nextVal);
    if (mode === 'online') patch({}, boardSize, nextVal);
  };

  /** Attiva/disattiva il «campo libero» (numero di caselle scelto a mano). */
  const toggleLibero = () => {
    const nextOn = !liberoOn;
    setLiberoOn(nextOn);
    if (mode === 'online') {
      const nextHex = computeHexCount(nextOn, caselleRaw, presetTotal);
      const total = nextHex ?? presetTotal;
      patch({}, boardSize, boardShape, nextHex, desertSendFor(desertiRaw, total));
    }
  };

  /** Aggiorna il numero di caselle del campo libero (e in online lo propaga). */
  const setCaselle = (v: string) => {
    setCaselleRaw(v);
    if (mode === 'online' && liberoOn) {
      const nextHex = computeHexCount(true, v, presetTotal);
      const total = nextHex ?? presetTotal;
      patch({}, boardSize, boardShape, nextHex, desertSendFor(desertiRaw, total));
    }
  };

  /** Aggiorna il numero di deserti (e in online lo propaga). */
  const setDeserti = (v: string) => {
    setDesertiRaw(v);
    if (mode === 'online') {
      patch({}, boardSize, boardShape, hexCountVal, desertSendFor(v, effectiveTotal));
    }
  };

  /** Numero di deserti da TRASMETTERE dal testo digitato: assente se pari al default. */
  const desertSendFor = (raw: string, total: number): number | undefined => {
    const val = computeDesertCount(raw !== '' ? raw : String(defaultDesertCount(total)), total);
    return val !== defaultDesertCount(total) ? val : undefined;
  };

  // --- Azioni online ---
  const createLobby = () => {
    socketRef.current?.emit('lobby:create', configFromRules(), (res) => {
      if (isApiError(res)) return showError(res.error);
      setLobby(res);
    });
  };
  const joinLobby = (code: string) => {
    socketRef.current?.emit('lobby:join', code, (res) => {
      if (isApiError(res)) {
        // Partita già in corso: con il codice puoi comunque GUARDARLA.
        if (res.error === 'Partita già iniziata') return watchLobby(code);
        return showError(res.error);
      }
      setLobby(res);
      if (res.started) ensureController();
    });
  };
  /** Entra come spettatore in una partita in corso (pubblica o via codice). */
  const watchLobby = (code: string) => {
    socketRef.current?.emit('lobby:watch', code, (res) => {
      if (isApiError(res)) return showError(res.error);
      setSpectating(true);
      setLobby(res.state);
      ensureController();
    });
  };
  const leaveLobby = () => {
    if (spectating) {
      socketRef.current?.emit('lobby:stopWatch');
      setSpectating(false);
    } else {
      socketRef.current?.emit('lobby:leave');
    }
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
      battle,
      capitale,
      ...(heroesMode
        ? {
            heroes: true,
            heroAssignments: seats.map((_, i) => fillHeroesList(seatHeroes[i] ?? [], heroesPerPlayer)),
          }
        : {}),
      ...(boardSize ? { boardSize } : {}),
      ...(boardShape ? { boardShape } : {}),
      ...(hexCountVal != null ? { hexCount: hexCountVal } : {}),
      ...(desertCountSend != null ? { desertCount: desertCountSend } : {}),
      ...(teamMode && teamsBalanced
        ? {
            teams: [...seatTeams],
            teamColors: teamColors.slice(0, numTeams),
            teamNames: teamNames.slice(0, numTeams),
            teamTargetPerPlayer: teamTarget,
          }
        : {}),
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
      <>
        <GameScreen
          key={gameKey}
          makeController={() => controller}
          onGameComplete={onGameComplete}
          onExit={leaveLobby}
          onRematch={null}
          manage={manage}
        />
        <ChatPanel chat={chat} myUserId={session?.userId ?? ''} />
      </>
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
    !battle &&
    !capitale &&
    !heroesMode &&
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
              const baseTag = s.isBot
                ? `${it.bot} · ${botLevelLabel(s.botLevel)}`
                : i === 0
                  ? it.ruoloTu
                  : it.ruoloAmico;
              const tag = teamMode
                ? `${baseTag} · ${teamLabelShort(teamNames, seatTeams[i] ?? 0, censor)}`
                : baseTag;
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
                      {teamMode && (
                        <div className="color-picker" style={{ marginTop: 4 }}>
                          <span style={{ fontSize: 8, color: 'var(--ink-dim)', alignSelf: 'center', marginRight: 4 }}>
                            {it.squadra.squadraLabel}
                          </span>
                          {Array.from({ length: numTeams }, (_, ti) => (
                            <button
                              key={ti}
                              className={`color-swatch ${seatTeams[i] === ti ? 'color-swatch--active' : ''}`}
                              style={{ background: shadesFor(teamColors[ti] ?? TEAM_PALETTE[ti] ?? '#888').main }}
                              title={t(it.squadra.squadraN, { n: teamLetter(ti) })}
                              onClick={() => pickSeatTeam(i, ti)}
                            >
                              {teamLetter(ti)}
                            </button>
                          ))}
                        </div>
                      )}
                      {heroesMode && (
                        <div
                          style={{
                            marginTop: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <HeroesSummary heroes={seatHeroes[i] ?? []} />
                          <button
                            className="pxbtn pxbtn--ghost pxbtn--small"
                            onClick={() => setHeroPickerSeat(i)}
                          >
                            {(seatHeroes[i]?.length ?? 0) > 0 ? it.eroi.cambia : it.eroi.scegli}
                          </button>
                        </div>
                      )}
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
            teamSlot={teamSlot}
            online={false}
            editable
            open={rulesOpen}
            onToggle={() => setRulesOpen(!rulesOpen)}
            classic={rulesAreClassic}
            targetPG={targetPG}
            bumpTarget={bumpTarget}
            calamities={calamities}
            setCalamities={(v) => setCalamities(v)}
            battle={battle}
            setBattle={(v) => setBattle(v)}
            capitale={capitale}
            setCapitale={(v) => setCapitale(v)}
            heroesMode={heroesMode}
            setHeroesMode={applyHeroesMode}
            heroesCount={heroesCount}
            heroesLibero={heroesLibero}
            maxHeroes={MAX_HEROES}
            onPickHeroesPreset={pickHeroesPreset}
            onToggleHeroesLibero={() => setHeroesLibero((v) => !v)}
            onSetHeroesCount={applyHeroesCount}
            avoid68={avoid68}
            setAvoid68={(v) => setAvoid68(v)}
            seed={seed}
            setSeed={(v) => setSeed(v)}
            boardSize={boardSize}
            onPickBoard={pickBoardSize}
            boardShape={boardShape}
            onToggleShape={toggleBoardShape}
            liberoOn={liberoOn}
            onToggleLibero={toggleLibero}
            caselleRaw={caselleRaw}
            setCaselle={setCaselle}
            presetTotal={presetTotal}
            desertiShown={desertiShown}
            setDeserti={setDeserti}
            maxDeserts={maxDeserts}
            timerRaw={timerRaw}
            setTimerRaw={setTimerRaw}
            commitTimer={() => {}}
            isPublic={isPublic}
            setIsPublic={() => {}}
          />

          <button
            className="pxbtn newgame-start"
            onClick={() => void startLocal()}
            disabled={humanCount === 0 || startingLocal || (teamMode && !teamsBalanced)}
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

              {/* Partite in corso: si possono solo GUARDARE (spettatore). */}
              <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 8 }}>
                {it.spettatore.partiteInCorso}
              </div>
              {watchableRooms.length === 0 ? (
                <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>
                  {it.spettatore.nessunaInCorso}
                </div>
              ) : (
                watchableRooms.map((room) => (
                  <div key={room.code} className="setup-player">
                    <span style={{ flex: 1, fontSize: 9 }}>
                      {room.hostName}
                      <span style={{ color: 'var(--ink-dim)', fontSize: 8 }}>
                        {' · '}
                        {t(it.spettatore.giroN, { n: room.turnNumber })}
                        {room.spectators > 0 ? ` · ${t(it.spettatore.spettatoriN, { n: room.spectators })}` : ''}
                      </span>
                    </span>
                    <button className="pxbtn pxbtn--small" onClick={() => watchLobby(room.code)}>
                      👁 {it.spettatore.guarda}
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
                const baseTag = slot.isBot
                  ? it.bot
                  : slot.userId === session.userId
                    ? it.ruoloTu
                    : it.ruoloAmico;
                const tag = teamMode
                  ? `${baseTag} · ${teamLabelShort(teamNames, slot.team ?? 0, censor)}`
                  : baseTag;
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
                    {lobby.config.heroes && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '4px 8px',
                        }}
                      >
                        <HeroesSummary heroes={slot.heroes ?? []} />
                        {(slot.userId === session.userId || (isHost && slot.isBot)) && (
                          <button
                            className="pxbtn pxbtn--ghost pxbtn--small"
                            onClick={() => setHeroPickerSeat(i)}
                          >
                            {(slot.heroes?.length ?? 0) > 0 ? it.eroi.cambia : it.eroi.scegli}
                          </button>
                        )}
                      </div>
                    )}
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
                        {teamMode && (
                          <div className="color-picker" style={{ marginTop: 4 }}>
                            <span style={{ fontSize: 8, color: 'var(--ink-dim)', alignSelf: 'center', marginRight: 4 }}>
                              {it.squadra.squadraLabel}
                            </span>
                            {Array.from({ length: numTeams }, (_, tt) => (
                              <button
                                key={tt}
                                className={`color-swatch ${slot.team === tt ? 'color-swatch--active' : ''}`}
                                style={{ background: shadesFor(teamColors[tt] ?? TEAM_PALETTE[tt] ?? '#888').main }}
                                title={t(it.squadra.squadraN, { n: teamLetter(tt) })}
                                onClick={() => {
                                  socketRef.current?.emit('lobby:setTeam', i, tt);
                                  setPickerOnline(null);
                                }}
                              >
                                {teamLetter(tt)}
                              </button>
                            ))}
                          </div>
                        )}
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
            teamSlot={teamSlot}
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
            battle={battle}
            setBattle={(v) => {
              setBattle(v);
              patch({ battle: v });
            }}
            capitale={capitale}
            setCapitale={(v) => {
              setCapitale(v);
              patch({ capitale: v });
            }}
            heroesMode={heroesMode}
            setHeroesMode={(v) => {
              setHeroesMode(v);
              patch({ heroes: v, heroesPerPlayer });
            }}
            heroesCount={heroesCount}
            heroesLibero={heroesLibero}
            maxHeroes={MAX_HEROES}
            onPickHeroesPreset={pickHeroesPreset}
            onToggleHeroesLibero={() => setHeroesLibero((v) => !v)}
            onSetHeroesCount={applyHeroesCount}
            avoid68={avoid68}
            setAvoid68={(v) => {
              setAvoid68(v);
              patch({ avoidAdjacent68: v });
            }}
            seed={seed}
            setSeed={setSeed}
            commitSeed={() => patch({ seed: seed.trim() })}
            boardSize={boardSize}
            onPickBoard={pickBoardSize}
            boardShape={boardShape}
            onToggleShape={toggleBoardShape}
            liberoOn={liberoOn}
            onToggleLibero={toggleLibero}
            caselleRaw={caselleRaw}
            setCaselle={setCaselle}
            presetTotal={presetTotal}
            desertiShown={desertiShown}
            setDeserti={setDeserti}
            maxDeserts={maxDeserts}
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
                  disabled={lobby.slots.length < 2 || (teamMode && !teamsBalanced)}
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

      {/* Chat della lobby: disponibile appena si entra in una stanza (spettatori inclusi). */}
      {mode === 'online' && session && (lobby || spectating) && (
        <ChatPanel chat={chat} myUserId={session.userId} />
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
      {heroPickerSeat !== null && (
        <HeroPicker
          title={t(it.eroi.scegliPerMulti, {
            nome:
              (isOnline ? lobby?.slots[heroPickerSeat]?.name : seats[heroPickerSeat]?.name) ?? '',
          })}
          selected={(isOnline ? lobby?.slots[heroPickerSeat]?.heroes : seatHeroes[heroPickerSeat]) ?? []}
          maxCount={heroesPerPlayer}
          onChange={(next) => {
            if (isOnline) socketRef.current?.emit('lobby:setHeroes', heroPickerSeat, next);
            else setSeatHeroList(heroPickerSeat, next);
          }}
          progression={progression}
          onClose={() => setHeroPickerSeat(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Riepilogo compatto degli eroi di un posto: le pixel art + i nomi. */
function HeroesSummary({ heroes }: { heroes: HeroId[] }) {
  if (heroes.length === 0) {
    return (
      <div style={{ flex: 1, minWidth: 0, fontSize: 9, color: 'var(--ink-dim)' }}>
        {it.eroi.nessuno}
      </div>
    );
  }
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {heroes.map((h) => (
          <HeroArt key={h} hero={h} size={28} emblem={heroDef(h)?.emblem} />
        ))}
      </div>
      <div style={{ minWidth: 0, fontSize: 8, color: 'var(--ink-dim)' }}>
        {heroes.map((h) => heroDef(h)?.name).filter(Boolean).join(', ')}
      </div>
    </div>
  );
}

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

interface TeamSettingsPanelProps {
  teamMode: boolean;
  /** L'utente può modificare (host prima dell'avvio; sempre in locale). */
  editable: boolean;
  onToggle: (v: boolean) => void;
  validTeamCounts: number[];
  numTeams: number;
  onPickNumTeams: (n: number) => void;
  teamColors: string[];
  onSetTeamColor: (t: number, color: string) => void;
  teamNames: string[];
  onSetTeamName: (t: number, name: string) => void;
  teamTarget: number;
  onSetTeamTarget: (v: number) => void;
  teamSizeVal: number;
  teamsBalanced: boolean;
}

/** Pannello impostazioni Modalità Squadra, condiviso fra locale e online. */
function TeamSettingsPanel(p: TeamSettingsPanelProps) {
  return (
    <>
      <label className="check">
        <input
          type="checkbox"
          checked={p.teamMode}
          disabled={!p.editable}
          onChange={(e) => p.onToggle(e.target.checked)}
        />
        🛡️ {it.squadra.modalita}
      </label>
      {p.teamMode && (
        <div style={{ paddingLeft: 4 }}>
          <div style={NOTE_STYLE}>{it.squadra.spiega}</div>
          <div style={CAT_STYLE}>{it.squadra.numeroSquadre}</div>
          <div className="color-picker">
            {p.validTeamCounts.map((n) => (
              <button
                key={n}
                className={`pxbtn pxbtn--small ${p.numTeams === n ? '' : 'pxbtn--ghost'}`}
                disabled={!p.editable}
                onClick={() => p.onPickNumTeams(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div style={CAT_STYLE}>{it.squadra.coloriNomiSquadre}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from({ length: p.numTeams }, (_, ti) => (
              <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label
                  className="color-swatch color-swatch--custom"
                  style={{ background: shadesFor(p.teamColors[ti] ?? TEAM_PALETTE[ti] ?? '#888').main }}
                  title={t(it.squadra.coloreSquadraN, { n: teamLetter(ti) })}
                >
                  <span style={{ fontSize: 8, color: '#fff' }}>{teamLetter(ti)}</span>
                  <input
                    type="color"
                    value={shadesFor(p.teamColors[ti] ?? TEAM_PALETTE[ti] ?? '#888').main}
                    disabled={!p.editable}
                    onChange={(e) => p.onSetTeamColor(ti, e.target.value)}
                  />
                </label>
                <input
                  type="text"
                  value={p.teamNames[ti] ?? ''}
                  placeholder={t(it.squadra.squadraN, { n: teamLetter(ti) })}
                  title={it.squadra.nomeSquadra}
                  aria-label={t(it.squadra.coloreSquadraN, { n: teamLetter(ti) })}
                  maxLength={24}
                  disabled={!p.editable}
                  onChange={(e) => p.onSetTeamName(ti, e.target.value)}
                  style={{ flex: 1, fontSize: 9, minWidth: 0 }}
                />
              </div>
            ))}
          </div>
          <div className="stepper-row">
            <span style={{ fontSize: 9 }}>
              {it.squadra.puntiPerGiocatore}{' '}
              <span style={{ color: 'var(--ink-dim)', fontSize: 8 }}>{t(it.standardN, { n: 8 })}</span>
            </span>
            <span className="stepper">
              <button
                className="pxbtn pxbtn--ghost pxbtn--small"
                disabled={!p.editable || p.teamTarget <= 3}
                onClick={() => p.onSetTeamTarget(Math.max(3, p.teamTarget - 1))}
              >
                -
              </button>
              <span style={{ minWidth: 26, textAlign: 'center', color: 'var(--accent)' }}>{p.teamTarget}</span>
              <button
                className="pxbtn pxbtn--ghost pxbtn--small"
                disabled={!p.editable || p.teamTarget >= 15}
                onClick={() => p.onSetTeamTarget(Math.min(15, p.teamTarget + 1))}
              >
                +
              </button>
            </span>
          </div>
          <div style={NOTE_STYLE}>
            {t(it.squadra.bersaglio, {
              size: p.teamSizeVal,
              target: p.teamTarget,
              tot: p.teamSizeVal * p.teamTarget,
            })}
          </div>
          {!p.teamsBalanced && (
            <div style={{ fontSize: 9, color: 'var(--danger)' }}>{it.squadra.sbilanciate}</div>
          )}
        </div>
      )}
    </>
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
  battle: boolean;
  setBattle: (v: boolean) => void;
  capitale: boolean;
  setCapitale: (v: boolean) => void;
  /** Modalità Eroi. */
  heroesMode: boolean;
  setHeroesMode: (v: boolean) => void;
  /** «Numero di eroi» per clan: valore corrente, preset/libero e setter. */
  heroesCount: number;
  heroesLibero: boolean;
  maxHeroes: number;
  onPickHeroesPreset: (n: number) => void;
  onToggleHeroesLibero: () => void;
  onSetHeroesCount: (n: number) => void;
  avoid68: boolean;
  setAvoid68: (v: boolean) => void;
  seed: string;
  setSeed: (v: string) => void;
  commitSeed?: () => void;
  /** Tavola grande scelta (null = piccola/consigliata dal numero di giocatori). */
  boardSize: BoardSizeChoice | null;
  onPickBoard: (choice: BoardSizeChoice) => void;
  /** Forma della tavola (null = esagono classico; 'rientranze' = isola con golfi). */
  boardShape: BoardShapeChoice | null;
  onToggleShape: () => void;
  /** Campo libero: numero di caselle scelto a mano. */
  liberoOn: boolean;
  onToggleLibero: () => void;
  caselleRaw: string;
  setCaselle: (v: string) => void;
  /** Caselle della taglia preset corrente (fallback/placeholder del campo libero). */
  presetTotal: number;
  /** Deserti: testo mostrato (default prevalorizzato), setter e limiti. */
  desertiShown: string;
  setDeserti: (v: string) => void;
  maxDeserts: number;
  timerRaw: string;
  setTimerRaw: (v: string) => void;
  commitTimer: () => void;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
  /** Blocco «Modalità squadra», reso dentro la categoria Modalità (come calamità/battaglia). */
  teamSlot?: ReactNode;
}

/** Preset regole richiudibile, in categorie: Punti vittoria, Modalità, Tavola, Online. */
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

          {/* Categoria: Modalità di gioco */}
          <div style={CAT_STYLE}>{it.categoriaModalita}</div>
          <label className="check">
            <input
              type="checkbox"
              checked={p.calamities}
              disabled={!p.editable}
              onChange={(e) => p.setCalamities(e.target.checked)}
            />
            ⚡ {it.calamita.conCalamita}
          </label>
          {p.calamities && <div style={NOTE_STYLE}>{it.calamita.spiega}</div>}
          <label className="check">
            <input
              type="checkbox"
              checked={p.battle}
              disabled={!p.editable}
              onChange={(e) => p.setBattle(e.target.checked)}
            />
            ⚔️ {it.battaglia.conBattaglia}
          </label>
          {p.battle && <div style={NOTE_STYLE}>{it.battaglia.spiega}</div>}
          <label className="check">
            <input
              type="checkbox"
              checked={p.capitale}
              disabled={!p.editable}
              onChange={(e) => p.setCapitale(e.target.checked)}
            />
            👑 {it.capitale.conCapitale}
          </label>
          {p.capitale && <div style={NOTE_STYLE}>{it.capitale.spiega}</div>}
          <label className="check">
            <input
              type="checkbox"
              checked={p.heroesMode}
              disabled={!p.editable}
              onChange={(e) => p.setHeroesMode(e.target.checked)}
            />
            🛡️ {it.eroi.conEroi}
          </label>
          {p.heroesMode && <div style={NOTE_STYLE}>{it.eroi.spiega}</div>}
          {p.heroesMode && (
            <div style={{ paddingLeft: 4 }}>
              <div style={CAT_STYLE}>{it.eroi.numero}</div>
              <div className="color-picker">
                {HERO_COUNT_PRESETS.map((n) => (
                  <button
                    key={n}
                    className={`pxbtn pxbtn--small ${!p.heroesLibero && p.heroesCount === n ? '' : 'pxbtn--ghost'}`}
                    disabled={!p.editable}
                    onClick={() => p.onPickHeroesPreset(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className={`pxbtn pxbtn--small ${p.heroesLibero ? '' : 'pxbtn--ghost'}`}
                  disabled={!p.editable}
                  onClick={p.onToggleHeroesLibero}
                >
                  {it.eroi.libero}
                </button>
                {p.heroesLibero && (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={p.maxHeroes}
                    value={p.heroesCount}
                    disabled={!p.editable}
                    onChange={(e) => p.onSetHeroesCount(parseInt(e.target.value, 10) || 1)}
                    style={{ width: 60 }}
                  />
                )}
              </div>
              <div style={NOTE_STYLE}>{it.eroi.numeroSpiega}</div>
            </div>
          )}

          {/* Modalità Squadra: un'altra «modalità» accanto a calamità e battaglia. */}
          {p.teamSlot}

          {/* Categoria: Tavola (dimensione + mappa) */}
          <div style={CAT_STYLE}>{it.categoriaTavola}</div>
          <label className="check">
            <input
              type="checkbox"
              checked={p.boardSize === 'grande'}
              disabled={!p.editable || p.liberoOn}
              onChange={() => p.onPickBoard('grande')}
            />
            {it.campoGrande}
          </label>
          <div style={NOTE_STYLE}>{it.campoGrandeSpiega}</div>
          <label className="check">
            <input
              type="checkbox"
              checked={p.boardSize === 'gigante'}
              disabled={!p.editable || p.liberoOn}
              onChange={() => p.onPickBoard('gigante')}
            />
            {it.campoGigante}
          </label>
          <div style={NOTE_STYLE}>{it.campoGiganteSpiega}</div>
          <label className="check">
            <input
              type="checkbox"
              checked={p.boardShape === 'rientranze'}
              disabled={!p.editable || p.liberoOn}
              onChange={p.onToggleShape}
            />
            {it.campoRientranze}
          </label>
          <div style={NOTE_STYLE}>{it.campoRientranzeSpiega}</div>

          {/* Campo libero: numero di caselle scelto a mano (vince su taglia/forma). */}
          <label className="check">
            <input
              type="checkbox"
              checked={p.liberoOn}
              disabled={!p.editable}
              onChange={p.onToggleLibero}
            />
            {it.campoLibero}
          </label>
          {p.liberoOn && (
            <div className="stepper-row">
              <span style={{ fontSize: 9 }}>{it.numeroCaselle}</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_CUSTOM_HEXES}
                max={MAX_CUSTOM_HEXES}
                placeholder={String(p.presetTotal)}
                value={p.caselleRaw}
                disabled={!p.editable}
                onChange={(e) => p.setCaselle(e.target.value)}
                style={{ width: 70 }}
              />
            </div>
          )}
          <div style={NOTE_STYLE}>{t(it.campoLiberoSpiega, { min: MIN_CUSTOM_HEXES, max: MAX_CUSTOM_HEXES })}</div>

          {/* Deserti (tundra): numero libero, con il default della taglia prevalorizzato. */}
          <div className="stepper-row">
            <span style={{ fontSize: 9 }}>{it.deserti}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={p.maxDeserts}
              value={p.desertiShown}
              disabled={!p.editable}
              onChange={(e) => p.setDeserti(e.target.value)}
              style={{ width: 70 }}
            />
          </div>
          <div style={NOTE_STYLE}>{it.desertiSpiega}</div>

          <label className="check">
            <input
              type="checkbox"
              checked={p.avoid68}
              disabled={!p.editable}
              onChange={(e) => p.setAvoid68(e.target.checked)}
            />
            {it.evita68}
          </label>
          <input
            type="text"
            placeholder={it.seedOpzionale}
            value={p.seed}
            disabled={!p.editable}
            onChange={(e) => p.setSeed(e.target.value)}
            onBlur={p.commitSeed}
            style={{ width: '100%' }}
          />

          {/* Categoria: Online (solo multigiocatore) */}
          {p.online && (
            <>
              <div style={CAT_STYLE}>{it.categoriaOnline}</div>
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
              <label className="check">
                <input
                  type="checkbox"
                  checked={p.isPublic}
                  disabled={!p.editable}
                  onChange={(e) => p.setIsPublic(e.target.checked)}
                />
                {it.partitaPubblicaToggle}
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}
