---
name: vikiland-server
description: Connetti e opera sul VPS che ospita Viking Island e le altre app (Traefik, deploy, log, backup, rollback, nuove app). Usa quando l'utente chiede di collegarsi al server, controllare il deploy, vedere i log in produzione, fare un rollback, aggiungere una nuova app sul server, o parla del "server", del "VPS" o di "kingwin" in relazione a questo progetto.
user-invocable: true
---

# Server Viking Island (VPS kingwin)

Un solo VPS Ubuntu 22.04 (container LXC, 1 vCPU, 10 GB RAM, 30 GB disco)
ospita Viking Island e, in futuro, altre app — ognuna in container Docker
separati dietro **Traefik** (certificati HTTPS automatici). Setup e
architettura completi: [`deploy/README.md`](../../deploy/README.md) nel repo.

## Accesso

```bash
ssh -i ~/.ssh/vikiland_deploy deploy@185.91.127.214   # utente operativo, in gruppo docker
ssh root@185.91.127.214                                # solo per amministrazione di sistema
```

- IP server: `185.91.127.214`
- Hostname pubblico attuale (nessun dominio comprato): `185-91-127-214.sslip.io`
  — quando l'utente compra un dominio vero, si aggiorna `APP_HOST` nei
  secrets/variables di GitHub e in `/srv/apps/vikiland/.env` sul server, poi
  si rilancia il deploy. Nessun'altra modifica necessaria.
- Chiave SSH della CI (GitHub Actions): `~/.ssh/vikiland_deploy` (locale, su
  questo Mac) — la pubblica è nei secrets del repo (`DEPLOY_SSH_KEY`).
- L'accesso con password root è disattivato (`PasswordAuthentication no`):
  solo chiave.
- **Nota ambiente**: è un container **LXC**, non una VM piena — niente swap
  interno (lo gestisce l'host), `mkswap` locale non supporta `-q`,
  `ssh.service` è socket-activated (`ssh.socket`): un `reload` su
  `ssh.service` fallisce normalmente, non è un errore.

## Comandi comuni

```bash
# stato dei container di Viking Island
ssh deploy@185.91.127.214 "cd /srv/apps/vikiland && docker compose ps"

# log in diretta
ssh deploy@185.91.127.214 "cd /srv/apps/vikiland && docker compose logs -f server"
ssh deploy@185.91.127.214 "cd /srv/apps/vikiland && docker compose logs -f web"

# log di Traefik (routing, certificati)
ssh deploy@185.91.127.214 "cd /srv/platform && docker compose logs -f traefik"

# deploy manuale di un tag specifico (la CI lo fa già a ogni push)
ssh deploy@185.91.127.214 "/srv/platform/bin/deploy-app.sh vikiland sha-1a2b3c4"

# rollback: stesso comando con il tag precedente, oppure da GitHub Actions
# (tab Actions -> deploy -> Run workflow -> campo image_tag)

# backup immediato di tutti i database delle app
ssh root@185.91.127.214 /srv/platform/bin/backup.sh
ls /srv/backups   # dump compressi, 14 giorni di storico, uno per app

# risorse del server
ssh deploy@185.91.127.214 "docker stats --no-stream; free -h; df -h /"
```

## Autodeploy

Ogni push sul branch `claude/affectionate-wozniak-gqvfw0` fa: controlli
(lint/typecheck/test) → build immagini su GHCR → `docker compose pull && up
-d` via SSH → verifica che `/api/health` e la home rispondano in HTTPS. Se i
container non diventano sani entro 2 minuti, `deploy-app.sh` torna da solo al
tag precedente. Workflow: [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml).

## Aggiungere una nuova app sullo stesso server

```bash
ssh deploy@185.91.127.214
cp -r /srv/apps/_template /srv/apps/NOMEAPP
cd /srv/apps/NOMEAPP
# modifica docker-compose.yml: immagine, porta interna, nomi router Traefik
cp .env.example .env && nano .env   # APP_HOST + password del database
docker compose up -d
```

Poi un dominio/sottodominio (o un altro hostname sslip.io, es.
`185-91-127-214.sslip.io` non basta per due app sullo stesso IP: serve un
path diverso o — meglio — un vero sottodominio quando disponibile) puntato
allo stesso IP, e nella CI di quell'app una riga `deploy-app.sh NOMEAPP
<tag>` via SSH con la stessa chiave.

Regole per non toccare le app già online: mai `ports:` nel compose (solo
Traefik pubblica 80/443), nomi dei router Traefik univoci, database sulla
rete `internal` (mai su `edge`). Dettagli completi in
[`deploy/README.md`](../../deploy/README.md).
