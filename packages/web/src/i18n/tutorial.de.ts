import type { TutorialChapter } from './tutorial';

/** German (DE) tutorial — same structure as the Italian one, translated text. */
export const tutorialDe: TutorialChapter[] = [
  {
    chip: 'Ziel',
    title: 'Willkommen auf Viking-Island!',
    blocks: [
      {
        t: 'p',
        text:
          'Willkommen auf Viking-Island, der Insel der Nordclans! Baue Pfade, ' +
          'Dörfer und Festungen, treibe Handel und verteidige dich gegen den Drachen: Es ' +
          'gewinnt, wer als Erster im eigenen Zug 10 Ruhmespunkte (RP) erreicht.',
      },
      { t: 'h', text: 'Was Ruhmespunkte gibt' },
      {
        t: 'list',
        items: [
          'Dorf = 1 RP (höchstens 5 Dörfer)',
          'Festung = 2 RP (höchstens 4, wird auf eines deiner Dörfer gebaut)',
          'Die Große Straße = 2 RP (die längste Pfadkette, mindestens 5)',
          'Berserkerwut = 2 RP (mehr ausgespielte Berserker als alle anderen, mindestens 3)',
          'Heldensaga = 1 geheimer RP (verdeckte Karte, zählt sofort)',
        ],
      },
      {
        t: 'tip',
        text:
          'Die RP der Helden bleiben vor den Gegnern verborgen: Der Punktestand, den du ' +
          'bei anderen siehst, ist vielleicht nicht alles!',
      },
    ],
  },
  {
    chip: 'Insel',
    title: 'Die Insel und ihre Rohstoffe',
    blocks: [
      {
        t: 'p',
        text:
          'Die Insel besteht aus Sechsecken, jedes mit einem Gelände, das einen Rohstoff ' +
          'erzeugt, und einem Zahlenplättchen (2–12).',
      },
      { t: 'resRow' },
      {
        t: 'list',
        items: [
          'Kiefernwald → Holz',
          'Rotsteinbruch → Stein',
          'Weide → Wolle',
          'Gerstenfelder → Gerste',
          'Eisenmine → Eisen',
          'Gefrorene Tundra → nichts: Sie ist der Hort des Drachen',
        ],
      },
      { t: 'h', text: 'Die Zahlenplättchen' },
      {
        t: 'p',
        text:
          'Die Punkte unter der Zahl zeigen, wie wahrscheinlich sie mit zwei ' +
          'Würfeln fällt: 6 und 8 (in Rot) kommen sehr oft, 2 und 12 fast nie. Gute ' +
          'Zahlen zu wählen zählt mehr, als gute Gelände zu wählen.',
      },
      { t: 'h', text: 'Die Häfen' },
      {
        t: 'p',
        text:
          'An der Küste liegen 9 Häfen (die Drakkars): 4 allgemeine (3:1-Handel) und 5 ' +
          'auf einen Rohstoff spezialisierte (2:1). Um sie zu nutzen, brauchst du ein ' +
          'Dorf oder eine Festung auf einer der beiden Kreuzungen des Hafens — beim ' +
          'Platzieren zeigen diese Kreuzungen eine LILA Markierung statt einer weißen.',
      },
    ],
  },
  {
    chip: 'Start',
    title: 'Der Spielbeginn',
    blocks: [
      {
        t: 'p',
        text:
          'Es geht „im Schlangenmuster“ los: Reihum platziert jeder Spieler 1 Dorf + 1 ' +
          'Pfad, dann geht es in umgekehrter Reihenfolge für die zweite Runde zurück. Wer ' +
          'das erste Dorf zuletzt platziert, platziert das zweite zuerst.',
      },
      {
        t: 'list',
        items: [
          'Tippe auf eine hervorgehobene Kreuzung, um das Dorf zu platzieren',
          'Tippe danach auf eine der angrenzenden Kanten für den Pfad',
          'Das ZWEITE Dorf erzeugt sofort die Rohstoffe der Sechsecke ringsum',
        ],
      },
      { t: 'h', text: 'Die Abstandsregel' },
      {
        t: 'p',
        text:
          'Zwei Gebäude dürfen nie auf benachbarten Kreuzungen stehen: Zwischen deinem ' +
          'Dorf und jedem anderen Gebäude muss immer mindestens eine freie ' +
          'Kreuzung liegen. Das gilt für das ganze Spiel.',
      },
      {
        t: 'tip',
        text:
          'Suche für das erste Dorf starke Zahlen (6, 8, 5, 9) und vielfältige ' +
          'Rohstoffe; mit dem zweiten ergänzt du, was dir fehlt, oder schnappst dir einen Hafen.',
      },
    ],
  },
  {
    chip: 'Zug',
    title: 'Dein Zug',
    blocks: [
      { t: 'h', text: '1. Würfeln' },
      {
        t: 'p',
        text:
          'ALLE Sechsecke mit der gewürfelten Zahl erzeugen: 1 Rohstoff für jedes ' +
          'angrenzende Dorf, 2 für jede Festung. Auch die Gegner erzeugen, nicht nur, ' +
          'wer würfelt!',
      },
      { t: 'h', text: '2. Mach deine Züge (in beliebiger Reihenfolge)' },
      {
        t: 'list',
        items: [
          'Baue Pfade, Dörfer, Festungen',
          'Kaufe und spiele Saga-Karten (1 ausgespielte Karte pro Zug)',
          'Handle mit der Bank, den Häfen oder den anderen Spielern',
        ],
      },
      { t: 'h', text: '3. Zug beenden' },
      {
        t: 'p',
        text:
          'Drücke „Zug beenden“ und die Würfel gehen an den nächsten Spieler. Hast du 10 RP, ' +
          'endet das Spiel sofort mit deinem Sieg.',
      },
      {
        t: 'tip',
        text:
          'Hat die Bank nicht genug Karten eines Rohstoffs, um MEHRERE Spieler ' +
          'beim selben Wurf zu bedienen, wird dieser Rohstoff an niemanden verteilt (Knappheit).',
      },
    ],
  },
  {
    chip: 'Drache',
    title: 'Die 7 und der Drache',
    blocks: [
      {
        t: 'p',
        text: 'Fällt eine 7, erzeugt niemand und drei Dinge geschehen, der Reihe nach:',
      },
      {
        t: 'list',
        items: [
          '1. Wer MEHR als 7 Rohstoffkarten hat, wirft die Hälfte ab (abgerundet)',
          '2. Wer gewürfelt hat, bewegt den Drachen auf ein anderes Sechseck seiner Wahl',
          '3. Er stiehlt 1 zufällige Karte von einem Spieler mit einem Gebäude auf diesem Sechseck',
        ],
      },
      {
        t: 'p',
        text:
          'Das Sechseck mit dem Drachen erzeugt NICHT, solange der Drache dort bleibt: ' +
          'Setze ihn auf die besten Zahlen deiner Gegner!',
      },
      {
        t: 'tip',
        text:
          'Die Berserker-Karte bewegt den Drachen auf dieselbe Weise (und zählt für die ' +
          'Berserkerwut). Du kannst sie sogar VOR dem Würfeln ausspielen.',
      },
    ],
  },
  {
    chip: 'Bauen',
    title: 'Bauten und Kosten',
    blocks: [
      { t: 'cost', kind: 'sentiero', note: 'verbindet deine Gebäude · max. 15' },
      { t: 'cost', kind: 'villaggio', note: '1 RP, erzeugt 1 Rohstoff · max. 5' },
      { t: 'cost', kind: 'roccaforte', note: '2 RP, erzeugt 2 Rohstoffe · max. 4' },
      { t: 'cost', kind: 'cartaSaga', note: 'eine Überraschungskarte aus dem Stapel (25 Karten)' },
      { t: 'h', text: 'Die Platzierungsregeln' },
      {
        t: 'list',
        items: [
          'Pfade müssen dein Netz berühren (einen deiner Pfade oder ein Gebäude)',
          'Eine von einem GEGNER besetzte Kreuzung trennt dein Netz ab',
          'Dörfer kommen auf eine mit deinen Pfaden verbundene Kreuzung + Abstandsregel',
          'Die Festung ersetzt EINES deiner Dörfer (das Dorf wird wieder verfügbar)',
        ],
      },
      {
        t: 'p',
        text:
          'Im Spiel: Drücke „Pfad“, „Dorf“ oder „Festung“ in der unteren Leiste und ' +
          'tippe auf eines der hervorgehobenen Ziele auf dem Brett. Die Schaltfläche „?“ ' +
          'oben öffnet die Regelkarte mit dieser Übersicht.',
      },
    ],
  },
  {
    chip: 'Handel',
    title: 'Der Handel',
    blocks: [
      { t: 'h', text: 'Mit der Bank und den Häfen' },
      {
        t: 'list',
        items: [
          'Bank: 4 gleiche Rohstoffe → 1 nach Wahl (immer verfügbar)',
          'Allgemeiner Hafen (3:1): 3 gleiche → 1 nach Wahl',
          'Spezieller Hafen (2:1): 2 von DIESEM Rohstoff → 1 nach Wahl',
        ],
      },
      {
        t: 'p',
        text: 'Das beste Verhältnis wird im Dialog „Bank / Häfen“ automatisch angewendet.',
      },
      { t: 'h', text: 'Mit den anderen Spielern (in deinem Zug)' },
      {
        t: 'list',
        items: [
          'Biete EINEM Spieler einen Handel an: Nimmt er an, geschieht er sofort',
          'Oder biete ihn ALLEN an: Jeder antwortet, dann schließt du mit, wem du willst',
          'Du kannst das Angebot jederzeit zurückziehen; nur Rohstoff gegen Rohstoff ist möglich',
        ],
      },
    ],
  },
  {
    chip: 'Saga-Karten',
    title: 'Die Saga-Karten',
    blocks: [
      {
        t: 'p',
        text:
          'Der Stapel hat 25 Karten. Gekaufte Karten kannst du AB DEM NÄCHSTEN ZUG ' +
          'ausspielen (Helden zählen dagegen sofort, verdeckt). Du kannst höchstens eine ' +
          'Karte pro Zug ausspielen.',
      },
      { t: 'sagaList' },
      {
        t: 'tip',
        text:
          'Der Tribut ist mitten im Spiel verheerend: Wähle den Rohstoff, den gerade alle ' +
          'erzeugt haben. Das Festmahl ist perfekt, um eine Festung auf der Stelle ' +
          'fertigzustellen.',
      },
    ],
  },
  {
    chip: 'Bonus',
    title: 'Die Große Straße und die Wut',
    blocks: [
      { t: 'h', text: 'Die Große Straße (2 RP)' },
      {
        t: 'p',
        text:
          'Geht an den mit der längsten Kette ZUSAMMENHÄNGENDER Pfade, mindestens 5. ' +
          'Ein gegnerisches Gebäude auf einer Kreuzung der Kette teilt sie ' +
          'in zwei! Bei Gleichstand bleibt der Bonus bei dem, der ihn hatte.',
      },
      { t: 'h', text: 'Die Berserkerwut (2 RP)' },
      {
        t: 'p',
        text:
          'Geht an den, der die meisten Berserker-Karten AUSGESPIELT hat, mindestens 3. Wie bei ' +
          'der Straße musst du den Inhaber echt übertreffen, um ihm den Bonus zu entreißen.',
      },
      {
        t: 'tip',
        text:
          'Diese 4 RP entscheiden oft das Spiel: Zähle die Pfade und Berserker der ' +
          'Gegner in der oberen Leiste (STRASSE und WUT zeigen die Inhaber).',
      },
    ],
  },
  {
    chip: 'App',
    title: 'Die App benutzen',
    blocks: [
      { t: 'h', text: 'Das Brett' },
      {
        t: 'list',
        items: [
          'Tippe auf ein hervorgehobenes Ziel zum Platzieren (weiß = Zug, lila = Kreuzung mit Hafen)',
          'Zoom: mit zwei Fingern spreizen (Handy) oder das Rad nutzen (PC), zum Verschieben ziehen, „1×“ zum Zurücksetzen',
          '🗺 öffnet die Vollbildkarte (mit ✕ oder ESC schließen)',
          '„?“ öffnet die Regelkarte mit Kosten, Punkten und Schnellregeln',
        ],
      },
      { t: 'h', text: 'Die Anzeigen' },
      {
        t: 'list',
        items: [
          'Oben: Würfel, Zugphase und Spieler (RP ★, Rohstoffkarten, Saga-Karten)',
          'Unten: deine Hand, die Schaltfläche „Karten“ und das Logbuch mit der Chronik',
          'Die Aktionsleiste zeigt nur, was du in diesem Moment tun kannst',
        ],
      },
      { t: 'h', text: 'Mehrere Spieler am selben Gerät (Hot-Seat)' },
      {
        t: 'p',
        text:
          'Stelle bei „Neues Spiel“ mehrere Zeilen auf „Mensch“. Zwischen einem ' +
          'menschlichen Zug und dem nächsten erscheint „Gerät weitergeben“: Die Hand des ' +
          'Nächsten wird erst nach der Bestätigung aufgedeckt, damit niemand spickt. Auch die ' +
          'Abwürfe bei der 7 geschehen einzeln, nacheinander.',
      },
      {
        t: 'tip',
        text:
          'Im Setup kannst du den „Karten-Seed“ festlegen: Derselbe Seed erzeugt immer ' +
          'dieselbe Insel (praktisch für Wiederholungen oder faire Duelle).',
      },
    ],
  },
  {
    chip: 'Online',
    title: 'Online spielen',
    blocks: [
      { t: 'h', text: '1. Erstelle ein Konto' },
      {
        t: 'p',
        text:
          'Drücke im Menü „Online“ und registriere dich: Du brauchst nur einen Benutzernamen (er ' +
          'wird auch dein Name im Spiel) und ein Passwort mit mindestens 8 Zeichen. ' +
          'Keine E-Mail: Sie wird nicht gebraucht. Ein grünes Häkchen sagt dir, ob der Server ' +
          'erreichbar ist.',
      },
      { t: 'h', text: '2. Erstelle das Spiel oder tritt bei' },
      {
        t: 'list',
        items: [
          'SPIEL ERSTELLEN → du erhältst einen CODE aus 6 Buchstaben/Ziffern: schick ihn deinen Freunden',
          'BEITRETEN → gib den erhaltenen Code ein und du bist in der Lobby',
          'Der Host kann Bots hinzufügen und dann „In See stechen!“ drücken (2 bis 6 Spieler)',
        ],
      },
      { t: 'h', text: '3. Los geht’s!' },
      {
        t: 'p',
        text:
          'Jeder spielt von seinem eigenen Gerät und sieht NUR die eigene Hand: Der ' +
          'Schiedsrichter ist der Server, der jeden Zug nach denselben Regeln wie das ' +
          'lokale Spiel prüft (Schummeln ist unmöglich). Die Züge der anderen kommen in ' +
          'Echtzeit ins Logbuch.',
      },
      { t: 'h', text: 'Timer und Verbindungsabbrüche' },
      {
        t: 'list',
        items: [
          'Zugtimer (optional, beim Erstellen gewählt): Läuft er ab, macht das Spiel selbst den harmlosesten Zug, damit niemand das Spiel blockiert',
          'Fällst du raus oder schließt die Seite, komm zurück: Die Sitzung verbindet sich von selbst wieder, oder tritt mit dem Lobby-Code erneut bei — dein Platz bleibt deiner',
        ],
      },
      {
        t: 'tip',
        text:
          'Ohne konfigurierten Server ist Online schlicht aus: Der Rest des Spiels ' +
          '(Bots und Hot-Seat) funktioniert trotzdem, auch offline.',
      },
    ],
  },
];
