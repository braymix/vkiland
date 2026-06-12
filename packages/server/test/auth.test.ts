/** Test di registrazione, login e sessioni. */
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
    const reg = auth.register('bjorn@vikiland.it', 'password123', 'Bjorn');
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    expect(auth.authenticate(reg.token)?.displayName).toBe('Bjorn');

    const login = auth.login('BJORN@vikiland.it', 'password123');
    expect(login.ok).toBe(true);
  });

  it('rifiuta email doppie, email non valide, password corte e nomi vuoti', () => {
    const auth = make();
    expect(auth.register('a@b.it', 'password123', 'Astrid').ok).toBe(true);
    expect(auth.register('a@b.it', 'password456', 'Clone').ok).toBe(false);
    expect(auth.register('non-email', 'password123', 'X').ok).toBe(false);
    expect(auth.register('c@d.it', 'corta', 'Y').ok).toBe(false);
    expect(auth.register('e@f.it', 'password123', '').ok).toBe(false);
    expect(auth.register('g@h.it', 'password123', 'NomeTroppoLungo!!').ok).toBe(false);
  });

  it('profilo: espone i dati salvati ma MAI l\'hash della password', () => {
    const auth = make();
    const reg = auth.register('sigrid@vikiland.it', 'password123', 'Sigrid');
    if (!reg.ok) throw new Error('registrazione fallita');
    const profile = auth.getProfile(reg.userId)!;
    expect(profile.displayName).toBe('Sigrid');
    expect(profile.email).toBe('sigrid@vikiland.it');
    expect(profile.createdAt).toBeGreaterThan(0);
    expect(Object.keys(profile)).not.toContain('passwordHash');
  });

  it('cambia nome (con validazione)', () => {
    const auth = make();
    const reg = auth.register('olaf@vikiland.it', 'password123', 'Olaf');
    if (!reg.ok) throw new Error('registrazione fallita');
    expect(auth.changeDisplayName(reg.userId, 'OlafIlGrande')).toBeNull();
    expect(auth.getProfile(reg.userId)!.displayName).toBe('OlafIlGrande');
    expect(auth.changeDisplayName(reg.userId, '')).not.toBeNull();
    expect(auth.changeDisplayName(reg.userId, 'NomeDecisamenteLungo')).not.toBeNull();
  });

  it('cambia email solo con la password giusta e senza duplicati', () => {
    const auth = make();
    const a = auth.register('a@clan.it', 'password123', 'A');
    auth.register('b@clan.it', 'password123', 'B');
    if (!a.ok) throw new Error('registrazione fallita');
    expect(auth.changeEmail(a.userId, 'nuova@clan.it', 'sbagliata')).not.toBeNull();
    expect(auth.changeEmail(a.userId, 'b@clan.it', 'password123')).not.toBeNull();
    expect(auth.changeEmail(a.userId, 'nuova@clan.it', 'password123')).toBeNull();
    expect(auth.login('nuova@clan.it', 'password123').ok).toBe(true);
    expect(auth.login('a@clan.it', 'password123').ok).toBe(false);
  });

  it('cambia password: revoca le vecchie sessioni e ne apre una nuova', () => {
    const auth = make();
    const reg = auth.register('freya@vikiland.it', 'vecchiapass1', 'Freya');
    if (!reg.ok) throw new Error('registrazione fallita');
    expect(auth.changePassword(reg.userId, 'sbagliata', 'nuovapass123').ok).toBe(false);
    const changed = auth.changePassword(reg.userId, 'vecchiapass1', 'nuovapass123');
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    // Il vecchio token non vale più; il nuovo sì.
    expect(auth.authenticate(reg.token)).toBeNull();
    expect(auth.authenticate(changed.token)?.displayName).toBe('Freya');
    // Login: solo con la nuova password.
    expect(auth.login('freya@vikiland.it', 'vecchiapass1').ok).toBe(false);
    expect(auth.login('freya@vikiland.it', 'nuovapass123').ok).toBe(true);
  });

  it('login con credenziali errate fallisce; il logout invalida il token', () => {
    const auth = make();
    const reg = auth.register('leif@vikiland.it', 'password123', 'Leif');
    if (!reg.ok) throw new Error('registrazione fallita');
    expect(auth.login('leif@vikiland.it', 'altra-password').ok).toBe(false);
    expect(auth.login('ignoto@vikiland.it', 'password123').ok).toBe(false);
    auth.logout(reg.token);
    expect(auth.authenticate(reg.token)).toBeNull();
  });
});
