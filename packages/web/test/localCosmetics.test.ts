/**
 * Skin locali (senza account): salvate su questo dispositivo. L'ambiente di
 * test è Node "puro" (niente DOM): si fornisce un piccolo polyfill di
 * localStorage in memoria — il modulo usa il `localStorage` globale solo
 * DENTRO le funzioni (mai al momento dell'import), quindi predisporlo in
 * `beforeEach` prima di ogni chiamata basta, senza toccare il modulo.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { getLocalCosmetics, setLocalCosmetics } from '../src/game/localCosmetics';

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
});

describe('skin locali (device-bound, nessun account)', () => {
  it('senza nulla salvato ritorna {} (nessun crash, nessuna skin fantasma)', () => {
    expect(getLocalCosmetics()).toEqual({});
  });

  it('salva e rilegge (round-trip) attraverso "riavvii" separati', () => {
    setLocalCosmetics({ dragon: 'trex' });
    expect(getLocalCosmetics()).toEqual({ dragon: 'trex' });
    // Una lettura successiva (finta "nuova sessione") vede lo stesso valore.
    expect(getLocalCosmetics()).toEqual({ dragon: 'trex' });
  });

  it('il merge non cancella l’altra skin già scelta', () => {
    setLocalCosmetics({ dragon: 'navicella' });
    setLocalCosmetics({ stronghold: 'castello' });
    expect(getLocalCosmetics()).toEqual({ dragon: 'navicella', stronghold: 'castello' });
  });

  it('salva e rilegge i colori personalizzati (occhi/fiamme, pietra)', () => {
    setLocalCosmetics({ dragon: 'drago', dragonColors: { eyes: '#00ff00', fire: '#ff00ff' } });
    setLocalCosmetics({ strongholdColors: { stone: '#8899aa' } });
    expect(getLocalCosmetics()).toEqual({
      dragon: 'drago',
      dragonColors: { eyes: '#00ff00', fire: '#ff00ff' },
      strongholdColors: { stone: '#8899aa' },
    });
  });

  it('scarta i colori mal formati e i contenitori vuoti', () => {
    setLocalCosmetics({ dragonColors: { eyes: 'verde' as never }, strongholdColors: { stone: '#zzzzzz' as never } });
    expect(getLocalCosmetics()).toEqual({});
  });

  it('scarta id sconosciuti o scritti a mano (mai propagati al motore)', () => {
    setLocalCosmetics({ dragon: 'ufo-alieno' as never });
    expect(getLocalCosmetics()).toEqual({});
    localStorage.setItem('vikiland-cosmetics-v1', JSON.stringify({ dragon: 123, stronghold: 'castello' }));
    expect(getLocalCosmetics()).toEqual({ stronghold: 'castello' });
  });

  it('se localStorage non è disponibile, degrada senza eccezioni', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).localStorage;
    expect(() => getLocalCosmetics()).not.toThrow();
    expect(getLocalCosmetics()).toEqual({});
    expect(() => setLocalCosmetics({ dragon: 'trex' })).not.toThrow();
    // Nessuna persistenza, ma il risultato di questa chiamata resta corretto.
    expect(setLocalCosmetics({ dragon: 'trex' })).toEqual({ dragon: 'trex' });
  });
});
