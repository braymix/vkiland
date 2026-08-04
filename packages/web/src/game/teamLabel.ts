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

/** Nome scelto per la squadra `idx`, ripulito; '' se assente/vuoto. */
export function customTeamName(names: readonly string[] | undefined, idx: number): string {
  return (names?.[idx] ?? '').trim();
}

/** Nome completo: nome scelto oppure «Squadra A». */
export function teamLabel(names: readonly string[] | undefined, idx: number): string {
  const custom = customTeamName(names, idx);
  return custom || t(it.squadra.squadraN, { n: teamLetter(idx) });
}

/** Nome corto per gli spazi stretti: nome scelto oppure «Sq.A». */
export function teamLabelShort(names: readonly string[] | undefined, idx: number): string {
  const custom = customTeamName(names, idx);
  return custom || t(it.squadra.sqN, { n: teamLetter(idx) });
}
