/**
 * Modalità CALAMITÀ (opzionale) — RIVELAZIONE ed effetti ISTANTANEI.
 * Una carta si rivela all'inizio di ogni giro e vale SOLO per quel giro.
 * `applyInstantCalamity` risolve subito le carte istantanee (scarti, guadagni),
 * mutando lo stato (già clonato) e, se serve, aprendo una fase interattiva.
 * Le carte PERSISTENTI non fanno nulla qui: le regole del giro le leggono via
 * le query pure di `calamityRules.ts`.
 *
 * Nessun import da `apply.ts`: questo modulo è "a valle" del reducer, che lo usa.
 * Tutte le scelte casuali passano da `state.rngState` → partite replay-abili.
 */
import type { GameEvent } from './actions';
import { HAND_LIMIT, PIECE_LIMITS, RESOURCES } from './constants';
import { flattenResources, totalResources, zeroResources } from './resources';
import { nextInt } from './rng';
import { legalRoadEdges } from './rules';
import { gloryPoints } from './scoring';
import type { CalamityCard, GameState, PlayerId, PlayerState, ResourceCount } from './types';

// ---------------------------------------------------------------------------
// Rivelazione ed effetti ISTANTANEI (mutano lo stato clonato)
// ---------------------------------------------------------------------------

/**
 * Rivela la prossima calamità del giro: la mette come `current`, emette
 * l'evento e ne applica l'effetto immediato. Ritorna true se ha aperto una
 * FASE interattiva (scarto/guadagno/strade) che va risolta prima del tiro.
 */
export function revealCalamity(state: GameState, events: GameEvent[]): boolean {
  const c = state.calamities;
  if (!c) return false;
  c.current = null;
  const card = c.deck.pop();
  if (!card) return false; // mazzo esaurito: da qui in poi giro normale
  c.current = card;
  events.push({ type: 'calamitaRivelata', card });
  return applyInstantCalamity(state, card, events);
}

/** Le calamità PERSISTENTI: cambiano le regole del giro (lette dalle query pure). */
const PERSISTENT_CALAMITIES: ReadonlySet<CalamityCard['kind']> = new Set([
  'materialeDoppio',
  'materialeBloccato',
  'dragoFermo',
  'nienteSaga',
  'dragoPrimaDelTiro',
  'scambiTre',
  'scambioDue',
  'abbondanza',
  'bufera',
  'assedio',
  'mareInTempesta',
  'mercatoOro',
]);

/**
 * Carta CAMBIA SORTE: sostituisce la calamità del giro con la prossima calamità
 * PERSISTENTE del mazzo. Le carte istantanee incontrate vengono scartate (i
 * loro effetti immediati NON si ri-attivano a metà giro: si applicano solo alla
 * rivelazione). A mazzo esaurito il giro prosegue senza calamità. Emette
 * l'evento `calamitaRivelata` così che UI e diario si aggiornino. Non apre mai
 * una fase interattiva. Ritorna la nuova calamità (o null).
 */
export function changeCalamity(state: GameState, events: GameEvent[]): CalamityCard | null {
  const c = state.calamities;
  if (!c) return null;
  c.current = null;
  while (c.deck.length > 0) {
    const card = c.deck.pop()!;
    if (PERSISTENT_CALAMITIES.has(card.kind)) {
      c.current = card;
      events.push({ type: 'calamitaRivelata', card });
      return card;
    }
    // Istantanea: scartata senza effetto (siamo a metà giro, non alla rivelazione).
  }
  return null; // mazzo esaurito: da qui il giro è normale
}

/** Applica una calamità ISTANTANEA; ritorna true se ha aperto una fase interattiva. */
function applyInstantCalamity(state: GameState, card: CalamityCard, events: GameEvent[]): boolean {
  switch (card.kind) {
    // ---------- automatiche (si risolvono subito, per tutti) ----------
    case 'tuttiPiu2':
      grantToAll(state, events, (bank) => {
        const g = zeroResources();
        g[card.resource] = Math.min(2, bank[card.resource]);
        return g;
      });
      return false;
    case 'tuttiUnoDiTutto':
      grantToAll(state, events, (bank) => {
        const g = zeroResources();
        for (const r of RESOURCES) g[r] = bank[r] > 0 ? 1 : 0;
        return g;
      });
      return false;
    case 'leaderScartaTutto': {
      for (const pid of leaders(state)) {
        const p = state.players[pid]!;
        const n = totalResources(p.resources);
        if (n === 0) continue;
        const dumped = { ...p.resources };
        for (const r of RESOURCES) {
          state.bank[r] += p.resources[r];
          p.resources[r] = 0;
        }
        events.push({ type: 'risorseScartate', player: pid, resources: dumped, total: n });
      }
      return false;
    }
    case 'donoDegliDei':
      for (const pid of state.turnOrder) drawSaga(state, state.players[pid]!, events);
      return false;
    case 'bottino':
      for (const pid of trailers(state)) drawSaga(state, state.players[pid]!, events);
      return false;
    case 'razzia':
      applyRazzia(state, events);
      return false;

    // ---------- interattive (aprono una fase, se c'è qualcosa da fare) ----------
    case 'tuttiScartanoMeta': {
      const mustDiscard = discardMap(state, (n) => Math.floor(n / 2));
      if (Object.keys(mustDiscard).length === 0) return false;
      state.phase = { type: 'calamityDiscard', mustDiscard };
      return true;
    }
    case 'scartaFino7': {
      const mustDiscard = discardMap(state, (n) => (n > HAND_LIMIT ? n - HAND_LIMIT : 0));
      if (Object.keys(mustDiscard).length === 0) return false;
      state.phase = { type: 'calamityDiscard', mustDiscard };
      return true;
    }
    case 'ultimoPesca4': {
      if (bankTotal(state) === 0) return false;
      const mustGain: Record<PlayerId, number> = {};
      for (const pid of trailers(state)) mustGain[pid] = 4;
      state.phase = { type: 'calamityGain', mustGain };
      return true;
    }
    case 'ultimoStrade2': {
      const queue = fewestRoadsPlaceable(state);
      if (queue.length === 0) return false;
      state.phase = { type: 'calamityRoads', queue, remaining: 2 };
      return true;
    }

    // ---------- persistenti: nessun effetto immediato ----------
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers privati
// ---------------------------------------------------------------------------

/** Punti PUBBLICI (senza Eroi nascosti): non si prende di mira l'informazione segreta. */
function publicScores(state: GameState): number[] {
  return state.players.map((p) => gloryPoints(state, p.id, false));
}
function leaders(state: GameState): PlayerId[] {
  const s = publicScores(state);
  const max = Math.max(...s);
  return state.players.filter((_, i) => s[i] === max).map((p) => p.id);
}
function trailers(state: GameState): PlayerId[] {
  const s = publicScores(state);
  const min = Math.min(...s);
  return state.players.filter((_, i) => s[i] === min).map((p) => p.id);
}

function bankTotal(state: GameState): number {
  return totalResources(state.bank);
}

/** Distribuisce a TUTTI (in ordine di turno) ciò che `pick` calcola dalla banca corrente. */
function grantToAll(
  state: GameState,
  events: GameEvent[],
  pick: (bank: ResourceCount) => ResourceCount
): void {
  const gains: { player: PlayerId; resources: ResourceCount }[] = [];
  for (const pid of state.turnOrder) {
    const p = state.players[pid]!;
    const g = pick(state.bank);
    if (totalResources(g) === 0) continue;
    for (const r of RESOURCES) {
      p.resources[r] += g[r];
      state.bank[r] -= g[r];
    }
    gains.push({ player: pid, resources: g });
  }
  if (gains.length > 0) {
    gains.sort((a, b) => a.player - b.player);
    events.push({ type: 'risorseProdotte', gains });
  }
}

/** Pesca 1 Carta Saga dal mazzo (se disponibile) verso la mano "di questo turno". */
function drawSaga(state: GameState, p: PlayerState, events: GameEvent[]): void {
  if (state.sagaDeck.length === 0) return;
  const card = state.sagaDeck.pop()!;
  p.sagaCardsBoughtThisTurn.push(card);
  events.push({ type: 'cartaSagaComprata', player: p.id, card });
}

/** Razzia: ogni leader dà 1 risorsa casuale a ciascun avversario finché ne ha. */
function applyRazzia(state: GameState, events: GameEvent[]): void {
  for (const pid of leaders(state)) {
    const leader = state.players[pid]!;
    for (const oppId of state.turnOrder) {
      if (oppId === pid) continue;
      const pool = flattenResources(leader.resources);
      if (pool.length === 0) break;
      const [idx, rng] = nextInt(state.rngState, pool.length);
      state.rngState = rng;
      const r = pool[idx]!;
      leader.resources[r] -= 1;
      state.players[oppId]!.resources[r] += 1;
      events.push({ type: 'risorsaRubata', thief: oppId, victim: pid, resource: r });
    }
  }
}

/** Mappa giocatore → quantità da scartare, secondo `amountFn(mano)`, saltando gli 0. */
function discardMap(state: GameState, amountFn: (hand: number) => number): Record<PlayerId, number> {
  const map: Record<PlayerId, number> = {};
  for (const p of state.players) {
    const n = amountFn(totalResources(p.resources));
    if (n > 0) map[p.id] = n;
  }
  return map;
}

/** Giocatori col MINIMO di strade che possono effettivamente piazzarne, in ordine di turno. */
function fewestRoadsPlaceable(state: GameState): PlayerId[] {
  const min = Math.min(...state.players.map((p) => p.roads.length));
  const radius = state.config.boardRadius;
  return state.turnOrder.filter((pid) => {
    const p = state.players[pid]!;
    return (
      p.roads.length === min &&
      p.roads.length < PIECE_LIMITS.sentiero &&
      legalRoadEdges(state, pid, radius).length > 0
    );
  });
}
