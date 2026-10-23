# Client Vikiland: build Vite + PWA, servita da nginx.
# Va costruita dalla RADICE del monorepo (servono engine, bots, protocol):
#
#   docker build -f packages/web/Dockerfile \
#     --build-arg VITE_SERVER_URL=https://vikiland.esempio.it \
#     -t vikiland-web .
#
FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable

# Prima i manifest (layer cache-abile dell'install)...
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/engine/package.json packages/engine/package.json
COPY packages/engine-world/package.json packages/engine-world/package.json
COPY packages/bots/package.json packages/bots/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/web/package.json packages/web/package.json
RUN pnpm install --frozen-lockfile --filter "@vikiland/web..."

# ...poi i sorgenti.
COPY tsconfig.base.json ./
COPY packages/engine packages/engine
COPY packages/engine-world packages/engine-world
COPY packages/bots packages/bots
COPY packages/server packages/server
COPY packages/web packages/web

# Indirizzo pubblico del server di gioco: finisce DENTRO il bundle, quindi è
# un argomento di build (non una variabile di runtime). In produzione è lo
# stesso host del client (/api e /socket.io li inoltra Traefik al server).
ARG VITE_SERVER_URL=""
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN pnpm --filter @vikiland/web build

FROM nginx:1.27-alpine
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
