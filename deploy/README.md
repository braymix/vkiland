# Deploy — un server, molte app

Viking Island gira sul tuo server dentro container Docker, dietro un unico
"portiere" (Traefik) che gestisce domini e certificati HTTPS. Ogni app futura
si aggiunge accanto, senza toccare quelle già online.

```
                    internet
                       │  :80 → redirect :443
                       ▼
        ┌──────────────────────────────┐
        │  Traefik  (/srv/platform)    │  certificati Let's Encrypt automatici
        └───┬───────────────────┬──────┘
   rete edge│                   │
            ▼                   ▼
  ┌─────────────────────┐   ┌───────────────────┐
  │ vikiland.DOMINIO    │   │ app2.DOMINIO      │   ← app future, stessa ricetta
  │ /srv/apps/vikiland  │   │ /srv/apps/app2    │
  │                     │   │                   │
  │  web (nginx+PWA)    │   │  app              │
  │  server (Socket.io) │   │                   │
  │  db (Postgres)      │   │  db (Postgres)    │  ← un database per app,
  └─────────────────────┘   └───────────────────┘     rete interna, non esposto
```

Un solo dominio per app serve sia il client sia il server:

| Percorso        | Va a                         |
| --------------- | ---------------------------- |
| `/`             | client (build Vite + PWA)    |
| `/api/*`        | server di gioco (REST)       |
| `/socket.io/*`  | server di gioco (WebSocket)  |

Stessa origine ⇒ niente CORS, un solo certificato, WebSocket in HTTPS.

## Cosa serve per l'installazione iniziale

1. IP del server + accesso `root` (password o chiave SSH)
2. un dominio o sottodominio, con la possibilità di creare un record DNS **A**

## Installazione (una volta sola)

```bash
SERVER=1.2.3.4 \
APP_HOST=vikiland.tuodominio.it \
ACME_EMAIL=michelepanarotto00@gmail.com \
bash deploy/setup-server.sh
```

Lo script: crea la chiave SSH della CI, installa Docker/firewall/swap/backup
notturni, copia la piattaforma e lo stack dell'app, genera la password del
database, accende Traefik e salva i segreti su GitHub.

Prima del primo deploy serve il **record DNS A** `vikiland.tuodominio.it →
1.2.3.4`: senza, Let's Encrypt non può emettere il certificato.

Una volta sola, su GitHub → *Packages* → `vkiland-web` e `vkiland-server` →
*Package settings* → **Change visibility: Public**, così il server scarica le
immagini senza credenziali.

## Autodeploy

Ogni push sul branch di produzione (`claude/affectionate-wozniak-gqvfw0`,
vedi `.github/workflows/deploy.yml`) fa:

1. **controlli** — `pnpm lint`, `typecheck`, `test`. Se falliscono, STOP: in
   produzione resta la versione precedente.
2. **build** — due immagini su GHCR, taggate `sha-<commit>` e `latest`.
3. **deploy** — via SSH: `docker compose pull` + `up -d`, attesa che i
   container siano *healthy*, e **rollback automatico** al tag precedente se
   non lo diventano entro 2 minuti.
4. **verifica** — `/api/health` e la home devono rispondere in HTTPS.

Modifiche solo a `*.md` o `docs/` non fanno ripartire il deploy.

### Rollback manuale

GitHub → *Actions* → *deploy* → **Run workflow** → `image_tag` = `sha-1a2b3c4`
(il tag di un commit precedente). Salta build e controlli, rimette online
quella versione in pochi secondi. Dal server, equivalente:

```bash
/srv/platform/bin/deploy-app.sh vikiland sha-1a2b3c4
```

## Aggiungere un'app (in futuro)

```bash
ssh deploy@SERVER
cp -r /srv/apps/_template /srv/apps/app2
cd /srv/apps/app2
# modifica docker-compose.yml (nome immagine, porta, nomi dei router Traefik)
cp .env.example .env && nano .env      # APP_HOST + password del database
docker compose up -d
```

Poi il record DNS `app2.tuodominio.it → SERVER` e, nella CI di quell'app, una
riga identica a quella di Viking Island:

```bash
ssh deploy@SERVER "/srv/platform/bin/deploy-app.sh app2 <tag>"
```

Tre regole per non disturbare le app già online:

- **mai** `ports:` in un'app — l'unico che pubblica 80/443 è Traefik;
- nomi dei router/service Traefik **unici** (prefissali col nome dell'app);
- il database sulla rete `internal`, mai su `edge`.

Le app convivono senza vedersi: reti separate, volumi separati, database
separati. Un deploy di Viking Island non ferma le altre (e viceversa).

## Backup

`/srv/platform/bin/backup.sh` gira ogni notte alle 03:00 (cron) e salva un
dump compresso per ogni app in `/srv/backups`, tenendo 14 giorni.

```bash
# backup immediato
ssh root@SERVER /srv/platform/bin/backup.sh

# ripristino di un dump
gunzip -c /srv/backups/vikiland-2026-10-23-0300.sql.gz \
  | docker compose -f /srv/apps/vikiland/docker-compose.yml exec -T db psql -U vikiland
```

I dump restano **sul server**: conviene scaricarli ogni tanto in locale
(`scp root@SERVER:/srv/backups/*.sql.gz .`).

## Comandi utili

```bash
cd /srv/apps/vikiland
docker compose ps                  # stato dei container
docker compose logs -f server      # log del server di gioco
docker compose logs -f web
docker compose restart server
docker compose exec db psql -U vikiland        # console del database

cd /srv/platform && docker compose logs -f traefik   # certificati, routing
docker stats                       # CPU/RAM per container
```

## Note

- `netlify.toml` e `render.yaml` restano nel repo come alternative storiche.
  Se il server diventa la produzione, **disattiva l'autodeploy su Render**
  (`autoDeploy: true`) per non avere due produzioni che si contraddicono.
- Il service worker della PWA non viene messo in cache da nginx (`sw.js`,
  `index.html` con `no-cache`): dopo un deploy i client aggiornano da soli.
- Il database **non** è raggiungibile da internet: nessuna porta pubblicata,
  solo la rete Docker interna dell'app.
