import type { Strings } from './types';

/** English (EN). */
export const en: Strings = {
  titolo: 'VIKING-ISLAND',
  sottotitolo: 'Saga of the Northern Isle',

  // Menu
  nuovaPartita: 'New game',
  multigiocatore: 'Online',
  negozio: 'Shop (coming soon)',
  comeSiGioca: 'How to play',

  // Entry (login/sign-up on launch) and account from the menu
  entrataInvito:
    'Log in or sign up to play online — or continue and play locally right away.',
  continuaSenzaAccount: 'Continue without an account',
  gestioneAccount: 'Account settings',
  partitaClassica: 'Classic game',
  partitaClassicaInfo: 'Offline: you (and friends on this device) against the bots.',
  giocaOnline: 'Play online',
  serveAccountOnline: 'You need an account to play online.',

  crediti: 'Credits',
  creditiFattoDa: 'Made by',
  creditiInvito: 'Got advice or found a bug? Don’t hesitate to write me — all feedback is welcome!',
  creditiGrazie: 'Thanks for playing Viking-Island!',

  // Joke "monetization" popup (New game)
  memeTitolo: 'Hold on, Viking!',
  memeTesto:
    'To set sail you can watch a 47-minute ad or upgrade to ' +
    'VIKING-ISLAND PRO™ for just $999 a month + tax (billed to your jarl).',
  memePubblicita: '▶ Continue with ads',
  memePro: 'Go PRO — $999/month + tax',
  memeAvanti: 'Just kidding, carry on →',

  // Tutorial ("Book of Sagas")
  libroSaghe: 'Book of Sagas',
  capitoloDi: 'Chapter {n} of {tot}',
  avanti: 'Next',
  comeFunzionaOnline: 'How does online work?',
  apriTutorial: 'Open the Book of Sagas',

  // Online: account
  accedi: 'Log in',
  registrati: 'Sign up',
  email: 'Email',
  password: 'Password',
  nomeUtente: 'Username',
  nomeUtenteHint: 'Your username is also your in-game name.',
  nomeInGioco: 'In-game name',
  serverUrl: 'Server address',
  serverExpander: 'Server',
  connessioneInCorso: 'Connecting…',
  esciAccount: 'Switch account',
  ciao: 'Hi, {nome}!',

  serverVerifica: 'Checking the server…',
  serverOk: 'Game server reachable',
  serverGiu:
    'Game server unreachable: online is off here. You can still play locally from the menu (bots and hot-seat) — or enter the address of another server.',

  // Online: lobby
  creaPartita: 'Create game',
  unisciti: 'Join',
  codiceInvito: 'Invite code',
  lobbyTitolo: 'Lobby {code}',
  condividiCodice: 'Share the code with the other Vikings',
  inAttesaHost: 'Waiting for the host to set sail…',
  avviaPartita: 'Set sail!',
  aggiungiBot: '+ Bot',
  esciLobby: 'Leave the lobby',
  esciPartita: 'Leave the game',
  esciPartitaTitolo: 'Leave the game?',
  esciPartitaTesto:
    'The game goes on without you and your seat stays YOURS: come back any time from «Online» with the code {code}.',
  esciPartitaConferma: 'Yes, leave',
  timerTurno: 'Turn timer',
  timerSecondi: 'Turn timer (seconds, 0 = none)',
  timerLobby: 'Turn timer: {s}',
  nessunTimer: 'None',
  secondiAbbr: '{n}s',
  hostTag: 'host',
  disconnessoTag: 'away',
  attesaPartita: 'Waiting for the game…',
  lobbyChiusa: 'Lobby closed: {motivo}',
  terminaPartita: 'End game',
  terminaTitolo: 'End the game?',
  terminaTesto: 'The game will be closed for ALL players and cannot be resumed.',
  terminaConferma: 'Yes, end it for everyone',
  partitaPubblicaToggle: 'Public game (open to all)',
  partitePubbliche: 'Public games',
  nessunaPubblica: 'No public games right now. Create one!',
  entra: 'Join',
  postiNsuM: '{n}/{m} Vikings',
  visibilitaPubblica: 'Public',
  visibilitaPrivata: 'Private (invite only)',

  // Account management
  account: 'Account',

  inventario: 'Inventory',
  invSottotitolo: 'Your skins: everyone playing with you sees them in game.',
  invModoLocale: '📴 Saved on this device (no account) — log in from «Online» to take them anywhere.',
  invModoAccount: '☁️ Saved to your account: they follow you on every device.',
  invDrago: 'Your Dragon',
  invDragoInfo: 'In game it takes the look AND color of whoever moved it last.',
  invRocca: 'Your strongholds',
  invRoccaInfo: 'Whatever look you pick, it is always tinted in your clan color.',
  invSelezionato: 'In use',
  invSalvato: 'Saved ✓',
  skin: {
    drago: 'Classic Dragon',
    navicella: 'Spaceship',
    trex: 'T-Rex',
    briganti: 'Brigands',
    roccaforte: 'Classic stronghold',
    torre: 'Watchtower',
    castello: 'Castle',
  },
  ilTuoAccount: 'Your account',
  datiSalvati: 'This is the data we keep about you:',
  registratoIl: 'Registered on',
  idAccount: 'Account ID',
  passwordImpostata: '••••••••',
  cambiaNome: 'Change username',
  nuovoNome: 'New username',
  nomeAggiornato: 'Name updated! It will apply in game from your next matches.',
  passwordAttuale: 'Current password',
  aggiungiEmail: 'Add email',
  emailEggTitolo: 'Wait a second…',
  emailEggTesto:
    '"Does an online game really need your email?" No. And since we don\'t sell ' +
    'your data, we don\'t ask for it and don\'t store it: this field doesn\'t even ' +
    'exist in the database.',
  emailEggOk: 'Fair enough!',
  cambiaPassword: 'Change password',
  nuovaPassword: 'New password (min 8)',
  ripetiPassword: 'Repeat the new password',
  passwordNonCoincidono: 'The two passwords do not match',
  passwordAggiornata:
    'Password updated! Sessions on other devices have been logged out.',
  salva: 'Save',

  // Setup
  configuraPartita: 'Prepare the expedition',
  giocatore: 'Player',
  umano: 'Human',
  bot: 'Bot',
  livelloBot: 'Level',
  facile: 'Easy',
  normale: 'Normal',
  difficile: 'Hard',
  esperto: 'Expert',
  difficolta: 'Choose bot difficulty',
  aggiungi: 'Add',
  nome: 'Name',
  aggiungiGiocatore: '+ Add Viking',
  cambiaColore: 'Change color',
  scambiaColoreCon: 'Swap color with {nome}',
  coloreCustom: 'Custom',
  nomeColore: {
    rosso: 'Red',
    blu: 'Blue',
    verde: 'Green',
    giallo: 'Yellow',
    viola: 'Purple',
  },
  rimuovi: 'Remove',
  configurazione: 'Settings',
  puntiVittoria: 'Points to win',
  standardN: '(standard {n})',
  seedOpzionale: 'Map seed (empty = random)',
  evita68: 'Avoid adjacent 6 and 8',
  via: 'Set sail!',
  indietro: 'Back',
  serveUnUmano: 'You need at least one human Viking',

  // New game (unified flow: local + online in one view)
  stessoDevice: 'Same device',
  nuovaPartitaHintLocale:
    'Pass the phone between players on each turn. Every seat can be You or a Bot.',
  nuovaPartitaHintOnline:
    'Share the code: friends join from afar. Fill the empty seats with bots.',
  aggiungiPosto: '+ Add seat',
  aggiungiBotPosto: '+ Add bot',
  ruoloTu: 'You',
  ruoloAmico: 'Friend',
  regoleEtichetta: 'Rules',
  regoleClassica: 'Classic',
  regolePersonalizzate: 'Custom',
  modificaRegole: 'Edit',
  altreRegole: 'More',
  avvia: 'Start',
  copia: 'Copy',
  copiato: 'Copied!',
  gestionePartita: 'Game management',
  riprendi: 'Resume',
  esciLocaleTesto: 'The current game will be lost and you will return to the menu.',
  statoOffline: 'offline',

  // Hot-seat (passing the device)
  passaDispositivo: 'Pass the device',
  toccaA: "{nome}'s turn",
  sonoPronto: "I'm {nome}!",

  // Phases and actions
  faseSetupVillaggio: '{nome}: place a village',
  faseSetupSentiero: '{nome}: place a path next to the village',
  tiraIDadi: 'Roll the dice',
  setteGrave: 'The Dragon awakens!',
  faseTiroAtteso: "{nome}'s turn: roll the dice",
  faseMain: "{nome}'s turn",
  faseScarto: 'A 7! {nome} must discard {n} cards',
  faseDrago: '{nome} moves the Dragon',
  faseFurto: '{nome} chooses whom to rob',
  faseSentieriGratis: '{nome} places {n} free paths',
  costruisci: 'Build',
  sentiero: 'Path',
  villaggio: 'Village',
  roccaforte: 'Stronghold',
  compraCarta: 'Saga Card',
  scambia: 'Trade',
  scambiaBanca: 'Bank / Harbors',
  proponiScambio: 'Offer to players',
  carte: 'Cards',
  costruzioni: 'Buildings',
  costruzioniSub: 'How many you have left to build',
  disponibili: 'available',
  fineTurno: 'End turn',
  annulla: 'Cancel',
  conferma: 'Confirm',
  chiudi: 'Close',
  gioca: 'Play',

  // Panels
  leTueRisorse: 'Your resources',
  leTueCarte: 'Your Saga Cards',
  carteNonGiocabili: '(from next turn)',
  mazzoRimasto: 'Deck: {n}',
  banca: 'Bank',
  puntiGloria: 'Glory Points',
  diario: 'Captain’s log',

  // Trades
  dai: 'Give',
  ricevi: 'Receive',
  rapporto: 'Ratio {n}:1',
  scegliRisorse: 'Choose the resources',
  offertaA: 'Offer to',
  tutti: 'Everyone',
  offertaDi: 'Offer from {nome}',
  accetta: 'Accept',
  rifiuta: 'Decline',
  inAttesaRisposte: 'Waiting for a reply…',
  concludiCon: 'Close with {nome}',

  // Discard and theft
  scartaCarte: 'Discard {n} cards',
  scegliVittima: 'Choose whom to rob',

  // Rules summary (costs and points)
  bugiardino: 'Rules card',
  bugiardinoTitolo: 'Costs and Glory Points',
  pezziMax: 'max {n}',
  puntiGloriaAbbr: 'GP',
  bonusRequisitoVia: 'at least {n} connected paths',
  bonusRequisitoFuria: 'at least {n} Berserkers played',
  eroeSegretoRiga: '1 secret GP (counts right away)',
  scambiRiga: 'Trades: bank 4:1 · harbor 3:1 · dedicated harbor 2:1',
  obiettivoRiga: 'Win: {n} Glory Points on your own turn',
  setteRiga: 'On a 7: anyone with more than {n} cards discards half',

  // Victory
  vittoriaTitolo: '{nome} conquers Viking-Island!',
  vittoriaSub: 'conquers Viking-Island!',
  rivincita: 'Rematch',
  tornaAlMenu: 'Back to menu',
  dettaglioPunti: 'Glory Points breakdown',
  bonusGrandeVia: 'The Great Road',
  bonusFuria: 'Berserker Fury',
  eroiNascosti: 'Hero Sagas',
  villaggi: 'Villages',
  roccaforti: 'Strongholds',
  totale: 'Total',

  // End of game: final map and stats
  vediMappaFinale: 'Final map',
  vediStatistiche: 'Statistics',
  mappaFinaleTitolo: 'The map at the end',
  statisticheTitolo: 'Game statistics',
  statTiriDado: 'Dice rolls',
  statTiriSub: '{tiri} rolls in {turni} turns · expected vs actual',
  statNessunTiro: 'No rolls recorded.',
  statLegendaAtteso: 'expected',
  statNumeroFortunato: 'Lucky number',
  statSetteUsciti: 'Sevens rolled',
  statDragoMosso: 'Dragon moved',
  statConfronto: 'Clan comparison',
  statScambi: 'Trades',
  statScambiBanca: 'Bank trades',
  statScambiGiocatori: 'Player trades',
  statCostruzioni: 'Buildings',
  statRisorseProdotte: 'Resources produced',
  statCarteSaga: 'Saga Cards bought',
  statFurti: 'Dragon raids',
  statScartate: 'Cards discarded',
  statPrimati: 'Hall of fame',
  statManiDoro: 'Golden hands',
  statManiDoroSub: 'most resources gathered',
  statMercante: 'Merchant',
  statMercanteSub: 'most trades closed',
  statCostruttore: 'Master builder',
  statCostruttoreSub: 'most buildings',
  statPredone: 'Raider',
  statPredoneSub: 'most Dragon raids',
  statSfortunato: 'Unlucky one',
  statSfortunatoSub: 'most cards discarded',
  statStratega: 'Strategist',
  statStrategaSub: 'most Saga Cards played',
  statNessuno: '—',

  // Resource and terrain names
  risorsa: {
    legname: 'Wood',
    pietra: 'Stone',
    lana: 'Wool',
    orzo: 'Barley',
    ferro: 'Iron',
  },
  terreno: {
    legname: 'Pine forest',
    pietra: 'Red-stone quarry',
    lana: 'Pasture',
    orzo: 'Barley fields',
    ferro: 'Iron mine',
    tundra: 'Frozen tundra',
  },
  cartaSaga: {
    berserker: 'Berserker',
    sagaDegliEroi: 'Hero Saga',
    costruttoriDiSentieri: 'Path Builders',
    banchetto: 'Feast',
    tributo: 'Tribute',
  },
  calamita: {
    modalita: 'Game mode',
    standard: 'Standard game',
    conCalamita: 'With calamities',
    spiega: 'Each round a card changes the rules, for that round only — good and bad, in random order. When the deck runs out, things go back to normal.',
    titolo: 'Calamity of the round',
    rimaste: '{n} left in the deck',
    guadagna: 'Calamity: gain {n} resources',
    strade: 'Calamity: place your free roads on the map!',
    attesa: 'Calamity underway: wait for the others…',
    nome: {
      materialeDoppio: '{mat} in abundance',
      materialeBloccato: '{mat} shortage',
      dragoFermo: 'Dragon asleep',
      nienteSaga: 'Forgotten sagas',
      dragoPrimaDelTiro: 'Restless Dragon',
      scambiTre: 'Trade routes',
      scambioDue: '{mat} market',
      abbondanza: 'Year of plenty',
      bufera: 'Snowstorm',
      assedio: 'Siege',
      mareInTempesta: 'Stormy seas',
      mercatoOro: 'Golden market',
      leaderScartaTutto: "Gods' envy",
      tuttiScartanoMeta: 'Great freeze',
      ultimoPesca4: "Gods' favour",
      ultimoStrade2: 'Ways home',
      tuttiPiu2: 'Gift of {mat}',
      scartaFino7: 'Overflowing stores',
      tuttiUnoDiTutto: 'Bountiful harvest',
      donoDegliDei: 'Gift of the gods',
      bottino: "Pauper's spoils",
      razzia: 'Raid',
    },
    desc: {
      materialeDoppio: 'This round {mat} is gained double.',
      materialeBloccato: 'This round {mat} is not gained.',
      dragoFermo: 'This round the Dragon cannot be moved.',
      nienteSaga: 'This round no Saga Cards can be played.',
      dragoPrimaDelTiro: 'This round, before rolling, you move the Dragon.',
      scambiTre: 'This round all bank trades are 3:1.',
      scambioDue: 'This round {mat} bank trades are 2:1.',
      abbondanza: 'This round ALL materials are gained double.',
      bufera: 'This round no roads can be built.',
      assedio: 'This round no strongholds can be built.',
      mareInTempesta: 'This round bank trades are forbidden.',
      mercatoOro: 'This round all bank trades are 2:1.',
      leaderScartaTutto: 'Whoever has the most points discards ALL resources.',
      tuttiScartanoMeta: 'Everyone discards half their resources.',
      ultimoPesca4: 'Whoever has the fewest points gains 4 resources of choice.',
      ultimoStrade2: 'Whoever has the fewest roads places 2 for free.',
      tuttiPiu2: 'Everyone gains 2 {mat}.',
      scartaFino7: 'Whoever has more than 7 resources discards down to 7.',
      tuttiUnoDiTutto: 'Everyone gains 1 of each material.',
      donoDegliDei: 'Everyone draws 1 Saga Card.',
      bottino: 'Whoever has the fewest points draws 1 Saga Card.',
      razzia: 'Whoever has the most points gives 1 resource to each opponent.',
    },
  },

  descrizioneCarta: {
    berserker: 'Move the Dragon and steal 1 card. Counts toward Berserker Fury.',
    sagaDegliEroi: '1 secret Glory Point (counts right away).',
    costruttoriDiSentieri: 'Immediately place 2 free paths.',
    banchetto: 'Take 2 resources of your choice from the bank.',
    tributo: 'Every opponent hands you ALL their units of one resource.',
  },

  /**
   * EASTER EGG: bots griping when the Dragon blocks them — just like at a real
   * table, where someone always takes it personally.
   */
  lamentiDrago: [
    'Oh come on, always me?!',
    'Block someone else, will you?!',
    "I'll get my revenge. A Viking's word.",
    'Odin, why me of all people?',
    "Half the isle is free and you put it HERE?!",
    'That dragon has it in for me, it’s official.',
    "Sure, sure, I'm writing this down. ALL of it.",
    'Oh great, AGAIN at my place.',
    'And to think I even offered you a trade…',
    "I'm calling the clan's lawyer.",
    'When MY Fury comes, we’ll talk.',
    'Lovely way to make friends, well done.',
    'My barley… MY BARLEY!',
    'Nice dragon, back to the tundra, please.',
  ],

  // Captain's log events
  log: {
    calamita: '⚡ Calamity — {nome}: {desc}',
    lamentoDrago: '{nome}: «{frase}»',
    ordineTiro: '{nome} rolls {d1}+{d2} = {tot}',
    ordineSpareggio: 'Tie-break: {righe}',
    ordineTitolo: 'Roll for order: {righe}',
    ordineFinale: 'Turn order: {ordine}',
    turnoIniziato: '— Turn {n}: {nome}’s turn —',
    dadiTirati: '{nome} rolls {d1}+{d2} = {tot}',
    risorseProdotte: '{nome} receives {risorse}',
    penuriaBanca: 'Bank shortage: {risorse} not distributed',
    risorseScartate: '{nome} discards {n} cards',
    dragoMosso: '{nome} moves the Dragon',
    risorsaRubataNota: '{ladro} steals {risorsa} from {vittima}',
    risorsaRubata: '{ladro} steals a card from {vittima}',
    costruito: '{nome} builds: {cosa}',
    cartaComprataNota: '{nome} buys a Saga Card: {carta}',
    cartaComprata: '{nome} buys a Saga Card',
    cartaGiocata: '{nome} plays: {carta}',
    banchetto: '{nome} feasts: +{r1} and +{r2}',
    tributo: '{nome} collects the tribute: {n}× {risorsa}',
    scambioProposto: '{nome} proposes a trade',
    rispostaScambio: '{nome} {risposta} the trade',
    accettaVerbo: 'accepts',
    rifiutaVerbo: 'declines',
    scambioEseguitoBanca: '{nome} trades with the bank: {dai} → {ricevi}',
    scambioEseguito: 'Trade closed between {a} and {b}',
    scambioAnnullato: 'Offer withdrawn',
    grandeVia: 'The Great Road passes to {nome} ({n} paths)',
    grandeViaNessuno: 'The Great Road no longer belongs to anyone',
    furia: 'Berserker Fury passes to {nome} ({n} berserkers)',
    vittoria: '{nome} wins with {n} Glory Points!',
  },

  demo: {
    apri: 'Quick tutorial',
    titolo: 'Quick tutorial',
    sottotitolo: 'Learn by playing, step by step',
    benvenutoTitolo: 'Welcome to the magical world of Viking-Island',
    benvenutoVai: 'Let’s go!',
    passoDi: 'Step {n} of {tot}',
    salta: 'Skip',
    auto: 'Auto',
    sezioneGioco: 'How to play',
    sezioneOnline: 'Playing online',
    seiClan: 'In this demo you are the {colore} clan.',
    haiTirato: 'You rolled {d1} + {d2} = {tot}!',
    haiRicevuto: 'You received:',
    niente: 'nothing this time',
    giocaOffline: 'Play with bots',
    vaiOnline: 'Try online',
    fineChiudi: 'Close the demo',
    senzaEmail: 'Email — no need!',
    passi: {
      intro: {
        titolo: 'Welcome to the demo!',
        testo:
          'I’ll walk you step by step through a game of Viking-Island, then ' +
          'show you how to play online. Press «Next» to go on: you can go ' +
          '«Back» or «Skip» whenever you like.',
      },
      isola: {
        titolo: 'The isle and the resources',
        testo:
          'The isle is made of hexagons. Each one produces a resource and has ' +
          'a number: the dots tell you how likely it is to come up on the dice ' +
          '(6 and 8, in red, come up very often). The tundra produces nothing: ' +
          'it is the Dragon’s lair.',
      },
      setupVillaggio: {
        titolo: 'Your first village',
        testo:
          'You start by placing a free village on a corner (the white ' +
          'crosshair). Look for strong numbers and varied resources. Distance ' +
          'rule: two buildings can never sit on neighboring corners.',
      },
      setupSentiero: {
        titolo: 'Your first path',
        testo:
          'Right after the village you place a path on an adjacent side: it is ' +
          'the start of your road network, which you’ll need to expand.',
      },
      altri: {
        titolo: 'The other clans place too',
        testo:
          'Each clan takes turns placing «snake-style»: first in order, then ' +
          'backwards. Whoever places the first village last places the second ' +
          'one first.',
      },
      secondoVillaggio: {
        titolo: 'The second village produces right away',
        testo:
          'On the second round you place another village (and a path). The ' +
          'second village gives you a resource right away for every hexagon ' +
          'highlighted around it.',
      },
      tiraDadi: {
        titolo: 'Roll the dice',
        testo:
          'The real game begins! Every turn starts by rolling two dice: the ' +
          'number that comes up decides which hexagons produce for ALL ' +
          'players, not just for whoever rolls.',
      },
      produzione: {
        titolo: 'Production',
        testo:
          'Each hexagon with the rolled number gives 1 resource for every ' +
          'adjacent village and 2 for every stronghold. The highlighted ' +
          'hexagons are the ones that pay out to you.',
      },
      costruire: {
        titolo: 'Building and buying',
        testo:
          'With resources you build paths, villages and strongholds (the ' +
          'village upgrade) or you buy a Saga Card. Here’s how much each thing ' +
          'costs:',
      },
      drago: {
        titolo: 'The 7 and the Dragon',
        testo:
          'If a 7 comes up nobody produces: anyone with more than 7 cards ' +
          'discards half, then whoever rolled moves the Dragon (highlighted) ' +
          'and steals a card from a neighbor. The hexagon with the Dragon ' +
          'produces nothing while it stays there.',
      },
      carteSaga: {
        titolo: 'The Saga Cards',
        testo:
          'A deck of 25 cards with special effects. You buy them now and play ' +
          'them from the next turn, at most one per turn (the Hero Saga, ' +
          'instead, counts right away, while hidden).',
      },
      scambi: {
        titolo: 'Trades',
        testo:
          'Missing a resource? Trade with the bank (4:1), with the harbors ' +
          '(3:1 or 2:1) or offer a trade to the other players during your turn.',
      },
      bonus: {
        titolo: 'Bonuses and hidden points',
        testo:
          'The Great Road (the longest chain of paths) and the Berserker Fury ' +
          '(most Berserker cards played) are worth 2 Glory Points each. The ' +
          'Hero Saga is worth 1 secret point: watch out for surprises!',
      },
      vittoria: {
        titolo: 'Winning the game',
        testo:
          'The first clan to reach 10 Glory Points on their own turn wins. ' +
          'Here’s how the isle might look at the end of the game: full of ' +
          'villages, strongholds and paths.',
      },
      onlineIntro: {
        titolo: 'Playing online with friends',
        testo:
          'From the «Online» menu you play with real people, each on their own ' +
          'device. The referee is the server: it validates every move with the ' +
          'same rules, so cheating is impossible.',
      },
      serverFreddo: {
        titolo: 'Be patient: the server wakes up',
        testo:
          'Important: the free server goes «to sleep» when nobody is playing. ' +
          'The FIRST connection can take 30 to 60 seconds to wake it up — it’s ' +
          'normal, just wait. A green check lets you know when it’s ready.',
      },
      account: {
        titolo: '1. Create an account',
        testo:
          'All you need is a username (it will also be your in-game name) and ' +
          'a password of at least 8 characters. No email: it’s not needed and ' +
          'we don’t ask for it.',
      },
      creaEntra: {
        titolo: '2. Create or join a game',
        testo:
          'Press «Create game» to get a 6-character code to send to your ' +
          'friends, or «Join» and enter the code you received.',
      },
      lobby: {
        titolo: '3. The lobby',
        testo:
          'In the waiting room you can change your color and the host can add ' +
          'bots to fill the seats. When there are 2 to 6 of you, the host ' +
          'presses «Set sail!».',
      },
      onlinePartita: {
        titolo: '4. Let’s play!',
        testo:
          'Everyone’s moves arrive in real time. If your connection drops, ' +
          'rejoin with the lobby code: your seat stays yours. There’s also an ' +
          'optional turn timer, so nobody holds up the game.',
      },
      fine: {
        titolo: 'You’re ready, Viking!',
        testo:
          'That’s all! You can review every rule in the «Book of Sagas» from ' +
          'the menu. Now it’s your turn: set sail!',
      },
    },
  },
  erroreMossa: 'Invalid move: {motivo}',
};
