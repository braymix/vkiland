import { describe, expect, it } from 'vitest';
import { worldLangs } from '../src/i18n/world.langs';
import { wt } from '../src/i18n/world';

const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe('traduzioni di Vikings Around the World', () => {
  // L'inglese è la base: le chiavi mancanti ripiegano su di lui.
  const base = wt as unknown as Record<string, string>;

  for (const [lang, dict] of Object.entries(worldLangs)) {
    it(`${lang}: chiavi valide e stessi segnaposto dell'originale`, () => {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof base[key], `chiave sconosciuta ${lang}.${key}`).toBe('string');
        expect(value!.length, `${lang}.${key} vuota`).toBeGreaterThan(0);
        // Il confronto con l'italiano (lingua attiva nei test = en/it): stessi segnaposto.
        expect(placeholders(value!), `${lang}.${key}`).toEqual(placeholders(base[key]!));
      }
    });

    it(`${lang}: copre le stringhe essenziali (tutorial, regole, azioni)`, () => {
      for (const k of ['tut1B', 'tut6B', 'regoleTesto', 'tira', 'fineTurno', 'costruisci', 'vittoria', 'creaPartita']) {
        expect(dict[k as keyof typeof dict], `${lang}.${k}`).toBeTruthy();
      }
    });
  }
});
