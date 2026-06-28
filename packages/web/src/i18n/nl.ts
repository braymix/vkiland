import type { Strings } from './types';

/** Nederlands (NL). */
export const nl: Strings = {
  titolo: 'VIKING-ISLAND',
  sottotitolo: 'Saga van het Noordelijke Eiland',

  // Menu
  nuovaPartita: 'Nieuw spel',
  multigiocatore: 'Online',
  negozio: 'Winkel (binnenkort)',
  comeSiGioca: 'Hoe te spelen',
  crediti: 'Credits',
  creditiFattoDa: 'Gemaakt door',
  creditiInvito: 'Heb je een tip of een bug gevonden? Schrijf me gerust — alle feedback is welkom!',
  creditiGrazie: 'Bedankt dat je Viking-Island hebt gespeeld!',

  // Grappige "monetisatie"-pop-up (Nieuw spel)
  memeTitolo: 'Wacht even, Viking!',
  memeTesto:
    'Om uit te varen kun je een advertentie van 47 minuten bekijken of upgraden naar ' +
    'VIKING-ISLAND PRO™ voor slechts $999 per maand + btw (op rekening van je jarl).',
  memePubblicita: '▶ Doorgaan met advertenties',
  memePro: 'Word PRO — $999/maand + btw',
  memeAvanti: 'Grapje, ga verder →',

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
  connessioneInCorso: 'Verbinden…',
  esciAccount: 'Account wisselen',
  ciao: 'Hoi, {nome}!',

  serverVerifica: 'Server controleren…',
  serverOk: 'Spelserver bereikbaar',
  serverGiu:
    'Spelserver onbereikbaar: online staat hier uit. Je kunt nog steeds lokaal spelen vanuit het menu (bots en hot-seat) — of voer het adres van een andere server in.',

  // Online: lobby
  creaPartita: 'Spel maken',
  unisciti: 'Deelnemen',
  codiceInvito: 'Uitnodigingscode',
  lobbyTitolo: 'Lobby {code}',
  condividiCodice: 'Deel de code met de andere Vikingen',
  inAttesaHost: 'Wachten tot de host uitvaart…',
  avviaPartita: 'Uitvaren!',
  aggiungiBot: '+ Bot',
  esciLobby: 'Lobby verlaten',
  timerTurno: 'Beurttimer',
  timerSecondi: 'Beurttimer (seconden, 0 = geen)',
  timerLobby: 'Beurttimer: {s}',
  nessunTimer: 'Geen',
  secondiAbbr: '{n}s',
  hostTag: 'host',
  disconnessoTag: 'afwezig',
  attesaPartita: 'Wachten op het spel…',
  lobbyChiusa: 'Lobby gesloten: {motivo}',
  terminaPartita: 'Spel beëindigen',
  terminaTitolo: 'Spel beëindigen?',
  terminaTesto: 'Het spel wordt voor ALLE spelers gesloten en kan niet worden hervat.',
  terminaConferma: 'Ja, voor iedereen beëindigen',
  partitaPubblicaToggle: 'Openbaar spel (voor iedereen)',
  partitePubbliche: 'Openbare spellen',
  nessunaPubblica: 'Op dit moment geen openbare spellen. Maak er een!',
  entra: 'Meedoen',
  postiNsuM: '{n}/{m} Vikingen',
  visibilitaPubblica: 'Openbaar',
  visibilitaPrivata: 'Privé (op uitnodiging)',

  // Accountbeheer
  account: 'Account',
  ilTuoAccount: 'Jouw account',
  datiSalvati: 'Dit zijn de gegevens die we van je bewaren:',
  registratoIl: 'Geregistreerd op',
  idAccount: 'Account-ID',
  passwordImpostata: '••••••••',
  cambiaNome: 'Gebruikersnaam wijzigen',
  nuovoNome: 'Nieuwe gebruikersnaam',
  nomeAggiornato: 'Naam bijgewerkt! Hij geldt in het spel vanaf je volgende potjes.',
  passwordAttuale: 'Huidig wachtwoord',
  aggiungiEmail: 'E-mail toevoegen',
  emailEggTitolo: 'Wacht eens even…',
  emailEggTesto:
    '„Heeft een online spel echt je e-mail nodig?” Nee. En omdat we je gegevens niet ' +
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
  facile: 'Makkelijk',
  normale: 'Normaal',
  difficile: 'Moeilijk',
  esperto: 'Expert',
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
  via: 'Uitvaren!',
  indietro: 'Terug',
  serveUnUmano: 'Je hebt minstens één menselijke Viking nodig',

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
  fineTurno: 'Beurt beëindigen',
  annulla: 'Annuleren',
  conferma: 'Bevestigen',
  chiudi: 'Sluiten',
  gioca: 'Spelen',

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
  inAttesaRisposte: 'Wachten op antwoord…',
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
  scambiRiga: 'Ruilen: bank 4:1 · haven 3:1 · speciale haven 2:1',
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
  statTiriSub: '{tiri} worpen in {turni} beurten · verwacht vs werkelijk',
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
  statNessuno: '—',

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
    berserker: 'Berserker',
    sagaDegliEroi: 'Heldensaga',
    costruttoriDiSentieri: 'Padenbouwers',
    banchetto: 'Feestmaal',
    tributo: 'Tribuut',
  },
  descrizioneCarta: {
    berserker: 'Verplaats de Draak en steel 1 kaart. Telt mee voor de Razernij der Berserkers.',
    sagaDegliEroi: '1 geheim Roempunt (telt meteen mee).',
    costruttoriDiSentieri: 'Plaats meteen 2 gratis paden.',
    banchetto: 'Neem 2 grondstoffen naar keuze uit de bank.',
    tributo: 'Elke tegenstander geeft je AL zijn eenheden van één grondstof.',
  },

  /**
   * EASTER EGG: bots die mopperen als de Draak hen blokkeert — net als aan een
   * echte tafel, waar iemand het altijd persoonlijk opvat.
   */
  lamentiDrago: [
    'Oh kom op, altijd ik?!',
    'Blokkeer iemand anders, wil je?!',
    'Ik neem wraak. Op mijn Vikingerewoord.',
    'Odin, waarom uitgerekend ik?',
    'Het halve eiland is vrij en je zet hem HIER?!',
    'Die draak heeft het op mij gemunt, officieel.',
    'Ja, ja, ik schrijf het op. ALLES.',
    'Oh geweldig, ALWEER bij mij.',
    'En ik bood je nog wel een ruil aan…',
    'Ik bel de advocaat van de clan.',
    'Als MIJN Razernij komt, praten we verder.',
    'Mooie manier om vrienden te maken, knap hoor.',
    'Mijn gerst… MIJN GERST!',
    'Brave draak, terug naar de toendra, alsjeblieft.',
  ],

  // Gebeurtenissen in het scheepsjournaal
  log: {
    lamentoDrago: '{nome}: „{frase}”',
    ordineTiro: '{nome} gooit {d1}+{d2} = {tot}',
    ordineSpareggio: 'Beslissing: {righe}',
    ordineTitolo: 'Worp om de volgorde: {righe}',
    ordineFinale: 'Beurtvolgorde: {ordine}',
    turnoIniziato: '— Beurt {n}: {nome} is aan zet —',
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
    tributo: '{nome} int het tribuut: {n}× {risorsa}',
    scambioProposto: '{nome} stelt een ruil voor',
    rispostaScambio: '{nome} {risposta} de ruil',
    accettaVerbo: 'accepteert',
    rifiutaVerbo: 'weigert',
    scambioEseguitoBanca: '{nome} ruilt met de bank: {dai} → {ricevi}',
    scambioEseguito: 'Ruil gesloten tussen {a} en {b}',
    scambioAnnullato: 'Aanbod ingetrokken',
    grandeVia: 'De Grote Weg gaat naar {nome} ({n} paden)',
    grandeViaNessuno: 'De Grote Weg is van niemand meer',
    furia: 'De Razernij der Berserkers gaat naar {nome} ({n} berserkers)',
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
    haiTirato: 'Je gooide {d1} + {d2} = {tot}!',
    haiRicevuto: 'Je ontving:',
    niente: 'deze keer niets',
    giocaOffline: 'Speel met bots',
    vaiOnline: 'Probeer online',
    fineChiudi: 'Demo sluiten',
    senzaEmail: 'E-mail — niet nodig!',
    passi: {
      intro: {
        titolo: 'Welkom bij de demo!',
        testo:
          'Ik loop stap voor stap met je door een potje Viking-Island, en laat je daarna ' +
          'zien hoe je online speelt. Druk op „Verder” om door te gaan: je kunt altijd ' +
          '„Terug” of „Overslaan”.',
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
          'Elke clan plaatst om de beurt „in slangvorm”: eerst op volgorde, dan achteruit. ' +
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
          'volgende beurt, hoogstens één per beurt (de Heldensaga telt juist meteen mee, terwijl hij verborgen blijft).',
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
      onlineIntro: {
        titolo: 'Online spelen met vrienden',
        testo:
          'Via het menu „Online” speel je met echte mensen, elk op hun eigen apparaat. De ' +
          'scheidsrechter is de server: die controleert elke zet met dezelfde regels, dus valsspelen is onmogelijk.',
      },
      serverFreddo: {
        titolo: 'Heb geduld: de server ontwaakt',
        testo:
          'Belangrijk: de gratis server gaat „in slaap” als niemand speelt. De EERSTE verbinding ' +
          'kan 30 tot 60 seconden duren om hem te wekken — dat is normaal, even wachten. Een groen vinkje laat zien wanneer hij klaar is.',
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
          'Druk op „Spel maken” voor een code van 6 tekens om naar je vrienden te sturen, of ' +
          '„Deelnemen” en voer de ontvangen code in.',
      },
      lobby: {
        titolo: '3. De lobby',
        testo:
          'In de wachtruimte kun je je kleur wijzigen en kan de host bots toevoegen om de plaatsen ' +
          'te vullen. Als jullie met 2 tot 6 zijn, drukt de host op „Uitvaren!”.',
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
          'Dat was het! Je kunt elke regel nalezen in het „Boek der Sagen” via het menu. Nu is het ' +
          'jouw beurt: vaar uit!',
      },
    },
  },
  erroreMossa: 'Ongeldige zet: {motivo}',
};
