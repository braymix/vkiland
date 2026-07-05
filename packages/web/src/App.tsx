/** Router a stati dell'app: entrata → menu → partita locale, oppure online. */
import { useState } from 'react';
import { useLang } from './i18n';
import { LocalGameController, type GameSetup } from './game/LocalGameController';
import { loadSession, saveSession, type OnlineSession } from './online/connection';
import { TUTORIAL_ONLINE_CHAPTER } from './i18n/tutorial';
import { AccountScreen } from './screens/AccountScreen';
import { DemoScreen } from './screens/DemoScreen';
import { EntryScreen } from './screens/EntryScreen';
import { GameScreen } from './screens/GameScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { MenuScreen } from './screens/MenuScreen';
import { OnlineScreen } from './screens/OnlineScreen';
import { SetupScreen } from './screens/SetupScreen';
import { TutorialScreen } from './screens/TutorialScreen';

type Route =
  | { screen: 'entry' }
  | { screen: 'menu' }
  | { screen: 'setup' }
  | { screen: 'game'; setup: GameSetup; gameKey: number }
  | { screen: 'online' }
  | { screen: 'account' }
  | { screen: 'tutorial'; chapter?: number }
  | { screen: 'demo' }
  | { screen: 'inventory' };

export function App() {
  // Sessione online (se presente): decide se «entri» già loggato e se i pulsanti
  // online sono attivi. È solo un puntatore all'account — il gioco in locale
  // funziona identico anche senza (bot e hot-seat).
  const [session, setSession] = useState<OnlineSession | null>(() => loadSession());
  const [route, setRoute] = useState<Route>(() =>
    session ? { screen: 'menu' } : { screen: 'entry' }
  );
  // Sottoscrive la lingua attiva: al cambio si ri-renderizza tutto l'albero,
  // così il proxy `it` rilegge i testi nella nuova lingua ovunque.
  useLang();

  const hasAccount = session !== null;

  /** Login/registrazione riuscita (dall'entrata): ricorda la sessione, va al menu. */
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
          onOpenTutorial={() => setRoute({ screen: 'tutorial', chapter: TUTORIAL_ONLINE_CHAPTER })}
        />
      );
    case 'menu':
      return (
        <MenuScreen
          hasAccount={hasAccount}
          onNewGame={() => setRoute({ screen: 'setup' })}
          onLibro={() => setRoute({ screen: 'tutorial' })}
          onInventory={() => setRoute({ screen: 'inventory' })}
          // Senza account, «Gestione account» porta all'entrata per accedere.
          onAccount={() => setRoute({ screen: hasAccount ? 'account' : 'entry' })}
          onDemo={() => setRoute({ screen: 'demo' })}
        />
      );
    case 'tutorial':
      return (
        <TutorialScreen
          initialChapter={route.chapter ?? 0}
          onClose={() => setRoute({ screen: 'menu' })}
        />
      );
    case 'inventory':
      return <InventoryScreen onBack={() => setRoute({ screen: 'menu' })} />;
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
        />
      );
    case 'demo':
      return (
        <DemoScreen
          onClose={() => setRoute({ screen: 'menu' })}
          onPlay={() => setRoute({ screen: 'setup' })}
          // L'online richiede un account: senza, si passa dall'entrata.
          onOnline={() => setRoute({ screen: hasAccount ? 'online' : 'entry' })}
        />
      );
    case 'setup':
      return (
        <SetupScreen
          hasAccount={hasAccount}
          onBack={() => setRoute({ screen: 'menu' })}
          onGoOnline={() => setRoute({ screen: 'online' })}
          onStart={(setup) => setRoute({ screen: 'game', setup, gameKey: Date.now() })}
        />
      );
    case 'game':
      return (
        <GameScreen
          key={route.gameKey}
          makeController={() => new LocalGameController(route.setup)}
          onExit={() => setRoute({ screen: 'menu' })}
          onRematch={() =>
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
        />
      );
    case 'online':
      if (!session) return null;
      return (
        <OnlineScreen
          session={session}
          onBack={() => setRoute({ screen: 'menu' })}
          onInvalidSession={onLogout}
        />
      );
  }
}
