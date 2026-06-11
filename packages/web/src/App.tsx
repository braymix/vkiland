/** Router a stati dell'app: menu → setup → partita locale, oppure online. */
import { useState } from 'react';
import { LocalGameController, type GameSetup } from './game/LocalGameController';
import { GameScreen } from './screens/GameScreen';
import { MenuScreen } from './screens/MenuScreen';
import { OnlineScreen } from './screens/OnlineScreen';
import { SetupScreen } from './screens/SetupScreen';

type Route =
  | { screen: 'menu' }
  | { screen: 'setup' }
  | { screen: 'game'; setup: GameSetup; gameKey: number }
  | { screen: 'online' };

export function App() {
  const [route, setRoute] = useState<Route>({ screen: 'menu' });

  switch (route.screen) {
    case 'menu':
      return (
        <MenuScreen
          onNewGame={() => setRoute({ screen: 'setup' })}
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
