#!/usr/bin/env bash
# Deploy di UNA app sul server. Lo chiama la CI via SSH:
#
#   deploy-app.sh <nome-app> <tag-immagine>
#   deploy-app.sh vikiland sha-1a2b3c4
#
# Cosa fa: fissa il tag nel .env dell'app, scarica le immagini, riavvia i
# container, aspetta che siano sani e — se non lo diventano — torna
# automaticamente al tag precedente. Idempotente: rilanciarlo non fa danni.
set -euo pipefail

APP="${1:?uso: deploy-app.sh <nome-app> <tag-immagine>}"
TAG="${2:?uso: deploy-app.sh <nome-app> <tag-immagine>}"
APP_DIR="/srv/apps/${APP}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"

cd "$APP_DIR" || { echo "!! app sconosciuta: $APP_DIR non esiste"; exit 1; }

# Tag attualmente in produzione: serve per il rollback.
PREV_TAG="$(grep -E '^IMAGE_TAG=' .env 2>/dev/null | cut -d= -f2- || true)"
PREV_TAG="${PREV_TAG:-latest}"
echo ">> ${APP}: ${PREV_TAG} -> ${TAG}"

set_tag() {
  if grep -qE '^IMAGE_TAG=' .env; then
    sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$1|" .env
  else
    echo "IMAGE_TAG=$1" >> .env
  fi
}

# Attende che TUTTI i container con healthcheck dello stack siano "healthy".
wait_healthy() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT))
  while (( SECONDS < deadline )); do
    local ids unhealthy=0
    ids="$(docker compose ps -q)"
    [[ -z "$ids" ]] && { sleep 3; continue; }
    for id in $ids; do
      local state health
      state="$(docker inspect -f '{{.State.Status}}' "$id")"
      health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id")"
      [[ "$state" != running ]] && unhealthy=1
      [[ "$health" == starting || "$health" == unhealthy ]] && unhealthy=1
    done
    (( unhealthy == 0 )) && return 0
    sleep 3
  done
  return 1
}

set_tag "$TAG"
docker compose pull --quiet
docker compose up -d --remove-orphans

if wait_healthy; then
  echo ">> ${APP} online sul tag ${TAG}"
  # Tiene il disco pulito senza toccare i volumi (i dati restano).
  docker image prune -af --filter 'until=168h' >/dev/null 2>&1 || true
else
  echo "!! ${APP}: container non sani entro ${HEALTH_TIMEOUT}s — rollback a ${PREV_TAG}"
  docker compose logs --tail 80 || true
  set_tag "$PREV_TAG"
  docker compose up -d --remove-orphans
  exit 1
fi
