/**
 * Hub dell'internazionalizzazione. I componenti importano `it` (le stringhe) e
 * `t` (interpolazione) da qui: `it` è un PROXY che legge sempre il dizionario
 * della lingua attiva, quindi le chiamate `it.qualcosa` restituiscono il testo
 * nella lingua corrente senza modifiche ai punti d'uso.
 *
 * Il cambio lingua avvisa gli iscritti (`subscribe`): `App` usa `useLang()` e
 * ri-renderizza l'albero, così il proxy rilegge la nuova lingua ovunque.
 */
import { useSyncExternalStore } from 'react';
import { it as itDict, t } from './it';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { ru } from './ru';
import { sr } from './sr';
import type { Strings } from './types';

export type { Strings } from './types';
export { t };

export type Lang = 'it' | 'en' | 'es' | 'fr' | 'de' | 'ru' | 'sr';

/** Ordine e codici mostrati nel selettore (etichette in alfabeto latino). */
export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: 'it', label: 'IT', native: 'Italiano' },
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'es', label: 'ES', native: 'Español' },
  { code: 'fr', label: 'FR', native: 'Français' },
  { code: 'de', label: 'DE', native: 'Deutsch' },
  { code: 'ru', label: 'RU', native: 'Russkij' },
  { code: 'sr', label: 'SR', native: 'Srpski' },
];

const DICTS: Record<Lang, Strings> = { it: itDict, en, es, fr, de, ru, sr };
const SUPPORTED = new Set<Lang>(LANGS.map((l) => l.code));
const STORAGE_KEY = 'vikiland-lang';

/** Lingua del browser (o salvata): 'it-IT' → 'it', 'sr-Latn' → 'sr', ecc. */
function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.has(saved as Lang)) return saved as Lang;
  } catch {
    /* localStorage non disponibile: si prosegue col browser */
  }
  const candidates = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const tag of candidates) {
    const base = (tag ?? '').toLowerCase().split('-')[0] as Lang;
    if (SUPPORTED.has(base)) return base;
  }
  return 'en';
}

let current: Lang = detectLang();
const listeners = new Set<() => void>();

/** Allinea l'attributo della pagina (per il font cirillico del russo) e il titolo. */
function applyDocument(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current;
    document.documentElement.dataset.lang = current;
  }
}
applyDocument();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (!SUPPORTED.has(lang) || lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* salvataggio non disponibile: il cambio vale per la sessione */
  }
  applyDocument();
  for (const cb of listeners) cb();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Hook che ri-renderizza al cambio lingua e restituisce la lingua attiva. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

/** Stringhe della lingua ATTIVA: proxy che inoltra ogni lettura al dizionario giusto. */
export const it = new Proxy({} as Strings, {
  get(_target, prop: string | symbol) {
    return (DICTS[current] as Record<string | symbol, unknown>)[prop];
  },
  has(_target, prop) {
    return prop in DICTS[current];
  },
  ownKeys() {
    return Reflect.ownKeys(DICTS[current]);
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(DICTS[current], prop);
  },
}) as Strings;
