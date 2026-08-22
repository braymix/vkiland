/**
 * Stringhe della funzionalità «casse ed eroi» dell'inventario. Vivono in un
 * modulo a parte (non nel grande tipo `Strings`) per restare contenute, ma
 * seguono la STESSA lingua attiva: `inv` è un proxy che, a ogni lettura, pesca
 * dal dizionario della lingua corrente — esattamente come `it` in `index.ts`.
 */
import { getLang, type Lang } from './index';

export interface InvStrings {
  // Sezione casse
  casseTitolo: string;
  casseInfo: string;
  casseComeSi: string;
  scontoAttivo: string;
  cassaPronta: string;
  cassaApri: string;
  cassaCarica: string;
  casseVuote: string;
  casseMax: string;
  restano: (hhmm: string) => string;
  // Collezione eroi
  eroiTitolo: string;
  eroiInfo: string;
  sbloccato: string;
  bloccato: string;
  frammenti: (n: number, tot: number) => string;
  // Notifica apertura cassa
  notSbloccoTitolo: string;
  notFrammentoTitolo: string;
  notSprecatoTitolo: string;
  notSprecato: string;
  notProgresso: (n: number, tot: number) => string;
  notSblocco: (nome: string) => string;
  // Picker eroi (bloccati)
  pickerBloccato: string;
  pickerSbloccaDaCasse: string;
  // Popup tester
  testerTitolo: string;
  testerMessaggio: string;
  testerExtra: string;
  // Negozio (cassa gratuita giornaliera)
  shopSottotitolo: string;
  shopGratisTitolo: string;
  shopGratisInfo: string;
  shopGratisApri: string;
  shopGratisFatta: string;
  shopGratisTornaDomani: string;
  // Negozio (riscatto una-tantum di un eroe non comune a scelta)
  shopRiscattoTitolo: string;
  shopRiscattoInfo: string;
  shopRiscattoScegli: string;
  shopRiscattoFatto: (nome: string) => string;
  riscattoTitolo: string;
  // Missioni (partite casuali da vincere; ricompensa in casse istantanee)
  missioniTitolo: string;
  missioniSottotitolo: string;
  missioniInfo: string;
  missioniComeSi: string;
  missioneFacile: string;
  missioneNormale: string;
  missioneDifficolta: (label: string) => string;
  missioneRicompensa: (n: number) => string;
  missioneModo: (label: string) => string;
  modoCalamita: string;
  modoBattaglia: string;
  modoCapitale: string;
  missioneGioca: string;
  missioneCompletata: string;
  missioniRefresh: (hhmm: string) => string;
  missioniScontoRefresh: string;
  missioneVittoriaTitolo: string;
  missioneVittoriaCorpo: (n: number) => string;
  missioneSconfittaTitolo: string;
  missioneSconfittaCorpo: string;
  // Comuni
  chiudi: string;
  /** Etichetta del pallino rosso «da fare» sui pulsanti del menu (accessibilità). */
  azioniDaFare: (n: number) => string;
}

const it: InvStrings = {
  casseTitolo: 'Casse',
  casseInfo: 'Ogni cassa contiene il frammento di un eroe non comune casuale. Con 5 frammenti dello stesso eroe lo sblocchi.',
  casseComeSi: 'Guadagni una cassa a fine partita (online o offline). Puoi tenerne al massimo 3 in lavorazione.',
  scontoAttivo: '🔖 Sconto attivo: le casse si aprono in 3 ore invece di 9.',
  cassaPronta: 'Pronta!',
  cassaApri: 'Apri',
  cassaCarica: 'In caricamento',
  casseVuote: 'Nessuna cassa: finisci una partita per guadagnarne una.',
  casseMax: 'Casse piene (3/3): aprine una per fare spazio.',
  restano: (h) => `Mancano ${h}`,
  eroiTitolo: 'Eroi',
  eroiInfo: 'Gli eroi comuni sono già tuoi. Quelli non comuni si sbloccano con i frammenti delle casse.',
  sbloccato: 'Sbloccato',
  bloccato: 'Bloccato',
  frammenti: (n, tot) => `${n}/${tot} frammenti`,
  notSbloccoTitolo: '🎉 Nuovo eroe sbloccato!',
  notFrammentoTitolo: '✨ Frammento trovato!',
  notSprecatoTitolo: 'Frammento sprecato',
  notSprecato: 'Avevi già questo eroe: il frammento è andato perso.',
  notProgresso: (n, tot) => `${n}/${tot} frammenti per sbloccarlo`,
  notSblocco: (nome) => `${nome} è ora disponibile nella scelta eroe!`,
  pickerBloccato: 'Bloccato',
  pickerSbloccaDaCasse: 'Sblocca con i frammenti delle casse (inventario)',
  testerTitolo: '🛡️ Grazie!',
  testerMessaggio: 'Grazie di essere un tester, per me é molto importante.',
  testerExtra: 'Come ringraziamento hai ogni eroe già sbloccato. Buone partite, vichingo!',
  shopSottotitolo: 'Una cassa gratuita ogni giorno. Altro in arrivo.',
  shopGratisTitolo: 'Cassa gratuita del giorno',
  shopGratisInfo: 'Si apre all’istante: nessuna attesa. Dentro c’è il frammento di un eroe non comune casuale.',
  shopGratisApri: 'Riscuoti gratis',
  shopGratisFatta: 'Già riscossa oggi',
  shopGratisTornaDomani: 'Torna domani per la prossima cassa gratuita.',
  shopRiscattoTitolo: 'Riscatto una-tantum',
  shopRiscattoInfo: 'Una volta per account: scegli un eroe non comune e sbloccalo subito, gratis.',
  shopRiscattoScegli: 'Scegli l’eroe',
  shopRiscattoFatto: (nome) => `Riscatto già usato: ${nome}.`,
  riscattoTitolo: '🎁 Eroe riscattato!',
  missioniTitolo: 'Missioni',
  missioniSottotitolo: 'Partite casuali da vincere per casse gratis.',
  missioniInfo: 'Ogni missione è una partita contro i bot: vincila per aprire subito le casse in premio.',
  missioniComeSi: 'Le missioni facili sono le più frequenti; le normali sono più rare, con bot più forti e doppia ricompensa.',
  missioneFacile: 'Facile',
  missioneNormale: 'Normale',
  missioneDifficolta: (label) => `Bot: ${label}`,
  missioneRicompensa: (n) => (n === 1 ? '1 cassa' : `${n} casse`),
  missioneModo: (label) => `Modalità: ${label}`,
  modoCalamita: 'Calamità',
  modoBattaglia: 'Battaglia',
  modoCapitale: 'Capitale',
  missioneGioca: 'Gioca',
  missioneCompletata: '✓ Completata',
  missioniRefresh: (hhmm) => `Nuove missioni fra ${hhmm}`,
  missioniScontoRefresh: '🔖 Sconto attivo: le missioni si rigenerano più in fretta.',
  missioneVittoriaTitolo: '🎉 Missione completata!',
  missioneVittoriaCorpo: (n) =>
    n === 1 ? 'Hai vinto! Apri la cassa in premio.' : `Hai vinto! Apri le ${n} casse in premio.`,
  missioneSconfittaTitolo: 'Missione non riuscita',
  missioneSconfittaCorpo: 'Non hai vinto questa volta: la missione resta disponibile, riprova!',
  chiudi: 'Chiudi',
  azioniDaFare: (n) => (n === 1 ? '1 azione da fare' : `${n} azioni da fare`),
};

const en: InvStrings = {
  casseTitolo: 'Chests',
  casseInfo: 'Each chest holds a fragment of a random uncommon hero. Collect 5 fragments of the same hero to unlock it.',
  casseComeSi: 'You earn a chest at the end of a game (online or offline). You can keep up to 3 in progress.',
  scontoAttivo: '🔖 Discount active: chests open in 3 hours instead of 9.',
  cassaPronta: 'Ready!',
  cassaApri: 'Open',
  cassaCarica: 'Loading',
  casseVuote: 'No chests: finish a game to earn one.',
  casseMax: 'Chests full (3/3): open one to make room.',
  restano: (h) => `${h} left`,
  eroiTitolo: 'Heroes',
  eroiInfo: 'Common heroes are already yours. Uncommon ones unlock with fragments from chests.',
  sbloccato: 'Unlocked',
  bloccato: 'Locked',
  frammenti: (n, tot) => `${n}/${tot} fragments`,
  notSbloccoTitolo: '🎉 New hero unlocked!',
  notFrammentoTitolo: '✨ Fragment found!',
  notSprecatoTitolo: 'Fragment wasted',
  notSprecato: 'You already owned this hero: the fragment was lost.',
  notProgresso: (n, tot) => `${n}/${tot} fragments to unlock`,
  notSblocco: (nome) => `${nome} is now available in hero selection!`,
  pickerBloccato: 'Locked',
  pickerSbloccaDaCasse: 'Unlock with chest fragments (inventory)',
  testerTitolo: '🛡️ Thank you!',
  testerMessaggio: 'Thank you for being a tester, it means a lot to me.',
  testerExtra: 'As a thank-you, every hero is already unlocked for you. Enjoy, viking!',
  shopSottotitolo: 'One free chest every day. More coming soon.',
  shopGratisTitolo: 'Daily free chest',
  shopGratisInfo: 'Opens instantly: no waiting. Inside is a fragment of a random uncommon hero.',
  shopGratisApri: 'Claim for free',
  shopGratisFatta: 'Already claimed today',
  shopGratisTornaDomani: 'Come back tomorrow for the next free chest.',
  shopRiscattoTitolo: 'One-time redeem',
  shopRiscattoInfo: 'Once per account: pick an uncommon hero and unlock it right away, for free.',
  shopRiscattoScegli: 'Pick your hero',
  shopRiscattoFatto: (nome) => `Redeem already used: ${nome}.`,
  riscattoTitolo: '🎁 Hero redeemed!',
  missioniTitolo: 'Missions',
  missioniSottotitolo: 'Random games to win for free chests.',
  missioniInfo: 'Each mission is a game against the bots: win it to instantly open the chests you earn.',
  missioniComeSi: 'Easy missions are the most common; normal ones are rarer, with tougher bots and double the reward.',
  missioneFacile: 'Easy',
  missioneNormale: 'Normal',
  missioneDifficolta: (label) => `Bots: ${label}`,
  missioneRicompensa: (n) => (n === 1 ? '1 chest' : `${n} chests`),
  missioneModo: (label) => `Mode: ${label}`,
  modoCalamita: 'Calamity',
  modoBattaglia: 'Battle',
  modoCapitale: 'Capital',
  missioneGioca: 'Play',
  missioneCompletata: '✓ Completed',
  missioniRefresh: (hhmm) => `New missions in ${hhmm}`,
  missioniScontoRefresh: '🔖 Discount active: missions refresh faster.',
  missioneVittoriaTitolo: '🎉 Mission complete!',
  missioneVittoriaCorpo: (n) =>
    n === 1 ? 'You won! Open your reward chest.' : `You won! Open your ${n} reward chests.`,
  missioneSconfittaTitolo: 'Mission failed',
  missioneSconfittaCorpo: 'You did not win this time: the mission stays available, try again!',
  chiudi: 'Close',
  azioniDaFare: (n) => (n === 1 ? '1 action to do' : `${n} actions to do`),
};

const es: InvStrings = {
  casseTitolo: 'Cofres',
  casseInfo: 'Cada cofre contiene un fragmento de un héroe poco común aleatorio. Con 5 fragmentos del mismo héroe lo desbloqueas.',
  casseComeSi: 'Ganas un cofre al terminar una partida (en línea o local). Puedes tener hasta 3 en proceso.',
  scontoAttivo: '🔖 Descuento activo: los cofres se abren en 3 horas en vez de 9.',
  cassaPronta: '¡Listo!',
  cassaApri: 'Abrir',
  cassaCarica: 'Cargando',
  casseVuote: 'Sin cofres: termina una partida para ganar uno.',
  casseMax: 'Cofres llenos (3/3): abre uno para hacer sitio.',
  restano: (h) => `Faltan ${h}`,
  eroiTitolo: 'Héroes',
  eroiInfo: 'Los héroes comunes ya son tuyos. Los poco comunes se desbloquean con fragmentos de los cofres.',
  sbloccato: 'Desbloqueado',
  bloccato: 'Bloqueado',
  frammenti: (n, tot) => `${n}/${tot} fragmentos`,
  notSbloccoTitolo: '🎉 ¡Nuevo héroe desbloqueado!',
  notFrammentoTitolo: '✨ ¡Fragmento encontrado!',
  notSprecatoTitolo: 'Fragmento desperdiciado',
  notSprecato: 'Ya tenías este héroe: el fragmento se perdió.',
  notProgresso: (n, tot) => `${n}/${tot} fragmentos para desbloquear`,
  notSblocco: (nome) => `¡${nome} ya está disponible en la selección de héroe!`,
  pickerBloccato: 'Bloqueado',
  pickerSbloccaDaCasse: 'Desbloquea con fragmentos de cofres (inventario)',
  testerTitolo: '🛡️ ¡Gracias!',
  testerMessaggio: 'Gracias por ser tester, para mí es muy importante.',
  testerExtra: 'Como agradecimiento tienes todos los héroes ya desbloqueados. ¡A disfrutar, vikingo!',
  shopSottotitolo: 'Un cofre gratis cada día. Pronto habrá más.',
  shopGratisTitolo: 'Cofre gratis del día',
  shopGratisInfo: 'Se abre al instante: sin esperas. Dentro hay un fragmento de un héroe poco común aleatorio.',
  shopGratisApri: 'Reclamar gratis',
  shopGratisFatta: 'Ya reclamado hoy',
  shopGratisTornaDomani: 'Vuelve mañana por el próximo cofre gratis.',
  shopRiscattoTitolo: 'Canje único',
  shopRiscattoInfo: 'Una vez por cuenta: elige un héroe poco común y desbloquéalo al instante, gratis.',
  shopRiscattoScegli: 'Elige el héroe',
  shopRiscattoFatto: (nome) => `Canje ya usado: ${nome}.`,
  riscattoTitolo: '🎁 ¡Héroe canjeado!',
  missioniTitolo: 'Misiones',
  missioniSottotitolo: 'Partidas aleatorias que ganar para cofres gratis.',
  missioniInfo: 'Cada misión es una partida contra los bots: gánala para abrir al instante los cofres que ganes.',
  missioniComeSi: 'Las misiones fáciles son las más frecuentes; las normales son más raras, con bots más fuertes y doble recompensa.',
  missioneFacile: 'Fácil',
  missioneNormale: 'Normal',
  missioneDifficolta: (label) => `Bots: ${label}`,
  missioneRicompensa: (n) => (n === 1 ? '1 cofre' : `${n} cofres`),
  missioneModo: (label) => `Modo: ${label}`,
  modoCalamita: 'Calamidad',
  modoBattaglia: 'Batalla',
  modoCapitale: 'Capital',
  missioneGioca: 'Jugar',
  missioneCompletata: '✓ Completada',
  missioniRefresh: (hhmm) => `Nuevas misiones en ${hhmm}`,
  missioniScontoRefresh: '🔖 Descuento activo: las misiones se renuevan más rápido.',
  missioneVittoriaTitolo: '🎉 ¡Misión completada!',
  missioneVittoriaCorpo: (n) =>
    n === 1 ? '¡Has ganado! Abre tu cofre de recompensa.' : `¡Has ganado! Abre tus ${n} cofres de recompensa.`,
  missioneSconfittaTitolo: 'Misión fallida',
  missioneSconfittaCorpo: 'No has ganado esta vez: la misión sigue disponible, ¡inténtalo de nuevo!',
  chiudi: 'Cerrar',
  azioniDaFare: (n) => (n === 1 ? '1 acción por hacer' : `${n} acciones por hacer`),
};

const fr: InvStrings = {
  casseTitolo: 'Coffres',
  casseInfo: 'Chaque coffre contient un fragment d’un héros peu commun aléatoire. Avec 5 fragments du même héros, vous le débloquez.',
  casseComeSi: 'Vous gagnez un coffre à la fin d’une partie (en ligne ou hors ligne). Vous pouvez en garder 3 en cours.',
  scontoAttivo: '🔖 Réduction active : les coffres s’ouvrent en 3 heures au lieu de 9.',
  cassaPronta: 'Prêt !',
  cassaApri: 'Ouvrir',
  cassaCarica: 'Chargement',
  casseVuote: 'Aucun coffre : terminez une partie pour en gagner un.',
  casseMax: 'Coffres pleins (3/3) : ouvrez-en un pour faire de la place.',
  restano: (h) => `Reste ${h}`,
  eroiTitolo: 'Héros',
  eroiInfo: 'Les héros communs sont déjà à vous. Les peu communs se débloquent avec les fragments des coffres.',
  sbloccato: 'Débloqué',
  bloccato: 'Verrouillé',
  frammenti: (n, tot) => `${n}/${tot} fragments`,
  notSbloccoTitolo: '🎉 Nouveau héros débloqué !',
  notFrammentoTitolo: '✨ Fragment trouvé !',
  notSprecatoTitolo: 'Fragment gaspillé',
  notSprecato: 'Vous aviez déjà ce héros : le fragment est perdu.',
  notProgresso: (n, tot) => `${n}/${tot} fragments pour débloquer`,
  notSblocco: (nome) => `${nome} est maintenant disponible dans le choix du héros !`,
  pickerBloccato: 'Verrouillé',
  pickerSbloccaDaCasse: 'Débloquez avec les fragments des coffres (inventaire)',
  testerTitolo: '🛡️ Merci !',
  testerMessaggio: 'Merci d’être testeur, c’est très important pour moi.',
  testerExtra: 'En remerciement, tous les héros sont déjà débloqués pour vous. Bon jeu, viking !',
  shopSottotitolo: 'Un coffre gratuit chaque jour. Bientôt plus.',
  shopGratisTitolo: 'Coffre gratuit du jour',
  shopGratisInfo: 'S’ouvre à l’instant : aucune attente. À l’intérieur, un fragment d’un héros peu commun aléatoire.',
  shopGratisApri: 'Récupérer gratuitement',
  shopGratisFatta: 'Déjà récupéré aujourd’hui',
  shopGratisTornaDomani: 'Revenez demain pour le prochain coffre gratuit.',
  shopRiscattoTitolo: 'Échange unique',
  shopRiscattoInfo: 'Une fois par compte : choisissez un héros peu commun et débloquez-le aussitôt, gratuitement.',
  shopRiscattoScegli: 'Choisir le héros',
  shopRiscattoFatto: (nome) => `Échange déjà utilisé : ${nome}.`,
  riscattoTitolo: '🎁 Héros échangé !',
  missioniTitolo: 'Missions',
  missioniSottotitolo: 'Des parties aléatoires à gagner pour des coffres gratuits.',
  missioniInfo: 'Chaque mission est une partie contre les bots : gagnez-la pour ouvrir aussitôt les coffres gagnés.',
  missioniComeSi: 'Les missions faciles sont les plus fréquentes ; les normales sont plus rares, avec des bots plus forts et une récompense double.',
  missioneFacile: 'Facile',
  missioneNormale: 'Normale',
  missioneDifficolta: (label) => `Bots : ${label}`,
  missioneRicompensa: (n) => (n === 1 ? '1 coffre' : `${n} coffres`),
  missioneModo: (label) => `Mode : ${label}`,
  modoCalamita: 'Calamité',
  modoBattaglia: 'Bataille',
  modoCapitale: 'Capitale',
  missioneGioca: 'Jouer',
  missioneCompletata: '✓ Terminée',
  missioniRefresh: (hhmm) => `Nouvelles missions dans ${hhmm}`,
  missioniScontoRefresh: '🔖 Réduction active : les missions se renouvellent plus vite.',
  missioneVittoriaTitolo: '🎉 Mission accomplie !',
  missioneVittoriaCorpo: (n) =>
    n === 1 ? 'Vous avez gagné ! Ouvrez votre coffre de récompense.' : `Vous avez gagné ! Ouvrez vos ${n} coffres de récompense.`,
  missioneSconfittaTitolo: 'Mission échouée',
  missioneSconfittaCorpo: 'Vous n’avez pas gagné cette fois : la mission reste disponible, réessayez !',
  chiudi: 'Fermer',
  azioniDaFare: (n) => (n === 1 ? '1 action à faire' : `${n} actions à faire`),
};

const de: InvStrings = {
  casseTitolo: 'Truhen',
  casseInfo: 'Jede Truhe enthält ein Fragment eines zufälligen ungewöhnlichen Helden. Mit 5 Fragmenten desselben Helden schaltest du ihn frei.',
  casseComeSi: 'Du erhältst eine Truhe am Ende eines Spiels (online oder offline). Du kannst höchstens 3 in Bearbeitung halten.',
  scontoAttivo: '🔖 Rabatt aktiv: Truhen öffnen in 3 statt 9 Stunden.',
  cassaPronta: 'Bereit!',
  cassaApri: 'Öffnen',
  cassaCarica: 'Lädt',
  casseVuote: 'Keine Truhen: Beende ein Spiel, um eine zu verdienen.',
  casseMax: 'Truhen voll (3/3): Öffne eine, um Platz zu schaffen.',
  restano: (h) => `Noch ${h}`,
  eroiTitolo: 'Helden',
  eroiInfo: 'Gewöhnliche Helden gehören dir bereits. Ungewöhnliche schaltest du mit Fragmenten aus Truhen frei.',
  sbloccato: 'Freigeschaltet',
  bloccato: 'Gesperrt',
  frammenti: (n, tot) => `${n}/${tot} Fragmente`,
  notSbloccoTitolo: '🎉 Neuer Held freigeschaltet!',
  notFrammentoTitolo: '✨ Fragment gefunden!',
  notSprecatoTitolo: 'Fragment verschwendet',
  notSprecato: 'Du hattest diesen Helden schon: Das Fragment ging verloren.',
  notProgresso: (n, tot) => `${n}/${tot} Fragmente zum Freischalten`,
  notSblocco: (nome) => `${nome} ist jetzt in der Heldenauswahl verfügbar!`,
  pickerBloccato: 'Gesperrt',
  pickerSbloccaDaCasse: 'Mit Truhen-Fragmenten freischalten (Inventar)',
  testerTitolo: '🛡️ Danke!',
  testerMessaggio: 'Danke, dass du Tester bist, das ist mir sehr wichtig.',
  testerExtra: 'Als Dankeschön sind alle Helden bereits freigeschaltet. Viel Spaß, Wikinger!',
  shopSottotitolo: 'Jeden Tag eine kostenlose Truhe. Mehr folgt bald.',
  shopGratisTitolo: 'Kostenlose Tagestruhe',
  shopGratisInfo: 'Öffnet sofort: kein Warten. Darin ein Fragment eines zufälligen ungewöhnlichen Helden.',
  shopGratisApri: 'Kostenlos abholen',
  shopGratisFatta: 'Heute schon abgeholt',
  shopGratisTornaDomani: 'Komm morgen für die nächste kostenlose Truhe wieder.',
  shopRiscattoTitolo: 'Einmal-Einlösung',
  shopRiscattoInfo: 'Einmal pro Konto: Wähle einen ungewöhnlichen Helden und schalte ihn sofort gratis frei.',
  shopRiscattoScegli: 'Held wählen',
  shopRiscattoFatto: (nome) => `Einlösung bereits genutzt: ${nome}.`,
  riscattoTitolo: '🎁 Held eingelöst!',
  missioniTitolo: 'Missionen',
  missioniSottotitolo: 'Zufällige Spiele zum Gewinnen für kostenlose Truhen.',
  missioniInfo: 'Jede Mission ist ein Spiel gegen die Bots: Gewinne es, um die verdienten Truhen sofort zu öffnen.',
  missioniComeSi: 'Leichte Missionen kommen am häufigsten vor; normale sind seltener, mit stärkeren Bots und doppelter Belohnung.',
  missioneFacile: 'Leicht',
  missioneNormale: 'Normal',
  missioneDifficolta: (label) => `Bots: ${label}`,
  missioneRicompensa: (n) => (n === 1 ? '1 Truhe' : `${n} Truhen`),
  missioneModo: (label) => `Modus: ${label}`,
  modoCalamita: 'Unheil',
  modoBattaglia: 'Schlacht',
  modoCapitale: 'Hauptstadt',
  missioneGioca: 'Spielen',
  missioneCompletata: '✓ Abgeschlossen',
  missioniRefresh: (hhmm) => `Neue Missionen in ${hhmm}`,
  missioniScontoRefresh: '🔖 Rabatt aktiv: Missionen erneuern sich schneller.',
  missioneVittoriaTitolo: '🎉 Mission abgeschlossen!',
  missioneVittoriaCorpo: (n) =>
    n === 1 ? 'Gewonnen! Öffne deine Belohnungstruhe.' : `Gewonnen! Öffne deine ${n} Belohnungstruhen.`,
  missioneSconfittaTitolo: 'Mission fehlgeschlagen',
  missioneSconfittaCorpo: 'Diesmal nicht gewonnen: Die Mission bleibt verfügbar, versuch es erneut!',
  chiudi: 'Schließen',
  azioniDaFare: (n) => (n === 1 ? '1 offene Aktion' : `${n} offene Aktionen`),
};

const nl: InvStrings = {
  casseTitolo: 'Kisten',
  casseInfo: 'Elke kist bevat een fragment van een willekeurige ongewone held. Met 5 fragmenten van dezelfde held ontgrendel je hem.',
  casseComeSi: 'Je verdient een kist aan het einde van een spel (online of offline). Je kunt er maximaal 3 in behandeling houden.',
  scontoAttivo: '🔖 Korting actief: kisten openen in 3 uur in plaats van 9.',
  cassaPronta: 'Klaar!',
  cassaApri: 'Openen',
  cassaCarica: 'Bezig',
  casseVuote: 'Geen kisten: maak een spel af om er een te verdienen.',
  casseMax: 'Kisten vol (3/3): open er een om ruimte te maken.',
  restano: (h) => `Nog ${h}`,
  eroiTitolo: 'Helden',
  eroiInfo: 'Gewone helden zijn al van jou. Ongewone ontgrendel je met fragmenten uit kisten.',
  sbloccato: 'Ontgrendeld',
  bloccato: 'Vergrendeld',
  frammenti: (n, tot) => `${n}/${tot} fragmenten`,
  notSbloccoTitolo: '🎉 Nieuwe held ontgrendeld!',
  notFrammentoTitolo: '✨ Fragment gevonden!',
  notSprecatoTitolo: 'Fragment verspild',
  notSprecato: 'Je had deze held al: het fragment ging verloren.',
  notProgresso: (n, tot) => `${n}/${tot} fragmenten om te ontgrendelen`,
  notSblocco: (nome) => `${nome} is nu beschikbaar bij de heldenkeuze!`,
  pickerBloccato: 'Vergrendeld',
  pickerSbloccaDaCasse: 'Ontgrendel met kistfragmenten (inventaris)',
  testerTitolo: '🛡️ Bedankt!',
  testerMessaggio: 'Bedankt dat je tester bent, dat is heel belangrijk voor mij.',
  testerExtra: 'Als dank zijn alle helden al voor je ontgrendeld. Veel plezier, viking!',
  shopSottotitolo: 'Elke dag een gratis kist. Meer komt eraan.',
  shopGratisTitolo: 'Gratis kist van de dag',
  shopGratisInfo: 'Gaat meteen open: geen wachten. Erin zit een fragment van een willekeurige ongewone held.',
  shopGratisApri: 'Gratis ophalen',
  shopGratisFatta: 'Vandaag al opgehaald',
  shopGratisTornaDomani: 'Kom morgen terug voor de volgende gratis kist.',
  shopRiscattoTitolo: 'Eenmalige inwissel',
  shopRiscattoInfo: 'Eén keer per account: kies een ongewone held en ontgrendel hem meteen, gratis.',
  shopRiscattoScegli: 'Kies de held',
  shopRiscattoFatto: (nome) => `Inwissel al gebruikt: ${nome}.`,
  riscattoTitolo: '🎁 Held ingewisseld!',
  missioniTitolo: 'Missies',
  missioniSottotitolo: 'Willekeurige potjes om te winnen voor gratis kisten.',
  missioniInfo: 'Elke missie is een potje tegen de bots: win het om de verdiende kisten meteen te openen.',
  missioniComeSi: 'Makkelijke missies komen het vaakst voor; normale zijn zeldzamer, met sterkere bots en dubbele beloning.',
  missioneFacile: 'Makkelijk',
  missioneNormale: 'Normaal',
  missioneDifficolta: (label) => `Bots: ${label}`,
  missioneRicompensa: (n) => (n === 1 ? '1 kist' : `${n} kisten`),
  missioneModo: (label) => `Modus: ${label}`,
  modoCalamita: 'Ramp',
  modoBattaglia: 'Strijd',
  modoCapitale: 'Hoofdstad',
  missioneGioca: 'Spelen',
  missioneCompletata: '✓ Voltooid',
  missioniRefresh: (hhmm) => `Nieuwe missies over ${hhmm}`,
  missioniScontoRefresh: '🔖 Korting actief: missies vernieuwen sneller.',
  missioneVittoriaTitolo: '🎉 Missie voltooid!',
  missioneVittoriaCorpo: (n) =>
    n === 1 ? 'Je hebt gewonnen! Open je beloningskist.' : `Je hebt gewonnen! Open je ${n} beloningskisten.`,
  missioneSconfittaTitolo: 'Missie mislukt',
  missioneSconfittaCorpo: 'Deze keer niet gewonnen: de missie blijft beschikbaar, probeer opnieuw!',
  chiudi: 'Sluiten',
  azioniDaFare: (n) => (n === 1 ? '1 actie te doen' : `${n} acties te doen`),
};

const ru: InvStrings = {
  casseTitolo: 'Сундуки',
  casseInfo: 'В каждом сундуке — фрагмент случайного необычного героя. Собрав 5 фрагментов одного героя, вы его открываете.',
  casseComeSi: 'Сундук выдаётся в конце партии (онлайн или офлайн). Одновременно можно держать не более 3.',
  scontoAttivo: '🔖 Действует скидка: сундуки открываются за 3 часа вместо 9.',
  cassaPronta: 'Готов!',
  cassaApri: 'Открыть',
  cassaCarica: 'Загрузка',
  casseVuote: 'Сундуков нет: завершите партию, чтобы получить.',
  casseMax: 'Сундуки заполнены (3/3): откройте один, чтобы освободить место.',
  restano: (h) => `Осталось ${h}`,
  eroiTitolo: 'Герои',
  eroiInfo: 'Обычные герои уже ваши. Необычные открываются фрагментами из сундуков.',
  sbloccato: 'Открыт',
  bloccato: 'Закрыт',
  frammenti: (n, tot) => `${n}/${tot} фрагментов`,
  notSbloccoTitolo: '🎉 Открыт новый герой!',
  notFrammentoTitolo: '✨ Найден фрагмент!',
  notSprecatoTitolo: 'Фрагмент потрачен зря',
  notSprecato: 'Этот герой у вас уже был: фрагмент потерян.',
  notProgresso: (n, tot) => `${n}/${tot} фрагментов до открытия`,
  notSblocco: (nome) => `${nome} теперь доступен при выборе героя!`,
  pickerBloccato: 'Закрыт',
  pickerSbloccaDaCasse: 'Откройте фрагментами из сундуков (инвентарь)',
  testerTitolo: '🛡️ Спасибо!',
  testerMessaggio: 'Спасибо, что вы тестер, это для меня очень важно.',
  testerExtra: 'В знак благодарности все герои уже открыты для вас. Удачи, викинг!',
  shopSottotitolo: 'Один бесплатный сундук каждый день. Скоро больше.',
  shopGratisTitolo: 'Бесплатный сундук дня',
  shopGratisInfo: 'Открывается мгновенно, без ожидания. Внутри — фрагмент случайного необычного героя.',
  shopGratisApri: 'Забрать бесплатно',
  shopGratisFatta: 'Сегодня уже забрано',
  shopGratisTornaDomani: 'Возвращайтесь завтра за следующим бесплатным сундуком.',
  shopRiscattoTitolo: 'Разовый обмен',
  shopRiscattoInfo: 'Один раз на аккаунт: выберите необычного героя и откройте его сразу, бесплатно.',
  shopRiscattoScegli: 'Выберите героя',
  shopRiscattoFatto: (nome) => `Обмен уже использован: ${nome}.`,
  riscattoTitolo: '🎁 Герой получен!',
  missioniTitolo: 'Миссии',
  missioniSottotitolo: 'Случайные партии для победы ради бесплатных сундуков.',
  missioniInfo: 'Каждая миссия — это партия против ботов: выиграйте её, чтобы сразу открыть заработанные сундуки.',
  missioniComeSi: 'Лёгкие миссии встречаются чаще; обычные реже — с более сильными ботами и двойной наградой.',
  missioneFacile: 'Лёгкая',
  missioneNormale: 'Обычная',
  missioneDifficolta: (label) => `Боты: ${label}`,
  missioneRicompensa: (n) => (n === 1 ? '1 сундук' : `${n} сундука`),
  missioneModo: (label) => `Режим: ${label}`,
  modoCalamita: 'Бедствие',
  modoBattaglia: 'Битва',
  modoCapitale: 'Столица',
  missioneGioca: 'Играть',
  missioneCompletata: '✓ Выполнена',
  missioniRefresh: (hhmm) => `Новые миссии через ${hhmm}`,
  missioniScontoRefresh: '🔖 Действует скидка: миссии обновляются быстрее.',
  missioneVittoriaTitolo: '🎉 Миссия выполнена!',
  missioneVittoriaCorpo: (n) =>
    n === 1 ? 'Вы победили! Откройте сундук-награду.' : `Вы победили! Откройте ${n} сундука-награды.`,
  missioneSconfittaTitolo: 'Миссия не выполнена',
  missioneSconfittaCorpo: 'В этот раз не вышло: миссия остаётся доступной, попробуйте снова!',
  chiudi: 'Закрыть',
  azioniDaFare: (n) => `Действий к выполнению: ${n}`,
};

const sr: InvStrings = {
  casseTitolo: 'Sanduci',
  casseInfo: 'Svaki sanduk sadrži fragment nasumičnog neuobičajenog junaka. Sa 5 fragmenata istog junaka otključavaš ga.',
  casseComeSi: 'Sanduk dobijaš na kraju partije (onlajn ili oflajn). Možeš držati najviše 3 u obradi.',
  scontoAttivo: '🔖 Popust aktivan: sanduci se otvaraju za 3 sata umesto 9.',
  cassaPronta: 'Spreman!',
  cassaApri: 'Otvori',
  cassaCarica: 'Učitavanje',
  casseVuote: 'Nema sanduka: završi partiju da bi ga zaradio.',
  casseMax: 'Sanduci puni (3/3): otvori jedan da napraviš mesta.',
  restano: (h) => `Ostalo ${h}`,
  eroiTitolo: 'Junaci',
  eroiInfo: 'Uobičajeni junaci su već tvoji. Neuobičajene otključavaš fragmentima iz sanduka.',
  sbloccato: 'Otključan',
  bloccato: 'Zaključan',
  frammenti: (n, tot) => `${n}/${tot} fragmenata`,
  notSbloccoTitolo: '🎉 Novi junak otključan!',
  notFrammentoTitolo: '✨ Fragment pronađen!',
  notSprecatoTitolo: 'Fragment protraćen',
  notSprecato: 'Već si imao ovog junaka: fragment je izgubljen.',
  notProgresso: (n, tot) => `${n}/${tot} fragmenata do otključavanja`,
  notSblocco: (nome) => `${nome} je sada dostupan pri izboru junaka!`,
  pickerBloccato: 'Zaključan',
  pickerSbloccaDaCasse: 'Otključaj fragmentima iz sanduka (inventar)',
  testerTitolo: '🛡️ Hvala!',
  testerMessaggio: 'Hvala što si tester, to mi mnogo znači.',
  testerExtra: 'Kao znak zahvalnosti svi junaci su ti već otključani. Uživaj, Vikinže!',
  shopSottotitolo: 'Jedan besplatan sanduk svakog dana. Uskoro još.',
  shopGratisTitolo: 'Besplatan sanduk dana',
  shopGratisInfo: 'Otvara se istog trena: bez čekanja. Unutra je fragment nasumičnog neuobičajenog junaka.',
  shopGratisApri: 'Preuzmi besplatno',
  shopGratisFatta: 'Već preuzeto danas',
  shopGratisTornaDomani: 'Vrati se sutra po sledeći besplatan sanduk.',
  shopRiscattoTitolo: 'Jednokratno preuzimanje',
  shopRiscattoInfo: 'Jednom po nalogu: izaberi neuobičajenog junaka i otključaj ga odmah, besplatno.',
  shopRiscattoScegli: 'Izaberi junaka',
  shopRiscattoFatto: (nome) => `Preuzimanje već iskorišćeno: ${nome}.`,
  riscattoTitolo: '🎁 Junak preuzet!',
  missioniTitolo: 'Misije',
  missioniSottotitolo: 'Nasumične partije za pobedu radi besplatnih sanduka.',
  missioniInfo: 'Svaka misija je partija protiv botova: pobedi je da odmah otvoriš zarađene sanduke.',
  missioniComeSi: 'Lake misije su najčešće; normalne su ređe, sa jačim botovima i dvostrukom nagradom.',
  missioneFacile: 'Laka',
  missioneNormale: 'Normalna',
  missioneDifficolta: (label) => `Botovi: ${label}`,
  missioneRicompensa: (n) => (n === 1 ? '1 sanduk' : `${n} sanduka`),
  missioneModo: (label) => `Režim: ${label}`,
  modoCalamita: 'Nedaća',
  modoBattaglia: 'Bitka',
  modoCapitale: 'Prestonica',
  missioneGioca: 'Igraj',
  missioneCompletata: '✓ Završena',
  missioniRefresh: (hhmm) => `Nove misije za ${hhmm}`,
  missioniScontoRefresh: '🔖 Popust aktivan: misije se obnavljaju brže.',
  missioneVittoriaTitolo: '🎉 Misija završena!',
  missioneVittoriaCorpo: (n) =>
    n === 1 ? 'Pobedio si! Otvori sanduk-nagradu.' : `Pobedio si! Otvori ${n} sanduka-nagrade.`,
  missioneSconfittaTitolo: 'Misija neuspešna',
  missioneSconfittaCorpo: 'Ovog puta nisi pobedio: misija ostaje dostupna, pokušaj ponovo!',
  chiudi: 'Zatvori',
  azioniDaFare: (n) => `Radnji za obaviti: ${n}`,
};

const DICTS: Record<Lang, InvStrings> = { it, en, es, fr, de, nl, ru, sr };

/** Stringhe dell'inventario nella lingua ATTIVA (proxy come `it` in index.ts). */
export const inv = new Proxy({} as InvStrings, {
  get(_t, prop: string | symbol) {
    return (DICTS[getLang()] as unknown as Record<string | symbol, unknown>)[prop];
  },
}) as InvStrings;
