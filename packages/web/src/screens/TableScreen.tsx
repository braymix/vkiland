/**
 * Modalità TAVOLO: un dispositivo (di solito un tablet in mezzo al tavolo)
 * che guarda una partita Classica online SENZA account. Elenca le partite
 * pubbliche in corso, si collega a una (o a una privata col codice) e mostra
 * la mappa in tempo reale coi numeri usciti. Sola lettura: nessuna azione.
 *
 * Anche un utente loggato può aprire il tavolo: la connessione ha comunque
 * un'identità di tavolo separata, così il suo posto in partita resta intatto.
 */
import { useEffect, useRef, useState } from 'react';
import type { LobbyState, WatchableGameSummary } from '@vikiland/server/protocol';
import { isApiError } from '@vikiland/server/protocol';
import { it } from '../i18n';
import { tav } from '../i18n/table';
import { connectTableSocket, defaultServerUrl, type OnlineSession, type ServerSocket } from '../online/connection';
import { RemoteGameController } from '../online/RemoteGameController';
import type { ManageInfo } from '../components/ManageSheet';
import { GameScreen } from './GameScreen';

/** Ogni quanto si rinfresca la lista delle partite (ms). */
const LIST_REFRESH_MS = 5000;

export function TableScreen({ session, onBack }: { session: OnlineSession | null; onBack: () => void }) {
  const socketRef = useRef<ServerSocket | null>(null);
  const controllerRef = useRef<RemoteGameController | null>(null);
  /** Codice della partita guardata: alla riconnessione il tavolo ci ri-entra da solo. */
  const watchingRef = useRef<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [down, setDown] = useState(false);
  const [games, setGames] = useState<WatchableGameSummary[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [ready, setReady] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  const dropController = () => {
    controllerRef.current?.dispose();
    controllerRef.current = null;
    watchingRef.current = null;
    setReady(false);
    setLobby(null);
  };

  const watch = (rawCode: string) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('lobby:watch', rawCode.trim().toUpperCase(), (res) => {
      if (isApiError(res)) {
        setError(res.error);
        return;
      }
      setError(null);
      watchingRef.current = res.code;
      setLobby(res.state);
      if (controllerRef.current) return; // ri-ingresso dopo una riconnessione
      const controller = new RemoteGameController(socket);
      controllerRef.current = controller;
      const unsub = controller.subscribe(() => {
        if (controller.ready) {
          unsub();
          setGameKey((k) => k + 1);
          setReady(true);
        }
      });
    });
  };

  const leave = () => {
    socketRef.current?.emit('lobby:stopWatch');
    dropController();
  };

  // Socket del tavolo: uno per tutta la vita della schermata.
  useEffect(() => {
    const socket = connectTableSocket(session?.serverUrl ?? defaultServerUrl(), session?.token);
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      setDown(false);
      // Il server dimentica il tavolo quando cade la connessione: ri-entra.
      if (watchingRef.current) watch(watchingRef.current);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setDown(true));
    socket.on('lobby:state', (state) => {
      if (state.code === watchingRef.current) setLobby(state);
    });
    socket.on('lobby:closed', (e) => {
      dropController();
      setError(tav.partitaChiusa(e.error));
    });
    return () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lista delle partite pubbliche in corso, finché non si guarda una partita.
  useEffect(() => {
    if (!connected || lobby) return;
    let alive = true;
    const refresh = () =>
      socketRef.current?.emit('lobby:listWatchable', (list) => alive && setGames(list));
    refresh();
    const timer = setInterval(refresh, LIST_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [connected, lobby]);

  // Lo schermo del tavolo non deve spegnersi mentre si gioca.
  useEffect(() => {
    if (!ready) return;
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        ?.request('screen')
        .then((l) => {
          if (alive) lock = l;
          else void l.release();
        })
        .catch(() => {});
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release().catch(() => {});
    };
  }, [ready]);

  const controller = controllerRef.current;
  if (lobby && ready && controller?.ready) {
    const manage: ManageInfo = {
      online: true,
      code: lobby.code,
      isHost: false,
      players: lobby.slots.map((s) => ({
        name: s.name,
        isBot: s.isBot,
        color: s.color,
        connected: s.connected,
        isHost: s.userId === lobby.hostUserId,
      })),
      onLeave: leave,
      onTerminate: null,
    };
    return (
      <GameScreen
        key={gameKey}
        makeController={() => controller}
        onExit={leave}
        onRematch={null}
        manage={manage}
        table
      />
    );
  }

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h1 className="menu-title">{tav.titolo}</h1>
      <div className="pixel-frame newgame-join" style={{ maxWidth: 520, width: '100%' }}>
        <p style={{ fontSize: 9, lineHeight: 1.8, color: 'var(--ink-dim)' }}>{tav.sottotitolo}</p>

        {!connected && (
          <div style={{ fontSize: 9, color: down ? 'var(--danger)' : 'var(--ink-dim)' }}>
            {down ? tav.serverGiu : tav.connessione}
          </div>
        )}

        <div style={{ fontSize: 10, color: 'var(--accent)' }}>{tav.collegati}</div>
        <div className="table-codes">
          <input
            type="text"
            placeholder={tav.codicePlaceholder}
            value={code}
            maxLength={6}
            style={{ textTransform: 'uppercase' }}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.trim().length === 6) watch(code);
            }}
          />
          <button
            className="pxbtn pxbtn--small"
            onClick={() => watch(code)}
            disabled={!connected || code.trim().length < 6}
          >
            {tav.codiceGuarda}
          </button>
        </div>
        {error && <div style={{ fontSize: 9, color: 'var(--danger)' }}>{error}</div>}

        <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 8 }}>{tav.partite}</div>
        {games.length === 0 ? (
          <div style={{ fontSize: 8, color: 'var(--ink-dim)', lineHeight: 1.8 }}>{tav.nessuna}</div>
        ) : (
          games.map((g) => (
            <div key={g.code} className="setup-player">
              <span style={{ flex: 1, fontSize: 9 }}>
                {g.hostName}
                <span style={{ color: 'var(--ink-dim)', fontSize: 8 }}>
                  {' · '}
                  {tav.giocatoriN(g.players)}
                  {' · '}
                  {tav.giroN(g.turnNumber)}
                  {g.tables ? ` · ${tav.tavoliN(g.tables)}` : ''}
                </span>
              </span>
              <button className="pxbtn pxbtn--small" onClick={() => watch(g.code)} disabled={!connected}>
                🎲 {tav.codiceGuarda}
              </button>
            </div>
          ))
        )}
      </div>
      <button className="pxbtn pxbtn--ghost" onClick={onBack}>
        {it.indietro}
      </button>
    </div>
  );
}
