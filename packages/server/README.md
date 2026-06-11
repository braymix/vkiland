# @vikiland/server — Fase 3 (non ancora implementato)

Questo package ospiterà il backend per il multiplayer online (Fase 3 della roadmap):

- **Fastify + Socket.io**: il server detiene il `GameState` completo e il log delle azioni;
  i client inviano `Action` come *intenzioni* → `applyAction` lato server (lo stesso
  `@vikiland/engine` = anti-cheat) → broadcast delle viste filtrate (`getPlayerView`)
  e degli eventi filtrati per giocatore.
- **Persistenza**: Drizzle ORM, SQLite in sviluppo / PostgreSQL in produzione.
  Tabelle previste: `users` (email + hash argon2id), `sessions` (token), `games`
  (seed, config, action_log per il replay, stato), `stats`.
- **Lobby** con codici invito; **riconnessione** (re-auth del socket → reinvio della vista);
  **timer di turno** lato server con auto-azione.
- Lato client verrà introdotto un `RemoteGameController` con la stessa interfaccia del
  `LocalGameController` (la UI non cambia).

<!-- PUNTO DI ESTENSIONE: tabella `entitlements` (cosmetici/premium) e hook per
     annunci/acquisti verranno definiti qui in Fase 4. -->
