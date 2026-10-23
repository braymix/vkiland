# Server di gioco Vikiland — immagine pronta per VPS/Render/Railway/Fly.
# Va costruita dalla RADICE del monorepo (servono engine, engine-world, bots):
#
#   docker build -f packages/server/Dockerfile -t vikiland-server .
#   docker run -p 8787:8787 -v vikiland-data:/data vikiland-server
#
FROM node:22-alpine

WORKDIR /app
RUN corepack enable

# Prima i manifest (layer cache-abile dell'install)...
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/engine/package.json packages/engine/package.json
COPY packages/engine-world/package.json packages/engine-world/package.json
COPY packages/bots/package.json packages/bots/package.json
COPY packages/server/package.json packages/server/package.json
RUN pnpm install --frozen-lockfile --filter "@vikiland/server..."

# ...poi i sorgenti (source-first: il server gira con tsx, nessuna build).
COPY tsconfig.base.json ./
COPY packages/engine packages/engine
COPY packages/engine-world packages/engine-world
COPY packages/bots packages/bots
COPY packages/server packages/server

ENV PORT=8787
ENV HOST=0.0.0.0
ENV DATA_DIR=/data
VOLUME /data
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:8787/api/health >/dev/null || exit 1

CMD ["pnpm", "--filter", "@vikiland/server", "start"]
