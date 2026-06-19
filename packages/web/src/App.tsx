/** Router a stati dell'app: menu → setup → partita locale, oppure online. */
import { useState } from 'react';
import { useLang } from './i18n';
import { LocalGameController, type GameSetup } from './game/LocalGameController';
import { DemoScreen } from './screens/DemoScreen';
import { GameScreen } from './screens/GameScreen';
import { MenuScreen } from './screens/MenuScreen';
import { OnlineScreen } from './screens/OnlineScreen';
import { SetupScreen } from './screens/SetupScreen';
import { TutorialScreen } from './screens/TutorialScreen';

type Route =
  | { screen: 'menu' }
  | { screen: 'setup' }
  | { screen: 'game'; setup: GameSetup; gameKey: number }
  | { screen: 'online' }
  | { screen: 'tutorial' }
  | { screen: 'demo' };

export function App() {
  const [route, setRoute] = useState<Route>({ screen: 'menu' });
  // Sottoscrive la lingua attiva: al cambio si ri-renderizza tutto l'albero,
  // così il proxy `it` rilegge i testi nella nuova lingua ovunque.
  useLang();

  switch (route.screen) {
    case 'menu':
      return (
        <MenuScreen
          onNewGame={() => setRoute({ screen: 'setup' })}
          onOnline={() => setRoute({ screen: 'online' })}
          onTutorial={() => setRoute({ screen: 'tutorial' })}
          onDemo={() => setRoute({ screen: 'demo' })}
        />
      );
    case 'tutorial':
      return <TutorialScreen onClose={() => setRoute({ screen: 'menu' })} />;
    case 'demo':
      return (
        <DemoScreen
          onClose={() => setRoute({ screen: 'menu' })}
          onPlay={() => setRoute({ screen: 'setup' })}
          onOnline={() => setRoute({ screen: 'online' })}
        />
      );
    case 'setup':
      return (
        <SetupScreen
          onBack={() => setRoute({ screen: 'menu' })}
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
      return <OnlineScreen onBack={() => setRoute({ screen: 'menu' })} />;
  }
}
