# VIKING-ISLAND

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

**Online al 100% (client Netlify + server Render)** — il server di gioco è un
processo persistente con WebSocket: NON può girare su Netlify Functions. Il repo
contiene [`render.yaml`](./render.yaml) per il deploy a 3 click su Render
(piano free, senza carta di credito):

1. Vai su [render.com](https://render.com) → registrati → **New + → Blueprint**
   → collega questo repository → **Apply**. Render costruisce il
   [`Dockerfile`](./packages/server/Dockerfile) del server e lo pubblica in
   HTTPS, es. `https://vikiland-server.onrender.com`.
2. Verifica che risponda: apri `https://<servizio>.onrender.com/api/health`
   (deve mostrare `{"ok":true}` — al primo colpo può metterci ~1 minuto:
   il piano free si addormenta dopo 15 minuti di inattività).
3. Su Netlify: **Site settings → Environment variables** → aggiungi
   `VITE_SERVER_URL = https://<servizio>.onrender.com` → **Deploys →
   Trigger deploy**. Da quel momento il form Online del sito arriva
   precompilato con il tuo server (spunta verde) e si gioca online.

Limiti del free di Render: risveglio lento dopo l'inattività e dischi
effimeri (account e partite si azzerano a ogni deploy del server). Per un
servizio stabile: piano a pagamento o VPS, stesso Dockerfile:

```bash
docker build -f packages/server/Dockerfile -t vikiland-server .
docker run -p 8787:8787 -v vikiland-data:/data vikiland-server
```

(`PORT`, `HOST` e `DATA_DIR` sono configurabili via ambiente; i dati di
account/partite vivono nel volume `/data`.)

## Persistenza durevole (PostgreSQL / filess.io)

Sul free di Render il disco è **effimero**: account e partite si azzerano a
ogni deploy. Per renderli **permanenti** basta puntare il server a un database
PostgreSQL gestito. [filess.io](https://filess.io) ne offre uno gratis:

1. **Crea il database** — su [filess.io](https://filess.io) registrati →
   *Create Database* → scegli **PostgreSQL**. A creazione avvenuta apri il
   database: nella scheda *Connection* trovi **Host, Port, Database name,
   Username, Password**.
2. **Componi la connection string** in questo formato:

   ```
   postgresql://UTENTE:PASSWORD@HOST:PORTA/NOMEDB
   ```

   (usa esattamente i valori del passo 1; se la password ha caratteri strani
   vanno codificati per URL).
3. **Collegala al server** — imposta la variabile d'ambiente `DATABASE_URL` con
   quella stringa (su Render: *Environment → Add Environment Variable*; in
   locale: `DATABASE_URL=... pnpm server`). Riavvia: nei log comparirà
   `[storage] PostgreSQL: dati persistenti`. Il server crea da solo le tabelle
   al primo avvio — non devi eseguire nessuna migrazione a mano.

Senza `DATABASE_URL` il server continua a usare il file JSON in `DATA_DIR`
(comodo in sviluppo).

**SSL:** filess.io **non** usa SSL, quindi lascia `DATABASE_SSL` non impostata
(e se la tua `DATABASE_URL` contiene `?sslmode=require`, il server lo ignora da
solo per non andare in crash). Solo su host che *richiedono* TLS (es. Neon,
Supabase) imposta `DATABASE_SSL=true`.

**Schema:** non serve crearne uno a mano. Il server usa `public` se esiste,
altrimenti si crea da solo uno schema dedicato `vikiland` (è il caso di
filess.io, che all'utente non dà `public`: senza questo si otterrebbe l'errore
*"no schema has been selected to create in"*). Per forzare uno schema preciso,
imposta `DB_SCHEMA`.

Come funziona: il server tiene i dati **in memoria** e li scrive sul database in
background (write-through), ricaricandoli all'avvio. Così le letture restano
istantanee e un'eventuale lentezza del DB non blocca il gioco.

## Stato del progetto

Vedi [PROGRESS.md](./PROGRESS.md) per la roadmap e lo stato di avanzamento.
