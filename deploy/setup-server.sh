#!/usr/bin/env bash
# Prepara il server NUOVO e collega l'autodeploy. Si lancia dal tuo Mac, una
# volta sola, quando hai l'accesso root (password o chiave) al server:
#
#   SERVER=1.2.3.4 \
#   APP_HOST=vikiland.tuodominio.it \
#   ACME_EMAIL=michelepanarotto00@gmail.com \
#   bash deploy/setup-server.sh
#
# Cosa fa, in ordine:
#   1. crea (se manca) la chiave SSH dedicata alla CI
#   2. installa Docker, firewall, swap, backup notturni sul server
#   3. copia la piattaforma (Traefik) e lo stack di Viking Island
#   4. genera la password del database e accende Traefik
#   5. salva i segreti su GitHub, così il prossimo push deploya da solo
# È idempotente: rilanciarlo non cancella dati né rigenera la password.
set -euo pipefail

SERVER="${SERVER:?serve SERVER: IP o hostname del server}"
APP_HOST="${APP_HOST:?serve APP_HOST: il dominio dell-app, es. vikiland.tuodominio.it}"
ACME_EMAIL="${ACME_EMAIL:?serve ACME_EMAIL: email per i certificati TLS}"
ROOT_TARGET="${ROOT_TARGET:-root@${SERVER}}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
KEY="${KEY:-$HOME/.ssh/vikiland_deploy}"
HARDEN_SSH="${HARDEN_SSH:-0}"
REPO="${REPO:-braymix/vkiland}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_PORT="${SSH_PORT:-22}"
# Keepalive: senza, una connessione che muore in silenzio (NAT/firewall che
# droppa senza FIN/RST) blocca lo script per sempre invece di fallire.
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ServerAliveInterval=10 -o ServerAliveCountMax=3 -o ConnectTimeout=15 -p "$SSH_PORT")
SCP_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -P "$SSH_PORT")

echo "== 1/5 chiave SSH della CI (${KEY})"
if [[ ! -f "$KEY" ]]; then
  ssh-keygen -t ed25519 -N '' -C 'github-actions@vikiland' -f "$KEY" >/dev/null
  echo "   creata"
else
  echo "   già presente, la riuso"
fi
PUBKEY="$(cat "${KEY}.pub")"

echo "== 2/5 preparazione del server (${ROOT_TARGET})"
ssh "${SSH_OPTS[@]}" "$ROOT_TARGET" \
  "DEPLOY_USER='${DEPLOY_USER}' DEPLOY_PUBKEY='${PUBKEY}' ACME_EMAIL='${ACME_EMAIL}' HARDEN_SSH='${HARDEN_SSH}' SSH_PORT='${SSH_PORT}' bash -s" \
  < "${HERE}/platform/bootstrap.sh"

echo "== 3/5 copia di piattaforma e app"
TARBALL="$(mktemp -t vikiland-deploy)"
trap 'rm -f "$TARBALL"' EXIT
tar -C "$HERE" -czf "$TARBALL" \
  platform/docker-compose.yml platform/bin apps/vikiland/docker-compose.yml apps/_template
scp "${SCP_OPTS[@]}" -q "$TARBALL" "${ROOT_TARGET}:/tmp/vikiland-deploy.tgz"
ssh "${SSH_OPTS[@]}" "$ROOT_TARGET" "DEPLOY_USER='${DEPLOY_USER}' bash -s" <<'REMOTE'
set -euo pipefail
install -d /srv/platform/bin /srv/apps/vikiland
rm -rf /tmp/vikiland-unpack && install -d /tmp/vikiland-unpack
tar -C /tmp/vikiland-unpack -xzf /tmp/vikiland-deploy.tgz
cp /tmp/vikiland-unpack/platform/docker-compose.yml /srv/platform/
cp /tmp/vikiland-unpack/platform/bin/*.sh /srv/platform/bin/
chmod +x /srv/platform/bin/*.sh
cp /tmp/vikiland-unpack/apps/vikiland/docker-compose.yml /srv/apps/vikiland/
cp -r /tmp/vikiland-unpack/apps/_template /srv/apps/
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" /srv/apps /srv/platform
rm -rf /tmp/vikiland-unpack /tmp/vikiland-deploy.tgz
echo "   piattaforma in /srv/platform, app in /srv/apps/vikiland"
REMOTE

echo "== 4/5 configurazione e avvio di Traefik"
ssh "${SSH_OPTS[@]}" "$ROOT_TARGET" "APP_HOST='${APP_HOST}' ACME_EMAIL='${ACME_EMAIL}' DEPLOY_USER='${DEPLOY_USER}' bash -s" <<'REMOTE'
set -euo pipefail
echo "ACME_EMAIL=${ACME_EMAIL}" > /srv/platform/.env

# La password del database si genera UNA volta: se il file c'è già, non si
# tocca (cambiarla renderebbe illeggibile il database esistente).
ENV_FILE=/srv/apps/vikiland/.env
if [[ ! -f "$ENV_FILE" ]]; then
  {
    echo "APP_HOST=${APP_HOST}"
    echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
    echo "IMAGE_TAG=latest"
  } > "$ENV_FILE"
  echo "   .env creato con password nuova"
else
  sed -i "s|^APP_HOST=.*|APP_HOST=${APP_HOST}|" "$ENV_FILE"
  echo "   .env già presente: aggiornato solo APP_HOST"
fi
chmod 600 "$ENV_FILE" && chown "${DEPLOY_USER}:${DEPLOY_USER}" "$ENV_FILE"

cd /srv/platform && docker compose up -d
docker compose ps
REMOTE

echo "== 5/5 segreti su GitHub (${REPO})"
if command -v gh >/dev/null; then
  gh secret set DEPLOY_HOST --repo "$REPO" --body "$SERVER"
  gh secret set DEPLOY_SSH_KEY --repo "$REPO" < "$KEY"
  gh variable set APP_HOST --repo "$REPO" --body "$APP_HOST"
  gh variable set DEPLOY_USER --repo "$REPO" --body "$DEPLOY_USER"
  gh variable set DEPLOY_PORT --repo "$REPO" --body "$SSH_PORT"
  echo "   fatto"
else
  echo "   !! gh non installato: imposta a mano su GitHub"
  echo "      secret DEPLOY_HOST = ${SERVER}"
  echo "      secret DEPLOY_SSH_KEY = contenuto di ${KEY}"
  echo "      variable APP_HOST = ${APP_HOST}"
  echo "      variable DEPLOY_USER = ${DEPLOY_USER}"
  echo "      variable DEPLOY_PORT = ${SSH_PORT}"
fi

cat <<FINE

Tutto pronto lato server.

DNS: crea un record A   ${APP_HOST}  ->  ${SERVER}
     (e un A per ogni app futura: app2.tuodominio.it -> ${SERVER})

Poi fai un push sul branch di produzione: la CI builda le immagini e mette
Viking Island online su https://${APP_HOST} (certificato automatico).
FINE
