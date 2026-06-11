/** Punti Gloria e condizione di vittoria. */
import { BONUS_GLORY } from './constants';
import type { ScoreBreakdown } from './actions';
import type { GameState, PlayerId, PlayerState } from './types';

export function countHiddenHeroes(p: PlayerState): number {
  let n = 0;
  for (const c of p.sagaCards) if (c === 'sagaDegliEroi') n++;
  // Anche le carte comprate in questo turno contano per la vittoria:
  // gli Eroi non si "giocano", valgono appena acquistati.
  for (const c of p.sagaCardsBoughtThisTurn) if (c === 'sagaDegliEroi') n++;
  return n;
}

export function scoreBreakdown(state: GameState, player: PlayerId): ScoreBreakdown {
  const p = state.players[player]!;
  const villaggi = p.villages.length;
  const roccaforti = p.strongholds.length * 2;
  const grandeVia = state.longestRoad.holder === player ? BONUS_GLORY : 0;
  const furia = state.largestArmy.holder === player ? BONUS_GLORY : 0;
  const eroiNascosti = countHiddenHeroes(p);
  return {
    player,
    villaggi,
    roccaforti,
    grandeVia,
    furia,
    eroiNascosti,
    totale: villaggi + roccaforti + grandeVia + furia + eroiNascosti,
  };
}

/** Punti Gloria; con `includeHidden: false` esclude gli Eroi (vista pubblica). */
export function gloryPoints(state: GameState, player: PlayerId, includeHidden: boolean): number {
  const b = scoreBreakdown(state, player);
  return includeHidden ? b.totale : b.totale - b.eroiNascosti;
}
