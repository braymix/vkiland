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

// PWA: il service worker rende l'app installabile e giocabile offline
// (partite locali e hot-seat); si aggiorna da solo a ogni deploy.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
