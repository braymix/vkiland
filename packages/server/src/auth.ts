/**
 * Account e sessioni. Password con scrypt (node:crypto, parametri OWASP):
 * nessuna dipendenza nativa, funziona ovunque. Il formato dell'hash è
 * versionato nel campo stesso, quindi un futuro passaggio ad argon2id può
 * convivere con gli hash esistenti.
 */
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Storage, UserRecord } from './storage';

const SCRYPT_N = 1 << 15; // 32768
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const expected = Buffer.from(hashHex!, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex!, 'hex'), expected.length, {
    N: Number(nStr),
    r: Number(rStr),
    p: Number(pStr),
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(expected, actual);
}

export interface AuthResult {
  ok: true;
  token: string;
  userId: string;
  username: string;
}
export interface AuthFailure {
  ok: false;
  error: string;
}

/** Il nome utente È il nome in gioco: 1–12 caratteri, unico (case-insensitive). */
function validateUsername(raw: string): string | AuthFailure {
  const name = raw.trim();
  if (name.length < 1 || name.length > 12)
    return { ok: false, error: 'Il nome utente deve avere 1–12 caratteri' };
  return name;
}

export class AuthService {
  constructor(private readonly storage: Storage) {}

  register(username: string, password: string): AuthResult | AuthFailure {
    const name = validateUsername(username);
    if (typeof name !== 'string') return name;
    if (password.length < 8) return { ok: false, error: 'Password troppo corta (minimo 8 caratteri)' };
    if (this.storage.getUserByUsername(name))
      return { ok: false, error: 'Nome utente già in uso' };

    const user: UserRecord = {
      id: randomUUID(),
      username: name,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    };
    this.storage.createUser(user);
    return this.newSession(user);
  }

  login(username: string, password: string): AuthResult | AuthFailure {
    const user = this.storage.getUserByUsername(username);
    if (!user || !verifyPassword(password, user.passwordHash))
      return { ok: false, error: 'Nome utente o password errati' };
    return this.newSession(user);
  }

  /** Valida un token di sessione → utente (per REST e handshake socket). */
  authenticate(token: string): UserRecord | null {
    const session = this.storage.getSession(token);
    if (!session) return null;
    return this.storage.getUserById(session.userId);
  }

  logout(token: string): void {
    this.storage.deleteSession(token);
  }

  /** I pochi dati che salviamo, SENZA l'hash della password. */
  getProfile(userId: string): { userId: string; username: string; createdAt: number } | null {
    const user = this.storage.getUserById(userId);
    if (!user) return null;
    return {
      userId: user.id,
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  changeUsername(userId: string, username: string): AuthFailure | null {
    const user = this.storage.getUserById(userId);
    if (!user) return { ok: false, error: 'Utente non trovato' };
    const name = validateUsername(username);
    if (typeof name !== 'string') return name;
    const existing = this.storage.getUserByUsername(name);
    if (existing && existing.id !== userId)
      return { ok: false, error: 'Nome utente già in uso' };
    this.storage.updateUser({ ...user, username: name });
    return null;
  }

  /**
   * Cambio password: verifica l'attuale, REVOCA tutte le sessioni (anche su
   * altri dispositivi) e ne apre una nuova per chi ha fatto il cambio.
   */
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): AuthResult | AuthFailure {
    const user = this.storage.getUserById(userId);
    if (!user) return { ok: false, error: 'Utente non trovato' };
    if (!verifyPassword(currentPassword, user.passwordHash))
      return { ok: false, error: 'Password attuale errata' };
    if (newPassword.length < 8)
      return { ok: false, error: 'Password troppo corta (minimo 8 caratteri)' };
    this.storage.updateUser({ ...user, passwordHash: hashPassword(newPassword) });
    this.storage.deleteSessionsByUser(userId);
    return this.newSession({ ...user });
  }

  private newSession(user: UserRecord): AuthResult {
    const token = randomBytes(32).toString('hex');
    this.storage.createSession({ token, userId: user.id, createdAt: Date.now() });
    return { ok: true, token, userId: user.id, username: user.username };
  }
}
