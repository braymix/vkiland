#!/usr/bin/env bash
# Prepara un server Ubuntu/Debian APPENA INSTALLATO a ospitare più app.
# Si lancia UNA volta, come root:
#
#   DEPLOY_PUBKEY="ssh-ed25519 AAAA... deploy@github" \
#   ACME_EMAIL="tua@email.it" \
#   bash bootstrap.sh
#
# Opzioni: HARDEN_SSH=1 (disattiva login con password), SWAP_GB=2, SSH_PORT=22
# Idempotente: si può rilanciare senza rompere niente.
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PUBKEY="${DEPLOY_PUBKEY:?serve DEPLOY_PUBKEY: la chiave SSH PUBBLICA che userà la CI}"
ACME_EMAIL="${ACME_EMAIL:?serve ACME_EMAIL: email per i certificati TLS}"
SWAP_GB="${SWAP_GB:-2}"
SSH_PORT="${SSH_PORT:-22}"
HARDEN_SSH="${HARDEN_SSH:-0}"

[[ $EUID -eq 0 ]] || { echo "!! esegui come root"; exit 1; }

echo "== 1/8 pacchetti di base"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git ufw fail2ban unattended-upgrades \
  postgresql-client rsync jq >/dev/null

echo "== 2/8 Docker (engine + compose)"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh >/dev/null
fi
systemctl enable --now docker >/dev/null

# Log sotto controllo: senza questo i log dei container riempiono il disco.
if [[ ! -f /etc/docker/daemon.json ]]; then
  cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true
}
JSON
  systemctl restart docker
fi

echo "== 3/8 utente di deploy: ${DEPLOY_USER}"
id -u "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos '' "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh"
touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
grep -qxF "$DEPLOY_PUBKEY" "/home/${DEPLOY_USER}/.ssh/authorized_keys" \
  || echo "$DEPLOY_PUBKEY" >> "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"

echo "== 4/8 cartelle della piattaforma"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" /srv /srv/apps /srv/platform /srv/platform/bin
install -d -o root -g root -m 750 /srv/backups

echo "== 5/8 swap da ${SWAP_GB}G (evita gli OOM sui VPS piccoli)"
# Dentro un container LXC lo swap è gestito dall'host: un swapfile interno
# spesso non si attiva (swapon è un no-op silenzioso) e può restare
# "incollato" sul disco (immutabile) finché non lo stacca l'host. Lo saltiamo.
if [[ "$(systemd-detect-virt 2>/dev/null)" == "lxc" ]]; then
  echo "   container LXC: swap gestito dall'host, salto (già attivo lato host)"
elif swapon --show | grep -q '/swapfile'; then
  echo "   già presente"
elif fallocate -l "${SWAP_GB}G" /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_GB*1024)) status=none; then
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  echo "   !! impossibile creare lo swapfile: continuo senza (non bloccante)"
  rm -f /swapfile
fi

echo "== 6/8 firewall (${SSH_PORT} SSH, 80/443 web — tutto il resto chiuso)"
# La porta SSH va aperta PRIMA di accendere ufw, altrimenti ci si chiude fuori.
ufw allow "${SSH_PORT}/tcp" >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban >/dev/null

echo "== 7/8 rete Docker condivisa 'edge'"
docker network inspect edge >/dev/null 2>&1 || docker network create edge >/dev/null

echo "== 8/8 backup notturno dei database (03:00)"
cat > /etc/cron.d/srv-backups <<'CRON'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
0 3 * * * root /srv/platform/bin/backup.sh >> /var/log/srv-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/srv-backups

if [[ "$HARDEN_SSH" == "1" ]]; then
  echo "== extra: SSH solo a chiave"
  cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'SSHD'
PasswordAuthentication no
PermitRootLogin prohibit-password
SSHD
  # Su alcune immagini sshd è socket-activated (ssh.socket): ssh.service
  # resta "inactive" finché non arriva una connessione, e reload fallisce.
  # Non è un problema: ogni nuova connessione parte già con la config
  # aggiornata. Il reload resta solo un "nice to have", non deve bloccare.
  systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
fi

echo
echo "Server pronto. Prossimi passi:"
echo "  1) copia deploy/platform/* in /srv/platform/ (lo fa setup-server.sh dal tuo Mac)"
echo "  2) echo 'ACME_EMAIL=${ACME_EMAIL}' > /srv/platform/.env"
echo "  3) cd /srv/platform && docker compose up -d     # Traefik"
