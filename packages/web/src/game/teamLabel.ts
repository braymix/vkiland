/**
 * Etichette delle squadre condivise da HUD, schermata di vittoria e setup.
 * Se la squadra ha un nome scelto dai giocatori lo si usa; altrimenti si ripiega
 * sull'etichetta di default «Squadra A/B/…» (o la forma corta «Sq.A»).
 */
import { it, t } from '../i18n';

/** Lettera identificativa di una squadra (A, B, C, …). */
export function teamLetter(idx: number): string {
  return String.fromCharCode(65 + idx);
}

/** Funzione di censura (per la sola visualizzazione); default = nessuna. */
type Censor = (text: string) => string;

/**
 * Nome scelto per la squadra `idx`, ripulito; '' se assente/vuoto. Il nome è
 * scelto dai giocatori, quindi si passa `censor` per mascherarlo in
 * visualizzazione (il valore reale nella config resta intatto).
 */
export function customTeamName(
  names: readonly string[] | undefined,
  idx: number,
  censor?: Censor
): string {
  const raw = (names?.[idx] ?? '').trim();
  return censor ? censor(raw) : raw;
}

/** Nome completo: nome scelto (censurato) oppure «Squadra A». */
export function teamLabel(names: readonly string[] | undefined, idx: number, censor?: Censor): string {
  const custom = customTeamName(names, idx, censor);
  return custom || t(it.squadra.squadraN, { n: teamLetter(idx) });
}

/** Nome corto per gli spazi stretti: nome scelto (censurato) oppure «Sq.A». */
export function teamLabelShort(
  names: readonly string[] | undefined,
  idx: number,
  censor?: Censor
): string {
  const custom = customTeamName(names, idx, censor);
  return custom || t(it.squadra.sqN, { n: teamLetter(idx) });
}
