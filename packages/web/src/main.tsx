import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/press-start-2p';
import './styles/global.css';
import { App } from './App';

// PWA: il service worker rende l'app installabile e giocabile offline
// (partite locali e hot-seat); si aggiorna da solo a ogni deploy.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
