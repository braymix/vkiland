/**
 * Amministrazione. C'è un UNICO amministratore, sempre e comunque: l'account
 * con nome utente «pana». Solo lui può gestire la lista GLOBALE di parole
 * censurate (moderazione). Non è un ruolo assegnabile: è deciso dal nome.
 */

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
