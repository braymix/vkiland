/**
 * Mossa di default quando il timer di turno scade: il server sblocca SEMPRE
 * la partita con l'azione legale più innocua per il giocatore in ritardo.
 */
import {
  getLegalActions,
  RESOURCES,
  zeroResources,
  type Action,
  type GameState,
  type PlayerId,
} from '@vikiland/engine';

export function defaultActionFor(state: GameState, pid: PlayerId): Action | null {
  const legal = getLegalActions(state, pid);
  if (legal.length === 0) return null;

  // Offerta in sospeso: il proponente la ritira, gli altri rifiutano.
  const cancel = legal.find((m) => m.type === 'annullaScambio');
  if (cancel) return cancel as Action;
  const refuse = legal.find((m) => m.type === 'rispondiScambio' && !m.accept);
  if (refuse) return refuse as Action;

  // Fine turno se disponibile (fase main), altrimenti tira i dadi.
  const end = legal.find((m) => m.type === 'fineTurno');
  if (end) return end as Action;
  const roll = legal.find((m) => m.type === 'tiraDadi');
  if (roll) return roll as Action;

  // Scarto: si scarta in modo avido dalle risorse più abbondanti.
  const discard = legal.find((m) => m.type === 'scartaDescr');
  if (discard && discard.type === 'scartaDescr') {
    const hand = { ...state.players[pid]!.resources };
    const resources = zeroResources();
    let left = discard.amount;
    while (left > 0) {
      const richest = [...RESOURCES].sort((a, b) => hand[b] - hand[a])[0]!;
      if (hand[richest] <= 0) break;
      hand[richest] -= 1;
      resources[richest] += 1;
      left -= 1;
    }
    return { type: 'scarta', player: pid, resources };
  }

  // Qualsiasi altra fase (setup, drago, furto, sentieri gratis): la prima
  // azione concreta enumerata (deterministica).
  const concrete = legal.find(
    (m): m is Action => m.type !== 'scartaDescr' && m.type !== 'proponiScambioDescr'
  );
  return concrete ?? null;
}
