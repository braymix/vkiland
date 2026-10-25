/**
 * Stringhe della modalità TAVOLO (un tablet in mezzo al tavolo che guarda una
 * partita online senza account). Modulo a parte come `inventory.ts`: `tav` è
 * un proxy che pesca sempre dalla lingua attiva.
 */
import { getLang, type Lang } from './index';

export interface TableStrings {
  /** Pulsante d'ingresso (entrata e menu Classica). */
  apri: string;
  titolo: string;
  sottotitolo: string;
  partite: string;
  nessuna: string;
  collegati: string;
  codicePlaceholder: string;
  codiceGuarda: string;
  connessione: string;
  serverGiu: string;
  giroN: (n: number) => string;
  giocatoriN: (n: number) => string;
  tavoliN: (n: number) => string;
  /** Barra del tavolo in partita. */
  turnoDi: (nome: string) => string;
  setup: string;
  ultimoTiro: string;
  nessunTiro: string;
  numeriUsciti: string;
  tiriN: (n: number) => string;
  carte: string;
  partitaChiusa: (motivo: string) => string;
  esci: string;
}

const it: TableStrings = {
  apri: '🎲 Modalità Tavolo',
  titolo: '🎲 Tavolo',
  sottotitolo:
    'Metti questo schermo in mezzo al tavolo: mostra la mappa in tempo reale e i numeri che escono. Non serve un account.',
  partite: 'Partite pubbliche in corso',
  nessuna: 'Nessuna partita pubblica in corso. La lista si aggiorna da sola.',
  collegati: 'Collega il tavolo',
  codicePlaceholder: 'Codice partita',
  codiceGuarda: 'Collega',
  connessione: 'Connessione al server…',
  serverGiu: 'Server non raggiungibile: riprovo da solo.',
  giroN: (n) => `Giro ${n}`,
  giocatoriN: (n) => `${n} giocatori`,
  tavoliN: (n) => `${n} 🎲`,
  turnoDi: (nome) => `Turno di ${nome}`,
  setup: 'Fondazione dei villaggi',
  ultimoTiro: 'Ultimo tiro',
  nessunTiro: 'Ancora nessun tiro',
  numeriUsciti: 'Numeri usciti',
  tiriN: (n) => `${n} tiri`,
  carte: 'carte',
  partitaChiusa: (motivo) => `Partita chiusa: ${motivo}`,
  esci: 'Esci dal tavolo',
};

const en: TableStrings = {
  apri: '🎲 Table mode',
  titolo: '🎲 Table',
  sottotitolo:
    'Put this screen in the middle of the table: it shows the live map and the numbers rolled. No account needed.',
  partite: 'Public games in progress',
  nessuna: 'No public game in progress. The list refreshes by itself.',
  collegati: 'Connect the table',
  codicePlaceholder: 'Game code',
  codiceGuarda: 'Connect',
  connessione: 'Connecting to the server…',
  serverGiu: 'Server unreachable: retrying automatically.',
  giroN: (n) => `Round ${n}`,
  giocatoriN: (n) => `${n} players`,
  tavoliN: (n) => `${n} 🎲`,
  turnoDi: (nome) => `${nome}'s turn`,
  setup: 'Founding the villages',
  ultimoTiro: 'Last roll',
  nessunTiro: 'No rolls yet',
  numeriUsciti: 'Numbers rolled',
  tiriN: (n) => `${n} rolls`,
  carte: 'cards',
  partitaChiusa: (motivo) => `Game closed: ${motivo}`,
  esci: 'Leave the table',
};

const es: TableStrings = {
  apri: '🎲 Modo Mesa',
  titolo: '🎲 Mesa',
  sottotitolo:
    'Pon esta pantalla en el centro de la mesa: muestra el mapa en tiempo real y los números que salen. No hace falta cuenta.',
  partite: 'Partidas públicas en curso',
  nessuna: 'No hay partidas públicas en curso. La lista se actualiza sola.',
  collegati: 'Conectar la mesa',
  codicePlaceholder: 'Código de partida',
  codiceGuarda: 'Conectar',
  connessione: 'Conectando con el servidor…',
  serverGiu: 'Servidor no disponible: reintentando solo.',
  giroN: (n) => `Ronda ${n}`,
  giocatoriN: (n) => `${n} jugadores`,
  tavoliN: (n) => `${n} 🎲`,
  turnoDi: (nome) => `Turno de ${nome}`,
  setup: 'Fundación de las aldeas',
  ultimoTiro: 'Última tirada',
  nessunTiro: 'Aún no hay tiradas',
  numeriUsciti: 'Números salidos',
  tiriN: (n) => `${n} tiradas`,
  carte: 'cartas',
  partitaChiusa: (motivo) => `Partida cerrada: ${motivo}`,
  esci: 'Salir de la mesa',
};

const fr: TableStrings = {
  apri: '🎲 Mode Table',
  titolo: '🎲 Table',
  sottotitolo:
    "Pose cet écran au milieu de la table : il montre la carte en direct et les numéros tirés. Pas besoin de compte.",
  partite: 'Parties publiques en cours',
  nessuna: 'Aucune partie publique en cours. La liste se met à jour toute seule.',
  collegati: 'Connecter la table',
  codicePlaceholder: 'Code de la partie',
  codiceGuarda: 'Connecter',
  connessione: 'Connexion au serveur…',
  serverGiu: 'Serveur injoignable : nouvel essai automatique.',
  giroN: (n) => `Tour ${n}`,
  giocatoriN: (n) => `${n} joueurs`,
  tavoliN: (n) => `${n} 🎲`,
  turnoDi: (nome) => `Au tour de ${nome}`,
  setup: 'Fondation des villages',
  ultimoTiro: 'Dernier lancer',
  nessunTiro: 'Aucun lancer pour l’instant',
  numeriUsciti: 'Numéros tirés',
  tiriN: (n) => `${n} lancers`,
  carte: 'cartes',
  partitaChiusa: (motivo) => `Partie fermée : ${motivo}`,
  esci: 'Quitter la table',
};

const de: TableStrings = {
  apri: '🎲 Tisch-Modus',
  titolo: '🎲 Tisch',
  sottotitolo:
    'Leg diesen Bildschirm in die Tischmitte: Er zeigt die Karte live und die gewürfelten Zahlen. Kein Konto nötig.',
  partite: 'Laufende öffentliche Partien',
  nessuna: 'Keine öffentliche Partie läuft. Die Liste aktualisiert sich selbst.',
  collegati: 'Tisch verbinden',
  codicePlaceholder: 'Partie-Code',
  codiceGuarda: 'Verbinden',
  connessione: 'Verbinde mit dem Server…',
  serverGiu: 'Server nicht erreichbar: neuer Versuch automatisch.',
  giroN: (n) => `Runde ${n}`,
  giocatoriN: (n) => `${n} Spieler`,
  tavoliN: (n) => `${n} 🎲`,
  turnoDi: (nome) => `${nome} ist am Zug`,
  setup: 'Gründung der Dörfer',
  ultimoTiro: 'Letzter Wurf',
  nessunTiro: 'Noch kein Wurf',
  numeriUsciti: 'Gewürfelte Zahlen',
  tiriN: (n) => `${n} Würfe`,
  carte: 'Karten',
  partitaChiusa: (motivo) => `Partie geschlossen: ${motivo}`,
  esci: 'Tisch verlassen',
};

const nl: TableStrings = {
  apri: '🎲 Tafelmodus',
  titolo: '🎲 Tafel',
  sottotitolo:
    'Zet dit scherm midden op tafel: het toont de kaart live en de gegooide getallen. Geen account nodig.',
  partite: 'Lopende openbare spellen',
  nessuna: 'Geen openbaar spel bezig. De lijst ververst vanzelf.',
  collegati: 'Tafel verbinden',
  codicePlaceholder: 'Spelcode',
  codiceGuarda: 'Verbinden',
  connessione: 'Verbinden met de server…',
  serverGiu: 'Server onbereikbaar: probeert het vanzelf opnieuw.',
  giroN: (n) => `Ronde ${n}`,
  giocatoriN: (n) => `${n} spelers`,
  tavoliN: (n) => `${n} 🎲`,
  turnoDi: (nome) => `${nome} is aan de beurt`,
  setup: 'Dorpen stichten',
  ultimoTiro: 'Laatste worp',
  nessunTiro: 'Nog geen worp',
  numeriUsciti: 'Gegooide getallen',
  tiriN: (n) => `${n} worpen`,
  carte: 'kaarten',
  partitaChiusa: (motivo) => `Spel gesloten: ${motivo}`,
  esci: 'Tafel verlaten',
};

const ru: TableStrings = {
  apri: '🎲 Режим стола',
  titolo: '🎲 Стол',
  sottotitolo:
    'Положи этот экран в центр стола: он показывает карту в реальном времени и выпавшие числа. Аккаунт не нужен.',
  partite: 'Публичные партии в процессе',
  nessuna: 'Нет идущих публичных партий. Список обновляется сам.',
  collegati: 'Подключить стол',
  codicePlaceholder: 'Код партии',
  codiceGuarda: 'Подключить',
  connessione: 'Подключение к серверу…',
  serverGiu: 'Сервер недоступен: повторяю автоматически.',
  giroN: (n) => `Раунд ${n}`,
  giocatoriN: (n) => `Игроков: ${n}`,
  tavoliN: (n) => `${n} 🎲`,
  turnoDi: (nome) => `Ход: ${nome}`,
  setup: 'Основание деревень',
  ultimoTiro: 'Последний бросок',
  nessunTiro: 'Бросков ещё нет',
  numeriUsciti: 'Выпавшие числа',
  tiriN: (n) => `Бросков: ${n}`,
  carte: 'карт',
  partitaChiusa: (motivo) => `Партия закрыта: ${motivo}`,
  esci: 'Выйти из-за стола',
};

const sr: TableStrings = {
  apri: '🎲 Režim stola',
  titolo: '🎲 Sto',
  sottotitolo:
    'Stavi ovaj ekran na sredinu stola: prikazuje mapu uživo i brojeve koji padnu. Nalog nije potreban.',
  partite: 'Javne partije u toku',
  nessuna: 'Nema javnih partija u toku. Lista se sama osvežava.',
  collegati: 'Poveži sto',
  codicePlaceholder: 'Kod partije',
  codiceGuarda: 'Poveži',
  connessione: 'Povezivanje sa serverom…',
  serverGiu: 'Server nedostupan: pokušavam ponovo sam.',
  giroN: (n) => `Krug ${n}`,
  giocatoriN: (n) => `Igrača: ${n}`,
  tavoliN: (n) => `${n} 🎲`,
  turnoDi: (nome) => `Na potezu: ${nome}`,
  setup: 'Osnivanje sela',
  ultimoTiro: 'Poslednje bacanje',
  nessunTiro: 'Još nema bacanja',
  numeriUsciti: 'Brojevi koji su pali',
  tiriN: (n) => `Bacanja: ${n}`,
  carte: 'karte',
  partitaChiusa: (motivo) => `Partija zatvorena: ${motivo}`,
  esci: 'Napusti sto',
};

const DICTS: Record<Lang, TableStrings> = { it, en, es, fr, de, nl, ru, sr };

/** Stringhe del Tavolo nella lingua ATTIVA (proxy come `it` in index.ts). */
export const tav = new Proxy({} as TableStrings, {
  get(_t, prop: string | symbol) {
    return (DICTS[getLang()] as unknown as Record<string | symbol, unknown>)[prop];
  },
}) as TableStrings;
