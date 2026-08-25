import { describe, expect, it } from 'vitest';
import { censorText, maskWord } from '../src/game/censorText';

describe('maskWord', () => {
  it('mantiene la prima metà e maschera il resto (es. Israele → Isra***)', () => {
    expect(maskWord('Israele')).toBe('Isra***');
  });
  it('lascia sempre almeno un asterisco', () => {
    expect(maskWord('ab')).toBe('a*');
    expect(maskWord('a')).toBe('*');
  });
});

describe('censorText', () => {
  const words = ['Israele'];

  it('censura il nome intero preservando le maiuscole rivelate', () => {
    expect(censorText('Israele', words)).toBe('Isra***');
  });

  it('è case-insensitive', () => {
    expect(censorText('ISRAELE', words)).toBe('ISRA***');
    expect(censorText('israele', words)).toBe('isra***');
  });

  it('censura anche come sottostringa dentro un nome più lungo', () => {
    expect(censorText('SuperIsraele99', words)).toBe('SuperIsra***99');
  });

  it('non tocca il testo se non ci sono parole censurate', () => {
    expect(censorText('Israele', [])).toBe('Israele');
  });

  it('lascia intatti i testi senza corrispondenze', () => {
    expect(censorText('Ciao a tutti', words)).toBe('Ciao a tutti');
  });

  it('gestisce più parole nella lista', () => {
    expect(censorText('pippo e pluto', ['pippo', 'pluto'])).toBe('pip** e plu**');
  });
});
