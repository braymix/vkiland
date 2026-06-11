/**
 * Logica hot-seat PURA (testabile senza DOM): a quale umano va il dispositivo.
 *
 * Regole di serializzazione quando più umani potrebbero agire insieme:
 *  - scarti simultanei sul 7 → uno alla volta;
 *  - offerta di scambio attiva → prima rispondono gli altri, il proponente
 *    (che ha sempre conferma/annulla tra le mosse) chiude per ultimo;
 *  - chi sta già guardando lo schermo ha la precedenza, per evitare
 *    passaggi di mano inutili.
 */
import { getLegalActions, type GameState, type PlayerId } from '@vikiland/engine';

export function nextHumanActor(
  state: GameState,
  humans: readonly PlayerId[],
  currentViewpoint: PlayerId
): PlayerId | null {
  if (state.phase.type === 'gameOver') return null;
  let candidates = humans.filter((pid) => getLegalActions(state, pid).length > 0);
  if (candidates.length === 0) return null;

  const offer = state.pendingTrade;
  if (offer !== null && candidates.some((pid) => pid !== offer.from)) {
    candidates = candidates.filter((pid) => pid !== offer.from);
  }

  if (candidates.includes(currentViewpoint)) return currentViewpoint;
  return candidates[0] ?? null;
}
