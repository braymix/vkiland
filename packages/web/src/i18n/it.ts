/**
 * TUTTE le stringhe della UI, centralizzate per la futura i18n.
 * `t(chiave, parametri)` interpola i segnaposto {nome}.
 */
import type { CalamityKind, PlayerColor, Resource, SagaCard, TerrainType } from '@vikiland/engine';

export const it = {
  titolo: 'VIKING-ISLAND',
  sottotitolo: "Saga dell'isola del Nord",

  // Menu
  nuovaPartita: 'Nuova partita',
  multigiocatore: 'Online',
  negozio: 'Negozio (in arrivo)',
  comeSiGioca: 'Come si gioca',

  // Entrata (login/registrazione all'avvio) e account dal menu
  entrataInvito:
    'Accedi o registrati per giocare online — oppure continua e gioca subito in locale.',
  continuaSenzaAccount: 'Continua senza account',
  gestioneAccount: 'Gestione account',
  partitaClassica: 'Partita classica',
  partitaClassicaInfo: 'Offline: tu (e gli amici su questo dispositivo) contro i bot.',
  giocaOnline: 'Gioca online',
  serveAccountOnline: 'Serve un account per giocare online.',

  crediti: 'Riconoscimenti',
  creditiFattoDa: 'Fatto da',
  creditiInvito: 'Hai un consiglio o hai trovato un bug? Non esitare a scrivermi: ogni feedback è benvenuto!',
  creditiGrazie: 'Grazie per aver giocato a Viking-Island!',

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
  esciPartita: 'Esci dalla partita',
  esciPartitaTitolo: 'Uscire dalla partita?',
  esciPartitaTesto:
    'La partita continua senza di te e il tuo posto resta TUO: puoi rientrare quando vuoi da «Online» col codice {code}.',
  esciPartitaConferma: 'Sì, esci',
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

  // Inventario (skin: sul dispositivo, o sull'account se hai fatto login online)
  inventario: 'Inventario',
  invSottotitolo: 'Le tue skin: chi gioca con te le vede in partita.',
  invModoLocale:
    '📴 Salvate su questo dispositivo (nessun account) — vai su «Online» per portarle con te ovunque.',
  invModoAccount: '☁️ Salvate sul tuo account: ti seguono su ogni dispositivo.',
  invDrago: 'Il tuo Drago',
  invDragoInfo: 'In gioco prende aspetto E colore di chi lo ha spostato per ultimo.',
  invRocca: 'Le tue roccaforti',
  invRoccaInfo: 'Qualunque aspetto scegli, si tinge sempre del colore del tuo clan.',
  invSelezionato: 'In uso',
  invSalvato: 'Salvato ✓',
  skin: {
    drago: 'Drago classico',
    navicella: 'Navicella spaziale',
    trex: 'T-Rex',
    briganti: 'Briganti',
    roccaforte: 'Roccaforte classica',
    torre: 'Torre di guardia',
    castello: 'Castello',
  },
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
  difficolta: 'Scegli difficoltà bot',
  aggiungi: 'Aggiungi',
  nome: 'Nome',
  aggiungiGiocatore: '+ Aggiungi vichingo',
  cambiaColore: 'Cambia colore',
  scambiaColoreCon: 'Scambia il colore con {nome}',
  coloreCustom: 'Personalizzato',
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

  // Nuova partita (flusso unico ridisegnato: locale + online in una vista)
  stessoDevice: 'Locale',
  nuovaPartitaHintLocale:
    'Passi il telefono tra i giocatori a turno. Ogni posto può essere Tu o un Bot.',
  nuovaPartitaHintOnline:
    'Condividi il codice: gli amici entrano da lontano. Riempi i posti liberi con dei bot.',
  aggiungiPosto: '+ Aggiungi posto',
  aggiungiBotPosto: '+ Aggiungi bot',
  ruoloTu: 'Tu',
  ruoloAmico: 'Amico',
  regoleEtichetta: 'Regole',
  regoleClassica: 'Classica',
  regolePersonalizzate: 'Su misura',
  modificaRegole: 'Modifica',
  altreRegole: 'Altro',
  avvia: 'Avvia',
  copia: 'Copia',
  copiato: 'Copiato!',
  gestionePartita: 'Gestione partita',
  riprendi: 'Riprendi',
  esciLocaleTesto: 'La partita in corso andrà persa e tornerai al menu.',
  statoOffline: 'offline',

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
  costruzioni: 'Costruzioni',
  costruzioniSub: 'Quante te ne restano da costruire',
  disponibili: 'disponibili',
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

  // --- Modalità Calamità ---
  calamita: {
    modalita: 'Modalità di gioco',
    standard: 'Partita standard',
    conCalamita: 'Con calamità',
    spiega:
      'Ogni giro una carta cambia le regole, solo per quel giro — buone e cattive, in ordine casuale. Quando il mazzo finisce, si torna alla normalità.',
    titolo: 'Calamità del giro',
    rimaste: '{n} nel mazzo',
    guadagna: 'Calamità: guadagna {n} risorse',
    strade: 'Calamità: piazza i tuoi sentieri gratis sulla mappa!',
    attesa: 'Calamità in corso: attendi gli altri…',
    nome: {
      materialeDoppio: '{mat} in abbondanza',
      materialeBloccato: 'Carestia di {mat}',
      dragoFermo: 'Drago in letargo',
      nienteSaga: 'Saghe dimenticate',
      dragoPrimaDelTiro: 'Drago inquieto',
      scambiTre: 'Rotte commerciali',
      scambioDue: 'Mercato del {mat}',
      abbondanza: 'Anno di abbondanza',
      bufera: 'Bufera di neve',
      assedio: 'Assedio',
      mareInTempesta: 'Mare in tempesta',
      mercatoOro: "Mercato d'oro",
      leaderScartaTutto: 'Invidia degli dèi',
      tuttiScartanoMeta: 'Grande gelo',
      ultimoPesca4: 'Favore degli dèi',
      ultimoStrade2: 'Vie del ritorno',
      tuttiPiu2: 'Dono di {mat}',
      scartaFino7: 'Magazzini colmi',
      tuttiUnoDiTutto: 'Raccolto generoso',
      donoDegliDei: 'Dono degli dèi',
      bottino: 'Bottino del povero',
      razzia: 'Razzia',
    } satisfies Record<CalamityKind, string>,
    desc: {
      materialeDoppio: 'Questo giro il {mat} si prende doppio.',
      materialeBloccato: 'Questo giro il {mat} non si prende.',
      dragoFermo: 'Questo giro il Drago non si può spostare.',
      nienteSaga: 'Questo giro non si giocano Carte Saga.',
      dragoPrimaDelTiro: 'Questo giro, prima di tirare, si sposta il Drago.',
      scambiTre: 'Questo giro tutti gli scambi con la banca sono 3:1.',
      scambioDue: 'Questo giro gli scambi di {mat} con la banca sono 2:1.',
      abbondanza: 'Questo giro TUTTI i materiali si prendono doppi.',
      bufera: 'Questo giro non si costruiscono sentieri.',
      assedio: 'Questo giro non si costruiscono roccaforti.',
      mareInTempesta: 'Questo giro sono vietati gli scambi con la banca.',
      mercatoOro: 'Questo giro tutti gli scambi con la banca sono 2:1.',
      leaderScartaTutto: 'Chi ha più punti scarta TUTTE le risorse.',
      tuttiScartanoMeta: 'Tutti scartano metà delle risorse.',
      ultimoPesca4: 'Chi ha meno punti guadagna 4 risorse a scelta.',
      ultimoStrade2: 'Chi ha meno strade ne piazza 2 gratis.',
      tuttiPiu2: 'Tutti guadagnano 2 {mat}.',
      scartaFino7: 'Chi ha più di 7 risorse scarta fino a 7.',
      tuttiUnoDiTutto: 'Tutti guadagnano 1 di ogni materiale.',
      donoDegliDei: 'Tutti pescano 1 Carta Saga.',
      bottino: 'Chi ha meno punti pesca 1 Carta Saga.',
      razzia: 'Chi ha più punti dà 1 risorsa a ciascun avversario.',
    } satisfies Record<CalamityKind, string>,
  },

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
    calamita: '⚡ Calamità — {nome}: {desc}',
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

  // Demo guidata (tour interattivo passo-passo, separato dal «Libro delle Saghe»)
  demo: {
    apri: 'Breve tutorial',
    titolo: 'Breve tutorial',
    sottotitolo: 'Impara giocando, passo dopo passo',
    benvenutoTitolo: 'Benvenuto nel magico mondo di Viking-Island',
    benvenutoVai: 'Si parte!',
    passoDi: 'Passo {n} di {tot}',
    salta: 'Salta',
    auto: 'Auto',
    sezioneGioco: 'Come si gioca',
    sezioneOnline: 'Giocare online',
    seiClan: 'In questa demo sei il clan {colore}.',
    haiTirato: 'Hai tirato {d1} + {d2} = {tot}!',
    haiRicevuto: 'Hai ricevuto:',
    niente: 'niente, questa volta',
    giocaOffline: 'Gioca coi bot',
    vaiOnline: 'Prova l’online',
    fineChiudi: 'Chiudi la demo',
    senzaEmail: 'Email — non serve!',
    passi: {
      intro: {
        titolo: 'Benvenuto nella demo!',
        testo:
          'Ti accompagno passo dopo passo in una partita a Viking-Island, poi ti mostro come si gioca online. ' +
          'Premi «Avanti» per procedere: puoi tornare «Indietro» o «Salta» quando vuoi.',
      },
      isola: {
        titolo: 'L’isola e le risorse',
        testo:
          'L’isola è fatta di esagoni. Ognuno produce una risorsa e ha un numero: i puntini dicono quanto è ' +
          'probabile che esca coi dadi (6 e 8, in rosso, escono spessissimo). La tundra non produce: è la tana del Drago.',
      },
      setupVillaggio: {
        titolo: 'Il tuo primo villaggio',
        testo:
          'Si parte piazzando un villaggio gratis su un incrocio (il mirino bianco). Cerca numeri forti e risorse ' +
          'diverse. Regola della distanza: due edifici non possono mai stare su incroci confinanti.',
      },
      setupSentiero: {
        titolo: 'Il tuo primo sentiero',
        testo:
          'Subito dopo il villaggio piazzi un sentiero su un lato adiacente: è l’inizio della tua rete di strade, ' +
          'che ti servirà per espanderti.',
      },
      altri: {
        titolo: 'Anche gli altri clan piazzano',
        testo:
          'A turno ogni clan piazza «a serpentina»: prima in ordine, poi a ritroso. Chi piazza per ultimo il primo ' +
          'villaggio piazza per primo il secondo.',
      },
      secondoVillaggio: {
        titolo: 'Il secondo villaggio produce subito',
        testo:
          'Al secondo giro piazzi un altro villaggio (e un sentiero). Il secondo villaggio ti regala subito una ' +
          'risorsa per ogni esagono evidenziato qui intorno.',
      },
      tiraDadi: {
        titolo: 'Tira i dadi',
        testo:
          'Comincia il gioco vero! Ogni turno parte tirando due dadi: il numero che esce decide quali esagoni ' +
          'producono per TUTTI i giocatori, non solo per chi tira.',
      },
      produzione: {
        titolo: 'La produzione',
        testo:
          'Ogni esagono col numero uscito dà 1 risorsa per ogni villaggio adiacente e 2 per ogni roccaforte. ' +
          'Gli esagoni evidenziati sono quelli che fruttano a te.',
      },
      costruire: {
        titolo: 'Costruire e comprare',
        testo:
          'Con le risorse costruisci sentieri, villaggi e roccaforti (il potenziamento del villaggio) oppure ' +
          'compri una Carta Saga. Ecco quanto costa ciascuna cosa:',
      },
      drago: {
        titolo: 'Il 7 e il Drago',
        testo:
          'Se esce 7 nessuno produce: chi ha più di 7 carte ne scarta metà, poi chi ha tirato sposta il Drago ' +
          '(evidenziato) e ruba una carta a un vicino. L’esagono col Drago non produce finché resta lì.',
      },
      carteSaga: {
        titolo: 'Le Carte Saga',
        testo:
          'Un mazzo di 25 carte con effetti speciali. Le compri ora e le giochi dal turno dopo, al massimo una per turno ' +
          '(la Saga degli Eroi invece conta subito, da nascosta).',
      },
      scambi: {
        titolo: 'Gli scambi',
        testo:
          'Ti manca una risorsa? Scambia con la banca (4:1), con gli approdi (3:1 o 2:1) oppure proponi uno scambio ' +
          'agli altri giocatori durante il tuo turno.',
      },
      bonus: {
        titolo: 'I bonus e i punti nascosti',
        testo:
          'La Grande Via (la catena di sentieri più lunga) e la Furia dei Berserker (più carte Berserker giocate) ' +
          'valgono 2 Punti Gloria ciascuna. La Saga degli Eroi vale 1 punto segreto: occhio alle sorprese!',
      },
      vittoria: {
        titolo: 'Vincere la partita',
        testo:
          'Vince il primo clan che raggiunge 10 Punti Gloria nel proprio turno. Ecco come potrebbe presentarsi ' +
          'l’isola a fine partita: piena di villaggi, roccaforti e sentieri.',
      },
      onlineIntro: {
        titolo: 'Giocare online con gli amici',
        testo:
          'Dal menu «Online» giochi con persone vere, ognuno dal proprio dispositivo. L’arbitro è il server: ' +
          'convalida ogni mossa con le stesse regole, così è impossibile barare.',
      },
      serverFreddo: {
        titolo: 'Abbi pazienza: il server si sveglia',
        testo:
          'Importante: il server gratuito va «in letargo» quando nessuno gioca. La PRIMA connessione può ' +
          'richiedere da 30 a 60 secondi per risvegliarlo — è normale, basta aspettare. Una spunta verde ti avvisa quando è pronto.',
      },
      account: {
        titolo: '1. Crea un account',
        testo:
          'Bastano un nome utente (sarà anche il tuo nome in gioco) e una password di almeno 8 caratteri. ' +
          'Niente email: non serve e non la chiediamo.',
      },
      creaEntra: {
        titolo: '2. Crea o entra in una partita',
        testo:
          'Premi «Crea partita» per ottenere un codice di 6 caratteri da mandare agli amici, oppure «Unisciti» ' +
          'e inserisci il codice che hai ricevuto.',
      },
      lobby: {
        titolo: '3. La lobby',
        testo:
          'Nella sala d’attesa puoi cambiare il tuo colore e l’host può aggiungere bot per riempire i posti. ' +
          'Quando siete da 2 a 6, l’host preme «Salpa!».',
      },
      onlinePartita: {
        titolo: '4. Si gioca!',
        testo:
          'Le mosse di tutti arrivano in tempo reale. Se cade la linea, rientra col codice della lobby: il tuo ' +
          'posto resta tuo. C’è anche un timer di turno opzionale, così nessuno blocca la partita.',
      },
      fine: {
        titolo: 'Sei pronto, vichingo!',
        testo:
          'Questo è tutto! Puoi rivedere ogni regola nel «Libro delle Saghe» dal menu. Adesso tocca a te: salpa!',
      },
    },
  },

  erroreMossa: 'Mossa non valida: {motivo}',
} as const;

/** Interpolazione minimale: sostituisce {chiave} con i parametri. */
export function t(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`
  );
}
