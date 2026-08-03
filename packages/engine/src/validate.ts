/**
 * Validazione delle azioni: `isLegal` è l'unica porta d'ingresso alle regole.
 * Restituisce null se l'azione è lecita, altrimenti un errore con messaggio
 * in italiano (riusabile direttamente nella UI). In Fase 3 questo stesso
 * controllo girerà sul server contro i client manomessi.
 */
import type { Action, ValidationError } from './actions';
import { boardTopoKey, getTopology, type TopoKey } from './board/topology';
import {
  calamityBlocksBankTrade,
  calamityBlocksRoad,
  calamityBlocksSaga,
  calamityBlocksStronghold,
  calamityDragonFrozen,
} from './calamityRules';
import { ATTACK_COST_EDIFICIO, ATTACK_COST_SENTIERO, BUILD_COSTS, PIECE_LIMITS, RESOURCES } from './constants';
import {
  hasAtLeast,
  isValidResourceCount,
  overlappingResources,
  totalResources,
} from './resources';
import { friendsOf, isTeamMode, sameTeam } from './teams';
import {
  buildingOwnerAt,
  effectiveBankRatio,
  franaTargets,
  roadConnects,
  roadIsBreakable,
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
  // --- Capitale ---
  capitaleSpenta: err('CAPITALE_SPENTA', 'La modalità Capitale non è attiva in questa partita.'),
  capitaleGiaCostruita: err('CAPITALE_GIA_COSTRUITA', 'Hai già la tua Capitale: se ne può costruire una sola.'),
  nonRoccaforte: err('NON_ROCCAFORTE', 'La Capitale si costruisce solo su una tua Roccaforte.'),
  capitaleIndistruttibile: err(
    'CAPITALE_INDISTRUTTIBILE',
    'La Capitale non si può mai distruggere.'
  ),
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
  sentieroNonRaggiunto: err(
    'SENTIERO_NON_RAGGIUNTO',
    'Nessuna strada avversaria raggiunta da una tua strada su questo punto.'
  ),
  sentieroProtetto: err(
    'SENTIERO_PROTETTO',
    'Questa strada è collegata su entrambi i lati: puoi spezzare solo quelle all’estremità.'
  ),
  nessunaCalamita: err(
    'NESSUNA_CALAMITA',
    'Non c’è nessuna calamità in corso da cambiare in questo giro.'
  ),
  franaNonValida: err(
    'FRANA_NON_VALIDA',
    'La frana può far crollare solo una tua strada marginale (mai una delle due iniziali).'
  ),
  // --- Squadra ---
  scambioSoloSquadra: err(
    'SCAMBIO_SOLO_SQUADRA',
    'In modalità squadra gli scambi si fanno solo con un compagno di squadra.'
  ),
  scambioUnoAUno: err(
    'SCAMBIO_UNO_A_UNO',
    'In modalità squadra gli scambi sono uno-a-uno: una risorsa per una risorsa.'
  ),
  troppiScambi: err(
    'TROPPI_SCAMBI',
    'In modalità squadra puoi fare al massimo due scambi per turno.'
  ),
} as const;

function isPlayerId(state: GameState, id: unknown): id is PlayerId {
  return typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < state.players.length;
}

/**
 * Battaglia: controlla che `vertex` sia un bersaglio d'attacco valido per
 * `player` (edificio avversario, raggiunto da una sua strada, non una casa
 * iniziale indistruttibile). Condiviso da attacco a pagamento e carta Assalto.
 */
function attackTargetError(
  state: GameState,
  player: PlayerId,
  vertex: string,
  radius: TopoKey
): ValidationError | null {
  const owner = buildingOwnerAt(state, vertex);
  // In modalità squadra i compagni non sono bersagli (né sé stessi).
  if (owner === null || friendsOf(state.config.teams, player).has(owner))
    return ERR.bersaglioNonRaggiunto;
  const topo = getTopology(radius);
  const reached = (topo.vertexEdges[vertex] ?? []).some((e) => state.players[player]!.roads.includes(e));
  if (!reached) return ERR.bersaglioNonRaggiunto;
  const ownerP = state.players[owner]!;
  // La Capitale non si può mai distruggere (né declassare).
  if (ownerP.capitals.includes(vertex)) return ERR.capitaleIndistruttibile;
  if (!ownerP.strongholds.includes(vertex) && ownerP.initialVillages.includes(vertex))
    return ERR.casaIndistruttibile;
  return null;
}

/**
 * Battaglia — attacco leggero: controlla che `edge` sia una strada avversaria
 * valida da spezzare per `player` (raggiunta da una sua strada e collegata su
 * un solo lato: all'estremità).
 */
function roadAttackTargetError(
  state: GameState,
  player: PlayerId,
  edge: string,
  radius: TopoKey
): ValidationError | null {
  const owner = roadOwnerAt(state, edge);
  if (owner === null || friendsOf(state.config.teams, player).has(owner))
    return ERR.sentieroNonRaggiunto;
  const topo = getTopology(radius);
  const vs = topo.edgeVertices[edge];
  if (!vs) return ERR.sentieroNonRaggiunto;
  const myRoads = state.players[player]!.roads;
  const reached = vs.some((v) => (topo.vertexEdges[v] ?? []).some((e) => myRoads.includes(e)));
  if (!reached) return ERR.sentieroNonRaggiunto;
  if (!roadIsBreakable(state.players[owner]!, edge, radius)) return ERR.sentieroProtetto;
  return null;
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
  const radius = boardTopoKey(state.config.boardRadius, state.config.boardShape, state.board.hexes);
  const topo = getTopology(radius);
  const me = state.players[action.player]!;
  // Modalità squadra: i compagni (sé compreso). Fuori dalla modalità è {player},
  // quindi tutte le regole geometriche restano identiche alle partite classiche.
  const friends = friendsOf(state.config.teams, action.player);

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
      if (!roadConnects(state, action.player, action.edge, radius, friends)) return ERR.nonConnesso;
      if (!hasAtLeast(me.resources, BUILD_COSTS.sentiero)) return ERR.risorseInsufficienti;
      return null;
    }
    case 'costruisciVillaggio': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (!(action.vertex in topo.vertexEdges)) return ERR.verticeNonValido;
      if (buildingOwnerAt(state, action.vertex) !== null) return ERR.verticeOccupato;
      if (!vertexFreeWithDistance(state, action.vertex, radius)) return ERR.distanza;
      // Connettività: serve un sentiero PROPRIO o di un compagno che tocchi il vertice.
      const connected = topo.vertexEdges[action.vertex]!.some((e) =>
        state.players.some((p) => friends.has(p.id) && p.roads.includes(e))
      );
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
    case 'costruisciCapitale': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (!state.config.capitale) return ERR.capitaleSpenta;
      // La Capitale è un'evoluzione della Roccaforte: la stessa calamità che
      // vieta le roccaforti (assedio) la blocca.
      if (calamityBlocksStronghold(state)) return ERR.calamitaRoccaforte;
      if (me.capitals.length >= PIECE_LIMITS.capitale) return ERR.capitaleGiaCostruita;
      // Si costruisce SOLO su una propria Roccaforte (non ancora Capitale).
      if (!me.strongholds.includes(action.vertex) || me.capitals.includes(action.vertex))
        return ERR.nonRoccaforte;
      if (!hasAtLeast(me.resources, BUILD_COSTS.capitale)) return ERR.risorseInsufficienti;
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
      const targetErr = attackTargetError(state, action.player, action.vertex, radius);
      if (targetErr) return targetErr;
      if (!hasAtLeast(me.resources, ATTACK_COST_EDIFICIO)) return ERR.risorseInsufficienti;
      return null;
    }
    case 'spezzaSentiero': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (!state.config.battle) return ERR.battagliaSpenta;
      const targetErr = roadAttackTargetError(state, action.player, action.edge, radius);
      if (targetErr) return targetErr;
      if (!hasAtLeast(me.resources, ATTACK_COST_SENTIERO)) return ERR.risorseInsufficienti;
      return null;
    }
    case 'giocaAssalto': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (!state.config.battle) return ERR.battagliaSpenta;
      if (calamityBlocksSaga(state)) return ERR.calamitaSaga;
      if (state.devCardPlayedThisTurn) return ERR.cartaGiaGiocata;
      if (!me.sagaCards.includes('assalto')) return ERR.cartaNonDisponibile;
      const targetErr = attackTargetError(state, action.player, action.vertex, radius);
      if (targetErr) return targetErr;
      return null;
    }
    case 'giocaAssaltoLeggero': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (!state.config.battle) return ERR.battagliaSpenta;
      if (calamityBlocksSaga(state)) return ERR.calamitaSaga;
      if (state.devCardPlayedThisTurn) return ERR.cartaGiaGiocata;
      if (!me.sagaCards.includes('assaltoLeggero')) return ERR.cartaNonDisponibile;
      const targetErr = roadAttackTargetError(state, action.player, action.edge, radius);
      if (targetErr) return targetErr;
      return null;
    }
    case 'giocaCambiaCalamita': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (calamityBlocksSaga(state)) return ERR.calamitaSaga;
      if (state.devCardPlayedThisTurn) return ERR.cartaGiaGiocata;
      if (!me.sagaCards.includes('cambiaCalamita')) return ERR.cartaNonDisponibile;
      if (!state.calamities || state.calamities.current === null) return ERR.nessunaCalamita;
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
      // Modalità squadra: uno-a-uno, al massimo due per turno; il destinatario è
      // tutta la squadra (`to` null) oppure un compagno specifico (mai un avversario).
      if (isTeamMode(state.config.teams)) {
        if ((state.teamTradesThisTurn ?? 0) >= 2) return ERR.troppiScambi;
        if (totalResources(action.give) !== 1 || totalResources(action.receive) !== 1)
          return ERR.scambioUnoAUno;
        if (action.to !== null && !sameTeam(state.config.teams, action.player, action.to))
          return ERR.scambioSoloSquadra;
      }
      return null;
    }
    case 'rispondiScambio': {
      if (state.phase.type !== 'main') return ERR.faseErrata;
      const offer = state.pendingTrade;
      if (offer === null || offer.id !== action.offerId) return ERR.offertaInesistente;
      if (action.player === offer.from) return ERR.rispostaNonAmmessa;
      if (offer.to !== null && action.player !== offer.to) return ERR.rispostaNonAmmessa;
      // Offerta «a tutta la squadra»: possono rispondere solo i compagni.
      if (offer.to === null && isTeamMode(state.config.teams) && !sameTeam(state.config.teams, offer.from, action.player))
        return ERR.rispostaNonAmmessa;
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
      if (!roadConnects(state, action.player, action.edge, radius, friends)) return ERR.nonConnesso;
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
    case 'giocaRazzia': {
      const guard = mainPhaseGuard(state, action.player);
      if (guard) return guard;
      if (calamityBlocksSaga(state)) return ERR.calamitaSaga;
      if (state.devCardPlayedThisTurn) return ERR.cartaGiaGiocata;
      if (!me.sagaCards.includes('razzia')) return ERR.cartaNonDisponibile;
      if (!state.board.hexes.some((h) => h.id === action.hex)) return ERR.esagonoNonValido;
      return null;
    }

    case 'franaSentiero': {
      if (state.phase.type !== 'calamityFrana') return ERR.faseErrata;
      if (action.player !== state.phase.player) return ERR.nonIlTuoTurno;
      if (!franaTargets(me, radius).includes(action.edge)) return ERR.franaNonValida;
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
