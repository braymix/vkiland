/**
 * Contenuto del tutorial («Libro delle Saghe»): tutte le regole di Vikiland
 * e l'uso dell'app, in capitoli. Testo separato dalla presentazione per la
 * futura i18n; i blocchi tipizzati vengono resi da TutorialScreen.
 */
import type { Buildable } from '@vikiland/engine';

export type TutorialBlock =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'tip'; text: string }
  | { t: 'cost'; kind: Buildable; note: string }
  | { t: 'resRow' }
  | { t: 'sagaList' };

export interface TutorialChapter {
  chip: string;
  title: string;
  blocks: TutorialBlock[];
}

export const TUTORIAL: TutorialChapter[] = [
  {
    chip: 'Obiettivo',
    title: 'Benvenuto a Viking-Island!',
    blocks: [
      {
        t: 'p',
        text:
          'Benvenuto a Viking-Island, l’isola dei clan del nord! Costruisci ' +
          'sentieri, villaggi e roccaforti, commercia e difenditi dal Drago: vince ' +
          'chi per primo raggiunge 10 Punti Gloria (PG) nel proprio turno.',
      },
      { t: 'h', text: 'Cosa dà Punti Gloria' },
      {
        t: 'list',
        items: [
          'Villaggio = 1 PG (massimo 5 villaggi)',
          'Roccaforte = 2 PG (massimo 4, si costruisce sopra un tuo villaggio)',
          'La Grande Via = 2 PG (la catena di sentieri più lunga, almeno 5)',
          'Furia dei Berserker = 2 PG (più Berserker giocati di tutti, almeno 3)',
          'Saga degli Eroi = 1 PG segreto (carta nascosta, conta da subito)',
        ],
      },
      {
        t: 'tip',
        text:
          'I PG degli Eroi restano nascosti agli avversari: il punteggio che vedi ' +
          'degli altri potrebbe non essere tutto!',
      },
    ],
  },
  {
    chip: 'Isola',
    title: 'L’isola e le risorse',
    blocks: [
      {
        t: 'p',
        text:
          'L’isola è fatta di esagoni, ognuno con un terreno che produce una risorsa ' +
          'e un segnalino numerico (2–12).',
      },
      { t: 'resRow' },
      {
        t: 'list',
        items: [
          'Foresta di pini → Legname',
          'Cava di granito → Pietra',
          'Pascolo → Lana',
          'Campi d’orzo → Orzo',
          'Miniera di ferro → Ferro',
          'Tundra ghiacciata → niente: è la tana del Drago',
        ],
      },
      { t: 'h', text: 'I segnalini numerici' },
      {
        t: 'p',
        text:
          'I puntini sotto il numero indicano quanto è probabile che esca con due ' +
          'dadi: 6 e 8 (in rosso) escono spessissimo, 2 e 12 quasi mai. Sceglere ' +
          'bene i numeri vale più di scegliere bene i terreni.',
      },
      { t: 'h', text: 'Gli approdi' },
      {
        t: 'p',
        text:
          'Sulla costa ci sono 9 approdi (i drakkar): 4 generici (scambi 3:1) e 5 ' +
          'dedicati a una risorsa (2:1). Per usarli devi avere un villaggio o una ' +
          'roccaforte su uno dei due incroci dell’approdo — quando piazzi, quegli ' +
          'incroci hanno il mirino VIOLA invece che bianco.',
      },
    ],
  },
  {
    chip: 'Inizio',
    title: 'L’inizio della partita',
    blocks: [
      {
        t: 'p',
        text:
          'Si parte “a serpentina”: in ordine ogni giocatore piazza 1 villaggio + 1 ' +
          'sentiero, poi si torna indietro nell’ordine inverso per il secondo giro. ' +
          'Chi piazza per ultimo il primo villaggio piazza per primo il secondo.',
      },
      {
        t: 'list',
        items: [
          'Tocca un incrocio evidenziato per piazzare il villaggio',
          'Poi tocca uno dei lati adiacenti per il sentiero',
          'Il SECONDO villaggio produce subito le risorse degli esagoni intorno',
        ],
      },
      { t: 'h', text: 'La regola della distanza' },
      {
        t: 'p',
        text:
          'Due edifici non possono mai stare su incroci confinanti: tra il tuo ' +
          'villaggio e qualsiasi altro edificio deve sempre esserci almeno un ' +
          'incrocio libero. Vale per tutta la partita.',
      },
      {
        t: 'tip',
        text:
          'Per il primo villaggio cerca numeri forti (6, 8, 5, 9) e risorse varie; ' +
          'col secondo completa quello che ti manca o prendi un approdo.',
      },
    ],
  },
  {
    chip: 'Turno',
    title: 'Il tuo turno',
    blocks: [
      { t: 'h', text: '1. Tira i dadi' },
      {
        t: 'p',
        text:
          'TUTTI gli esagoni col numero uscito producono: 1 risorsa per ogni ' +
          'villaggio adiacente, 2 per ogni roccaforte. Producono anche gli ' +
          'avversari, non solo chi tira!',
      },
      { t: 'h', text: '2. Fai le tue mosse (in qualsiasi ordine)' },
      {
        t: 'list',
        items: [
          'Costruisci sentieri, villaggi, roccaforti',
          'Compra e gioca Carte Saga (1 carta giocata a turno)',
          'Scambia con la banca, con gli approdi o con gli altri giocatori',
        ],
      },
      { t: 'h', text: '3. Fine turno' },
      {
        t: 'p',
        text:
          'Premi «Fine turno» e il dado passa al prossimo. Se hai 10 PG la ' +
          'partita finisce subito con la tua vittoria.',
      },
      {
        t: 'tip',
        text:
          'Se la banca non ha abbastanza carte di una risorsa per accontentare PIÙ ' +
          'giocatori nello stesso tiro, quella risorsa non viene distribuita a nessuno (penuria).',
      },
    ],
  },
  {
    chip: 'Drago',
    title: 'Il 7 e il Drago',
    blocks: [
      {
        t: 'p',
        text: 'Quando esce 7 nessuno produce e succedono tre cose, nell’ordine:',
      },
      {
        t: 'list',
        items: [
          '1. Chi ha PIÙ di 7 carte risorsa ne scarta la metà (arrotondata per difetto)',
          '2. Chi ha tirato sposta il Drago su un altro esagono a scelta',
          '3. Ruba 1 carta a caso a un giocatore con un edificio su quell’esagono',
        ],
      },
      {
        t: 'p',
        text:
          'L’esagono col Drago NON produce finché il Drago resta lì: piazzalo sui ' +
          'numeri migliori degli avversari!',
      },
      {
        t: 'tip',
        text:
          'La carta Berserker sposta il Drago allo stesso modo (e conta per la ' +
          'Furia dei Berserker). Puoi giocarla anche PRIMA di tirare i dadi.',
      },
    ],
  },
  {
    chip: 'Costruire',
    title: 'Costruzioni e costi',
    blocks: [
      { t: 'cost', kind: 'sentiero', note: 'collega i tuoi edifici · max 15' },
      { t: 'cost', kind: 'villaggio', note: '1 PG, produce 1 risorsa · max 5' },
      { t: 'cost', kind: 'roccaforte', note: '2 PG, produce 2 risorse · max 4' },
      { t: 'cost', kind: 'cartaSaga', note: 'carta a sorpresa dal mazzo (25 carte)' },
      { t: 'h', text: 'Le regole di piazzamento' },
      {
        t: 'list',
        items: [
          'I sentieri devono toccare la tua rete (un tuo sentiero o edificio)',
          'Un incrocio occupato da un AVVERSARIO interrompe la tua rete',
          'I villaggi vanno su un incrocio collegato ai tuoi sentieri + regola della distanza',
          'La roccaforte sostituisce un TUO villaggio (il villaggio torna disponibile)',
        ],
      },
      {
        t: 'p',
        text:
          'In partita: premi «Sentiero», «Villaggio» o «Roccaforte» nella barra in ' +
          'basso e tocca uno dei bersagli evidenziati sulla tavola. Il bottone «?» ' +
          'in alto apre il bugiardino con questo riepilogo.',
      },
    ],
  },
  {
    chip: 'Scambi',
    title: 'Gli scambi',
    blocks: [
      { t: 'h', text: 'Con la banca e gli approdi' },
      {
        t: 'list',
        items: [
          'Banca: 4 risorse uguali → 1 a scelta (sempre disponibile)',
          'Approdo generico (3:1): 3 uguali → 1 a scelta',
          'Approdo dedicato (2:1): 2 di QUELLA risorsa → 1 a scelta',
        ],
      },
      {
        t: 'p',
        text:
          'Il rapporto migliore viene applicato da solo nel dialogo «Banca / Approdi».',
      },
      { t: 'h', text: 'Con gli altri giocatori (nel tuo turno)' },
      {
        t: 'list',
        items: [
          'Proponi uno scambio a UN giocatore: se accetta, si esegue subito',
          'Oppure proponilo A TUTTI: ognuno risponde, poi tu concludi con chi vuoi',
          'Puoi sempre ritirare l’offerta; si può scambiare solo risorsa contro risorsa',
        ],
      },
    ],
  },
  {
    chip: 'Carte Saga',
    title: 'Le Carte Saga',
    blocks: [
      {
        t: 'p',
        text:
          'Il mazzo ha 25 carte. Quelle comprate si giocano DAL TURNO DOPO (gli ' +
          'Eroi invece contano subito, da nascosti). Puoi giocare al massimo una ' +
          'carta per turno.',
      },
      { t: 'sagaList' },
      {
        t: 'tip',
        text:
          'Il Tributo è devastante a metà partita: scegli la risorsa che tutti ' +
          'hanno appena prodotto. Il Banchetto è perfetto per completare al volo ' +
          'una roccaforte.',
      },
    ],
  },
  {
    chip: 'Bonus',
    title: 'La Grande Via e la Furia',
    blocks: [
      { t: 'h', text: 'La Grande Via (2 PG)' },
      {
        t: 'p',
        text:
          'Va a chi ha la catena di sentieri CONSECUTIVI più lunga, almeno 5. Un ' +
          'edificio avversario costruito su un incrocio della catena la spezza in ' +
          'due! In caso di parità il bonus resta a chi lo deteneva.',
      },
      { t: 'h', text: 'La Furia dei Berserker (2 PG)' },
      {
        t: 'p',
        text:
          'Va a chi ha GIOCATO più carte Berserker, almeno 3. Come per la Via, ' +
          'serve superare strettamente il detentore per strappargli il bonus.',
      },
      {
        t: 'tip',
        text:
          'Questi 4 PG spesso decidono la partita: conta i sentieri e i Berserker ' +
          'degli avversari nella strip in alto (VIA e FURIA indicano i detentori).',
      },
    ],
  },
  {
    chip: 'App',
    title: 'Usare l’app',
    blocks: [
      { t: 'h', text: 'La tavola' },
      {
        t: 'list',
        items: [
          'Tocca un bersaglio evidenziato per piazzare (bianco = mossa, viola = incrocio con approdo)',
          'Zoom: allarga due dita (cell) o usa la rotella (PC), trascina per spostarti, «1×» per tornare indietro',
          '🗺 apre la mappa a schermo intero (si chiude con ✕ o ESC)',
          '«?» apre il bugiardino con costi, punti e regole rapide',
        ],
      },
      { t: 'h', text: 'I pannelli' },
      {
        t: 'list',
        items: [
          'In alto: dadi, fase del turno e giocatori (PG ★, carte risorsa, Carte Saga)',
          'In basso: la tua mano, il bottone «Carte» e il diario di bordo con la cronaca',
          'La barra delle azioni mostra solo ciò che puoi fare in quel momento',
        ],
      },
      { t: 'h', text: 'In più giocatori sullo stesso dispositivo (hot-seat)' },
      {
        t: 'p',
        text:
          'In «Nuova partita» metti più righe su «Umano». Tra un turno umano e ' +
          'l’altro appare «Passa il dispositivo»: la mano del prossimo si rivela ' +
          'solo dopo la conferma, così nessuno sbircia. Anche gli scarti del 7 ' +
          'avvengono uno alla volta.',
      },
      {
        t: 'tip',
        text:
          'Nel setup puoi fissare il «seme mappa»: lo stesso seme genera sempre la ' +
          'stessa isola (utile per rigiocare o sfidarsi ad armi pari).',
      },
    ],
  },
  {
    chip: 'Online',
    title: 'Giocare online',
    blocks: [
      { t: 'h', text: '1. Crea un account' },
      {
        t: 'p',
        text:
          'Dal menu premi «Online» e registrati: email, password (almeno 8 ' +
          'caratteri) e il nome che vedranno gli altri. L’«indirizzo del server» è ' +
          'già precompilato: cambialo solo se usi un server tuo. Una spunta verde ' +
          'ti dice se il server è raggiungibile.',
      },
      { t: 'h', text: '2. Crea la partita o unisciti' },
      {
        t: 'list',
        items: [
          'CREA PARTITA → ottieni un CODICE di 6 lettere/cifre: mandalo agli amici',
          'UNISCITI → inserisci il codice ricevuto e sei nella lobby',
          'L’host può aggiungere bot e poi premere «Salpa!» (da 2 a 4 giocatori)',
        ],
      },
      { t: 'h', text: '3. Si gioca!' },
      {
        t: 'p',
        text:
          'Ognuno gioca dal proprio dispositivo e vede SOLO la propria mano: ' +
          'l’arbitro è il server, che convalida ogni mossa con le stesse regole ' +
          'del gioco locale (impossibile barare). Le mosse degli altri arrivano in ' +
          'tempo reale nel diario di bordo.',
      },
      { t: 'h', text: 'Timer e disconnessioni' },
      {
        t: 'list',
        items: [
          'Timer di turno (opzionale, scelto alla creazione): allo scadere il gioco fa da solo la mossa più innocua, così nessuno blocca la partita',
          'Se cadi o chiudi la pagina, rientra: la sessione si riaggancia da sola, oppure ri-entra col codice della lobby — il tuo posto resta tuo',
        ],
      },
      {
        t: 'tip',
        text:
          'Senza un server configurato l’online è semplicemente spento: tutto il ' +
          'resto del gioco (bot e hot-seat) funziona comunque, anche offline.',
      },
    ],
  },
];

/** Indice del capitolo «Giocare online» (per aprirlo direttamente). */
export const TUTORIAL_ONLINE_CHAPTER = TUTORIAL.length - 1;
