/**
 * TUTTE le stringhe della UI, centralizzate per la futura i18n.
 * `t(chiave, parametri)` interpola i segnaposto {nome}.
 */
import type { PlayerColor, Resource, SagaCard, TerrainType } from '@vikiland/engine';

export const it = {
  titolo: 'VIKING-ISLAND',
  sottotitolo: "Saga dell'isola del Nord",

  // Menu
  nuovaPartita: 'Nuova partita',
  multigiocatore: 'Online',
  negozio: 'Negozio (in arrivo)',
  comeSiGioca: 'Come si gioca',

  // Popup "monetizzazione" scherzoso (Nuova partita)
  memeTitolo: 'Un attimo, vichingo!',
  memeTesto:
    'Per salpare puoi guardare una pubblicità di 47 minuti oppure passare a ' +
    'VIKING-ISLAND PRO™ a soli 999 $ al mese + IVA (fattura al tuo jarl).',
  memePubblicita: '▶ Continua con pubblicità',
  memePro: 'Passa a PRO — 999 $/mese + IVA',
  memeAvanti: 'No scherzo, vai avanti →',

  // Tutorial («Libro delle Saghe»)
  libroSaghe: 'Libro delle Saghe',
  capitoloDi: 'Capitolo {n} di {tot}',
  avanti: 'Avanti',
  comeFunzionaOnline: "Come funziona l'online?",
  apriTutorial: 'Apri il Libro delle Saghe',

  // Online: account
  accedi: 'Accedi',
  registrati: 'Registrati',
  email: 'Email',
  password: 'Password',
  nomeUtente: 'Nome utente',
  nomeUtenteHint: 'Il nome utente è anche il tuo nome in gioco.',
  nomeInGioco: 'Nome in gioco',
  serverUrl: 'Indirizzo del server',
  serverExpander: 'Server',
  connessioneInCorso: 'Connessione…',
  esciAccount: 'Cambia account',
  ciao: 'Ciao, {nome}!',

  serverVerifica: 'Verifica del server…',
  serverOk: 'Server di gioco raggiungibile',
  serverGiu:
    "Server di gioco non raggiungibile: l'online qui è spento. Puoi comunque giocare in locale dal menu (bot e hot-seat) — oppure indica l'indirizzo di un altro server.",

  // Online: lobby
  creaPartita: 'Crea partita',
  unisciti: 'Unisciti',
  codiceInvito: 'Codice invito',
  lobbyTitolo: 'Lobby {code}',
  condividiCodice: 'Condividi il codice con gli altri vichinghi',
  inAttesaHost: "In attesa che l'host salpi…",
  avviaPartita: 'Salpa!',
  aggiungiBot: '+ Bot',
  esciLobby: 'Esci dalla lobby',
  timerTurno: 'Timer di turno',
  timerSecondi: 'Timer di turno (secondi, 0 = nessuno)',
  timerLobby: 'Timer di turno: {s}',
  nessunTimer: 'Nessuno',
  secondiAbbr: '{n}s',
  hostTag: 'host',
  disconnessoTag: 'assente',
  attesaPartita: 'In attesa della partita…',
  lobbyChiusa: 'Lobby chiusa: {motivo}',
  terminaPartita: 'Termina partita',
  terminaTitolo: 'Terminare la partita?',
  terminaTesto:
    'La partita verrà chiusa per TUTTI i giocatori e non si potrà riprendere.',
  terminaConferma: 'Sì, termina per tutti',
  partitaPubblicaToggle: 'Partita pubblica (aperta a tutti)',
  partitePubbliche: 'Partite pubbliche',
  nessunaPubblica: 'Nessuna partita pubblica al momento. Creane una tu!',
  entra: 'Entra',
  postiNsuM: '{n}/{m} vichinghi',
  visibilitaPubblica: 'Pubblica',
  visibilitaPrivata: 'Privata (su invito)',

  // Gestione account
  account: 'Account',
  ilTuoAccount: 'Il tuo account',
  datiSalvati: 'Questi sono i dati che salviamo su di te:',
  registratoIl: 'Registrato il',
  idAccount: 'ID account',
  passwordImpostata: '••••••••',
  cambiaNome: 'Cambia nome utente',
  nuovoNome: 'Nuovo nome utente',
  nomeAggiornato: 'Nome aggiornato! In gioco varrà dalle prossime partite.',
  passwordAttuale: 'Password attuale',
  aggiungiEmail: 'Aggiungi email',
  emailEggTitolo: 'Aspetta un attimo…',
  emailEggTesto:
    '«Per un gioco online non serve la mail?» No. E visto che non vendo i ' +
    'tuoi dati, non la chiediamo e non la salviamo: questo campo non esiste ' +
    'nemmeno nel database.',
  emailEggOk: 'Giusto!',
  cambiaPassword: 'Cambia password',
  nuovaPassword: 'Nuova password (min 8)',
  ripetiPassword: 'Ripeti la nuova password',
  passwordNonCoincidono: 'Le due password non coincidono',
  passwordAggiornata:
    'Password aggiornata! Le sessioni sugli altri dispositivi sono state disconnesse.',
  salva: 'Salva',

  // Setup
  configuraPartita: 'Prepara la spedizione',
  giocatore: 'Giocatore',
  umano: 'Umano',
  bot: 'Bot',
  livelloBot: 'Livello',
  facile: 'Facile',
  normale: 'Normale',
  difficile: 'Difficile',
  esperto: 'Esperto',
  nome: 'Nome',
  aggiungiGiocatore: '+ Aggiungi vichingo',
  cambiaColore: 'Cambia colore',
  scambiaColoreCon: 'Scambia il colore con {nome}',
  nomeColore: {
    rosso: 'Rosso',
    blu: 'Blu',
    verde: 'Verde',
    giallo: 'Giallo',
    viola: 'Viola',
  } satisfies Record<PlayerColor, string>,
  rimuovi: 'Rimuovi',
  configurazione: 'Configurazione',
  puntiVittoria: 'Punti per la vittoria',
  standardN: '(standard {n})',
  seedOpzionale: 'Seme mappa (vuoto = casuale)',
  evita68: 'Evita 6 e 8 adiacenti',
  via: 'Salpa!',
  indietro: 'Indietro',
  serveUnUmano: 'Serve almeno un vichingo umano',

  // Hot-seat (passaggio del dispositivo)
  passaDispositivo: 'Passa il dispositivo',
  toccaA: 'Tocca a {nome}',
  sonoPronto: 'Sono {nome}!',

  // Fasi e azioni
  faseSetupVillaggio: '{nome}: piazza un villaggio',
  faseSetupSentiero: '{nome}: piazza un sentiero accanto al villaggio',
  tiraIDadi: 'Tira i dadi',
  setteGrave: 'Il Drago si sveglia!',
  faseTiroAtteso: 'Tocca a {nome}: tira i dadi',
  faseMain: 'Tocca a {nome}',
  faseScarto: 'Il 7! {nome} deve scartare {n} carte',
  faseDrago: '{nome} sposta il Drago',
  faseFurto: '{nome} sceglie chi derubare',
  faseSentieriGratis: '{nome} piazza {n} sentieri gratuiti',
  costruisci: 'Costruisci',
  sentiero: 'Sentiero',
  villaggio: 'Villaggio',
  roccaforte: 'Roccaforte',
  compraCarta: 'Carta Saga',
  scambia: 'Scambia',
  scambiaBanca: 'Banca / Approdi',
  proponiScambio: 'Proponi ai giocatori',
  carte: 'Carte',
  fineTurno: 'Fine turno',
  annulla: 'Annulla',
  conferma: 'Conferma',
  chiudi: 'Chiudi',
  gioca: 'Gioca',

  // Pannelli
  leTueRisorse: 'Le tue risorse',
  leTueCarte: 'Le tue Carte Saga',
  carteNonGiocabili: '(dal prossimo turno)',
  mazzoRimasto: 'Mazzo: {n}',
  banca: 'Banca',
  puntiGloria: 'Punti Gloria',
  diario: 'Diario di bordo',

  // Scambi
  dai: 'Dai',
  ricevi: 'Ricevi',
  rapporto: 'Rapporto {n}:1',
  scegliRisorse: 'Scegli le risorse',
  offertaA: 'Offerta a',
  tutti: 'Tutti',
  offertaDi: 'Offerta di {nome}',
  accetta: 'Accetta',
  rifiuta: 'Rifiuta',
  inAttesaRisposte: 'In attesa di risposta…',
  concludiCon: 'Concludi con {nome}',

  // Scarto e furto
  scartaCarte: 'Scarta {n} carte',
  scegliVittima: 'Scegli chi derubare',

  // Bugiardino (riepilogo costi e punti)
  bugiardino: 'Bugiardino',
  bugiardinoTitolo: 'Costi e Punti Gloria',
  pezziMax: 'max {n}',
  puntiGloriaAbbr: 'PG',
  bonusRequisitoVia: 'almeno {n} sentieri collegati',
  bonusRequisitoFuria: 'almeno {n} Berserker giocati',
  eroeSegretoRiga: '1 PG segreto (conta da subito)',
  scambiRiga: 'Scambi: banca 4:1 · approdo 3:1 · approdo dedicato 2:1',
  obiettivoRiga: 'Vittoria: {n} Punti Gloria nel proprio turno',
  setteRiga: 'Col 7: chi ha più di {n} carte ne scarta la metà',

  // Vittoria
  vittoriaTitolo: '{nome} conquista Viking-Island!',
  vittoriaSub: 'conquista Viking-Island!',
  rivincita: 'Rivincita',
  tornaAlMenu: 'Torna al menu',
  dettaglioPunti: 'Dettaglio dei Punti Gloria',
  bonusGrandeVia: 'La Grande Via',
  bonusFuria: 'Furia dei Berserker',
  eroiNascosti: 'Saghe degli Eroi',
  villaggi: 'Villaggi',
  roccaforti: 'Roccaforti',
  totale: 'Totale',

  // Fine partita: mappa finale e statistiche
  vediMappaFinale: 'Mappa finale',
  vediStatistiche: 'Statistiche',
  mappaFinaleTitolo: 'La mappa a fine partita',
  statisticheTitolo: 'Statistiche della partita',
  statTiriDado: 'Numeri usciti dai dadi',
  statTiriSub: '{tiri} tiri in {turni} turni · atteso vs reale',
  statNessunTiro: 'Nessun tiro registrato.',
  statLegendaAtteso: 'atteso',
  statNumeroFortunato: 'Numero fortunato',
  statSetteUsciti: 'Sette usciti',
  statDragoMosso: 'Drago mosso',
  statConfronto: 'Confronto tra clan',
  statScambi: 'Scambi',
  statScambiBanca: 'Scambi con la banca',
  statScambiGiocatori: 'Scambi tra giocatori',
  statCostruzioni: 'Costruzioni',
  statRisorseProdotte: 'Risorse prodotte',
  statCarteSaga: 'Carte Saga comprate',
  statFurti: 'Saccheggi col Drago',
  statScartate: 'Carte scartate',
  statPrimati: 'Albo dei primati',
  statManiDoro: "Mani d'oro",
  statManiDoroSub: 'più risorse raccolte',
  statMercante: 'Mercante',
  statMercanteSub: 'più scambi conclusi',
  statCostruttore: 'Mastro costruttore',
  statCostruttoreSub: 'più costruzioni',
  statPredone: 'Predone',
  statPredoneSub: 'più saccheggi col Drago',
  statSfortunato: 'Sfortunato',
  statSfortunatoSub: 'più carte scartate',
  statStratega: 'Stratega',
  statStrategaSub: 'più Carte Saga giocate',
  statNessuno: '—',

  // Nomi delle risorse e dei terreni
  risorsa: {
    legname: 'Legname',
    pietra: 'Pietra',
    lana: 'Lana',
    orzo: 'Orzo',
    ferro: 'Ferro',
  } satisfies Record<Resource, string>,
  terreno: {
    legname: 'Foresta di pini',
    pietra: 'Cava di pietra rossa',
    lana: 'Pascolo',
    orzo: "Campi d'orzo",
    ferro: 'Miniera di ferro',
    tundra: 'Tundra ghiacciata',
  } satisfies Record<TerrainType, string>,
  cartaSaga: {
    berserker: 'Berserker',
    sagaDegliEroi: 'Saga degli Eroi',
    costruttoriDiSentieri: 'Costruttori di Sentieri',
    banchetto: 'Banchetto',
    tributo: 'Tributo',
  } satisfies Record<SagaCard, string>,
  descrizioneCarta: {
    berserker: 'Sposta il Drago e ruba 1 carta. Conta per la Furia dei Berserker.',
    sagaDegliEroi: '1 Punto Gloria segreto (conta da subito).',
    costruttoriDiSentieri: 'Piazza subito 2 sentieri gratuiti.',
    banchetto: 'Prendi 2 risorse a scelta dalla banca.',
    tributo: 'Tutti gli avversari ti consegnano TUTTE le unità di una risorsa.',
  } satisfies Record<SagaCard, string>,

  /**
   * EASTER EGG: lamentele dei bot quando il Drago li blocca — come al tavolo
   * vero, dove c'è sempre qualcuno che la prende sul personale.
   */
  lamentiDrago: [
    'No ma sempre a me?!',
    'Ma blocca l’altro, no?!?!',
    'Me ne vendicherò. Parola di vichingo.',
    'Odino, perché proprio io?',
    'C’è mezza isola libera e lo metti QUI?!',
    'Quel drago ce l’ha con me, è ufficiale.',
    'Tranquilli, me lo segno. Me lo segno TUTTO.',
    'Ah certo, come no, DI NUOVO da me.',
    'E pensare che ti avevo pure offerto uno scambio…',
    'Sto chiamando l’avvocato del clan.',
    'Quando arriva la MIA Furia ne riparliamo.',
    'Bel modo di fare amicizia, complimenti.',
    'Il mio orzo… IL MIO ORZO!',
    'Drago bello, torna nella tundra, ti prego.',
  ],

  // Eventi del diario
  log: {
    lamentoDrago: '{nome}: «{frase}»',
    ordineTiro: '{nome} tira {d1}+{d2} = {tot}',
    ordineSpareggio: 'Spareggio: {righe}',
    ordineTitolo: 'Tiro per l’ordine: {righe}',
    ordineFinale: 'Ordine di gioco: {ordine}',
    turnoIniziato: '— Turno {n}: tocca a {nome} —',
    dadiTirati: '{nome} tira {d1}+{d2} = {tot}',
    risorseProdotte: '{nome} riceve {risorse}',
    penuriaBanca: 'Penuria in banca: {risorse} non distribuite',
    risorseScartate: '{nome} scarta {n} carte',
    dragoMosso: '{nome} sposta il Drago',
    risorsaRubataNota: '{ladro} ruba {risorsa} a {vittima}',
    risorsaRubata: '{ladro} ruba una carta a {vittima}',
    costruito: '{nome} costruisce: {cosa}',
    cartaComprataNota: '{nome} compra una Carta Saga: {carta}',
    cartaComprata: '{nome} compra una Carta Saga',
    cartaGiocata: '{nome} gioca: {carta}',
    banchetto: '{nome} banchetta: +{r1} e +{r2}',
    tributo: '{nome} riscuote il tributo: {n}× {risorsa}',
    scambioProposto: '{nome} propone uno scambio',
    rispostaScambio: '{nome} {risposta} lo scambio',
    accettaVerbo: 'accetta',
    rifiutaVerbo: 'rifiuta',
    scambioEseguitoBanca: '{nome} scambia con la banca: {dai} → {ricevi}',
    scambioEseguito: 'Scambio concluso tra {a} e {b}',
    scambioAnnullato: 'Offerta ritirata',
    grandeVia: 'La Grande Via passa a {nome} ({n} sentieri)',
    grandeViaNessuno: 'La Grande Via non appartiene più a nessuno',
    furia: 'La Furia dei Berserker passa a {nome} ({n} berserker)',
    vittoria: '{nome} vince con {n} Punti Gloria!',
  },

  erroreMossa: 'Mossa non valida: {motivo}',
} as const;

/** Interpolazione minimale: sostituisce {chiave} con i parametri. */
export function t(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`
  );
}
