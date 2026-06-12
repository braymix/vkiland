/**
 * TUTTE le stringhe della UI, centralizzate per la futura i18n.
 * `t(chiave, parametri)` interpola i segnaposto {nome}.
 */
import type { Resource, SagaCard, TerrainType } from '@vikiland/engine';

export const it = {
  titolo: 'VIKILAND',
  sottotitolo: "Saga dell'isola del Nord",

  // Menu
  nuovaPartita: 'Nuova partita',
  multigiocatore: 'Online',
  negozio: 'Negozio (in arrivo)',

  // Online: account
  accedi: 'Accedi',
  registrati: 'Registrati',
  email: 'Email',
  password: 'Password',
  nomeInGioco: 'Nome in gioco',
  serverUrl: 'Indirizzo del server',
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
  nessunTimer: 'Nessuno',
  hostTag: 'host',
  disconnessoTag: 'assente',
  attesaPartita: 'In attesa della partita…',
  lobbyChiusa: 'Lobby chiusa: {motivo}',

  // Setup
  configuraPartita: 'Prepara la spedizione',
  giocatore: 'Giocatore',
  umano: 'Umano',
  bot: 'Bot',
  livelloBot: 'Livello',
  facile: 'Facile',
  normale: 'Normale',
  nome: 'Nome',
  aggiungiGiocatore: '+ Aggiungi vichingo',
  rimuovi: 'Rimuovi',
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
  vittoriaTitolo: '{nome} conquista Vikiland!',
  rivincita: 'Rivincita',
  tornaAlMenu: 'Torna al menu',
  dettaglioPunti: 'Dettaglio dei Punti Gloria',
  bonusGrandeVia: 'La Grande Via',
  bonusFuria: 'Furia dei Berserker',
  eroiNascosti: 'Saghe degli Eroi',
  villaggi: 'Villaggi',
  roccaforti: 'Roccaforti',
  totale: 'Totale',

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
    pietra: 'Cava di granito',
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

  // Eventi del diario
  log: {
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
