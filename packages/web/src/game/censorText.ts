/**
 * Logica PURA di mascheramento (nessuna dipendenza da React o dalla rete): usata
 * dal contesto di censura e direttamente dai test. Il valore reale non viene mai
 * modificato — queste funzioni servono solo alla VISUALIZZAZIONE.
 */

/** Escape dei caratteri speciali per usare la parola dentro una RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Maschera un'occorrenza mantenendo la prima metà (arrotondata per eccesso) e
 * sostituendo il resto con asterischi — con SEMPRE almeno un asterisco. Es.:
 * «Israele» → «Isra***».
 */
export function maskWord(match: string): string {
  const len = match.length;
  const reveal = Math.min(Math.ceil(len / 2), len - 1);
  return match.slice(0, reveal) + '*'.repeat(len - reveal);
}

/**
 * Censura ogni occorrenza (anche come sottostringa) di ciascuna parola vietata,
 * in modo case-insensitive, preservando le lettere non mascherate del testo
 * originale. Restituisce il testo invariato se non c'è nulla da censurare.
 */
export function censorText(text: string, words: readonly string[]): string {
  if (!text || words.length === 0) return text;
  let out = text;
  for (const word of words) {
    const w = word.trim();
    if (!w) continue;
    const re = new RegExp(escapeRegExp(w), 'gi');
    out = out.replace(re, (m) => maskWord(m));
  }
  return out;
}
