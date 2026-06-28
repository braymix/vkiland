import type { TutorialChapter } from './tutorial';

/** Nederlands (NL) tutorial — zelfde structuur als de Italiaanse, vertaalde tekst. */
export const tutorialNl: TutorialChapter[] = [
  {
    chip: 'Doel',
    title: 'Welkom bij Viking-Island!',
    blocks: [
      {
        t: 'p',
        text:
          'Welkom bij Viking-Island, het eiland van de noordelijke clans! Bouw paden, ' +
          'dorpen en burchten, ruil en verdedig je tegen de Draak: wie als eerste op de ' +
          'eigen beurt 10 Roempunten (RP) haalt, wint.',
      },
      { t: 'h', text: 'Wat levert Roempunten op' },
      {
        t: 'list',
        items: [
          'Dorp = 1 RP (max. 5 dorpen)',
          'Burcht = 2 RP (max. 4, gebouwd op een van je dorpen)',
          'De Grote Weg = 2 RP (de langste keten van paden, minstens 5)',
          'Razernij der Berserkers = 2 RP (meer Berserkers gespeeld dan wie dan ook, minstens 3)',
          'Heldensaga = 1 geheim RP (verborgen kaart, telt meteen mee)',
        ],
      },
      {
        t: 'tip',
        text:
          'Helden-RP blijven verborgen voor tegenstanders: de score die je van anderen ' +
          'ziet, is misschien niet het hele verhaal!',
      },
    ],
  },
  {
    chip: 'Eiland',
    title: 'Het eiland en zijn grondstoffen',
    blocks: [
      {
        t: 'p',
        text:
          'Het eiland bestaat uit zeshoeken, elk met een terrein dat een grondstof ' +
          'produceert en een getalfiche (2–12).',
      },
      { t: 'resRow' },
      {
        t: 'list',
        items: [
          'Dennenbos → Hout',
          'Roodsteengroeve → Steen',
          'Weide → Wol',
          'Gerstvelden → Gerst',
          'IJzermijn → IJzer',
          'Bevroren toendra → niets: het hol van de Draak',
        ],
      },
      { t: 'h', text: 'De getalfiches' },
      {
        t: 'p',
        text:
          'De stippen onder het getal tonen hoe waarschijnlijk het is met twee ' +
          'dobbelstenen: 6 en 8 (in het rood) komen heel vaak, 2 en 12 bijna nooit. Goede ' +
          'getallen kiezen telt zwaarder dan goede terreinen kiezen.',
      },
      { t: 'h', text: 'De havens' },
      {
        t: 'p',
        text:
          'Langs de kust liggen 9 havens (de drakkars): 4 algemene (3:1-ruil) en 5 ' +
          'toegewijd aan één grondstof (2:1). Om ze te gebruiken heb je een dorp of een ' +
          'burcht nodig op een van de twee kruispunten van de haven — bij het plaatsen ' +
          'tonen die kruispunten een PAARS vizier in plaats van wit.',
      },
    ],
  },
  {
    chip: 'Start',
    title: 'Het begin van het spel',
    blocks: [
      {
        t: 'p',
        text:
          'Je begint „in slangvorm”: op volgorde plaatst elke speler 1 dorp + 1 pad, ' +
          'daarna gaat het in omgekeerde volgorde terug voor de tweede ronde. Wie het ' +
          'eerste dorp als laatste plaatst, plaatst het tweede als eerste.',
      },
      {
        t: 'list',
        items: [
          'Tik op een gemarkeerd kruispunt om het dorp te plaatsen',
          'Tik daarna op een van de aangrenzende zijden voor het pad',
          'Het TWEEDE dorp produceert meteen de grondstoffen van de zeshoeken eromheen',
        ],
      },
      { t: 'h', text: 'De afstandsregel' },
      {
        t: 'p',
        text:
          'Twee bouwwerken mogen nooit op aangrenzende kruispunten staan: tussen je dorp ' +
          'en elk ander bouwwerk moet er altijd minstens één vrij kruispunt zijn. Dit geldt ' +
          'het hele spel.',
      },
      {
        t: 'tip',
        text:
          'Zoek voor het eerste dorp sterke getallen (6, 8, 5, 9) en gevarieerde ' +
          'grondstoffen; vul met het tweede aan wat je mist of pak een haven.',
      },
    ],
  },
  {
    chip: 'Beurt',
    title: 'Jouw beurt',
    blocks: [
      { t: 'h', text: '1. Gooi de dobbelstenen' },
      {
        t: 'p',
        text:
          'ALLE zeshoeken met het gegooide getal produceren: 1 grondstof per aangrenzend ' +
          'dorp, 2 per burcht. Ook tegenstanders produceren, niet alleen wie gooit!',
      },
      { t: 'h', text: '2. Doe je zetten (in willekeurige volgorde)' },
      {
        t: 'list',
        items: [
          'Bouw paden, dorpen, burchten',
          'Koop en speel Sagakaarten (1 kaart per beurt gespeeld)',
          'Ruil met de bank, de havens of de andere spelers',
        ],
      },
      { t: 'h', text: '3. Beurt beëindigen' },
      {
        t: 'p',
        text:
          'Druk op „Beurt beëindigen” en de dobbelstenen gaan naar de volgende speler. ' +
          'Heb je 10 RP, dan eindigt het spel meteen met jouw overwinning.',
      },
      {
        t: 'tip',
        text:
          'Als de bank niet genoeg kaarten van een grondstof heeft om bij dezelfde worp ' +
          'MEERDERE spelers te bedienen, krijgt niemand die grondstof (tekort).',
      },
    ],
  },
  {
    chip: 'Draak',
    title: 'De 7 en de Draak',
    blocks: [
      {
        t: 'p',
        text: 'Als er een 7 valt, produceert niemand en gebeuren er drie dingen, op volgorde:',
      },
      {
        t: 'list',
        items: [
          '1. Wie MEER dan 7 grondstofkaarten heeft, legt de helft af (naar beneden afgerond)',
          '2. Wie gooide verplaatst de Draak naar een andere zeshoek naar keuze',
          '3. Hij steelt 1 willekeurige kaart van een speler met een bouwwerk op die zeshoek',
        ],
      },
      {
        t: 'p',
        text:
          'De zeshoek met de Draak produceert NIET zolang de Draak daar blijft: zet hem op ' +
          'de beste getallen van je tegenstanders!',
      },
      {
        t: 'tip',
        text:
          'De Berserkerkaart verplaatst de Draak op dezelfde manier (en telt mee voor de ' +
          'Razernij der Berserkers). Je mag hem zelfs VÓÓR het gooien spelen.',
      },
    ],
  },
  {
    chip: 'Bouwen',
    title: 'Bouwwerken en kosten',
    blocks: [
      { t: 'cost', kind: 'sentiero', note: 'verbindt je bouwwerken · max. 15' },
      { t: 'cost', kind: 'villaggio', note: '1 RP, produceert 1 grondstof · max. 5' },
      { t: 'cost', kind: 'roccaforte', note: '2 RP, produceert 2 grondstoffen · max. 4' },
      { t: 'cost', kind: 'cartaSaga', note: 'een verrassingskaart uit de stapel (25 kaarten)' },
      { t: 'h', text: 'De plaatsingsregels' },
      {
        t: 'list',
        items: [
          'Paden moeten je netwerk raken (een van je paden of bouwwerken)',
          'Een kruispunt in handen van een TEGENSTANDER onderbreekt je netwerk',
          'Dorpen komen op een kruispunt dat met je paden is verbonden + de afstandsregel',
          'De burcht vervangt EEN van je dorpen (het dorp komt weer beschikbaar)',
        ],
      },
      {
        t: 'p',
        text:
          'In het spel: druk op „Pad”, „Dorp” of „Burcht” in de onderbalk en tik op een van ' +
          'de gemarkeerde doelen op het bord. De knop „?” bovenaan opent de spelkaart met dit overzicht.',
      },
    ],
  },
  {
    chip: 'Ruilen',
    title: 'Ruilen',
    blocks: [
      { t: 'h', text: 'Met de bank en de havens' },
      {
        t: 'list',
        items: [
          'Bank: 4 gelijke grondstoffen → 1 naar keuze (altijd beschikbaar)',
          'Algemene haven (3:1): 3 gelijke → 1 naar keuze',
          'Speciale haven (2:1): 2 van DIE grondstof → 1 naar keuze',
        ],
      },
      {
        t: 'p',
        text: 'De beste verhouding wordt automatisch toegepast in het venster „Bank / Havens”.',
      },
      { t: 'h', text: 'Met de andere spelers (op je beurt)' },
      {
        t: 'list',
        items: [
          'Bied een ruil aan EEN speler aan: accepteert hij, dan gebeurt het meteen',
          'Of bied hem AAN IEDEREEN aan: ieder antwoordt, daarna sluit je met wie je wilt',
          'Je kunt het aanbod altijd intrekken; je kunt alleen grondstof voor grondstof ruilen',
        ],
      },
    ],
  },
  {
    chip: 'Sagakaarten',
    title: 'De Sagakaarten',
    blocks: [
      {
        t: 'p',
        text:
          'De stapel heeft 25 kaarten. Gekochte kaarten kun je VANAF DE VOLGENDE BEURT ' +
          'spelen (Helden tellen juist meteen mee, terwijl ze verborgen zijn). Je mag ' +
          'hoogstens één kaart per beurt spelen.',
      },
      { t: 'sagaList' },
      {
        t: 'tip',
        text:
          'Het Tribuut is halverwege het spel verwoestend: kies de grondstof die iedereen ' +
          'net heeft geproduceerd. Het Feestmaal is perfect om ter plekke een burcht af te maken.',
      },
    ],
  },
  {
    chip: 'Bonus',
    title: 'De Grote Weg en de Razernij',
    blocks: [
      { t: 'h', text: 'De Grote Weg (2 RP)' },
      {
        t: 'p',
        text:
          'Gaat naar wie de langste keten van AANEENGESLOTEN paden heeft, minstens 5. Een ' +
          'bouwwerk van een tegenstander op een kruispunt van de keten splitst hem in tweeën! ' +
          'Bij gelijkspel blijft de bonus bij wie hem had.',
      },
      { t: 'h', text: 'De Razernij der Berserkers (2 RP)' },
      {
        t: 'p',
        text:
          'Gaat naar wie de meeste Berserkerkaarten heeft GESPEELD, minstens 3. Net als bij ' +
          'de Weg moet je de houder strikt overtreffen om de bonus te pakken.',
      },
      {
        t: 'tip',
        text:
          'Deze 4 RP beslissen vaak het spel: tel de paden en Berserkers van tegenstanders ' +
          'in de bovenste strip (WEG en RAZERNIJ tonen de houders).',
      },
    ],
  },
  {
    chip: 'App',
    title: 'De app gebruiken',
    blocks: [
      { t: 'h', text: 'Het bord' },
      {
        t: 'list',
        items: [
          'Tik op een gemarkeerd doel om te plaatsen (wit = zet, paars = havenkruispunt)',
          'Zoom: knijp met twee vingers (telefoon) of gebruik het wiel (pc), sleep om te schuiven, „1×” om te resetten',
          '🗺 opent de schermvullende kaart (sluit met ✕ of ESC)',
          '„?” opent de spelkaart met kosten, punten en snelle regels',
        ],
      },
      { t: 'h', text: 'De panelen' },
      {
        t: 'list',
        items: [
          'Boven: dobbelstenen, beurtfase en spelers (RP ★, grondstofkaarten, Sagakaarten)',
          'Onder: je hand, de knop „Kaarten” en het scheepsjournaal met de kroniek',
          'De actiebalk toont alleen wat je op dat moment kunt doen',
        ],
      },
      { t: 'h', text: 'Meerdere spelers op hetzelfde apparaat (hot-seat)' },
      {
        t: 'p',
        text:
          'Zet bij „Nieuw spel” meerdere rijen op „Mens”. Tussen de ene menselijke beurt en ' +
          'de volgende verschijnt „Geef het apparaat door”: de hand van de volgende speler ' +
          'wordt pas na bevestiging onthuld, zodat niemand spiekt. Ook de aflegbeurten bij de 7 ' +
          'gebeuren één voor één.',
      },
      {
        t: 'tip',
        text:
          'Bij de setup kun je het „kaartzaad” vastzetten: hetzelfde zaad genereert altijd ' +
          'hetzelfde eiland (handig om opnieuw te spelen of eerlijk te strijden).',
      },
    ],
  },
  {
    chip: 'Online',
    title: 'Online spelen',
    blocks: [
      { t: 'h', text: '1. Maak een account' },
      {
        t: 'p',
        text:
          'Druk in het menu op „Online” en registreer je: je hebt alleen een gebruikersnaam ' +
          'nodig (ook je naam in het spel) en een wachtwoord van minstens 8 tekens. Geen ' +
          'e-mail: niet nodig. Een groen vinkje laat zien of de server bereikbaar is.',
      },
      { t: 'h', text: '2. Maak het spel of doe mee' },
      {
        t: 'list',
        items: [
          'SPEL MAKEN → je krijgt een CODE van 6 letters/cijfers: stuur hem naar je vrienden',
          'DEELNEMEN → voer de ontvangen code in en je zit in de lobby',
          'De host kan bots toevoegen en daarna op „Uitvaren!” drukken (2 tot 6 spelers)',
        ],
      },
      { t: 'h', text: '3. Spelen!' },
      {
        t: 'p',
        text:
          'Iedereen speelt vanaf het eigen apparaat en ziet ALLEEN de eigen hand: de ' +
          'scheidsrechter is de server, die elke zet controleert met dezelfde regels als het ' +
          'lokale spel (valsspelen onmogelijk). De zetten van anderen komen in realtime binnen ' +
          'in het scheepsjournaal.',
      },
      { t: 'h', text: 'Timer en verbroken verbindingen' },
      {
        t: 'list',
        items: [
          'Beurttimer (optioneel, gekozen bij het maken): als hij afloopt, doet het spel zelf de meest onschuldige zet, zodat niemand het spel ophoudt',
          'Val je weg of sluit je de pagina, kom dan terug: de sessie verbindt vanzelf opnieuw, of kom terug met de lobbycode — je plaats blijft van jou',
        ],
      },
      {
        t: 'tip',
        text:
          'Zonder een ingestelde server staat online gewoon uit: de rest van het spel ' +
          '(bots en hot-seat) werkt nog steeds, ook offline.',
      },
    ],
  },
];
