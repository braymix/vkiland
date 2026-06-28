import type { TutorialChapter } from './tutorial';

/** Serbian (SR) tutorial — same structure as the Italian one, translated text. */
export const tutorialSr: TutorialChapter[] = [
  {
    chip: 'Cilj',
    title: 'Dobro došao na Viking-Island!',
    blocks: [
      {
        t: 'p',
        text:
          'Dobro došao na Viking-Island, ostrvo severnih klanova! Gradi staze, ' +
          'sela i utvrđenja, trguj i brani se od Zmaja: pobeđuje onaj ko prvi ' +
          'dostigne 10 Poena slave (PS) u sopstvenom potezu.',
      },
      { t: 'h', text: 'Šta donosi Poene slave' },
      {
        t: 'list',
        items: [
          'Selo = 1 PS (najviše 5 sela)',
          'Utvrđenje = 2 PS (najviše 4, gradi se preko jednog tvog sela)',
          'Veliki put = 2 PS (najduži niz staza, bar 5)',
          'Bes Berserkera = 2 PS (više odigranih Berserkera od svih, bar 3)',
          'Saga o herojima = 1 tajni PS (skrivena karta, računa se odmah)',
        ],
      },
      {
        t: 'tip',
        text:
          'PS od heroja ostaju skriveni od protivnika: rezultat koji vidiš za ' +
          'druge možda nije cela priča!',
      },
    ],
  },
  {
    chip: 'Ostrvo',
    title: 'Ostrvo i njegovi resursi',
    blocks: [
      {
        t: 'p',
        text:
          'Ostrvo je sačinjeno od heksagona, svaki sa terenom koji proizvodi ' +
          'resurs i numeričkim žetonom (2–12).',
      },
      { t: 'resRow' },
      {
        t: 'list',
        items: [
          'Borova šuma → Drvo',
          'Kamenolom crvenog kamena → Kamen',
          'Pašnjak → Vuna',
          'Polja ječma → Ječam',
          'Rudnik gvožđa → Gvožđe',
          'Zaleđena tundra → ništa: to je Zmajeva jazbina',
        ],
      },
      { t: 'h', text: 'Numerički žetoni' },
      {
        t: 'p',
        text:
          'Tačkice ispod broja pokazuju koliko je verovatno da padne sa dve ' +
          'kockice: 6 i 8 (crveni) padaju vrlo često, 2 i 12 skoro nikad. Izbor ' +
          'dobrih brojeva vredi više od izbora dobrih terena.',
      },
      { t: 'h', text: 'Pristaništa' },
      {
        t: 'p',
        text:
          'Duž obale ima 9 pristaništa (drakkar-i): 4 generička (razmene 3:1) i 5 ' +
          'namenskih za jedan resurs (2:1). Da bi ih koristio treba ti selo ili ' +
          'utvrđenje na jednom od dva raskršća pristaništa — kada postavljaš, ta ' +
          'raskršća pokazuju LJUBIČASTU oznaku umesto bele.',
      },
    ],
  },
  {
    chip: 'Početak',
    title: 'Početak igre',
    blocks: [
      {
        t: 'p',
        text:
          'Kreće se „zmijoliko“: po redu svaki igrač postavlja 1 selo + 1 stazu, ' +
          'pa se za drugi krug vraća unazad obrnutim redosledom. Ko poslednji ' +
          'postavi prvo selo, prvi postavlja drugo.',
      },
      {
        t: 'list',
        items: [
          'Dodirni istaknuto raskršće da postaviš selo',
          'Zatim dodirni jednu od susednih ivica za stazu',
          'DRUGO selo odmah proizvodi resurse heksagona oko sebe',
        ],
      },
      { t: 'h', text: 'Pravilo razmaka' },
      {
        t: 'p',
        text:
          'Dve građevine nikada ne mogu stajati na susednim raskršćima: između ' +
          'tvog sela i bilo koje druge građevine mora uvek postojati bar jedno ' +
          'slobodno raskršće. Ovo važi kroz celu igru.',
      },
      {
        t: 'tip',
        text:
          'Za prvo selo traži jake brojeve (6, 8, 5, 9) i raznovrsne resurse; sa ' +
          'drugim upotpuni ono što ti nedostaje ili zauzmi pristanište.',
      },
    ],
  },
  {
    chip: 'Potez',
    title: 'Tvoj potez',
    blocks: [
      { t: 'h', text: '1. Baci kockice' },
      {
        t: 'p',
        text:
          'SVI heksagoni sa palim brojem proizvode: 1 resurs za svako susedno ' +
          'selo, 2 za svako utvrđenje. Proizvode i protivnici, ne samo onaj ko ' +
          'baca!',
      },
      { t: 'h', text: '2. Odigraj svoje poteze (bilo kojim redom)' },
      {
        t: 'list',
        items: [
          'Gradi staze, sela, utvrđenja',
          'Kupuj i igraj Karte saga (1 odigrana karta po potezu)',
          'Trguj sa bankom, pristaništima ili ostalim igračima',
        ],
      },
      { t: 'h', text: '3. Završi potez' },
      {
        t: 'p',
        text:
          'Pritisni „Završi potez“ i kockice prelaze na sledećeg igrača. Ako imaš ' +
          '10 PS, igra se odmah završava tvojom pobedom.',
      },
      {
        t: 'tip',
        text:
          'Ako banka nema dovoljno karata nekog resursa da zadovolji VIŠE igrača ' +
          'na istom bacanju, taj resurs se ne daje nikome (nestašica).',
      },
    ],
  },
  {
    chip: 'Zmaj',
    title: 'Sedmica i Zmaj',
    blocks: [
      {
        t: 'p',
        text: 'Kada padne 7, niko ne proizvodi i dešavaju se tri stvari, po redu:',
      },
      {
        t: 'list',
        items: [
          '1. Ko ima VIŠE od 7 karata resursa odbacuje polovinu (zaokruženo naniže)',
          '2. Onaj ko je bacio pomera Zmaja na drugi heksagon po izboru',
          '3. Krade 1 nasumičnu kartu od igrača koji ima građevinu na tom heksagonu',
        ],
      },
      {
        t: 'p',
        text:
          'Heksagon sa Zmajem NE proizvodi dok Zmaj ostaje tu: postavi ga na ' +
          'najbolje brojeve svojih protivnika!',
      },
      {
        t: 'tip',
        text:
          'Karta Berserker pomera Zmaja na isti način (i računa se za Bes ' +
          'Berserkera). Možeš je odigrati čak i PRE bacanja kockica.',
      },
    ],
  },
  {
    chip: 'Gradi',
    title: 'Građevine i troškovi',
    blocks: [
      { t: 'cost', kind: 'sentiero', note: 'povezuje tvoje građevine · maks 15' },
      { t: 'cost', kind: 'villaggio', note: '1 PS, proizvodi 1 resurs · maks 5' },
      { t: 'cost', kind: 'roccaforte', note: '2 PS, proizvodi 2 resursa · maks 4' },
      { t: 'cost', kind: 'cartaSaga', note: 'iznenađenje iz špila (25 karata)' },
      { t: 'h', text: 'Pravila postavljanja' },
      {
        t: 'list',
        items: [
          'Staze moraju da dodiruju tvoju mrežu (jednu tvoju stazu ili građevinu)',
          'Raskršće koje drži PROTIVNIK prekida tvoju mrežu',
          'Sela idu na raskršće povezano sa tvojim stazama + pravilo razmaka',
          'Utvrđenje zamenjuje JEDNO tvoje selo (selo ponovo postaje dostupno)',
        ],
      },
      {
        t: 'p',
        text:
          'U igri: pritisni „Staza“, „Selo“ ili „Utvrđenje“ u donjoj traci i ' +
          'dodirni jednu od istaknutih meta na tabli. Dugme „?“ na vrhu otvara ' +
          'karticu pravila sa ovim pregledom.',
      },
    ],
  },
  {
    chip: 'Razmene',
    title: 'Trgovanje',
    blocks: [
      { t: 'h', text: 'Sa bankom i pristaništima' },
      {
        t: 'list',
        items: [
          'Banka: 4 ista resursa → 1 po izboru (uvek dostupno)',
          'Generičko pristanište (3:1): 3 ista → 1 po izboru',
          'Namensko pristanište (2:1): 2 TOG resursa → 1 po izboru',
        ],
      },
      {
        t: 'p',
        text: 'Najbolji odnos se automatski primenjuje u dijalogu „Banka / Pristaništa“.',
      },
      { t: 'h', text: 'Sa ostalim igračima (u tvom potezu)' },
      {
        t: 'list',
        items: [
          'Ponudi razmenu JEDNOM igraču: ako prihvati, odmah se izvršava',
          'Ili je ponudi SVIMA: svako odgovori, pa zaključuješ sa kim god želiš',
          'Uvek možeš povući ponudu; razmenjuje se samo resurs za resurs',
        ],
      },
    ],
  },
  {
    chip: 'Karte saga',
    title: 'Karte saga',
    blocks: [
      {
        t: 'p',
        text:
          'Špil ima 25 karata. Karte koje kupiš mogu se igrati OD SLEDEĆEG POTEZA ' +
          '(heroji se umesto toga računaju odmah, dok su skriveni). Možeš odigrati ' +
          'najviše jednu kartu po potezu.',
      },
      { t: 'sagaList' },
      {
        t: 'tip',
        text:
          'Danak je razoran u sredini igre: izaberi resurs koji su svi upravo ' +
          'proizveli. Gozba je savršena da na licu mesta dovršiš utvrđenje.',
      },
    ],
  },
  {
    chip: 'Bonus',
    title: 'Veliki put i Bes',
    blocks: [
      { t: 'h', text: 'Veliki put (2 PS)' },
      {
        t: 'p',
        text:
          'Pripada onome ko ima najduži niz UZASTOPNIH staza, bar 5. Protivnička ' +
          'građevina postavljena na raskršće niza deli ga na dva dela! Kod ' +
          'nerešenog ishoda bonus ostaje onome ko ga je držao.',
      },
      { t: 'h', text: 'Bes Berserkera (2 PS)' },
      {
        t: 'p',
        text:
          'Pripada onome ko je ODIGRAO najviše karata Berserker, bar 3. Kao i kod ' +
          'Puta, moraš strogo nadmašiti vlasnika da bi mu uzeo bonus.',
      },
      {
        t: 'tip',
        text:
          'Ovih 4 PS često odlučuju igru: broji staze i Berserkere protivnika ' +
          'u gornjoj traci (PUT i BES pokazuju vlasnike).',
      },
    ],
  },
  {
    chip: 'Aplikacija',
    title: 'Korišćenje aplikacije',
    blocks: [
      { t: 'h', text: 'Tabla' },
      {
        t: 'list',
        items: [
          'Dodirni istaknutu metu da postaviš (belo = potez, ljubičasto = raskršće sa pristaništem)',
          'Zum: raširi dva prsta (telefon) ili koristi točkić (PC), prevuci za pomeranje, „1×“ za resetovanje',
          '🗺 otvara mapu preko celog ekrana (zatvara se sa ✕ ili ESC)',
          '„?“ otvara karticu pravila sa troškovima, poenima i brzim pravilima',
        ],
      },
      { t: 'h', text: 'Paneli' },
      {
        t: 'list',
        items: [
          'Vrh: kockice, faza poteza i igrači (PS ★, karte resursa, Karte saga)',
          'Dno: tvoja ruka, dugme „Karte“ i kapetanov dnevnik sa hronikom',
          'Traka akcija prikazuje samo ono što možeš da uradiš u tom trenutku',
        ],
      },
      { t: 'h', text: 'Više igrača na istom uređaju (hot-seat)' },
      {
        t: 'p',
        text:
          'U „Nova igra“ postavi više redova na „Čovek“. Između jednog ljudskog ' +
          'poteza i sledećeg pojavljuje se „Predaj uređaj“: ruka sledećeg igrača ' +
          'otkriva se tek nakon potvrde, da niko ne viri. I odbacivanja na sedmicu ' +
          'dešavaju se jedno po jedno.',
      },
      {
        t: 'tip',
        text:
          'U podešavanjima možeš fiksirati „seme mape“: isto seme uvek generiše ' +
          'isto ostrvo (zgodno za ponovne partije ili poštene izazove).',
      },
    ],
  },
  {
    chip: 'Onlajn',
    title: 'Igranje onlajn',
    blocks: [
      { t: 'h', text: '1. Napravi nalog' },
      {
        t: 'p',
        text:
          'Iz menija pritisni „Onlajn“ i registruj se: dovoljno je korisničko ime ' +
          '(biće ujedno i tvoje ime u igri) i lozinka od bar 8 znakova. Bez imejla: ' +
          'nije potreban. Zelena kvačica ti govori da li je server dostupan.',
      },
      { t: 'h', text: '2. Napravi igru ili se pridruži' },
      {
        t: 'list',
        items: [
          'NAPRAVI IGRU → dobijaš KOD od 6 slova/cifara: pošalji ga prijateljima',
          'PRIDRUŽI SE → unesi primljeni kod i u čekaonici si',
          'Domaćin može da doda botove i zatim pritisne „Isplovi!“ (od 2 do 6 igrača)',
        ],
      },
      { t: 'h', text: '3. Igraj!' },
      {
        t: 'p',
        text:
          'Svako igra sa sopstvenog uređaja i vidi SAMO svoju ruku: sudija je ' +
          'server, koji potvrđuje svaki potez istim pravilima kao lokalna igra ' +
          '(varanje je nemoguće). Potezi ostalih stižu u realnom vremenu u ' +
          'kapetanov dnevnik.',
      },
      { t: 'h', text: 'Tajmer i prekidi veze' },
      {
        t: 'list',
        items: [
          'Tajmer poteza (opciono, biran pri kreiranju): kada istekne, igra sama odigra najbezopasniji potez, da niko ne koči igru',
          'Ako ti padne veza ili zatvoriš stranicu, vrati se: sesija se sama ponovo povezuje, ili ponovo uđi sa kodom čekaonice — tvoje mesto ostaje tvoje',
        ],
      },
      {
        t: 'tip',
        text:
          'Bez podešenog servera, onlajn je jednostavno isključen: ostatak igre ' +
          '(botovi i hot-seat) ipak radi, čak i oflajn.',
      },
    ],
  },
];
