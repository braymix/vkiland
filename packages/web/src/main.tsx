import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/press-start-2p';
// Font pixel con cirillico per il russo (Press Start 2P non ha il cirillico).
// Peso 700: i "dot" di Handjet si ispessiscono e diventano leggibili, vicini
// al tratto pieno di Press Start 2P.
import '@fontsource/handjet/latin-700.css';
import '@fontsource/handjet/cyrillic-700.css';
import '@fontsource/handjet/cyrillic-ext-700.css';
import './styles/global.css';
import { App } from './App';
import { Maintenance } from './Maintenance';
import { CensorProvider } from './game/censor';

// Il gioco va sempre giocato dal dominio ufficiale (apex, non sottodomini):
// chi arriva da altri indirizzi (anteprime, vecchi link, domini copiati)
// vede l'invito a passare su viking-island.it. 'localhost'/'127.0.0.1'
// restano aperti per lo sviluppo locale.
const ALLOWED_HOSTS = ['viking-island.it', 'localhost', '127.0.0.1'];

if (!ALLOWED_HOSTS.includes(window.location.hostname)) {
  createRoot(document.getElementById('root')!).render(<Maintenance />);
} else {
  // PWA: il service worker rende l'app installabile e giocabile offline
  // (partite locali e hot-seat); si aggiorna da solo a ogni deploy.
  registerSW({ immediate: true });

  createRoot(document.getElementById('root')!).render(
    <CensorProvider>
      <App />
    </CensorProvider>
  );
}
