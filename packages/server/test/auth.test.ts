/** Test di registrazione, login e sessioni (solo username + password). */
import { describe, expect, it } from 'vitest';
import { AuthService, hashPassword, verifyPassword } from '../src/auth';
import { MemoryStorage } from '../src/storage';

describe('hash delle password (scrypt)', () => {
  it('verifica la password giusta e rifiuta quella sbagliata', () => {
    const h = hashPassword('segretissima1');
    expect(verifyPassword('segretissima1', h)).toBe(true);
    expect(verifyPassword('sbagliata', h)).toBe(false);
  });

  it('sali diversi ⇒ hash diversi per la stessa password', () => {
    expect(hashPassword('x'.repeat(10))).not.toBe(hashPassword('x'.repeat(10)));
  });
});

describe('AuthService', () => {
  const make = () => new AuthService(new MemoryStorage());

  it('registra, fa login e autentica il token', () => {
    const auth = make();
    const reg = auth.register('Bjorn', 'password123');
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    expect(auth.authenticate(reg.token)?.username).toBe('Bjorn');

    // Il login sul nome utente è case-insensitive.
    const login = auth.login('BJORN', 'password123');
    expect(login.ok).toBe(true);
  });

  it('rifiuta nomi doppi (anche con maiuscole diverse), vuoti, lunghi o password corte', () => {
    const auth = make();
    expect(auth.register('Astrid', 'password123').ok).toBe(true);
    expect(auth.register('astrid', 'password456').ok).toBe(false);
    expect(auth.register('', 'password123').ok).toBe(false);
    expect(auth.register('NomeTroppoLungo!!', 'password123').ok).toBe(false);
    expect(auth.register('Leif', 'corta').ok).toBe(false);
  });

  it('profilo: espone i dati salvati ma MAI l’hash della password (né email: non esiste)', () => {
    const auth = make();
    const reg = auth.register('Sigrid', 'password123');
    if (!reg.ok) throw new Error('registrazione fallita');
    const profile = auth.getProfile(reg.userId)!;
    expect(profile.username).toBe('Sigrid');
    expect(profile.createdAt).toBeGreaterThan(0);
    expect(Object.keys(profile)).not.toContain('passwordHash');
    expect(Object.keys(profile)).not.toContain('email');
  });

  it('cambia nome utente con validazione e unicità', () => {
    const auth = make();
    const reg = auth.register('Olaf', 'password123');
    auth.register('Freya', 'password123');
    if (!reg.ok) throw new Error('registrazione fallita');
    expect(auth.changeUsername(reg.userId, 'OlafIlGrande')).toBeNull();
    expect(auth.getProfile(reg.userId)!.username).toBe('OlafIlGrande');
    expect(auth.changeUsername(reg.userId, '')).not.toBeNull();
    expect(auth.changeUsername(reg.userId, 'freya')).not.toBeNull(); // già in uso
    // Re-impostare il PROPRIO nome (cambiando solo le maiuscole) è permesso.
    expect(auth.changeUsername(reg.userId, 'olafilgrande')).toBeNull();
    // Dopo il cambio nome si accede col nuovo.
    expect(auth.login('olafilgrande', 'password123').ok).toBe(true);
    expect(auth.login('Olaf', 'password123').ok).toBe(false);
  });

  it('cambia password: revoca le vecchie sessioni e ne apre una nuova', () => {
    const auth = make();
    const reg = auth.register('Ragnhild', 'vecchiapass1');
    if (!reg.ok) throw new Error('registrazione fallita');
    expect(auth.changePassword(reg.userId, 'sbagliata', 'nuovapass123').ok).toBe(false);
    const changed = auth.changePassword(reg.userId, 'vecchiapass1', 'nuovapass123');
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    // Il vecchio token non vale più; il nuovo sì.
    expect(auth.authenticate(reg.token)).toBeNull();
    expect(auth.authenticate(changed.token)?.username).toBe('Ragnhild');
    // Login: solo con la nuova password.
    expect(auth.login('Ragnhild', 'vecchiapass1').ok).toBe(false);
    expect(auth.login('Ragnhild', 'nuovapass123').ok).toBe(true);
  });

  it('login con credenziali errate fallisce; il logout invalida il token', () => {
    const auth = make();
    const reg = auth.register('Leif', 'password123');
    if (!reg.ok) throw new Error('registrazione fallita');
    expect(auth.login('Leif', 'altra-password').ok).toBe(false);
    expect(auth.login('Ignoto', 'password123').ok).toBe(false);
    auth.logout(reg.token);
    expect(auth.authenticate(reg.token)).toBeNull();
  });
});
