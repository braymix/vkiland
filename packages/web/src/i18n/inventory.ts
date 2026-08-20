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
  // Comuni
  chiudi: string;
}

const it: InvStrings = {
  casseTitolo: 'Casse',
  casseInfo: 'Ogni cassa contiene il frammento di un eroe non comune casuale. Con 5 frammenti dello stesso eroe lo sblocchi.',
  casseComeSi: 'Guadagni una cassa a fine partita (online o offline). Puoi tenerne al massimo 3 in lavorazione.',
  scontoAttivo: '🔖 Sconto attivo: le casse restano in caricamento 9 ore.',
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
  chiudi: 'Chiudi',
};

const en: InvStrings = {
  casseTitolo: 'Chests',
  casseInfo: 'Each chest holds a fragment of a random uncommon hero. Collect 5 fragments of the same hero to unlock it.',
  casseComeSi: 'You earn a chest at the end of a game (online or offline). You can keep up to 3 in progress.',
  scontoAttivo: '🔖 Discount active: chests take 9 hours to open.',
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
  chiudi: 'Close',
};

const es: InvStrings = {
  casseTitolo: 'Cofres',
  casseInfo: 'Cada cofre contiene un fragmento de un héroe poco común aleatorio. Con 5 fragmentos del mismo héroe lo desbloqueas.',
  casseComeSi: 'Ganas un cofre al terminar una partida (en línea o local). Puedes tener hasta 3 en proceso.',
  scontoAttivo: '🔖 Descuento activo: los cofres tardan 9 horas en abrirse.',
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
  chiudi: 'Cerrar',
};

const fr: InvStrings = {
  casseTitolo: 'Coffres',
  casseInfo: 'Chaque coffre contient un fragment d’un héros peu commun aléatoire. Avec 5 fragments du même héros, vous le débloquez.',
  casseComeSi: 'Vous gagnez un coffre à la fin d’une partie (en ligne ou hors ligne). Vous pouvez en garder 3 en cours.',
  scontoAttivo: '🔖 Réduction active : les coffres mettent 9 heures à s’ouvrir.',
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
  chiudi: 'Fermer',
};

const de: InvStrings = {
  casseTitolo: 'Truhen',
  casseInfo: 'Jede Truhe enthält ein Fragment eines zufälligen ungewöhnlichen Helden. Mit 5 Fragmenten desselben Helden schaltest du ihn frei.',
  casseComeSi: 'Du erhältst eine Truhe am Ende eines Spiels (online oder offline). Du kannst höchstens 3 in Bearbeitung halten.',
  scontoAttivo: '🔖 Rabatt aktiv: Truhen brauchen 9 Stunden zum Öffnen.',
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
  chiudi: 'Schließen',
};

const nl: InvStrings = {
  casseTitolo: 'Kisten',
  casseInfo: 'Elke kist bevat een fragment van een willekeurige ongewone held. Met 5 fragmenten van dezelfde held ontgrendel je hem.',
  casseComeSi: 'Je verdient een kist aan het einde van een spel (online of offline). Je kunt er maximaal 3 in behandeling houden.',
  scontoAttivo: '🔖 Korting actief: kisten doen er 9 uur over om te openen.',
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
  chiudi: 'Sluiten',
};

const ru: InvStrings = {
  casseTitolo: 'Сундуки',
  casseInfo: 'В каждом сундуке — фрагмент случайного необычного героя. Собрав 5 фрагментов одного героя, вы его открываете.',
  casseComeSi: 'Сундук выдаётся в конце партии (онлайн или офлайн). Одновременно можно держать не более 3.',
  scontoAttivo: '🔖 Действует скидка: сундуки открываются 9 часов.',
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
  chiudi: 'Закрыть',
};

const sr: InvStrings = {
  casseTitolo: 'Sanduci',
  casseInfo: 'Svaki sanduk sadrži fragment nasumičnog neuobičajenog junaka. Sa 5 fragmenata istog junaka otključavaš ga.',
  casseComeSi: 'Sanduk dobijaš na kraju partije (onlajn ili oflajn). Možeš držati najviše 3 u obradi.',
  scontoAttivo: '🔖 Popust aktivan: sanducima treba 9 sati da se otvore.',
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
  chiudi: 'Zatvori',
};

const DICTS: Record<Lang, InvStrings> = { it, en, es, fr, de, nl, ru, sr };

/** Stringhe dell'inventario nella lingua ATTIVA (proxy come `it` in index.ts). */
export const inv = new Proxy({} as InvStrings, {
  get(_t, prop: string | symbol) {
    return (DICTS[getLang()] as unknown as Record<string | symbol, unknown>)[prop];
  },
}) as InvStrings;
