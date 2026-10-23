#!/usr/bin/env bash
# Backup di TUTTI i database delle app (uno per app) in /srv/backups.
# Da cron, ogni notte:  0 3 * * * /srv/platform/bin/backup.sh
set -euo pipefail

DEST="${BACKUP_DIR:-/srv/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%F-%H%M)"
mkdir -p "$DEST"

# Ogni app che ha un servizio "db" nel suo compose viene salvata.
for app_dir in /srv/apps/*/; do
  app="$(basename "$app_dir")"
  [[ "$app" == _* ]] && continue
  cd "$app_dir"
  docker compose ps --services 2>/dev/null | grep -qx db || continue

  out="${DEST}/${app}-${STAMP}.sql.gz"
  echo ">> dump ${app} -> ${out}"
  # pg_dumpall dentro il container: nessuna porta esposta all'esterno.
  if docker compose exec -T db sh -c 'pg_dumpall -U "$POSTGRES_USER"' | gzip > "$out"; then
    echo "   ok ($(du -h "$out" | cut -f1))"
  else
    echo "   !! dump di ${app} FALLITO"
    rm -f "$out"
  fi
done

# Ritenzione: butta i dump più vecchi di KEEP_DAYS giorni.
find "$DEST" -name '*.sql.gz' -mtime "+${KEEP_DAYS}" -delete
