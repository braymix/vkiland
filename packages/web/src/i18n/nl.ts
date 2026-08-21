import type { Strings } from './types';

/** Nederlands (NL). */
export const nl: Strings = {
  titolo: 'VIKING-ISLAND',
  sottotitolo: 'Saga van het Noordelijke Eiland',

  // Menu
  nuovaPartita: 'Nieuw spel',
  multigiocatore: 'Online',
  negozio: 'Winkel',
  comeSiGioca: 'Hoe te spelen',

  // Ingang (inloggen/registreren bij het opstarten) en account vanuit het menu
  entrataInvito:
    'Log in of registreer om online te spelen â of ga verder en speel meteen lokaal.',
  continuaSenzaAccount: 'Doorgaan zonder account',
  gestioneAccount: 'Accountbeheer',
  partitaClassica: 'Klassiek spel',
  partitaClassicaInfo: 'Offline: jij (en vrienden op dit apparaat) tegen de bots.',
  giocaOnline: 'Online spelen',
  serveAccountOnline: 'Je hebt een account nodig om online te spelen.',

  crediti: 'Credits',
  creditiFattoDa: 'Gemaakt door',
  creditiInvito: 'Heb je een tip of een bug gevonden? Schrijf me gerust â alle feedback is welkom!',
  creditiGrazie: 'Bedankt dat je Viking-Island hebt gespeeld!',

  // Grappige "monetisatie"-pop-up (Nieuw spel)
  memeTitolo: 'Wacht even, Viking!',
  memeTesto:
    'Om uit te varen kun je een advertentie van 47 minuten bekijken of upgraden naar ' +
    'VIKING-ISLAND PROâ¢ voor slechts $999 per maand + btw (op rekening van je jarl).',
  memePubblicita: 'â¶ Doorgaan met advertenties',
  memePro: 'Word PRO â $999/maand + btw',
  memeAvanti: 'Grapje, ga verder â',

  // Tutorial ("Boek der Sagen")
  libroSaghe: 'Boek der Sagen',
  capitoloDi: 'Hoofdstuk {n} van {tot}',
  avanti: 'Verder',
  comeFunzionaOnline: 'Hoe werkt online?',
  apriTutorial: 'Open het Boek der Sagen',

  // Online: account
  accedi: 'Inloggen',
  registrati: 'Registreren',
  email: 'E-mail',
  password: 'Wachtwoord',
  nomeUtente: 'Gebruikersnaam',
  nomeUtenteHint: 'Je gebruikersnaam is ook je naam in het spel.',
  nomeInGioco: 'Naam in het spel',
  serverUrl: 'Serveradres',
  serverExpander: 'Server',
  connessioneInCorso: 'Verbindenâ¦',
  esciAccount: 'Account wisselen',
  ciao: 'Hoi, {nome}!',

  serverVerifica: 'Server controlerenâ¦',
  serverOk: 'Spelserver bereikbaar',
  serverGiu:
    'Spelserver onbereikbaar: online staat hier uit. Je kunt nog steeds lokaal spelen vanuit het menu (bots en hot-seat) â of voer het adres van een andere server in.',

  // Online: lobby
  creaPartita: 'Spel maken',
  unisciti: 'Deelnemen',
  codiceInvito: 'Uitnodigingscode',
  lobbyTitolo: 'Lobby {code}',
  condividiCodice: 'Deel de code met de andere Vikingen',
  inAttesaHost: 'Wachten tot de host uitvaartâ¦',
  avviaPartita: 'Uitvaren!',
  aggiungiBot: '+ Bot',
  esciLobby: 'Lobby verlaten',
  esciPartita: 'Spel verlaten',
  esciPartitaTitolo: 'Het spel verlaten?',
  esciPartitaTesto:
    'Het spel gaat zonder jou verder en je plaats blijft van JOU: kom wanneer je wilt terug via âOnlineâ met de code {code}.',
  esciPartitaConferma: 'Ja, verlaten',
  timerTurno: 'Beurttimer',
  timerSecondi: 'Beurttimer (seconden, 0 = geen)',
  timerLobby: 'Beurttimer: {s}',
  nessunTimer: 'Geen',
  secondiAbbr: '{n}s',
  hostTag: 'host',
  disconnessoTag: 'afwezig',
  attesaPartita: 'Wachten op het spelâ¦',
  lobbyChiusa: 'Lobby gesloten: {motivo}',
  terminaPartita: 'Spel beÃ«indigen',
  terminaTitolo: 'Spel beÃ«indigen?',
  terminaTesto: 'Het spel wordt voor ALLE spelers gesloten en kan niet worden hervat.',
  terminaConferma: 'Ja, voor iedereen beÃ«indigen',
  partitaPubblicaToggle: 'Openbaar spel (voor iedereen)',
  partitePubbliche: 'Openbare spellen',
  nessunaPubblica: 'Op dit moment geen openbare spellen. Maak er een!',
  entra: 'Meedoen',
  postiNsuM: '{n}/{m} Vikingen',
  visibilitaPubblica: 'Openbaar',
  visibilitaPrivata: 'PrivÃ© (op uitnodiging)',
  spettatore: {
    guarda: 'Kijken',
    partiteInCorso: 'Lopende partijen',
    nessunaInCorso: 'Geen lopende partijen om te bekijken.',
    giroN: 'Ronde {n}',
    spettatoriN: '{n} ð',
    staiGuardando: 'Je kijkt mee',
    smettiGuarda: 'Stoppen met kijken',
    chiediMano: 'Bekijk de hand',
    manoNascosta: 'Hand verborgen',
    inAttesa: 'Wachtenâ¦',
    richiestaTitolo: 'Een kijker observeert je',
    richiestaTesto: '{nome} wil je hand zien. Toestaan?',
    permetti: 'Toestaan',
    nega: 'Weigeren',
    spettatoreTag: 'Toeschouwer',
  },

  // Spelchat (online)
  chat: {
    titolo: 'Chat',
    apri: 'Chat openen',
    chiudi: 'Chat sluiten',
    placeholder: 'Typ een berichtâ¦',
    invia: 'Verstuur',
    vuota: 'Nog geen berichten. Breek het ijs!',
    tu: 'Jij',
  },

  // Accountbeheer
  account: 'Account',

  inventario: 'Inventaris',
  invSottotitolo: 'Jouw skins: iedereen die met je speelt, ziet ze in het spel.',
  invModoLocale: 'ð´ Opgeslagen op dit apparaat (geen account) â log in via âOnlineâ om ze overal mee te nemen.',
  invModoAccount: 'âï¸ Opgeslagen op je account: ze volgen je op elk apparaat.',
  invDrago: 'Jouw Draak',
  invDragoInfo: 'In het spel neemt hij het uiterlijk ÃN de kleur aan van wie hem het laatst verplaatste.',
  invRocca: 'Jouw burchten',
  invRoccaInfo: 'Welk uiterlijk je ook kiest, hij kleurt altijd in de kleur van je clan.',
  invSelezionato: 'In gebruik',
  invSalvato: 'Opgeslagen â',
  invColori: 'Kleuren',
  invColoreOcchi: 'Ogen',
  invColoreFiamme: 'Vlammen',
  invColorePietra: 'Steen',
  invRipristina: 'Herstellen',
  skin: {
    drago: 'Klassieke Draak',
    navicella: 'Ruimteschip',
    trex: 'T-Rex',
    briganti: 'Rovers',
    roccaforte: 'Klassieke burcht',
    torre: 'Wachttoren',
    castello: 'Kasteel',
  },
  ilTuoAccount: 'Jouw account',
  datiSalvati: 'Dit zijn de gegevens die we van je bewaren:',
  registratoIl: 'Geregistreerd op',
  idAccount: 'Account-ID',
  passwordImpostata: 'â¢â¢â¢â¢â¢â¢â¢â¢',
  cambiaNome: 'Gebruikersnaam wijzigen',
  nuovoNome: 'Nieuwe gebruikersnaam',
  nomeAggiornato: 'Naam bijgewerkt! Hij geldt in het spel vanaf je volgende potjes.',
  passwordAttuale: 'Huidig wachtwoord',
  aggiungiEmail: 'E-mail toevoegen',
  emailEggTitolo: 'Wacht eens evenâ¦',
  emailEggTesto:
    'âHeeft een online spel echt je e-mail nodig?â Nee. En omdat we je gegevens niet ' +
    'verkopen, vragen we er niet om en bewaren we hem niet: dit veld bestaat niet eens ' +
    'in de database.',
  emailEggOk: 'Eerlijk is eerlijk!',
  cambiaPassword: 'Wachtwoord wijzigen',
  nuovaPassword: 'Nieuw wachtwoord (min. 8)',
  ripetiPassword: 'Herhaal het nieuwe wachtwoord',
  passwordNonCoincidono: 'De twee wachtwoorden komen niet overeen',
  passwordAggiornata:
    'Wachtwoord bijgewerkt! Sessies op andere apparaten zijn uitgelogd.',
  salva: 'Opslaan',

  // Setup
  configuraPartita: 'Bereid de expeditie voor',
  giocatore: 'Speler',
  umano: 'Mens',
  bot: 'Bot',
  livelloBot: 'Niveau',
  facile: 'Gemakkelijk',
  normale: 'Normaal',
  difficile: 'Moeilijk',
  esperto: 'Expert',
  difficolta: 'Kies moeilijkheidsgraad van de bot',
  aggiungi: 'Toevoegen',
  nome: 'Naam',
  aggiungiGiocatore: '+ Viking toevoegen',
  cambiaColore: 'Kleur wijzigen',
  scambiaColoreCon: 'Kleur ruilen met {nome}',
  coloreCustom: 'Aangepast',
  nomeColore: {
    rosso: 'Rood',
    blu: 'Blauw',
    verde: 'Groen',
    giallo: 'Geel',
    viola: 'Paars',
  },
  rimuovi: 'Verwijderen',
  configurazione: 'Instellingen',
  puntiVittoria: 'Punten om te winnen',
  standardN: '(standaard {n})',
  seedOpzionale: 'Kaartzaad (leeg = willekeurig)',
  evita68: 'Vermijd 6 en 8 naast elkaar',
  dimensioneTavola: 'Bordgrootte',
  campoGrande: 'Groot veld',
  campoGrandeSpiega: '30 vakken â aanbevolen voor 5â6 spelers.',
  campoGigante: 'Reuzenveld',
  campoGiganteSpiega: '37 vakken â aanbevolen voor 7â8 spelers.',
  campoRientranze: 'Met inhammen',
  campoLibero: 'Vrij speelveld',
  campoLiberoSpiega:
    'Kies hoeveel vakken het bord heeft ({min}â{max}): een compact eiland met dat aantal vakken. Gaat boven de grootte en vorm hierboven.',
  numeroCaselle: 'Vakken',
  deserti: 'Woestijnen',
  desertiSpiega:
    'Hoeveel woestijnen (toendra, zonder nummerfiche) op het bord. Minstens 1: de Draak start op een woestijn.',
  campoRientranzeSpiega:
    'Eiland met willekeurige vorm (baaien, schiereilanden) met evenveel vakken: je kunt bruggen bouwen om baaien van Ã©Ã©n weg breed over te steken.',
  categoriaModalita: 'Modi',
  categoriaTavola: 'Bord',
  categoriaOnline: 'Online',
  via: 'Uitvaren!',
  indietro: 'Terug',
  serveUnUmano: 'Je hebt minstens Ã©Ã©n menselijke Viking nodig',

  // Nieuw spel (Ã©Ã©n flow: lokaal + online in Ã©Ã©n weergave)
  stessoDevice: 'Lokaal',
  nuovaPartitaHintLocale:
    'Geef de telefoon om de beurt door. Elke plek kan Jij of een Bot zijn.',
  nuovaPartitaHintOnline:
    'Deel de code: vrienden doen van veraf mee. Vul de vrije plekken met bots.',
  aggiungiPosto: '+ Plek toevoegen',
  aggiungiBotPosto: '+ Bot toevoegen',
  ruoloTu: 'Jij',
  ruoloAmico: 'Vriend',
  regoleEtichetta: 'Regels',
  regoleClassica: 'Klassiek',
  regolePersonalizzate: 'Op maat',
  modificaRegole: 'Bewerken',
  altreRegole: 'Meer',
  avvia: 'Starten',
  copia: 'KopiÃ«ren',
  copiato: 'Gekopieerd!',
  gestionePartita: 'Spelbeheer',
  riprendi: 'Hervatten',
  esciLocaleTesto: 'Het huidige spel gaat verloren en je keert terug naar het menu.',
  statoOffline: 'offline',

  // Hot-seat (het apparaat doorgeven)
  passaDispositivo: 'Geef het apparaat door',
  toccaA: '{nome} is aan de beurt',
  sonoPronto: 'Ik ben {nome}!',

  // Fases en acties
  faseSetupVillaggio: '{nome}: plaats een dorp',
  faseSetupSentiero: '{nome}: plaats een pad naast het dorp',
  tiraIDadi: 'Gooi de dobbelstenen',
  setteGrave: 'De Draak ontwaakt!',
  faseTiroAtteso: '{nome} is aan de beurt: gooi de dobbelstenen',
  faseMain: '{nome} is aan de beurt',
  faseScarto: 'Een 7! {nome} moet {n} kaarten afleggen',
  faseDrago: '{nome} verplaatst de Draak',
  faseFurto: '{nome} kiest wie te beroven',
  faseSentieriGratis: '{nome} plaatst {n} gratis paden',
  costruisci: 'Bouwen',
  sentiero: 'Pad',
  villaggio: 'Dorp',
  roccaforte: 'Burcht',
  compraCarta: 'Sagakaart',
  scambia: 'Ruilen',
  scambiaBanca: 'Bank / Havens',
  proponiScambio: 'Aanbieden aan spelers',
  carte: 'Kaarten',
  costruzioni: 'Bouwwerken',
  costruzioniSub: 'Hoeveel je er nog kunt bouwen',
  disponibili: 'beschikbaar',
  fineTurno: 'Beurt beÃ«indigen',
  annulla: 'Annuleren',
  conferma: 'Bevestigen',
  chiudi: 'Sluiten',
  gioca: 'Spelen',
  razziaScegli: 'Kies het vak waarop je de Rooftocht ontketent.',

  // Panelen
  leTueRisorse: 'Jouw grondstoffen',
  leTueCarte: 'Jouw Sagakaarten',
  carteNonGiocabili: '(vanaf volgende beurt)',
  mazzoRimasto: 'Stapel: {n}',
  banca: 'Bank',
  puntiGloria: 'Roempunten',
  diario: 'Scheepsjournaal',

  // Ruilingen
  dai: 'Geef',
  ricevi: 'Ontvang',
  rapporto: 'Verhouding {n}:1',
  scegliRisorse: 'Kies de grondstoffen',
  offertaA: 'Aanbieden aan',
  tutti: 'Iedereen',
  offertaDi: 'Aanbod van {nome}',
  accetta: 'Accepteren',
  rifiuta: 'Weigeren',
  inAttesaRisposte: 'Wachten op antwoordâ¦',
  concludiCon: 'Sluiten met {nome}',

  // Afleggen en stelen
  scartaCarte: 'Leg {n} kaarten af',
  scegliVittima: 'Kies wie te beroven',

  // Spelkaart (kosten en punten)
  bugiardino: 'Spelkaart',
  bugiardinoTitolo: 'Kosten en Roempunten',
  pezziMax: 'max. {n}',
  puntiGloriaAbbr: 'RP',
  bonusRequisitoVia: 'minstens {n} verbonden paden',
  bonusRequisitoFuria: 'minstens {n} Berserkers gespeeld',
  eroeSegretoRiga: '1 geheim RP (telt meteen mee)',
  scambiRiga: 'Ruilen: bank 4:1 Â· haven 3:1 Â· speciale haven 2:1',
  obiettivoRiga: 'Winnen: {n} Roempunten op je eigen beurt',
  setteRiga: 'Bij een 7: wie meer dan {n} kaarten heeft, legt de helft af',

  // Overwinning
  vittoriaTitolo: '{nome} verovert Viking-Island!',
  vittoriaSub: 'verovert Viking-Island!',
  rivincita: 'Revanche',
  tornaAlMenu: 'Terug naar menu',
  dettaglioPunti: 'Verdeling van de Roempunten',
  bonusGrandeVia: 'De Grote Weg',
  bonusFuria: 'Razernij der Berserkers',
  eroiNascosti: 'Heldensagen',
  villaggi: 'Dorpen',
  roccaforti: 'Burchten',
  totale: 'Totaal',

  // Einde van het spel: eindkaart en statistieken
  vediMappaFinale: 'Eindkaart',
  vediStatistiche: 'Statistieken',
  mappaFinaleTitolo: 'De kaart op het einde',
  statisticheTitolo: 'Spelstatistieken',
  statTiriDado: 'Dobbelworpen',
  statTiriSub: '{tiri} worpen in {turni} beurten Â· verwacht vs werkelijk',
  statNessunTiro: 'Geen worpen geregistreerd.',
  statLegendaAtteso: 'verwacht',
  statNumeroFortunato: 'Geluksgetal',
  statSetteUsciti: 'Zevens gegooid',
  statDragoMosso: 'Draak verplaatst',
  statConfronto: 'Vergelijking tussen clans',
  statScambi: 'Ruilingen',
  statScambiBanca: 'Ruilingen met de bank',
  statScambiGiocatori: 'Ruilingen tussen spelers',
  statCostruzioni: 'Bouwwerken',
  statRisorseProdotte: 'Geproduceerde grondstoffen',
  statCarteSaga: 'Gekochte Sagakaarten',
  statFurti: 'Plunderingen met de Draak',
  statScartate: 'Afgelegde kaarten',
  statPrimati: 'Eregalerij',
  statManiDoro: 'Gouden handen',
  statManiDoroSub: 'meeste grondstoffen verzameld',
  statMercante: 'Koopman',
  statMercanteSub: 'meeste ruilingen gesloten',
  statCostruttore: 'Meesterbouwer',
  statCostruttoreSub: 'meeste bouwwerken',
  statPredone: 'Plunderaar',
  statPredoneSub: 'meeste plunderingen met de Draak',
  statSfortunato: 'Pechvogel',
  statSfortunatoSub: 'meeste kaarten afgelegd',
  statStratega: 'Strateeg',
  statStrategaSub: 'meeste Sagakaarten gespeeld',
  statNessuno: 'â',

  // Namen van grondstoffen en terreinen
  risorsa: {
    legname: 'Hout',
    pietra: 'Steen',
    lana: 'Wol',
    orzo: 'Gerst',
    ferro: 'IJzer',
  },
  terreno: {
    legname: 'Dennenbos',
    pietra: 'Roodsteengroeve',
    lana: 'Weide',
    orzo: 'Gerstvelden',
    ferro: 'IJzermijn',
    tundra: 'Bevroren toendra',
  },
  cartaSaga: {
    assalto: 'Aanval',
    assaltoLeggero: 'Lichte Aanval',
    cambiaCalamita: 'Wending van het Lot',
    berserker: 'Berserker',
    sagaDegliEroi: 'Heldensaga',
    costruttoriDiSentieri: 'Padenbouwers',
    banchetto: 'Feestmaal',
    tributo: 'Tribuut',
    razzia: 'Rooftocht',
  },
  calamita: {
    modalita: 'Spelmodus',
    standard: 'Standaardspel',
    conCalamita: 'Met rampen',
    spiega: 'Elke ronde verandert een kaart de regels, alleen voor die ronde â goed en slecht, in willekeurige volgorde. Als de stapel op is, wordt alles weer normaal.',
    titolo: 'Ramp van de ronde',
    rimaste: 'nog {n} in de stapel',
    guadagna: 'Ramp: verdien {n} grondstoffen',
    strade: 'Ramp: plaats je gratis wegen op de kaart!',
    franaScegli: 'Aardverschuiving! Kies welke van je randwegen instort.',
    attesa: 'Ramp bezig: wacht op de anderenâ¦',
    nome: {
      materialeDoppio: '{mat} in overvloed',
      materialeBloccato: '{mat}-tekort',
      dragoFermo: 'Slapende Draak',
      nienteSaga: 'Vergeten sagen',
      dragoPrimaDelTiro: 'Rusteloze Draak',
      scambiTre: 'Handelsroutes',
      scambioDue: '{mat}-markt',
      abbondanza: 'Jaar van overvloed',
      bufera: 'Sneeuwstorm',
      assedio: 'Beleg',
      mareInTempesta: 'Woeste zee',
      mercatoOro: 'Gouden markt',
      leaderScartaTutto: 'Afgunst der goden',
      tuttiScartanoMeta: 'Grote vorst',
      ultimoPesca4: 'Gunst der goden',
      ultimoStrade2: 'Wegen terug',
      tuttiPiu2: 'Gave van {mat}',
      scartaFino7: 'Volle pakhuizen',
      tuttiUnoDiTutto: 'Rijke oogst',
      donoDegliDei: 'Geschenk der goden',
      bottino: 'Buit van de arme',
      razzia: 'Rooftocht',
      frana: 'Aardverschuiving',
    },
    desc: {
      materialeDoppio: 'Deze ronde krijg je {mat} dubbel.',
      materialeBloccato: 'Deze ronde krijg je geen {mat}.',
      dragoFermo: 'Deze ronde kan de Draak niet verplaatst worden.',
      nienteSaga: 'Deze ronde speel je geen Sagakaarten.',
      dragoPrimaDelTiro: 'Deze ronde verplaats je vÃ³Ã³r het gooien de Draak.',
      scambiTre: 'Deze ronde zijn alle bankruilen 3:1.',
      scambioDue: 'Deze ronde zijn {mat}-bankruilen 2:1.',
      abbondanza: 'Deze ronde krijg je ALLE grondstoffen dubbel.',
      bufera: 'Deze ronde bouw je geen wegen.',
      assedio: 'Deze ronde bouw je geen vestingen.',
      mareInTempesta: 'Deze ronde zijn bankruilen verboden.',
      mercatoOro: 'Deze ronde zijn alle bankruilen 2:1.',
      leaderScartaTutto: 'Wie de meeste punten heeft, gooit ALLE grondstoffen weg.',
      tuttiScartanoMeta: 'Iedereen gooit de helft van zijn grondstoffen weg.',
      ultimoPesca4: 'Wie de minste punten heeft, krijgt 4 grondstoffen naar keuze.',
      ultimoStrade2: 'Wie de minste wegen heeft, plaatst er 2 gratis.',
      tuttiPiu2: 'Iedereen krijgt 2 {mat}.',
      scartaFino7: 'Wie meer dan 7 grondstoffen heeft, gooit terug naar 7.',
      tuttiUnoDiTutto: 'Iedereen krijgt 1 van elke grondstof.',
      donoDegliDei: 'Iedereen trekt 1 Sagakaart.',
      bottino: 'Wie de minste punten heeft, trekt 1 Sagakaart.',
      razzia: 'Wie de meeste punten heeft, geeft elke tegenstander 1 grondstof.',
      frana: 'Wie de meeste wegen heeft, verliest er 1 aan de rand naar keuze (nooit de twee beginwegen).',
    },
  },

  descrizioneCarta: {
    assalto: 'Gratis zware aanval: bereikt door een van je wegen, verwoest het huis van de tegenstander of degradeert het bolwerk tot huis.',
    assaltoLeggero: 'Gratis lichte aanval: breekt een weg van de tegenstander aan het uiteinde, bereikt door een van je wegen.',
    cambiaCalamita: 'Vervangt de ramp van de ronde door de volgende blijvende ramp in de stapel.',
    berserker: 'Verplaats de Draak en steel 1 kaart. Telt mee voor de Razernij der Berserkers.',
    sagaDegliEroi: '1 geheim Roempunt (telt meteen mee).',
    costruttoriDiSentieri: 'Plaats meteen 2 gratis paden.',
    banchetto: 'Neem 2 grondstoffen naar keuze uit de bank.',
    tributo: 'Elke tegenstander geeft je AL zijn eenheden van Ã©Ã©n grondstof.',
    razzia: 'Leg hem op een vak: tot je volgende beurt is de productie van DAT vak van jou, niet van de eigenaars.',
  },

  /**
   * EASTER EGG: bots die mopperen als de Draak hen blokkeert â net als aan een
   * echte tafel, waar iemand het altijd persoonlijk opvat.
   */
  // --- Heroes mode ---
  eroi: {
    conEroi: 'With heroes',
    spiega:
      'Each clan picks a hero with a special ability (common, uncommon, rare or legendary). Unless stated otherwise, each ability activates once per turn.',
    scegliTitolo: 'Choose your hero',
    scegliPer: '{nome}âs hero',
    nessuno: 'No hero',
    scegli: 'Choose hero',
    cambia: 'Change',
    scegliPerMulti: '{nome}’s heroes',
    numero: 'Number of heroes',
    numeroSpiega: 'How many distinct heroes each clan plays (no duplicates).',
    libero: 'Free',
    selezionati: 'Selected {n}/{max}',
    conferma: 'Confirm',
    usiRimasti: 'Uses left: {n}',
    abilita: 'Hero ability',
    usaMercante: 'Trader: 2:1 trade',
    usaMutaporto: 'Sea Lord: transform harbour',
    mutaportoScegli: 'Tap one of your harbours on the map to transform it.',
    mutaportoTipo: 'Transform it into which harbour?',
    mercanteTitolo: 'Wandering Trader â 2-for-1 trade',
    esaurita: 'Ability used up',
    rarita: {
      comune: 'Common',
      nonComune: 'Uncommon',
      rara: 'Rare',
      leggendaria: 'Legendary',
    },
  },

  capitale: {
    nome: 'ð Hoofdstad',
    conCapitale: 'Met hoofdstad',
    spiega:
      'Waardeer een van je Burchten op tot Hoofdstad (1 hout, 1 steen, 1 schaap, 2 gerst, 3 ijzer): hij is 3 Roempunten waard, levert 3 grondstoffen in plaats van 2 en kan nooit worden vernietigd. Je kunt er maar Ã©Ã©n bouwen.',
    scegli: 'Kies welke Burcht je opwaardeert tot Hoofdstad.',
  },

  battaglia: {
    assaltoScegli: 'Kies het gebouw van de tegenstander om met de kaart aan te vallen.',
    assaltoLeggeroScegli: 'Kies de weg van de tegenstander om met de kaart te breken.',
    conBattaglia: 'Met strijd',
    spiega:
      'Als een van jouw wegen het netwerk van een tegenstander bereikt, kun je het op twee manieren aanvallen. ' +
      'Zware aanval (2 hout, 1 steen, 1 schaap, 2 ijzer): raakt een huis (verwoest) of een bolwerk (gedegradeerd tot huis). ' +
      'Lichte aanval (2 hout, 2 ijzer): breekt een weg van de tegenstander, maar alleen die aan het uiteinde (aan Ã©Ã©n kant verbonden). ' +
      'De twee starthuizen zijn onverwoestbaar, tenzij ze bolwerken worden.',
    attacca: 'âï¸ Aanvallen',
    scegliBersaglio: 'Kies het gebouw van de tegenstander om aan te vallen (2 hout, 1 steen, 1 schaap, 2 ijzer).',
    spezza: 'ð¨ Weg breken',
    spezzaScegli: 'Kies de weg van de tegenstander om aan het uiteinde te breken (2 hout, 2 ijzer).',
    pesante: 'Zware aanval',
    pesanteNota: 'huizen en bolwerken',
    leggero: 'Lichte aanval',
    leggeroNota: 'wegen aan het uiteinde',
  },

  lamentiDrago: [
    'Oh kom op, altijd ik?!',
    'Blokkeer iemand anders, wil je?!',
    'Ik neem wraak. Op mijn Vikingerewoord.',
    'Odin, waarom uitgerekend ik?',
    'Het halve eiland is vrij en je zet hem HIER?!',
    'Die draak heeft het op mij gemunt, officieel.',
    'Ja, ja, ik schrijf het op. ALLES.',
    'Oh geweldig, ALWEER bij mij.',
    'En ik bood je nog wel een ruil aanâ¦',
    'Ik bel de advocaat van de clan.',
    'Als MIJN Razernij komt, praten we verder.',
    'Mooie manier om vrienden te maken, knap hoor.',
    'Mijn gerstâ¦ MIJN GERST!',
    'Brave draak, terug naar de toendra, alsjeblieft.',
  ],

  // Gebeurtenissen in het scheepsjournaal
  log: {
    calamita: 'â¡ Ramp â {nome}: {desc}',
    lamentoDrago: '{nome}: â{frase}â',
    ordineTiro: '{nome} gooit {d1}+{d2} = {tot}',
    ordineSpareggio: 'Beslissing: {righe}',
    ordineTitolo: 'Worp om de volgorde: {righe}',
    ordineFinale: 'Beurtvolgorde: {ordine}',
    turnoIniziato: 'â Beurt {n}: {nome} is aan zet â',
    dadiTirati: '{nome} gooit {d1}+{d2} = {tot}',
    risorseProdotte: '{nome} ontvangt {risorse}',
    penuriaBanca: 'Banktekort: {risorse} niet uitgedeeld',
    risorseScartate: '{nome} legt {n} kaarten af',
    dragoMosso: '{nome} verplaatst de Draak',
    risorsaRubataNota: '{ladro} steelt {risorsa} van {vittima}',
    risorsaRubata: '{ladro} steelt een kaart van {vittima}',
    costruito: '{nome} bouwt: {cosa}',
    cartaComprataNota: '{nome} koopt een Sagakaart: {carta}',
    cartaComprata: '{nome} koopt een Sagakaart',
    cartaGiocata: '{nome} speelt: {carta}',
    banchetto: '{nome} houdt een feestmaal: +{r1} en +{r2}',
    tributo: '{nome} int het tribuut: {n}Ã {risorsa}',
    razziaPosata: 'ð° {nome} ontketent een Rooftocht op een vak: int de productie ervan tot de volgende beurt',
    razziaRiscossa: 'ð° De Rooftocht levert {nome} op: {risorse}',
    franaSpezzata: 'â°ï¸ Een aardverschuiving laat een weg van {nome} instorten',
    scambioProposto: '{nome} stelt een ruil voor',
    rispostaScambio: '{nome} {risposta} de ruil',
    accettaVerbo: 'accepteert',
    rifiutaVerbo: 'weigert',
    scambioEseguitoBanca: '{nome} ruilt met de bank: {dai} â {ricevi}',
    scambioEseguito: 'Ruil gesloten tussen {a} en {b}',
    scambioAnnullato: 'Aanbod ingetrokken',
    scambioRifiutato: 'Geen teamgenoot accepteerde de ruil',
    grandeVia: 'De Grote Weg gaat naar {nome} ({n} paden)',
    grandeViaNessuno: 'De Grote Weg is van niemand meer',
    furia: 'De Razernij der Berserkers gaat naar {nome} ({n} berserkers)',
    battagliaDistrutta: 'âï¸ {attaccante} verwoest een huis van {vittima}',
    battagliaDeclassata: 'âï¸ {attaccante} degradeert een bolwerk van {vittima} tot huis',
    sentieroSpezzato: 'ð¨ {attaccante} breekt een weg van {vittima}',
    vittoria: '{nome} wint met {n} Roempunten!',
  },

  demo: {
    apri: 'Korte uitleg',
    titolo: 'Korte uitleg',
    sottotitolo: 'Leer al spelend, stap voor stap',
    benvenutoTitolo: 'Welkom in de magische wereld van Viking-Island',
    benvenutoVai: 'Daar gaan we!',
    passoDi: 'Stap {n} van {tot}',
    salta: 'Overslaan',
    auto: 'Auto',
    sezioneGioco: 'Hoe te spelen',
    sezioneOnline: 'Online spelen',
    seiClan: 'In deze demo ben jij de {colore} clan.',
    sezioneEsempio: 'Voorbeeldpartij',
    afferri: 'Met dit dorp pak je:',
    puntaNuove: 'Je mikt op deze nieuwe grondstoffen:',
    secondoAggiunge: 'Het tweede dorp voegt toe:',
    soloNumeriNuovi: 'nieuwe getallen (zelfde grondstof)',
    haiTirato: 'Je gooide {d1} + {d2} = {tot}!',
    haiRicevuto: 'Je ontving:',
    niente: 'deze keer niets',
    giocaOffline: 'Speel met bots',
    vaiOnline: 'Probeer online',
    fineChiudi: 'Demo sluiten',
    senzaEmail: 'E-mail â niet nodig!',
    passi: {
      intro: {
        titolo: 'Welkom bij de demo!',
        testo:
          'Ik loop stap voor stap met je door een potje Viking-Island, en laat je daarna ' +
          'zien hoe je online speelt. Druk op âVerderâ om door te gaan: je kunt altijd ' +
          'âTerugâ of âOverslaanâ.',
      },
      isola: {
        titolo: 'Het eiland en de grondstoffen',
        testo:
          'Het eiland bestaat uit zeshoeken. Elk produceert een grondstof en heeft een ' +
          'getal: de stippen tonen hoe waarschijnlijk het is met de dobbelstenen (6 en 8, ' +
          'in het rood, komen heel vaak). De toendra produceert niets: het is het hol van de Draak.',
      },
      setupVillaggio: {
        titolo: 'Je eerste dorp',
        testo:
          'Je begint met het gratis plaatsen van een dorp op een kruispunt (het witte vizier). ' +
          'Zoek sterke getallen en gevarieerde grondstoffen. Afstandsregel: twee bouwwerken ' +
          'mogen nooit op aangrenzende kruispunten staan.',
      },
      setupSentiero: {
        titolo: 'Je eerste pad',
        testo:
          'Meteen na het dorp plaats je een pad op een aangrenzende zijde: het begin van je ' +
          'wegennet, dat je nodig hebt om uit te breiden.',
      },
      altri: {
        titolo: 'Ook de andere clans plaatsen',
        testo:
          'Elke clan plaatst om de beurt âin slangvormâ: eerst op volgorde, dan achteruit. ' +
          'Wie het eerste dorp als laatste plaatst, plaatst het tweede als eerste.',
      },
      secondoVillaggio: {
        titolo: 'Het tweede dorp produceert meteen',
        testo:
          'In de tweede ronde plaats je nog een dorp (en een pad). Het tweede dorp geeft je ' +
          'meteen een grondstof voor elke gemarkeerde zeshoek eromheen.',
      },
      tiraDadi: {
        titolo: 'Gooi de dobbelstenen',
        testo:
          'Het echte spel begint! Elke beurt start met het gooien van twee dobbelstenen: het ' +
          'getal dat valt bepaalt welke zeshoeken produceren voor ALLE spelers, niet alleen voor wie gooit.',
      },
      produzione: {
        titolo: 'Productie',
        testo:
          'Elke zeshoek met het gegooide getal geeft 1 grondstof per aangrenzend dorp en 2 per ' +
          'burcht. De gemarkeerde zeshoeken zijn die welke jou opleveren.',
      },
      costruire: {
        titolo: 'Bouwen en kopen',
        testo:
          'Met grondstoffen bouw je paden, dorpen en burchten (de upgrade van het dorp) of koop ' +
          'je een Sagakaart. Dit kost elk:',
      },
      drago: {
        titolo: 'De 7 en de Draak',
        testo:
          'Als er een 7 valt, produceert niemand: wie meer dan 7 kaarten heeft, legt de helft af, ' +
          'daarna verplaatst wie gooide de Draak (gemarkeerd) en steelt een kaart van een buur. ' +
          'De zeshoek met de Draak produceert niets zolang hij daar blijft.',
      },
      carteSaga: {
        titolo: 'De Sagakaarten',
        testo:
          'Een stapel van 25 kaarten met speciale effecten. Je koopt ze nu en speelt ze vanaf de ' +
          'volgende beurt, hoogstens Ã©Ã©n per beurt (de Heldensaga telt juist meteen mee, terwijl hij verborgen blijft).',
      },
      scambi: {
        titolo: 'Ruilen',
        testo:
          'Mis je een grondstof? Ruil met de bank (4:1), met de havens (3:1 of 2:1) of bied tijdens ' +
          'je beurt een ruil aan de andere spelers aan.',
      },
      bonus: {
        titolo: 'Bonussen en verborgen punten',
        testo:
          'De Grote Weg (de langste keten van paden) en de Razernij der Berserkers (meeste ' +
          'Berserkerkaarten gespeeld) zijn elk 2 Roempunten waard. De Heldensaga is 1 geheim punt waard: pas op voor verrassingen!',
      },
      vittoria: {
        titolo: 'Het spel winnen',
        testo:
          'De eerste clan die op de eigen beurt 10 Roempunten haalt, wint. Zo zou het eiland er aan ' +
          'het einde uit kunnen zien: vol dorpen, burchten en paden.',
      },
      esempioIntro: {
        titolo: 'Een uitgelegde voorbeeldpartij',
        testo:
          'Nu een echte partij, maar uitgelegd: bij elke zet zeg ik je WAAROM die loont. Je leert de beste plek te kiezen, ' +
          'met wegen nieuwe getallen en materialen te bereiken, en grondstoffen om te zetten in je doelen.',
      },
      valutare: {
        titolo: 'Eerste zet: lees het eiland',
        testo:
          'Kijk naar de gemarkeerde kruispunten: dat zijn de sterkste. Een goede plek raakt waarschijnlijke getallen ' +
          '(de stippen: 6 en 8 komen heel vaak) en VERSCHILLENDE grondstoffen, zodat je bij elke worp iets produceert. Neem het overzicht voordat je plaatst.',
      },
      postoMigliore: {
        titolo: 'Kies de beste plek',
        testo:
          'Hier plaats je: het kruispunt met de meeste opbrengst. Van deze hexen pak je de grondstoffen hieronder telkens ' +
          'als hun getallen vallen. Het is de motor van je partij: kies goed, want hij blijft tot het einde bij je.',
      },
      stradeEspansione: {
        titolo: 'Reik uit met wegen',
        testo:
          'EÃ©n dorp is niet genoeg. Verleng de weg naar het gemarkeerde kruispunt: het brengt NIEUWE getallen en materialen ' +
          'die je nog niet produceert. Wegen zijn je armen â strek ze naar waar je iets mist.',
      },
      secondoPosto: {
        titolo: 'Het tweede dorp maakt de motor af',
        testo:
          'Kies bij je tweede plaatsing een kruispunt dat de ontbrekende grondstoffen dekt: zo komt er bij elke worp iets ' +
          'binnen. Een goede mix (hout en steen om te bouwen, gerst en wol om te groeien) houdt je altijd in het spel.',
      },
      obiettivi: {
        titolo: 'Zet grondstoffen om in doelen',
        testo:
          'Nu heb je een plan: met hout en steen verleng je wegen en win je âDe Grote Wegâ; met gerst, wol en ijzer ' +
          'promoveer je dorpen tot burchten en koop je Sagakaarten. Elke zet moet je dichter bij de 10 Roempunten brengen.',
      },
      risultato: {
        titolo: 'Het resultaat',
        testo:
          'Hier leidt de redenering heen: een eiland vol met jouw wegen, dorpen en burchten. Wie de plekken goed kiest, ' +
          'gericht uitbreidt en de doelen in het oog houdt, bereikt als eerste 10 punten. Nu is het jouw beurt!',
      },
      onlineIntro: {
        titolo: 'Online spelen met vrienden',
        testo:
          'Via het menu âOnlineâ speel je met echte mensen, elk op hun eigen apparaat. De ' +
          'scheidsrechter is de server: die controleert elke zet met dezelfde regels, dus valsspelen is onmogelijk.',
      },
      serverFreddo: {
        titolo: 'Heb geduld: de server ontwaakt',
        testo:
          'Belangrijk: de gratis server gaat âin slaapâ als niemand speelt. De EERSTE verbinding ' +
          'kan 30 tot 60 seconden duren om hem te wekken â dat is normaal, even wachten. Een groen vinkje laat zien wanneer hij klaar is.',
      },
      account: {
        titolo: '1. Maak een account',
        testo:
          'Je hebt alleen een gebruikersnaam nodig (ook je naam in het spel) en een wachtwoord van ' +
          'minstens 8 tekens. Geen e-mail: niet nodig en we vragen er niet om.',
      },
      creaEntra: {
        titolo: '2. Maak een spel of doe mee',
        testo:
          'Druk op âSpel makenâ voor een code van 6 tekens om naar je vrienden te sturen, of ' +
          'âDeelnemenâ en voer de ontvangen code in.',
      },
      lobby: {
        titolo: '3. De lobby',
        testo:
          'In de wachtruimte kun je je kleur wijzigen en kan de host bots toevoegen om de plaatsen ' +
          'te vullen. Als jullie met 2 tot 6 zijn, drukt de host op âUitvaren!â.',
      },
      onlinePartita: {
        titolo: '4. Spelen maar!',
        testo:
          'Ieders zetten komen in realtime binnen. Valt je verbinding weg, kom dan terug met de ' +
          'lobbycode: je plaats blijft van jou. Er is ook een optionele beurttimer, zodat niemand het spel ophoudt.',
      },
      fine: {
        titolo: 'Je bent er klaar voor, Viking!',
        testo:
          'Dat was het! Je kunt elke regel nalezen in het âBoek der Sagenâ via het menu. Nu is het ' +
          'jouw beurt: vaar uit!',
      },
    },
  },
  squadra: {
    modalita: 'Teammodus',
    spiega:
      'Wegen, havens, Â«De Grote WegÂ» en de Â«Razernij der BerserkersÂ» zijn van het team. ' +
      'Ruilen alleen tussen teamgenoten: twee per beurt, Ã©Ã©n om Ã©Ã©n. ' +
      'Je wint met de gecombineerde Roempunten van het team.',
    numeroSquadre: 'Aantal teams',
    coloriSquadre: 'Teamkleuren',
    coloriNomiSquadre: 'Teamkleuren en -namen',
    nomeSquadra: 'Teamnaam (optioneel)',
    puntiPerGiocatore: 'Punten per speler',
    bersaglio: 'Teamdoel: {size} Ã {target} = {tot} gecombineerde punten.',
    sbilanciate: 'Teams moeten even groot zijn: verdeel de plaatsen gelijk.',
    squadraLabel: 'Team:',
    squadraN: 'Team {n}',
    coloreSquadraN: 'Teamkleur {n}',
    sqN: 'T.{n}',
    manoCompagni: 'Jouw team',
    scambioNota: 'In een team: Ã©Ã©n grondstof â Ã©Ã©n grondstof, met het hele team of een teamgenoot (max. 2 per beurt).',
    tuttaLaSquadra: 'Het hele team',
  },
  erroreMossa: 'Ongeldige zet: {motivo}',
};
