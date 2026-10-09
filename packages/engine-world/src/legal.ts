/** Enumerazione delle azioni legali (per bot, UI ed evidenziazioni). */
import type { WorldAction } from './actions';
import { WORLD_RESOURCES } from './constants';
import { isProductive } from './map';
import { pickFromLargest, zeroResources } from './resources';
import { freeTerraLinks, reachableMoves } from './rules';
import { discardRequired, isLegal } from './validate';
import type { PlayerId, WorldGameState } from './types';

/** Scarto di default (pile più grandi). */
export function defaultDiscard(state: WorldGameState, pid: PlayerId): ReturnType<typeof zeroResources> {
  return pickFromLargest(state.players[pid]!.hand, discardRequired(state, pid), true);
}

/**
 * Azioni legali per `pid`. Gli scambi fra giocatori (proposte) non sono
 * elencati: ogni proposta è una combinazione libera; si elencano le risposte.
 */
export function getLegalActions(state: WorldGameState, pid: PlayerId): WorldAction[] {
  const out: WorldAction[] = [];
  const me = state.players[pid];
  if (!me || state.phase.type === 'fine') return out;
  const push = (a: WorldAction): void => {
    if (isLegal(state, a) === null) out.push(a);
  };
  const phase = state.phase;

  if (phase.type === 'setup') {
    if (pid !== state.currentPlayer) return out;
    if (phase.expect === 'villaggio') {
      for (const t of state.map.territories) {
        if (isProductive(t)) push({ type: 'piazzaVillaggioIniziale', player: pid, territory: t.id });
      }
    } else if (state.setupLastTerritory) {
      for (const l of freeTerraLinks(state, state.setupLastTerritory)) {
        push({ type: 'piazzaStradaIniziale', player: pid, link: l });
      }
    }
    return out;
  }
  if (phase.type === 'scarto') {
    if (phase.pending.includes(pid)) out.push({ type: 'scarta', player: pid, resources: defaultDiscard(state, pid) });
    return out;
  }
  if (phase.type === 'tiro') {
    if (pid === state.currentPlayer) out.push({ type: 'tiraDadi', player: pid });
    return out;
  }
  if (phase.type === 'razzia') {
    if (pid === state.currentPlayer) for (const t of phase.candidates) push({ type: 'ruba', player: pid, target: t });
    return out;
  }
  // fase azioni
  const o = state.pendingTrade;
  if (o && pid !== o.from) {
    push({ type: 'rispondiScambio', player: pid, offerId: o.id, accept: true });
    push({ type: 'rispondiScambio', player: pid, offerId: o.id, accept: false });
  }
  if (pid !== state.currentPlayer) return out;
  if (o) {
    push({ type: 'annullaScambio', player: pid, offerId: o.id });
    for (const q of state.players) push({ type: 'confermaScambio', player: pid, offerId: o.id, with: q.id });
  }
  for (const m of reachableMoves(state, pid)) push({ type: 'muovi', player: pid, to: m.to });
  for (const l of state.map.links) if (l.kind === 'terra') push({ type: 'costruisciStrada', player: pid, link: l.id });
  for (const t of state.map.territories) {
    for (const what of ['villaggio', 'citta', 'sala', 'porto', 'mercato'] as const) {
      push({ type: 'costruisci', player: pid, what, territory: t.id });
    }
  }
  for (const give of WORLD_RESOURCES) {
    for (const receive of WORLD_RESOURCES) push({ type: 'scambioBanca', player: pid, give, receive });
  }
  push({ type: 'fineTurno', player: pid });
  return out;
}

/** Chi deve agire adesso (il primo degli scarti pendenti, altrimenti il giocatore di turno). */
export function whoMustAct(state: WorldGameState): PlayerId {
  if (state.phase.type === 'scarto') return state.phase.pending[0]!;
  return state.currentPlayer;
}

/** Mossa «sicura» per il timer di turno: prosegue la partita senza scelte rischiose. */
export function getDefaultAction(state: WorldGameState): WorldAction | null {
  const pid = whoMustAct(state);
  const phase = state.phase;
  switch (phase.type) {
    case 'fine':
      return null;
    case 'setup': {
      const legal = getLegalActions(state, pid);
      if (phase.expect === 'villaggio') {
        // Il territorio con il numero più probabile.
        let best: WorldAction | null = null;
        let bestScore = -1;
        for (const a of legal) {
          if (a.type !== 'piazzaVillaggioIniziale') continue;
          const n = state.territories[a.territory]!.number;
          const score = n === null ? 0 : 6 - Math.abs(7 - n);
          if (score > bestScore) {
            best = a;
            bestScore = score;
          }
        }
        return best;
      }
      return legal[0] ?? null;
    }
    case 'tiro':
      return { type: 'tiraDadi', player: pid };
    case 'scarto':
      return { type: 'scarta', player: pid, resources: defaultDiscard(state, pid) };
    case 'razzia':
      return { type: 'ruba', player: pid, target: phase.candidates[0]! };
    case 'azioni':
      return { type: 'fineTurno', player: pid };
  }
}
