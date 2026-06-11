# VIKILAND

Gioco da tavolo digitale per browser: colonizza un'isola del nord alla guida di un clan
vichingo. Costruisci sentieri, villaggi e roccaforti, commercia con gli approdi, difenditi
dal Drago e conquista 10 Punti Gloria.

Tema, nomi e grafica (pixel art) sono completamente originali; le meccaniche sono ispirate
ai classici giochi da tavolo di colonizzazione con esagoni.

## Struttura del monorepo

| Package | Descrizione |
|---|---|
| `packages/engine` | Motore di gioco **puro** (zero dipendenze): stato + validazione/applicazione mosse, deterministico con PRNG seedato. Riusato identico da bot, hot-seat e server. |
| `packages/bots` | IA euristiche dei giocatori artificiali (dipende solo dall'engine). |
| `packages/web` | Frontend React + TypeScript + Vite, tabellone pixel-art su Canvas. |
| `packages/server` | Backend multiplayer online: Fastify + Socket.io, stato autoritativo, lobby con codici invito. |

## Comandi

```bash
pnpm install      # installa tutto il workspace
pnpm dev          # avvia il frontend (Vite)
pnpm server       # avvia il server di gioco online (porta 8787)
pnpm test         # esegue i test di tutti i package
pnpm typecheck    # tsc --noEmit su tutti i package
pnpm lint         # ESLint
pnpm build        # build di produzione del frontend
```

## Deploy

**Client su Netlify** (gioco locale e hot-seat funzionano subito, senza server):
il repo contiene già [`netlify.toml`](./netlify.toml) — basta collegare il repo a
Netlify (build `pnpm build`, publish `packages/web/dist`, rilevati in automatico).
Per abilitare l'Online imposta su Netlify la variabile d'ambiente
`VITE_SERVER_URL` con l'indirizzo pubblico del server di gioco: diventerà il
valore precompilato nel form di accesso.

**Server di gioco** (necessario solo per l'Online): è un processo persistente con
WebSocket, quindi NON può girare su Netlify Functions. Va su un host tipo
Render/Railway/Fly/VPS col [`Dockerfile`](./packages/server/Dockerfile) incluso:

```bash
docker build -f packages/server/Dockerfile -t vikiland-server .
docker run -p 8787:8787 -v vikiland-data:/data vikiland-server
```

(`PORT`, `HOST` e `DATA_DIR` sono configurabili via ambiente; i dati di
account/partite vivono nel volume `/data`.)

## Stato del progetto

Vedi [PROGRESS.md](./PROGRESS.md) per la roadmap e lo stato di avanzamento.
