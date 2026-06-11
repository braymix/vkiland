/**
 * Connessione al server Vikiland: autenticazione REST + socket autenticato.
 * La sessione (token) è ricordata in localStorage per riconnettersi al volo.
 */
import { io, type Socket } from 'socket.io-client';
import type {
  AuthResponse,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@vikiland/server/protocol';

export type ServerSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface OnlineSession {
  serverUrl: string;
  token: string;
  userId: string;
  displayName: string;
}

const STORAGE_KEY = 'vikiland-online-session';

export function defaultServerUrl(): string {
  // In produzione (es. Netlify) l'indirizzo del server arriva dalla build.
  const fromEnv = import.meta.env.VITE_SERVER_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv.replace(/\/+$/, '');
  // In sviluppo: stesso host della pagina, porta del server (comodo in LAN).
  return `${location.protocol}//${location.hostname}:8787`;
}

export function loadSession(): OnlineSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OnlineSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: OnlineSession | null): void {
  if (session === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

async function post(serverUrl: string, path: string, body: unknown, token?: string) {
  const res = await fetch(`${serverUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Errore ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export async function apiRegister(
  serverUrl: string,
  email: string,
  password: string,
  displayName: string
): Promise<OnlineSession> {
  const data = (await post(serverUrl, '/api/register', { email, password, displayName })) as AuthResponse;
  return { serverUrl, token: data.token, userId: data.userId, displayName: data.displayName };
}

export async function apiLogin(
  serverUrl: string,
  email: string,
  password: string
): Promise<OnlineSession> {
  const data = (await post(serverUrl, '/api/login', { email, password })) as AuthResponse;
  return { serverUrl, token: data.token, userId: data.userId, displayName: data.displayName };
}

/** Verifica che una sessione salvata sia ancora valida. */
export async function apiMe(session: OnlineSession): Promise<boolean> {
  try {
    const res = await fetch(`${session.serverUrl}/api/me`, {
      headers: { authorization: `Bearer ${session.token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function connectSocket(session: OnlineSession): ServerSocket {
  return io(session.serverUrl, {
    auth: { token: session.token },
    reconnection: true,
  });
}
