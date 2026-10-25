/** Router a stati dell'app: entrata → HUB → sottomenu di modalità → partita locale, oppure online. */
import { useEffect, useRef, useState } from 'react';
import type { GameState, Mission, PlayerId, PlayerProgression, WorldMission } from '@vikiland/engine';
import type { WorldPlayerView } from '@vikiland/engine-world';
import { useLang } from './i18n';
import { LocalGameController, type GameSetup } from './game/LocalGameController';
import { buildMissionSetup } from './game/missions';
import { buildWorldMissionSetup } from './game/worldMissions';
import { loadSession, saveSession, type OnlineSession } from './online/connection';
import {
  getLocalProgression,
  loadProgression,
  awardChestForFinishedGame,
  modeProgression,
} from './game/progression';
import { TUTORIAL_ONLINE_CHAPTER } from './i18n/tutorial';
import { AccountScreen } from './screens/AccountScreen';
import { DemoScreen } from './screens/DemoScreen';
import { EntryScreen } from './screens/EntryScreen';
import { GameScreen } from './screens/GameScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { MenuScreen } from './screens/MenuScreen';
import { ClassicoMenuScreen } from './screens/ClassicoMenuScreen';
import { MissionsScreen, type PendingMission } from './screens/MissionsScreen';
import { NewGameScreen } from './screens/NewGameScreen';
import { ShopScreen } from './screens/ShopScreen';
import { TableScreen } from './screens/TableScreen';
import { TutorialScreen } from './screens/TutorialScreen';
import { NewWorldGameScreen } from './screens/world/NewWorldGameScreen';
import { WorldGameScreen } from './screens/world/WorldGameScreen';
import { WorldMenuScreen } from './screens/world/WorldMenuScreen';
import { WorldMissionsScreen, type WorldPendingMission } from './screens/world/WorldMissionsScreen';
import { WorldTutorialScreen } from './screens/world/WorldTutorialScreen';
import { WorldOnlineScreen } from './screens/world/WorldOnlineScreen';
import { AdminMapsScreen } from './screens/world/AdminMapsScreen';
import { LocalWorldController, type WorldSetup } from './game/world/LocalWorldController';

/** Da dove si è aperto il Libro delle Saghe Classico: decide dove torna «Indietro». */
type TutorialFrom = 'menu' | 'classicoMenu';

type Route =
  | { screen: 'entry' }
  | { screen: 'menu' }
  | { screen: 'classicoMenu' }
  | { screen: 'worldMenu' }
  | { screen: 'newGame'; mode: 'locale' | 'online' }
  | { screen: 'newWorld' }
  | { screen: 'worldOnline' }
  | { screen: 'worldTutorial' }
  | { screen: 'adminMaps' }
  | { screen: 'world'; setup: WorldSetup; gameKey: number; mission?: WorldMission }
  | { screen: 'game'; setup: GameSetup; gameKey: number; mission?: Mission }
  | { screen: 'account' }
  | { screen: 'tutorial'; chapter?: number; from?: TutorialFrom }
  | { screen: 'demo' }
  | { screen: 'inventory'; mode: 'classico' | 'aroundTheWorld' }
  | { screen: 'missions'; pending?: PendingMission | null }
  | { screen: 'worldMissions'; pending?: WorldPendingMission | null }
  | { screen: 'shop' }
  | { screen: 'table'; from: 'entry' | 'classicoMenu' };

/** Link diretto alla modalità Tavolo (es. segnalibro sul tablet): viking-island.it/#tavolo */
const TABLE_HASH = '#tavolo';

export function App() {
  // Sessione online (se presente): decide se «entri» già loggato e se i pulsanti
  // online sono attivi. È solo un puntatore all'account — il gioco in locale
  // funziona identico anche senza (bot e hot-seat).
  const [session, setSession] = useState<OnlineSession | null>(() => loadSession());
  const [route, setRoute] = useState<Route>(() =>
    location.hash === TABLE_HASH
      ? { screen: 'table', from: session ? 'classicoMenu' : 'entry' }
      : session
        ? { screen: 'menu' }
        : { screen: 'entry' }
  );
  // Sottoscrive la lingua attiva: al cambio si ri-renderizza tutto l'albero,
  // così il proxy `it` rilegge i testi nella nuova lingua ovunque.
  useLang();

  const hasAccount = session !== null;

  // Progressione (casse, frammenti, eroi sbloccati, flag tester), divisa per
  // modalità (`.classico` / `.aroundTheWorld`). Vive qui in alto perché serve
  // ai due sottomenu (badge «da fare»), alla scelta eroe e all'assegnazione
  // della cassa a fine partita. Parte dal dispositivo e, se c'è una sessione,
  // si allinea all'account.
  const [progression, setProgression] = useState<PlayerProgression>(() => getLocalProgression());
  useEffect(() => {
    let alive = true;
    void loadProgression(session).then((p) => {
      if (alive) setProgression(p);
    });
    return () => {
      alive = false;
    };
  }, [session]);

  /** Rilegge la progressione dalla fonte giusta (dopo l'inventario, a fine partita). */
  const reloadProgression = () => {
    void loadProgression(session).then(setProgression);
  };

  /** Fine partita Classica al 100%: assegna una cassa (se c'è spazio) e aggiorna lo stato. */
  const onGameComplete = () => {
    void awardChestForFinishedGame(session, 'classico').then(setProgression);
  };

  // Esito della missione Classica appena giocata: registrato a fine partita e
  // consegnato alla schermata Missioni all'uscita (che completa la missione
  // se VINTA).
  const pendingMissionRef = useRef<PendingMission | null>(null);
  /** Fine di una partita-MISSIONE Classica: memorizza se l'umano ha vinto (posto = `viewpoint`). */
  const onMissionGameComplete = (mission: Mission, finalState: GameState, viewpoint: PlayerId) => {
    const won = finalState.phase.type === 'gameOver' && finalState.phase.winner === viewpoint;
    pendingMissionRef.current = { missionId: mission.id, won };
  };

  // Stesso meccanismo per le missioni del Mondo.
  const pendingWorldMissionRef = useRef<WorldPendingMission | null>(null);
  const onWorldMissionGameComplete = (mission: WorldMission, view: WorldPlayerView, viewpoint: PlayerId) => {
    const won = view.phase.type === 'fine' && view.phase.winner === viewpoint;
    pendingWorldMissionRef.current = { missionId: mission.id, won };
  };

  /** Login/registrazione riuscita (dall'entrata): ricorda la sessione, va all'HUB. */
  const onLoggedIn = (s: OnlineSession) => {
    saveSession(s);
    setSession(s);
    setRoute({ screen: 'menu' });
  };

  /** Esci dall'account (o sessione scaduta): dimentica tutto e torna all'entrata. */
  const onLogout = () => {
    saveSession(null);
    setSession(null);
    setRoute({ screen: 'entry' });
  };

  switch (route.screen) {
    case 'entry':
      return (
        <EntryScreen
          onLoggedIn={onLoggedIn}
          onSkip={() => setRoute({ screen: 'menu' })}
          onTable={() => setRoute({ screen: 'table', from: 'entry' })}
          onOpenTutorial={() =>
            setRoute({ screen: 'tutorial', chapter: TUTORIAL_ONLINE_CHAPTER, from: 'menu' })
          }
        />
      );
    case 'menu':
      return (
        <MenuScreen
          hasAccount={hasAccount}
          isTester={progression.tester === true}
          progression={progression}
          onClassico={() => setRoute({ screen: 'classicoMenu' })}
          onMondo={() => setRoute({ screen: 'worldMenu' })}
          onShop={() => setRoute({ screen: 'shop' })}
          // Senza account, «Gestione account» porta all'entrata per accedere.
          onAccount={() => setRoute({ screen: hasAccount ? 'account' : 'entry' })}
          onDemo={() => setRoute({ screen: 'demo' })}
        />
      );
    case 'classicoMenu':
      return (
        <ClassicoMenuScreen
          progression={modeProgression(progression, 'classico')}
          onNewGame={() => setRoute({ screen: 'newGame', mode: 'locale' })}
          onLibro={() => setRoute({ screen: 'tutorial', from: 'classicoMenu' })}
          onInventory={() => setRoute({ screen: 'inventory', mode: 'classico' })}
          onMissions={() => setRoute({ screen: 'missions' })}
          onTable={() => setRoute({ screen: 'table', from: 'classicoMenu' })}
          onBack={() => setRoute({ screen: 'menu' })}
        />
      );
    case 'worldMenu':
      return (
        <WorldMenuScreen
          progression={modeProgression(progression, 'aroundTheWorld')}
          onNewGame={() => setRoute({ screen: 'newWorld' })}
          onLibro={() => setRoute({ screen: 'worldTutorial' })}
          onInventory={() => setRoute({ screen: 'inventory', mode: 'aroundTheWorld' })}
          onMissions={() => setRoute({ screen: 'worldMissions' })}
          onBack={() => setRoute({ screen: 'menu' })}
        />
      );
    case 'table':
      return (
        <TableScreen
          session={session}
          onBack={() => {
            if (location.hash === TABLE_HASH) history.replaceState(null, '', location.pathname);
            setRoute({ screen: route.from });
          }}
        />
      );
    case 'tutorial':
      return (
        <TutorialScreen
          initialChapter={route.chapter ?? 0}
          onClose={() => setRoute({ screen: route.from ?? 'classicoMenu' })}
        />
      );
    case 'inventory':
      return (
        <InventoryScreen
          mode={route.mode}
          onBack={() => {
            // Tornando al sottomenu rilegge la progressione: eventuali sblocchi
            // fatti nell'inventario si riflettono subito nella scelta eroe.
            reloadProgression();
            setRoute({ screen: route.mode === 'classico' ? 'classicoMenu' : 'worldMenu' });
          }}
        />
      );
    case 'missions':
      return (
        <MissionsScreen
          pending={route.pending ?? null}
          onStartMission={(mission) => {
            // La missione si gioca come una partita locale, coi cosmetici e il
            // nome dell'account (se c'è). La cassa-ricompensa arriva alla VITTORIA.
            const setup = buildMissionSetup(mission, session?.username ?? 'Bjorn', null);
            pendingMissionRef.current = null;
            setRoute({ screen: 'game', setup, gameKey: Date.now(), mission });
          }}
          onBack={() => {
            // Tornando al sottomenu rilegge la progressione: le ricompense
            // delle missioni si riflettono subito nella scelta eroe.
            reloadProgression();
            setRoute({ screen: 'classicoMenu' });
          }}
        />
      );
    case 'worldMissions':
      return (
        <WorldMissionsScreen
          pending={route.pending ?? null}
          onStartMission={(mission) => {
            const setup = buildWorldMissionSetup(mission, session?.username ?? 'Bjorn');
            pendingWorldMissionRef.current = null;
            setRoute({ screen: 'world', setup, gameKey: Date.now(), mission });
          }}
          onBack={() => {
            reloadProgression();
            setRoute({ screen: 'worldMenu' });
          }}
        />
      );
    case 'shop':
      return (
        <ShopScreen
          onBack={() => {
            // Tornando all'HUB rilegge la progressione: le casse gratuite
            // riscosse qui si riflettono subito nella scelta eroe e nei badge.
            reloadProgression();
            setRoute({ screen: 'menu' });
          }}
        />
      );
    case 'account':
      if (!session) return null;
      return (
        <AccountScreen
          session={session}
          onSessionUpdate={(fresh) => {
            saveSession(fresh);
            setSession(fresh);
          }}
          onLogout={onLogout}
          onBack={() => setRoute({ screen: 'menu' })}
          onOpenMapEditor={() => setRoute({ screen: 'adminMaps' })}
        />
      );
    case 'demo':
      return (
        <DemoScreen
          onClose={() => setRoute({ screen: 'menu' })}
          onPlay={() => setRoute({ screen: 'newGame', mode: 'locale' })}
          // L'online richiede un account: senza, si passa dall'entrata.
          onOnline={() =>
            setRoute(hasAccount ? { screen: 'newGame', mode: 'online' } : { screen: 'entry' })
          }
        />
      );
    case 'newWorld':
      return (
        <NewWorldGameScreen
          defaultName={session?.username}
          progression={progression}
          onBack={() => setRoute({ screen: 'worldMenu' })}
          session={session}
          onOnline={() => setRoute(hasAccount ? { screen: 'worldOnline' } : { screen: 'entry' })}
          onTutorial={() => setRoute({ screen: 'worldTutorial' })}
          onStart={(setup) => setRoute({ screen: 'world', setup, gameKey: Date.now() })}
        />
      );
    case 'worldTutorial':
      return <WorldTutorialScreen onClose={() => setRoute({ screen: 'worldMenu' })} />;
    case 'worldOnline':
      if (!session) return null;
      return (
        <WorldOnlineScreen
          session={session}
          progression={progression}
          onBack={() => setRoute({ screen: 'worldMenu' })}
          onInvalidSession={onLogout}
        />
      );
    case 'adminMaps':
      if (!session) return null;
      return <AdminMapsScreen session={session} onBack={() => setRoute({ screen: 'account' })} />;
    case 'world': {
      const mission = route.mission;
      // In una MISSIONE del Mondo l'uscita torna alla bacheca (che, se hai
      // VINTO, apre le casse-ricompensa); niente rivincita (si rigioca dalla
      // bacheca). Una partita normale torna al sottomenu del Mondo.
      const exitToWorldMissions = () =>
        setRoute({ screen: 'worldMissions', pending: pendingWorldMissionRef.current });
      return (
        <WorldGameScreen
          key={route.gameKey}
          makeController={() => new LocalWorldController(route.setup)}
          {...(mission
            ? { onGameComplete: (view: WorldPlayerView, viewpoint: PlayerId) => onWorldMissionGameComplete(mission, view, viewpoint) }
            : {})}
          onExit={mission ? exitToWorldMissions : () => setRoute({ screen: 'worldMenu' })}
          onRematch={
            mission
              ? null
              : () =>
                  setRoute({
                    screen: 'world',
                    gameKey: Date.now(),
                    setup: { ...route.setup, seed: `world-${Date.now()}-${Math.floor(Math.random() * 1e6)}` },
                  })
          }
        />
      );
    }
    case 'newGame':
      return (
        <NewGameScreen
          session={session}
          progression={progression}
          onGameComplete={onGameComplete}
          initialMode={route.mode}
          onBack={() => setRoute({ screen: 'classicoMenu' })}
          onStartLocal={(setup) => setRoute({ screen: 'game', setup, gameKey: Date.now() })}
          onInvalidSession={onLogout}
          onNeedAccount={() => setRoute({ screen: 'entry' })}
        />
      );
    case 'game': {
      const mission = route.mission;
      // In una MISSIONE l'uscita torna alla bacheca (che, se hai VINTO, apre le
      // casse-ricompensa); niente rivincita (si rigioca dalla bacheca). Una
      // partita normale assegna la cassa di fine partita e torna al sottomenu.
      const exitToMissions = () => setRoute({ screen: 'missions', pending: pendingMissionRef.current });
      return (
        <GameScreen
          key={route.gameKey}
          makeController={() => new LocalGameController(route.setup)}
          onGameComplete={
            mission
              ? (finalState, viewpoint) => onMissionGameComplete(mission, finalState, viewpoint)
              : onGameComplete
          }
          onExit={mission ? exitToMissions : () => setRoute({ screen: 'classicoMenu' })}
          onRematch={
            mission
              ? null
              : () =>
                  setRoute({
                    screen: 'game',
                    gameKey: Date.now(),
                    setup: {
                      ...route.setup,
                      // Rivincita: stessi giocatori, nuova isola.
                      seed: `vikiland-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
                    },
                  })
          }
          // Gestione partita locale (☰): «esci» torna al sottomenu (o alla
          // bacheca missioni, senza ricompensa se abbandoni a metà).
          manage={{
            online: false,
            code: null,
            isHost: true,
            players: route.setup.players.map((p) => ({
              name: p.name,
              isBot: p.isBot,
              color: p.color,
              connected: true,
              isHost: false,
            })),
            onLeave: mission ? exitToMissions : () => setRoute({ screen: 'classicoMenu' }),
            onTerminate: null,
          }}
        />
      );
    }
  }
}
