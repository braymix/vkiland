/**
 * Validazione delle azioni: `isLegal` è l'unica porta d'ingresso alle regole.
 * Restituisce null se l'azione è lecita, altrimenti un errore con messaggio
 * in italiano (riusabile direttamente nella UI). In Fase 3 questo stesso
 * controllo girerà sul server contro i client manomessi.
 */
import type { Action, ValidationError } from './actions';
import { getTopology } from './board/topology';
import {
  calamityBlocksBankTrade,
  calamityBlocksRoad,
  calamityBlocksSaga,
  calamityBlocksStronghold,
  calamityDragonFrozen,
} from './calamityRules';
import { ATTACK_COST, BUILD_COSTS, PIECE_LIMITS, RESOURCES } from './constants';
import {
  hasAtLeast,
  isValidResourceCount,
  overlappingResources,
  totalResources,
} from './resources';
import {
  buildingOwnerAt,
  effectiveBankRatio,
  roadConnects,
  roadOwnerAt,
  vertexFreeWithDistance,
} from './rules';
import type { GameState, PlayerId } from './types';

function err(code: string, message: string): ValidationError {
  return { code, message };
}

const ERR = {
  partitaFinita: err('PARTITA_FINITA', 'La partita è già conclusa.'),
  giocatoreInesistente: err('GIOCATORE_INESISTENTE', 'Giocatore inesistente.'),
  faseErrata: err('FASE_ERRATA', 'Questa azione non è permessa in questa fase del turno.'),
  nonIlTuoTurno: err('NON_IL_TUO_TURNO', 'Non è il tuo turno.'),
  verticeNonValido: err('VERTICE_NON_VALIDO', 'Questo punto non è edificabile.'),
  verticeOccupato: err('VERTICE_OCCUPATO', 'Questo punto è già occupato.'),
  distanza: err('DISTANZA', 'Troppo vicino a un altro insediamento: serve un vertice di distanza.'),
  spigoloNonValido: err('SPIGOLO_NON_VALIDO', 'Qui non si può tracciare un sentiero.'),
  spigoloOccupato: err('SPIGOLO_OCCUPATO', 'Qui c’è già un sentiero.'),
  nonConnesso: err('NON_CONNESSO', 'Deve essere collegato alla tua rete di sentieri o edifici.'),
  risorseInsufficienti: err('RISORSE_INSUFFICIENTI', 'Non hai le risorse necessarie.'),
  pezziEsauriti: err('PEZZI_ESAURITI', 'Hai esaurito i pezzi di questo tipo.'),
  bancaVuota: err('BANCA_VUOTA', 'La banca non ha le risorse richieste.'),
  mazzoEsaurito: err('MAZZO_ESAURITO', 'Le Carte Saga sono esaurite.'),
  cartaNonDisponibile: err(
    'CARTA_NON_DISPONIBILE',
    'Non hai questa carta giocabile (quelle comprate ora si giocano dal prossimo turno).'
  ),
  cartaGiaGiocata: err('CARTA_GIA_GIOCATA', 'Puoi giocare una sola Carta Saga per turno.'),
  scartoErrato: err('SCARTO_ERRATO', 'La selezione di carte da scartare non è valida.'),
  nienteDaScartare: err('NIENTE_DA_SCARTARE', 'Non devi scartare nulla.'),
  dragoFermo: err('DRAGO_FERMO', 'Il Drago deve spostarsi su un’isola diversa.'),
  esagonoNonValido: err('ESAGONO_NON_VALIDO', 'Esagono inesistente.'),
  bersaglioNonValido: err('BERSAGLIO_NON_VALIDO', 'Non puoi derubare questo giocatore.'),
  scambioNonValido: err('SCAMBIO_NON_VALIDO', 'Proposta di scambio non valida.'),
  scambioPendente: err(
    'SCAMBIO_PENDENTE',
    'C’è già una proposta di scambio in corso: prima va risolta.'
  ),
  offertaInesistente: err('OFFERTA_INESISTENTE', 'Questa offerta non esiste più.'),
  rispostaNonAmmessa: err('RISPOSTA_NON_AMMESSA', 'Non puoi rispondere a questa offerta.'),
  giaRisposto: err('GIA_RISPOSTO', 'Hai già risposto a questa offerta.'),
  rapportoErrato: err('RAPPORTO_ERRATO', 'Quantità non conforme al rapporto di scambio.'),
  azioneSconosciuta: err('AZIONE_SCONOSCIUTA', 'Azione non riconosciuta.'),
  // --- Calamità ---
  calamitaSentiero: err('CALAMITA_SENTIERO', 'Una calamità impedisce di costruire sentieri in questo giro.'),
  calamitaRoccaforte: err('CALAMITA_ROCCAFORTE', 'Una calamità impedisce di costruire roccaforti in questo giro.'),
  calamitaScambio: err('CALAMITA_SCAMBIO', 'Una calamità vieta gli scambi con la banca in questo giro.'),
  calamitaSaga: err('CALAMITA_SAGA', 'Una calamità impedisce di giocare Carte Saga in questo giro.'),
  calamitaDrago: err('CALAMITA_DRAGO', 'Una calamità tiene fermo il Drago in questo giro.'),
  nienteDaGuadagnare: err('NIENTE_DA_GUADAGNARE', 'Non hai un guadagno da riscuotere.'),
  guadagnoErrato: err('GUADAGNO_ERRATO', 'La selezione di risorse da guadagnare non è valida.'),
  // --- Battaglia ---
  battagliaSpenta: err('BATTAGLIA_SPENTA', 'La modalità Battaglia non è attiva in questa partita.'),
  bersaglioNonRaggiunto: err(
    'BERSAGLIO_NON_RAGGIUNTO',
    'Nessun edificio avversario raggiunto da una tua strada su questo punto.'
  ),
  casaIndistruttibile: err(
    'CASA_INDISTRUTTIBILE',
    'Questa è una casa iniziale indistruttibile: puoi attaccarla solo se diventa una roccaforte.'
  ),
} as const;

function isPlayerId(state: GameState, id: unknown): id is PlayerId {
  return typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < state.players.length;
}

/** Guardia per le azioni della fase main del giocatore di turno, senza scambi pendenti. */
function mainPhaseGuard(state: GameState, player: PlayerId): ValidationError | null {
  if (state.phase.type !== 'main') return ERR.faseErrata;
  if (player !== state.currentPlayer) return ERR.nonIlTuoTurno;
  if (state.pendingTrade !== null) return ERR.scambioPendente;
  return null;
}

export function isLegal(state: GameState, action: Action): ValidationError | null {
  if (state.phase.type === 'gameOver') return ERR.partitaFinita;
  if (!isPlayerId(state, action.player)) return ERR.giocatoreInesistente;
  const radius = state.config.boardRadius;
  const topo = getTopology(radius);
  const me = state.players[action.player]!;

  switch (action.type) {
    // ----------------------------------------------------------- setup
    case 'piazzaVillaggioIniziale': {
      if (state.phase.type !== 'setup' || state.phase.expecting !== 'villaggio')
        return ERR.faseErrata;
      if (action.player !== state.setupOrder[state.setupIndex]) return ERR.nonIlTuoTurno;
      if (!(action.vertex in topo.vertexEdges)) return ERR.verticeNonValido;
      if (buildingOwnerAt(state, action.vertex) !== null) return ERR.verticeOccupato;
      if (!vertexFreeWithDistance(state, action.vertex, radius)) return ERR.distanza;
      return null;
    }
    case 'piazzaSentieroIniziale': {
      if (state.phase.type !== 'setup' || state.phase.expecting !== 'sentiero')
        return ERR.faseErrata;
      if (action.player !== state.setupOrder[state.setupIndex]) return ERR.nonIlTuoTurno;
      if (!(action.edge in topo.edgeVertices)) return ERR.spigoloNonValido;
      if (roadOwnerAt(state, action.edge) !== null) return ERR.spigoloOccupato;
      // Deve toccare il villaggio appena piazzato.
      const lastVillage = state.phase.lastVillage;
      if (lastVillage === null || !topo.edgeVertices[action.edge]!.includes(lastVillage))
        return ERR.nonConnesso;
      return null;
    }

    // ----------------------------------------------------------- turno
    case 'tiraDadi': {
      if (state.phase.type !== 'preRoll') return ERR.faseErrata;
      if (action.player !== state.currentPlayer) return ERR.nonIlTuoTurno;
      return null;
    }
    case 'scarta': {
      if (state.phase.type !== 'discard' && state.phase.type !== 'calamityDiscard')
        return ERR.faseErrata;
      const due = state.phase.mustDiscard[action.player];
      if (due === undefined) return ERR.nienteDaScartare;
      if (!isValidResourceCount(action.resources)) return ERR.scartoErrato;
      if (totalResources(action.resources) !== due) return ERR.scartoErrato;
      if (!hasAtLeast(me.resources, action.resources)) return ERR.scartoErrato;
      return null;
    }
    case 'guadagnaCalamita': {
      if (state.phase.type !== 'calamityGain') return ERR.faseErrata;
      const due = state.phase.mustGain[action.player];
      if (due === undefined) return ERR.nienteDaGuadagnare;
      if (!isValidResourceCount(action.resources)) return ERR.guadagnoErrato;
      // Si prende ESATTAMENTE il minimo tra la propria quota e ciò che resta in banca.
      const cap = Math.min(due, totalResources(state.bank));
      if (totalResources(action.resources) !== cap) return ERR.guadagnoErrato;
      for (const r of RESOURCES) if (action.resources[r] > state.bank[r]) return ERR.bancaVuota;
      return null;
    }
    case 'muoviDrago': {
      if (state.phase.type !== 'moveDragon') return ERR.faseErrata;
      if (action.player !== state.currentPlayer) return ERR.nonIlTuoTurno;
      if (!state.board.hexes.some((h) => h.id === action.hex)) return ERR.esagonoNonValido;
      if (action.hex === state.board.dragonHex) return ERR.dragoFermo;
      return null;
    }
    case 'ruba': {
      if (state.phase.type !== 'steal') return ERR.faseErrata;
      if (action.player !== state.currentPlayer) return ERR.nonIlTuoTurno;
      if (!state.phase.candidates.includes(action.target)) return ERR.bersaglioNonValido;
      return null;
    }

    // ----------------------------------------------------------- costruzioni
    case 'costruisciSentiero': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (calamityBlocksRoad(state)) return ERR.calamitaSentiero;
      if (!(action.edge in topo.edgeVertices)) return ERR.spigoloNonValido;
      if (roadOwnerAt(state, action.edge) !== null) return ERR.spigoloOccupato;
      if (me.roads.length >= PIECE_LIMITS.sentiero) return ERR.pezziEsauriti;
      if (!roadConnects(state, action.player, action.edge, radius)) return ERR.nonConnesso;
      if (!hasAtLeast(me.resources, BUILD_COSTS.sentiero)) return ERR.risorseInsufficienti;
      return null;
    }
    case 'costruisciVillaggio': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (!(action.vertex in topo.vertexEdges)) return ERR.verticeNonValido;
      if (buildingOwnerAt(state, action.vertex) !== null) return ERR.verticeOccupato;
      if (!vertexFreeWithDistance(state, action.vertex, radius)) return ERR.distanza;
      // Connettività: serve un proprio sentiero che tocchi il vertice.
      const connected = topo.vertexEdges[action.vertex]!.some((e) => me.roads.includes(e));
      if (!connected) return ERR.nonConnesso;
      if (me.villages.length >= PIECE_LIMITS.villaggio) return ERR.pezziEsauriti;
      if (!hasAtLeast(me.resources, BUILD_COSTS.villaggio)) return ERR.risorseInsufficienti;
      return null;
    }
    case 'costruisciRoccaforte': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (calamityBlocksStronghold(state)) return ERR.calamitaRoccaforte;
      if (!me.villages.includes(action.vertex)) return ERR.verticeNonValido;
      if (me.strongholds.length >= PIECE_LIMITS.roccaforte) return ERR.pezziEsauriti;
      if (!hasAtLeast(me.resources, BUILD_COSTS.roccaforte)) return ERR.risorseInsufficienti;
      return null;
    }
    case 'compraCartaSaga': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (state.sagaDeck.length === 0) return ERR.mazzoEsaurito;
      if (!hasAtLeast(me.resources, BUILD_COSTS.cartaSaga)) return ERR.risorseInsufficienti;
      return null;
    }

    // ----------------------------------------------------------- battaglia
    case 'attaccaEdificio': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (!state.config.battle) return ERR.battagliaSpenta;
      // Dev'essere un edificio AVVERSARIO, raggiunto da una mia strada.
      const owner = buildingOwnerAt(state, action.vertex);
      if (owner === null || owner === action.player) return ERR.bersaglioNonRaggiunto;
      const reached = (topo.vertexEdges[action.vertex] ?? []).some((e) => me.roads.includes(e));
      if (!reached) return ERR.bersaglioNonRaggiunto;
      // Le due case iniziali sono indistruttibili finché restano casette.
      const ownerP = state.players[owner]!;
      const isStronghold = ownerP.strongholds.includes(action.vertex);
      if (!isStronghold && ownerP.initialVillages.includes(action.vertex))
        return ERR.casaIndistruttibile;
      if (!hasAtLeast(me.resources, ATTACK_COST)) return ERR.risorseInsufficienti;
      return null;
    }

    // ----------------------------------------------------------- scambi
    case 'scambioBanca': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (calamityBlocksBankTrade(state)) return ERR.calamitaScambio;
      if (action.give === action.receive) return ERR.scambioNonValido;
      const ratio = effectiveBankRatio(state, action.player, action.give, radius);
      if (me.resources[action.give] < ratio) return ERR.risorseInsufficienti;
      if (state.bank[action.receive] < 1) return ERR.bancaVuota;
      return null;
    }
    case 'proponiScambio': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (!isValidResourceCount(action.give) || !isValidResourceCount(action.receive))
        return ERR.scambioNonValido;
      if (totalResources(action.give) === 0 || totalResources(action.receive) === 0)
        return ERR.scambioNonValido;
      if (overlappingResources(action.give, action.receive).length > 0)
        return ERR.scambioNonValido;
      if (!hasAtLeast(me.resources, action.give)) return ERR.risorseInsufficienti;
      if (action.to !== null) {
        if (!isPlayerId(state, action.to) || action.to === action.player)
          return ERR.scambioNonValido;
      }
      return null;
    }
    case 'rispondiScambio': {
      if (state.phase.type !== 'main') return ERR.faseErrata;
      const offer = state.pendingTrade;
      if (offer === null || offer.id !== action.offerId) return ERR.offertaInesistente;
      if (action.player === offer.from) return ERR.rispostaNonAmmessa;
      if (offer.to !== null && action.player !== offer.to) return ERR.rispostaNonAmmessa;
      if (offer.responses[action.player] !== undefined) return ERR.giaRisposto;
      // Per accettare, chi risponde deve possedere ciò che il proponente chiede.
      if (action.accept && !hasAtLeast(me.resources, offer.receive))
        return ERR.risorseInsufficienti;
      return null;
    }
    case 'confermaScambio': {
      if (state.phase.type !== 'main') return ERR.faseErrata;
      const offer = state.pendingTrade;
      if (offer === null || offer.id !== action.offerId) return ERR.offertaInesistente;
      if (action.player !== offer.from) return ERR.rispostaNonAmmessa;
      if (offer.to !== null) return ERR.scambioNonValido; // le offerte dirette si chiudono da sole
      if (!isPlayerId(state, action.with)) return ERR.giocatoreInesistente;
      if (offer.responses[action.with] !== 'accettata') return ERR.rispostaNonAmmessa;
      const partner = state.players[action.with]!;
      if (!hasAtLeast(me.resources, offer.give)) return ERR.risorseInsufficienti;
      if (!hasAtLeast(partner.resources, offer.receive)) return ERR.risorseInsufficienti;
      return null;
    }
    case 'annullaScambio': {
      if (state.phase.type !== 'main') return ERR.faseErrata;
      const offer = state.pendingTrade;
      if (offer === null || offer.id !== action.offerId) return ERR.offertaInesistente;
      if (action.player !== offer.from) return ERR.rispostaNonAmmessa;
      return null;
    }

    // ----------------------------------------------------------- Carte Saga
    case 'giocaBerserker': {
      if (state.phase.type !== 'preRoll' && state.phase.type !== 'main') return ERR.faseErrata;
      if (action.player !== state.currentPlayer) return ERR.nonIlTuoTurno;
      if (state.pendingTrade !== null) return ERR.scambioPendente;
      if (calamityBlocksSaga(state)) return ERR.calamitaSaga;
      if (calamityDragonFrozen(state)) return ERR.calamitaDrago; // il Berserker sposta il Drago
      if (state.devCardPlayedThisTurn) return ERR.cartaGiaGiocata;
      if (!me.sagaCards.includes('berserker')) return ERR.cartaNonDisponibile;
      return null;
    }
    case 'giocaCostruttori': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (calamityBlocksSaga(state)) return ERR.calamitaSaga;
      if (state.devCardPlayedThisTurn) return ERR.cartaGiaGiocata;
      if (!me.sagaCards.includes('costruttoriDiSentieri')) return ERR.cartaNonDisponibile;
      if (me.roads.length >= PIECE_LIMITS.sentiero) return ERR.pezziEsauriti;
      return null;
    }
    case 'piazzaSentieroGratis': {
      // Vale nella fase Costruttori (freeRoads) e nella fase strade delle calamità.
      if (state.phase.type === 'freeRoads') {
        if (action.player !== state.currentPlayer) return ERR.nonIlTuoTurno;
      } else if (state.phase.type === 'calamityRoads') {
        if (action.player !== state.phase.queue[0]) return ERR.nonIlTuoTurno;
      } else {
        return ERR.faseErrata;
      }
      if (!(action.edge in topo.edgeVertices)) return ERR.spigoloNonValido;
      if (roadOwnerAt(state, action.edge) !== null) return ERR.spigoloOccupato;
      if (me.roads.length >= PIECE_LIMITS.sentiero) return ERR.pezziEsauriti;
      if (!roadConnects(state, action.player, action.edge, radius)) return ERR.nonConnesso;
      return null;
    }
    case 'giocaBanchetto': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (calamityBlocksSaga(state)) return ERR.calamitaSaga;
      if (state.devCardPlayedThisTurn) return ERR.cartaGiaGiocata;
      if (!me.sagaCards.includes('banchetto')) return ERR.cartaNonDisponibile;
      const [r1, r2] = action.resources;
      const needed = r1 === r2 ? 2 : 1;
      if (state.bank[r1] < needed || state.bank[r2] < (r1 === r2 ? 2 : 1)) return ERR.bancaVuota;
      return null;
    }
    case 'giocaTributo': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (calamityBlocksSaga(state)) return ERR.calamitaSaga;
      if (state.devCardPlayedThisTurn) return ERR.cartaGiaGiocata;
      if (!me.sagaCards.includes('tributo')) return ERR.cartaNonDisponibile;
      return null;
    }

    // ----------------------------------------------------------- fine turno
    case 'fineTurno': {
      return mainPhaseGuard(state, action.player);
    }

    default:
      return ERR.azioneSconosciuta;
  }
}
