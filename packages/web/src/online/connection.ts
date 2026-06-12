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

export interface AccountProfile {
  userId: string;
  email: string;
  displayName: string;
  createdAt: number;
}

async function authedGet(session: OnlineSession, path: string): Promise<unknown> {
  const res = await fetch(`${session.serverUrl}${path}`, {
    headers: { authorization: `Bearer ${session.token}` },
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

export async function apiGetAccount(session: OnlineSession): Promise<AccountProfile> {
  return (await authedGet(session, '/api/account')) as AccountProfile;
}

export async function apiChangeName(
  session: OnlineSession,
  displayName: string
): Promise<AccountProfile> {
  return (await post(session.serverUrl, '/api/account/name', { displayName }, session.token)) as AccountProfile;
}

export async function apiChangeEmail(
  session: OnlineSession,
  email: string,
  password: string
): Promise<AccountProfile> {
  return (await post(session.serverUrl, '/api/account/email', { email, password }, session.token)) as AccountProfile;
}

/** Ritorna la NUOVA sessione: il cambio password revoca tutte le precedenti. */
export async function apiChangePassword(
  session: OnlineSession,
  currentPassword: string,
  newPassword: string
): Promise<OnlineSession> {
  const data = (await post(
    session.serverUrl,
    '/api/account/password',
    { currentPassword, newPassword },
    session.token
  )) as AuthResponse;
  return { ...session, token: data.token, displayName: data.displayName };
}

/**
 * Ping veloce del server di gioco: dice se l'online è disponibile QUI.
 * Senza backend il client resta perfettamente utilizzabile in locale.
 */
export async function checkServerHealth(serverUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/health`, {
      signal: AbortSignal.timeout(3500),
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
