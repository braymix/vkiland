/**
 * MODALITÀ SQUADRA (opzionale). I giocatori si dividono in squadre di UGUAL
 * dimensione (sempre pari). In squadra:
 *  - le STRADE sono in comune: la connettività (costruire strade/villaggi, «La
 *    Grande Via») considera la rete UNITA dei compagni;
 *  - gli APPRODI sono di squadra: il rapporto di scambio con la banca guarda gli
 *    edifici di TUTTI i compagni;
 *  - «La Grande Via» e «La Furia dei Berserker» sono di squadra (rete/berserker
 *    combinati);
 *  - gli SCAMBI fra giocatori sono ammessi solo fra compagni, uno-a-uno, al
 *    massimo due per turno;
 *  - si VINCE quando i Punti Gloria COMBINATI della squadra raggiungono il
 *    bersaglio (giocatori-per-squadra × un valore impostabile, di default 8).
 *
 * L'assegnazione è `config.teams` (un indice di squadra per giocatore) più
 * `config.teamColors` (un colore per squadra). Assenti = partita a tutti contro
 * tutti (comportamento classico invariato). Le funzioni qui sotto lavorano su un
 * semplice `teams?: number[]`, così sono usabili sia sullo stato completo sia
 * sulla vista filtrata.
 */
import type { PlayerId } from './types';

/** La partita è in modalità squadra? */
export function isTeamMode(teams: readonly number[] | undefined): teams is number[] {
  return Array.isArray(teams) && teams.length > 0;
}

/** Indice di squadra del giocatore (0 se non in modalità squadra). */
export function teamOf(teams: readonly number[] | undefined, player: PlayerId): number {
  return isTeamMode(teams) ? (teams[player] ?? 0) : 0;
}

/** Due giocatori sono compagni di squadra? Fuori dalla modalità: solo con sé stessi. */
export function sameTeam(
  teams: readonly number[] | undefined,
  a: PlayerId,
  b: PlayerId
): boolean {
  if (a === b) return true;
  if (!isTeamMode(teams)) return false;
  return teams[a] === teams[b];
}

/**
 * Insieme dei compagni di `player` (sé compreso). Fuori dalla modalità squadra
 * è `{player}`: passandolo alle regole geometriche si ottiene il comportamento
 * classico "solo la mia rete".
 */
export function friendsOf(
  teams: readonly number[] | undefined,
  player: PlayerId
): Set<PlayerId> {
  if (!isTeamMode(teams)) return new Set([player]);
  const t = teams[player];
  const out = new Set<PlayerId>();
  teams.forEach((tt, i) => {
    if (tt === t) out.add(i);
  });
  return out;
}

/** Elenco degli indici di squadra distinti, in ordine crescente. */
export function distinctTeams(teams: readonly number[]): number[] {
  return [...new Set(teams)].sort((a, b) => a - b);
}

/**
 * Convalida un'assegnazione di squadre: tutte le squadre di UGUAL dimensione,
 * almeno due squadre, e ogni giocatore assegnato. Restituisce un messaggio di
 * errore (in italiano) oppure null se valida.
 */
export function validateTeams(teams: readonly number[], playerCount: number): string | null {
  if (teams.length !== playerCount) return 'Ogni giocatore deve avere una squadra.';
  const groups = distinctTeams(teams);
  if (groups.length < 2) return 'Servono almeno due squadre.';
  const sizes = groups.map((g) => teams.filter((t) => t === g).length);
  const first = sizes[0]!;
  if (!sizes.every((s) => s === first)) return 'Le squadre devono essere di ugual dimensione.';
  return null;
}

/** Giocatori-per-squadra (dimensione di una squadra); 1 fuori dalla modalità. */
export function teamSize(teams: readonly number[] | undefined): number {
  if (!isTeamMode(teams)) return 1;
  const first = teams[0]!;
  return teams.filter((t) => t === first).length;
}
