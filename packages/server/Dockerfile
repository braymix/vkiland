# Server di gioco Vikiland — immagine pronta per Render/Railway/Fly/VPS.
# Va costruita dalla RADICE del monorepo (servono engine e bots):
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
COPY packages/bots/package.json packages/bots/package.json
COPY packages/server/package.json packages/server/package.json
RUN pnpm install --frozen-lockfile --filter "@vikiland/server..."

# ...poi i sorgenti (source-first: il server gira con tsx, nessuna build).
COPY packages/engine packages/engine
COPY packages/bots packages/bots
COPY packages/server packages/server

ENV PORT=8787
ENV HOST=0.0.0.0
ENV DATA_DIR=/data
VOLUME /data
EXPOSE 8787

CMD ["pnpm", "--filter", "@vikiland/server", "start"]
