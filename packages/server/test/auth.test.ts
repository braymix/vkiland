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
