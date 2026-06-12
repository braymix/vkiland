import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // PWA: installabile a schermata home e giocabile OFFLINE (locale/hot-seat).
    // L'online resta fuori dalla cache: il socket parla col server di gioco.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'Viking-Island',
        short_name: 'Viking-Island',
        description:
          "Gioco da tavolo digitale: colonizza l'isola dei clan vichinghi. " +
          'Bot, hot-seat e multiplayer online.',
        lang: 'it',
        display: 'standalone',
        start_url: '.',
        background_color: '#1d2733',
        theme_color: '#1d2733',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    host: true,
  },
});
