/**
 * Amministrazione. C'è un UNICO amministratore, sempre e comunque: l'account
 * con nome utente «pana». Solo lui può gestire la lista GLOBALE di parole
 * censurate (moderazione). Non è un ruolo assegnabile: è deciso dal nome.
 */

import { applyMapOverride, getMapDefinition, type MapOverride } from '@vikiland/engine-world';

/** L'unico amministratore dell'app (confronto case-insensitive). */
export const ADMIN_USERNAME = 'pana';

/** true se l'utente è l'amministratore (l'account «pana»). */
export function isAdmin(username: string | null | undefined): boolean {
  return (username ?? '').trim().toLowerCase() === ADMIN_USERNAME;
}

/** Tetti prudenti: evitano liste enormi o parole abnormi. */
const MAX_WORDS = 200;
const MAX_WORD_LEN = 30;

/**
 * Normalizza la lista di parole censurate arrivata dal client: accetta solo
 * stringhe, le ripulisce (trim + spazi collassati), scarta vuote/troppo lunghe,
 * deduplica in modo case-insensitive e limita il numero totale. Il confronto in
 * fase di mascheramento è comunque case-insensitive: qui si conserva la forma
 * inserita dall'amministratore.
 */
export function sanitizeCensoredWords(input: unknown): string[] {
  const arr = Array.isArray(input) ? input : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of arr) {
    if (typeof raw !== 'string') continue;
    const word = raw.trim().replace(/\s+/g, ' ');
    if (word.length < 1 || word.length > MAX_WORD_LEN) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
    if (out.length >= MAX_WORDS) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Editor mappe di «Vikings Around the World» (solo amministratore)
// ---------------------------------------------------------------------------

const MAX_TERRITORY_NAME = 40;

export type MapOverrideResult = { ok: true; override: MapOverride } | { ok: false; error: string };

/**
 * Ripulisce un override arrivato dal client: tiene solo id esistenti, nomi
 * 1–40 caratteri (e senza parole censurate), e rifiuta le mappe ingiocabili
 * (non connesse, meno di 15 territori produttivi, materiale mancante).
 */
export function sanitizeMapOverride(input: unknown, mapId: string, censored: string[] = []): MapOverrideResult {
  const def = getMapDefinition(mapId);
  if (!def) return { ok: false, error: 'Mappa sconosciuta.' };
  const raw = (typeof input === 'object' && input !== null ? input : {}) as { names?: unknown; removed?: unknown };
  const ids = new Set(def.territories.map((t) => t.id));
  const names: Record<string, string> = {};
  if (typeof raw.names === 'object' && raw.names !== null) {
    for (const [id, value] of Object.entries(raw.names as Record<string, unknown>)) {
      if (!ids.has(id) || typeof value !== 'string') continue;
      const name = value.trim().replace(/\s+/g, ' ');
      if (name.length < 1 || name.length > MAX_TERRITORY_NAME) continue;
      const lower = name.toLowerCase();
      if (censored.some((w) => w.trim() !== '' && lower.includes(w.trim().toLowerCase()))) {
        return { ok: false, error: `Il nome «${name}» contiene una parola non consentita.` };
      }
      if (name !== def.territories.find((t) => t.id === id)!.name) names[id] = name;
    }
  }
  const removed = Array.isArray(raw.removed)
    ? [...new Set((raw.removed as unknown[]).filter((x): x is string => typeof x === 'string' && ids.has(x)))]
    : [];
  const override: MapOverride = { mapId, names, removed };
  const check = applyMapOverride(def, override);
  if (!check.ok) return { ok: false, error: check.error };
  return { ok: true, override };
}
