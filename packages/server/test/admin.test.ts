import { describe, expect, it } from 'vitest';
import { isAdmin, sanitizeCensoredWords } from '../src/admin';

describe('isAdmin', () => {
  it('riconosce solo l’account «pana» (senza distinzione di maiuscole/spazi)', () => {
    expect(isAdmin('pana')).toBe(true);
    expect(isAdmin('PANA')).toBe(true);
    expect(isAdmin('  Pana  ')).toBe(true);
    expect(isAdmin('panag')).toBe(false);
    expect(isAdmin('altro')).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe('sanitizeCensoredWords', () => {
  it('ripulisce, scarta i vuoti e deduplica case-insensitive', () => {
    expect(sanitizeCensoredWords(['  ciao ', 'CIAO', '', 'pluto'])).toEqual(['ciao', 'pluto']);
  });
  it('accetta solo stringhe', () => {
    expect(sanitizeCensoredWords([1, {}, null, 'ok'])).toEqual(['ok']);
  });
  it('collassa gli spazi interni', () => {
    expect(sanitizeCensoredWords(['brutta   parola'])).toEqual(['brutta parola']);
  });
  it('ignora input non-array', () => {
    expect(sanitizeCensoredWords('israele')).toEqual([]);
    expect(sanitizeCensoredWords(null)).toEqual([]);
  });
  it('scarta le parole troppo lunghe (>30)', () => {
    expect(sanitizeCensoredWords(['x'.repeat(31)])).toEqual([]);
    expect(sanitizeCensoredWords(['x'.repeat(30)])).toEqual(['x'.repeat(30)]);
  });
  it('limita il numero totale di parole a 200', () => {
    const many = Array.from({ length: 250 }, (_, i) => `w${i}`);
    expect(sanitizeCensoredWords(many)).toHaveLength(200);
  });
});
