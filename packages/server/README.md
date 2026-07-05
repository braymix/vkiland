# @vikiland/server — multiplayer online (Fase 3)

Server **autoritativo**: lo stato completo della partita vive solo qui. I client
inviano `Action` come *intenzioni* → `applyAction` lato server (lo **stesso
`@vikiland/engine`** del client = anti-cheat) → a ogni posto torna la **propria
vista filtrata** (`getPlayerView`) e gli eventi filtrati. I bot girano sul server.

## Avvio

```bash
pnpm --filter @vikiland/server dev    # porta 8787 (override: PORT=…)
```

- `DATA_DIR` (default `packages/server/data/`, git-ignorata): persistenza JSON.
- Dal client web: menu → **Online** → registrati/accedi (l'indirizzo del server è
  precompilato con `http://<host della pagina>:8787`, comodo anche in LAN).

## Architettura

| Modulo | Ruolo |
|---|---|
| `protocol.ts` | Tipi condivisi client/server (import type-only dal web) |
| `auth.ts` | Account email+password (hash **scrypt** di `node:crypto`) e sessioni token |
| `storage.ts` | Interfaccia `Storage` + implementazione JSON; le partite finite sono salvate come `seed + action_log` (= replay deterministico) |
| `lobby.ts` | Lobby con **codici invito** a 6 caratteri, posti umani/bot, riconnessione |
| `room.ts` | `GameRoom`: stato autoritativo, bot, viste per posto, **timer di turno** |
| `defaultAction.ts` | Mossa di sblocco allo scadere del timer |
| `index.ts` | Fastify (REST `/api/*`) + Socket.io (eventi `lobby:*`, `game:*`) |

Note di progetto:

- **Niente dipendenze native** (scelta deliberata): password con scrypt anziché
  argon2id e storage JSON anziché SQLite ⇒ `pnpm install` funziona ovunque senza
  toolchain di compilazione. L'interfaccia `Storage` e il formato versionato
  dell'hash (`scrypt$N$r$p$salt$hash`) sono i punti di sostituzione previsti per
  Drizzle (SQLite/PostgreSQL) e argon2id in produzione.
- **Riconnessione**: il token in `localStorage` riapre la sessione; al re-handshake
  del socket il server riaggancia lobby/partita e reinvia la vista corrente.
- **Timer di turno** (opzionale, scelto alla creazione della lobby): allo scadere
  il server gioca la mossa di default per l'umano fermo — la partita non si
  blocca mai.

<!-- PUNTO DI ESTENSIONE: tabella `entitlements` (cosmetici/premium) e hook per
     annunci/acquisti verranno definiti qui in Fase 4. -->
