/**
 * Bootstrap del server Vikiland (Fase 3 — online).
 *
 *   REST  (Fastify):  /api/register · /api/login · /api/logout · /api/me
 *   Socket (Socket.io): lobby:* e game:* — vedi `protocol.ts`
 *
 * Avvio:  pnpm --filter @vikiland/server dev   (porta 8787, override: PORT)
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { Server, type Socket } from 'socket.io';
import type { Action } from '@vikiland/engine';
import { AuthService } from './auth';
import { LobbyManager } from './lobby';
import { JsonFileStorage } from './storage';
import { isApiError, type ClientToServerEvents, type LoginRequest, type RegisterRequest, type ServerToClientEvents } from './protocol';

const PORT = Number(process.env['PORT'] ?? 8787);
const HOST = process.env['HOST'] ?? '0.0.0.0';
const DATA_DIR =
  process.env['DATA_DIR'] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

const storage = new JsonFileStorage(DATA_DIR);
const auth = new AuthService(storage);

const app = Fastify({ logger: { level: 'warn' } });
await app.register(fastifyCors, { origin: true });

type AnySocket = Socket<ClientToServerEvents, ServerToClientEvents>;
const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
  cors: { origin: true },
});

/** Socket attivi per utente (per presenza e recapito mirato delle viste). */
const userSockets = new Map<string, Set<AnySocket>>();

const lobbies = new LobbyManager({
  broadcastLobby: (state) => io.to(`lobby:${state.code}`).emit('lobby:state', state),
  lobbyClosed: (code, reason) => {
    io.to(`lobby:${code}`).emit('lobby:closed', { error: reason });
    io.in(`lobby:${code}`).socketsLeave(`lobby:${code}`);
  },
  userRemoved: (userId, code, reason) => {
    io.to(`user:${userId}`).emit('lobby:closed', { error: reason });
    io.in(`user:${userId}`).socketsLeave(`lobby:${code}`);
  },
  sendUpdate: (userId, update) => io.to(`user:${userId}`).emit('game:update', update),
  sendRejected: (userId, message, generation) =>
    io.to(`user:${userId}`).emit('game:rejected', { message, generation }),
  gameFinished: (record) => storage.appendFinishedGame(record),
});

// ---------------------------------------------------------------------------
// REST: autenticazione
// ---------------------------------------------------------------------------

app.post('/api/register', async (req, reply) => {
  const body = (req.body ?? {}) as Partial<RegisterRequest>;
  const res = auth.register(body.email ?? '', body.password ?? '', body.displayName ?? '');
  if (!res.ok) return reply.code(400).send({ error: res.error });
  return { token: res.token, userId: res.userId, displayName: res.displayName };
});

app.post('/api/login', async (req, reply) => {
  const body = (req.body ?? {}) as Partial<LoginRequest>;
  const res = auth.login(body.email ?? '', body.password ?? '');
  if (!res.ok) return reply.code(401).send({ error: res.error });
  return { token: res.token, userId: res.userId, displayName: res.displayName };
});

app.post('/api/logout', async (req) => {
  const token = bearerOf(req.headers.authorization);
  if (token) auth.logout(token);
  return { ok: true };
});

app.get('/api/me', async (req, reply) => {
  const token = bearerOf(req.headers.authorization);
  const user = token ? auth.authenticate(token) : null;
  if (!user) return reply.code(401).send({ error: 'Sessione non valida' });
  return { userId: user.id, displayName: user.displayName };
});

// --- Gestione account (richiede Bearer token) -------------------------------

app.get('/api/account', async (req, reply) => {
  const user = authedUser(req.headers.authorization);
  if (!user) return reply.code(401).send({ error: 'Sessione non valida' });
  return auth.getProfile(user.id);
});

app.post('/api/account/name', async (req, reply) => {
  const user = authedUser(req.headers.authorization);
  if (!user) return reply.code(401).send({ error: 'Sessione non valida' });
  const body = (req.body ?? {}) as { displayName?: string };
  const err = auth.changeDisplayName(user.id, body.displayName ?? '');
  if (err) return reply.code(400).send({ error: err.error });
  return auth.getProfile(user.id);
});

app.post('/api/account/email', async (req, reply) => {
  const user = authedUser(req.headers.authorization);
  if (!user) return reply.code(401).send({ error: 'Sessione non valida' });
  const body = (req.body ?? {}) as { email?: string; password?: string };
  const err = auth.changeEmail(user.id, body.email ?? '', body.password ?? '');
  if (err) return reply.code(400).send({ error: err.error });
  return auth.getProfile(user.id);
});

app.post('/api/account/password', async (req, reply) => {
  const user = authedUser(req.headers.authorization);
  if (!user) return reply.code(401).send({ error: 'Sessione non valida' });
  const body = (req.body ?? {}) as { currentPassword?: string; newPassword?: string };
  const res = auth.changePassword(user.id, body.currentPassword ?? '', body.newPassword ?? '');
  if (!res.ok) return reply.code(400).send({ error: res.error });
  // Tutte le vecchie sessioni sono revocate: ecco il nuovo token.
  return { token: res.token, userId: res.userId, displayName: res.displayName };
});

function authedUser(header: string | undefined) {
  const token = bearerOf(header);
  return token ? auth.authenticate(token) : null;
}

app.get('/api/health', async () => ({ ok: true }));

function bearerOf(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

// ---------------------------------------------------------------------------
// Socket.io: handshake autenticato, lobby e partita
// ---------------------------------------------------------------------------

io.use((socket, next) => {
  const token = (socket.handshake.auth as { token?: string }).token;
  const user = token ? auth.authenticate(token) : null;
  if (!user) return next(new Error('Sessione non valida'));
  socket.data = { userId: user.id, name: user.displayName };
  next();
});

io.on('connection', (socket: AnySocket) => {
  const { userId, name } = socket.data as { userId: string; name: string };
  socket.join(`user:${userId}`);
  let set = userSockets.get(userId);
  if (!set) userSockets.set(userId, (set = new Set()));
  set.add(socket);
  lobbies.setConnected(userId, true);

  // Riconnessione: se l'utente era in una lobby/partita, lo riaggancia subito.
  const current = lobbies.lobbyOfUser(userId);
  if (current) {
    socket.join(`lobby:${current.code}`);
    socket.emit('lobby:state', lobbies.toState(current));
    if (current.started) lobbies.refreshGame(userId);
  }

  socket.on('lobby:create', (config, cb) => {
    const res = lobbies.create({ id: userId, name }, config);
    if (!isApiError(res)) socket.join(`lobby:${res.code}`);
    cb(res);
  });

  socket.on('lobby:join', (code, cb) => {
    const res = lobbies.join(code, { id: userId, name });
    if (!isApiError(res)) {
      socket.join(`lobby:${res.code}`);
      if (res.started) lobbies.refreshGame(userId);
    }
    cb(res);
  });

  socket.on('lobby:leave', () => {
    const lobby = lobbies.lobbyOfUser(userId);
    if (lobby) socket.leave(`lobby:${lobby.code}`);
    lobbies.leave(userId);
  });

  socket.on('lobby:addBot', (level) => {
    const res = lobbies.addBot(userId, level);
    if (isApiError(res)) socket.emit('lobby:error', res);
  });

  socket.on('lobby:removeSlot', (index) => {
    const res = lobbies.removeSlot(userId, Number(index));
    if (isApiError(res)) socket.emit('lobby:error', res);
  });

  socket.on('lobby:start', () => {
    const res = lobbies.start(userId);
    if (isApiError(res)) socket.emit('lobby:error', res);
  });

  socket.on('lobby:terminate', () => {
    const err = lobbies.terminate(userId);
    if (err) socket.emit('lobby:error', err);
  });

  socket.on('game:action', (action: Action) => lobbies.handleAction(userId, action));
  socket.on('game:refresh', () => lobbies.refreshGame(userId));

  socket.on('disconnect', () => {
    const sockets = userSockets.get(userId);
    sockets?.delete(socket);
    if (!sockets || sockets.size === 0) {
      userSockets.delete(userId);
      lobbies.setConnected(userId, false);
    }
  });
});

await app.listen({ port: PORT, host: HOST });
console.log(`Vikiland server in ascolto su http://${HOST}:${PORT} (dati: ${DATA_DIR})`);
