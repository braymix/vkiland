/**
 * Validazione: `isLegal` è l'unica porta d'ingresso alle regole. Restituisce
 * null se l'azione è lecita, altrimenti un errore con messaggio in italiano.
 */
import type { ValidationError, WorldAction } from './actions';
import {
  BANK_RATIO,
  HAND_LIMIT,
  MERCANTE_RATIO,
  PORT_RATIO,
  SILVER_BUY,
  SILVER_SELL,
  WORLD_RESOURCES,
} from './constants';
import { buildCostFor, hasHero, heroUsesLeft, paysToll } from './heroes';
import { isProductive, mapIndex } from './map';
import { hasAtLeast, isValidResourceMap, overlapping, totalResources } from './resources';
import {
  hasRoomFor,
  settlementOf,
  freeTerraLinks,
  piecesLeft,
  planMove,
  resolveToll,
  roadTouchesNetwork,
  tollDue,
} from './rules';
import type { PlayerId, WorldGameState, WorldResource } from './types';

function err(code: string, message: string): ValidationError {
  return { code, message };
}

const ERR = {
  finita: err('PARTITA_FINITA', 'La partita è già conclusa.'),
  giocatore: err('GIOCATORE_INESISTENTE', 'Giocatore inesistente.'),
  fase: err('FASE_ERRATA', 'Questa azione non è permessa in questa fase del turno.'),
  turno: err('NON_IL_TUO_TURNO', 'Non è il tuo turno.'),
  territorio: err('TERRITORIO_INESISTENTE', 'Territorio inesistente.'),
  deserto: err('DESERTO', 'Nel deserto non si può costruire.'),
  occupato: err('TERRITORIO_OCCUPATO', 'Qui non c’è posto: al massimo 2 clan diversi per territorio.'),
  nonTuo: err('NON_TUO', 'Questo territorio non è tuo.'),
  collegamento: err('COLLEGAMENTO_INESISTENTE', 'Collegamento inesistente.'),
  soloTerra: err('SOLO_TERRA', 'Le strade si costruiscono solo sui collegamenti di terra.'),
  stradaPresente: err('STRADA_PRESENTE', 'C’è già una strada qui.'),
  nonConnessa: err('NON_CONNESSA', 'La strada deve toccare il tuo Jarl, un tuo territorio o un’altra tua strada.'),
  risorse: err('RISORSE_INSUFFICIENTI', 'Non hai le risorse necessarie.'),
  pezzi: err('PEZZI_ESAURITI', 'Hai esaurito i pezzi di questo tipo.'),
  jarlAltrove: err('JARL_ALTROVE', 'Il Jarl deve trovarsi in questo territorio.'),
  scarto: err('SCARTO_ERRATO', 'La selezione di carte da scartare non è valida.'),
  scambio: err('SCAMBIO_NON_VALIDO', 'Scambio non valido.'),
  offerta: err('OFFERTA_INESISTENTE', 'Offerta inesistente.'),
  costiero: err('NON_COSTIERO', 'Il Porto si costruisce solo su un territorio costiero.'),
  giaPresente: err('GIA_PRESENTE', 'C’è già una costruzione di questo tipo qui.'),
  upgrade: err('UPGRADE_NON_VALIDO', 'Serve la costruzione precedente per migliorare qui.'),
  nonConsentito: err('NON_CONSENTITO', 'Azione non consentita.'),
};

/**
 * Rapporto di scambio con la banca: quante carte dai e quante ricevi.
 * `mercante` (eroe Gest) forza il 2-a-1 tra materiali (non vale per l'argento).
 */
export function bankRate(
  state: Pick<WorldGameState, 'territories'>,
  pid: PlayerId,
  give: WorldResource,
  receive: WorldResource,
  mercante = false
): { giveCount: number; receiveCount: number } | null {
  if (give === receive) return null;
  if (give === 'argento') return { giveCount: 1, receiveCount: SILVER_SELL };
  if (receive === 'argento') return { giveCount: SILVER_BUY, receiveCount: 1 };
  if (mercante) return { giveCount: MERCANTE_RATIO, receiveCount: 1 };
  const hasPort = Object.values(state.territories).some((t) => settlementOf(t, pid)?.porto);
  return { giveCount: hasPort ? PORT_RATIO : BANK_RATIO, receiveCount: 1 };
}

/** Candidati della Tassa del Re: clan con un edificio nel territorio del Jarl o in uno confinante. */
export function razziaCandidates(state: WorldGameState, pid: PlayerId): PlayerId[] {
  const idx = mapIndex(state.map);
  const here = state.players[pid]!.jarl;
  const around = new Set<string>([here]);
  for (const l of idx.linksOf.get(here) ?? []) around.add(l.a === here ? l.b : l.a);
  const out = new Set<PlayerId>();
  for (const id of around) {
    const t = state.territories[id];
    for (const s of t?.settlements ?? []) {
      if (s.owner !== pid && totalResources(state.players[s.owner]!.hand) > 0) out.add(s.owner);
    }
  }
  return [...out].sort((a, b) => a - b);
}

export function discardRequired(state: WorldGameState, pid: PlayerId): number {
  const total = totalResources(state.players[pid]!.hand);
  return total > HAND_LIMIT ? Math.floor(total / 2) : 0;
}

export function isLegal(state: WorldGameState, action: WorldAction): ValidationError | null {
  if (state.phase.type === 'fine') return ERR.finita;
  const pid = action.player;
  const me = state.players[pid];
  if (!me) return ERR.giocatore;
  const phase = state.phase;
  const idx = mapIndex(state.map);

  switch (action.type) {
    case 'piazzaVillaggioIniziale': {
      if (phase.type !== 'setup' || phase.expect !== 'villaggio') return ERR.fase;
      if (pid !== state.currentPlayer) return ERR.turno;
      const t = state.territories[action.territory];
      if (!t) return ERR.territorio;
      if (!isProductive(idx.territory.get(t.id)!)) return ERR.deserto;
      if (!hasRoomFor(t, pid)) return ERR.occupato;
      // Castello: all'inizio si sbarca solo nel Borgo, l'anello più esterno.
      const castle = state.map.castle;
      if (castle && castle.ringOf[t.id] !== castle.rings) {
        return err('SOLO_ANELLO_ESTERNO', 'All’inizio si può fondare solo nel Borgo, l’anello più esterno.');
      }
      if (freeTerraLinks(state, t.id).length === 0) {
        return err('SENZA_STRADE', 'Serve un territorio con almeno un collegamento di terra libero.');
      }
      return null;
    }
    case 'piazzaStradaIniziale': {
      if (phase.type !== 'setup' || phase.expect !== 'strada') return ERR.fase;
      if (pid !== state.currentPlayer) return ERR.turno;
      const l = idx.link.get(action.link);
      if (!l) return ERR.collegamento;
      if (l.kind !== 'terra') return ERR.soloTerra;
      if (state.roads[l.id] !== undefined) return ERR.stradaPresente;
      if (l.a !== state.setupLastTerritory && l.b !== state.setupLastTerritory) {
        return err('NON_ADIACENTE', 'La strada iniziale deve toccare il villaggio appena piazzato.');
      }
      return null;
    }
    case 'tiraDadi':
      if (phase.type !== 'tiro') return ERR.fase;
      return pid === state.currentPlayer ? null : ERR.turno;
    case 'scarta': {
      if (phase.type !== 'scarto' || !phase.pending.includes(pid)) return ERR.fase;
      const need = discardRequired(state, pid);
      if (!isValidResourceMap(action.resources)) return ERR.scarto;
      if (totalResources(action.resources) !== need) return ERR.scarto;
      if (!hasAtLeast(me.hand, action.resources)) return ERR.scarto;
      return null;
    }
    case 'ruba':
      if (phase.type !== 'razzia') return ERR.fase;
      if (pid !== state.currentPlayer) return ERR.turno;
      return phase.candidates.includes(action.target) ? null : err('BERSAGLIO_NON_VALIDO', 'Non puoi razziare questo clan.');
    case 'muovi': {
      if (phase.type !== 'azioni') return ERR.fase;
      if (pid !== state.currentPlayer) return ERR.turno;
      const plan = planMove(state, pid, action.to);
      if (!plan.ok) return err(plan.code, plan.message);
      // Freydis (salvacondotto) non paga mai pedaggi.
      const toll = paysToll(state, pid) ? tollDue(state, pid, action.to) : null;
      if (toll) {
        const r = resolveToll(me.hand, toll.amount, action.pay);
        if (!r.ok) return err(r.code, r.message);
      }
      return null;
    }
    case 'costruisciStrada': {
      if (phase.type !== 'azioni') return ERR.fase;
      if (pid !== state.currentPlayer) return ERR.turno;
      const l = idx.link.get(action.link);
      if (!l) return ERR.collegamento;
      if (l.kind !== 'terra') return ERR.soloTerra;
      if (state.roads[l.id] !== undefined) return ERR.stradaPresente;
      if (!roadTouchesNetwork(state, pid, l.id)) return ERR.nonConnessa;
      if (piecesLeft(state, pid, 'strada') <= 0) return ERR.pezzi;
      return hasAtLeast(me.hand, buildCostFor(state, pid, 'strada')) ? null : ERR.risorse;
    }
    case 'costruisci': {
      if (phase.type !== 'azioni') return ERR.fase;
      if (pid !== state.currentPlayer) return ERR.turno;
      const t = state.territories[action.territory];
      if (!t) return ERR.territorio;
      const what = action.what;
      if (piecesLeft(state, pid, what) <= 0) return ERR.pezzi;
      if (what === 'villaggio') {
        if (!isProductive(idx.territory.get(t.id)!)) return ERR.deserto;
        if (!hasRoomFor(t, pid)) return ERR.occupato;
        if (me.jarl !== t.id) return ERR.jarlAltrove;
      } else {
        const mine = settlementOf(t, pid);
        if (what === 'citta') {
          if (mine?.building !== 'villaggio') return ERR.upgrade;
        } else if (what === 'sala') {
          if (mine?.building !== 'citta') return ERR.upgrade;
        } else if (what === 'porto') {
          if (!mine) return ERR.nonTuo;
          if (!idx.territory.get(t.id)!.coastal) return ERR.costiero;
          if (mine.porto) return ERR.giaPresente;
        } else {
          if (!mine) return ERR.nonTuo;
          if (mine.mercato) return ERR.giaPresente;
        }
      }
      // Porto gratis dell'eroe Njord (mutaporto): niente costo, serve un uso disponibile.
      if (action.free) {
        if (what !== 'porto') return ERR.nonConsentito;
        if (!hasHero(state, pid, 'mutaporto') || heroUsesLeft(state, pid, 'portoGratis') <= 0) return ERR.nonConsentito;
        return null;
      }
      return hasAtLeast(me.hand, buildCostFor(state, pid, what)) ? null : ERR.risorse;
    }
    case 'scambioBanca': {
      if (phase.type !== 'azioni') return ERR.fase;
      if (pid !== state.currentPlayer) return ERR.turno;
      if (!WORLD_RESOURCES.includes(action.give) || !WORLD_RESOURCES.includes(action.receive)) return ERR.scambio;
      if (action.mercante) {
        // Mercante errante (Gest): solo materiale->materiale, con un uso disponibile.
        if (action.give === 'argento' || action.receive === 'argento') return ERR.scambio;
        if (!hasHero(state, pid, 'mercante') || heroUsesLeft(state, pid, 'mercante') <= 0) return ERR.nonConsentito;
      }
      const rate = bankRate(state, pid, action.give, action.receive, action.mercante);
      if (!rate) return ERR.scambio;
      return me.hand[action.give] >= rate.giveCount ? null : ERR.risorse;
    }
    case 'proponiScambio': {
      if (phase.type !== 'azioni') return ERR.fase;
      if (pid !== state.currentPlayer) return ERR.turno;
      if (state.pendingTrade) return err('SCAMBIO_IN_CORSO', 'C’è già un’offerta aperta.');
      if (!isValidResourceMap(action.give) || !isValidResourceMap(action.receive)) return ERR.scambio;
      if (totalResources(action.give) === 0 || totalResources(action.receive) === 0) return ERR.scambio;
      if (overlapping(action.give, action.receive)) return ERR.scambio;
      if (!hasAtLeast(me.hand, action.give)) return ERR.risorse;
      if (action.to !== null && (action.to === pid || !state.players[action.to])) return ERR.scambio;
      return null;
    }
    case 'rispondiScambio': {
      const o = state.pendingTrade;
      if (phase.type !== 'azioni' || !o || o.id !== action.offerId) return ERR.offerta;
      if (pid === o.from) return ERR.nonConsentito;
      if (o.to !== null && o.to !== pid) return ERR.nonConsentito;
      if (o.responses[pid] !== undefined) return err('GIA_RISPOSTO', 'Hai già risposto.');
      if (action.accept && !hasAtLeast(me.hand, o.receive)) return ERR.risorse;
      return null;
    }
    case 'confermaScambio': {
      const o = state.pendingTrade;
      if (phase.type !== 'azioni' || !o || o.id !== action.offerId) return ERR.offerta;
      if (pid !== o.from) return ERR.nonConsentito;
      if (o.responses[action.with] !== 'accettata') return err('NON_ACCETTATA', 'Quel giocatore non ha accettato.');
      const other = state.players[action.with];
      if (!other || !hasAtLeast(me.hand, o.give) || !hasAtLeast(other.hand, o.receive)) return ERR.risorse;
      return null;
    }
    case 'annullaScambio': {
      const o = state.pendingTrade;
      if (!o || o.id !== action.offerId) return ERR.offerta;
      return pid === o.from ? null : ERR.nonConsentito;
    }
    case 'fineTurno':
      if (phase.type !== 'azioni') return ERR.fase;
      return pid === state.currentPlayer ? null : ERR.turno;
  }
}
