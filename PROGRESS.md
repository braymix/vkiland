# PROGRESS — Viking-Island (ex Vikiland)

> Aggiornato a ogni step. Legenda: ✅ fatto · 🔄 in corso · ⬜ da fare

## Stato attuale

**MODALITÀ CALAMITÀ** ✅ — nuova modalità opzionale (single player, hot-seat e
online): a inizio partita si sceglie «Partita standard» o «Con calamità». Un
mazzo di 38 carte, una rivelata all'inizio di ogni giro e valida SOLO per quel
giro (finito il mazzo si torna normali). Due famiglie: persistenti (produzione
doppia/bloccata per materiale, scambi 3:1 e 2:1, niente Saga, Drago fermo o
«prima del tiro», bufera=niente sentieri, assedio=niente roccaforti, mare in
tempesta=niente banca, mercato d'oro=banca 2:1, abbondanza=tutto doppio) e
istantanee interattive (chi ha più/meno punti scarta/guadagna, scarto metà o
fino a 7, +2 di un materiale o +1 di tutti, strade gratis a chi ne ha meno,
doni di Carte Saga, razzia). Tutto deterministico dal seed (replay-abile);
partite standard invariate byte-per-byte. Engine puro con 19 test dedicati +
40 partite complete casuali; bot che giocano le calamità senza mosse illegali;
banner in partita e nomi/descrizioni nelle 8 lingue.

**FASE 3 COMPLETATA E COLLAUDATA IN PRODUZIONE** ✅ — multiplayer ONLINE:
server autoritativo (Fastify + Socket.io, stesso engine = anti-cheat),
account email+password, lobby con codici invito a 6 caratteri, bot lato
server, riconnessione, timer di turno opzionale con mossa automatica.
Deploy verificato dall'utente: client su Netlify + server su Render
(blueprint render.yaml), «funziona tutto correttamente».
Fasi 1 e 2 collaudate e approvate dall'utente (hot-seat, bugiardino,
mappa a schermo intero, mirini viola sugli approdi). Ogni approdo mostra
ora due pontili di legno SEMPRE visibili (strato statico) dai due vertici
costieri al drakkar: si vede a colpo d'occhio dove costruire per usarlo,
anche senza il mirino acceso. Rifiniture extra:
deploy pronto per Netlify (client) + Dockerfile (server); zoom della tavola
con pinch a due dita (mobile), rotella (desktop), trascinamento e reset «1×»;
tutorial completo «Libro delle Saghe» (11 capitoli: regole, uso dell'app,
hot-seat e online) raggiungibile dal menu, dal bugiardino in partita e
dall'Online (che lo apre direttamente sul capitolo «Giocare online»);
tavola a risoluzione doppia (320×280) con sprite ridisegnati; popup
scherzoso pre-partita; ordine di partenza deciso dai DADI nell'engine
(`turnOrder` + `startingRolls`, spareggi inclusi, deterministico dal seed,
mantenuto per tutta la partita, visibile nel diario e nella strip);
scelta del colore per ogni riga (anche bot) nel setup con picker (5 colori,
viola incluso); bot che PROPONGONO e ACCETTANO scambi (1 surplus ↔ 1 mancante,
conferma con l'accettante più indietro, ritiro se tutti rifiutano) e 4 livelli
di difficoltà: facile, normale, difficile, esperto (~14 scambi conclusi a
partita nelle simulazioni); rebranding in VIKING-ISLAND con logo pixel-art
originale (elmo cornuto e barba rossa, generato da scripts/gen-icons.mjs) e
PWA completa: manifest, service worker con precache (vite-plugin-pwa),
installabile a schermata home, gioco locale/hot-seat funzionante OFFLINE;
popup a tutto schermo del tiro di dadi (`DiceRollOverlay`, agganciato
all'evento `dadiTirati` via `lastRoll` nello snapshot, locale e online):
il totale compare grande e svanisce da solo, il 7 è «grave» (rosso,
tremolante, vignetta scura e avviso «Il Drago si sveglia!»); l'overlay non
cattura i click e rispetta `prefers-reduced-motion`. Schermata di fine
partita arricchita con due pulsanti: «Mappa finale» (riusa la mappa a
schermo intero con la vista da spettatore: tutti villaggi, roccaforti,
strade e Drago) e «Statistiche» — un cruscotto pixel con istogramma dei
numeri usciti (atteso vs reale, 6/8 in rosso, numero fortunato
evidenziato), confronto tra clan su scambi/costruzioni/risorse/Carte
Saga/saccheggi e un «Albo dei primati» (Mani d'oro, Mercante, Mastro
costruttore, Predone, Sfortunato, Stratega). Le statistiche si accumulano
lato client dal flusso di eventi (`game/stats.ts`, condiviso dai due
controller, solo eventi pubblici ⇒ coerenti anche online). Multilingua
al 100% in 8 lingue (italiano, inglese, spagnolo, francese, tedesco,
OLANDESE, russo, serbo) con lingua predefinita dedotta dal browser e
selettore nel menu — ora un PICKER a tendina (`<select>`) con la bandierina
della lingua accanto, non più una fila di pulsanti (`LanguageSwitcher`).
`i18n/index.ts` espone `it` come PROXY sulla lingua attiva (i punti d'uso
`it.qualcosa` non cambiano) e `useLang()` ri-renderizza l'albero al cambio;
ogni dizionario è tipizzato `: Strings` (forma derivata dall'italiano), così
TypeScript impone la copertura totale delle chiavi. Tutorial e diario di
bordo tradotti (incluso l'olandese: `nl.ts` + `tutorial.nl.ts`). Il russo usa
un font pixel con cirillico (`@fontsource/handjet`) attivato via
`html[data-lang='ru']`; il serbo e l'olandese sono in alfabeto latino.
Nel menu c'è un piccolo link «Riconoscimenti» che apre un popup (pixel-style)
con l'autore — Michele Panarotto, michelepanarotto00@gmail.com (link `mailto:`) —
e l'invito a mandare consigli/feedback; i testi sono tradotti nelle 8 lingue
(`crediti`, `creditiFattoDa`, `creditiInvito`, `creditiGrazie`).
Pulsante **«Annulla»** intelligente per i piazzamenti: compare nella barra
azioni solo dopo aver costruito (sentiero/villaggio/roccaforte, **setup
incluso**), annulla l'ULTIMO piazzamento e solo finché è ancora il tuo turno
(la finestra si chiude appena un bot o un altro umano agisce, o fai un'azione
non annullabile come tiro/scambio/fine turno). In locale: `LocalGameController`
tiene una pila di istantanee (stato + diario + statistiche di PRIMA dell'azione)
e `undo()` le ripristina; `GameSnapshot.canUndo` guida la UI. Online è sempre
`false` (stato autorevole sul server, gli altri hanno già visto la mossa).
Test: `undo.test.ts`.
Nelle partite online ora TUTTI possono **uscire dalla partita** (non solo
l'host): in basso a sinistra c'è «⇠ Esci dalla partita» per chiunque, con
popup di conferma che ricorda che il posto resta riservato e mostra il codice
per rientrare («Online» → «Unisciti»); l'host mantiene in più «✕ Termina
partita» (chiude per tutti). Lato server non serviva nulla: `lobby:leave` a
partita iniziata marca il posto disconnesso e il rientro col codice era già
supportato (coperto dai test lobby). Testi in 8 lingue (`esciPartita*`).
**INVENTARIO (Fase 4 — cosmetici, primo pezzo vero)**: skin per il Drago
(classico, **navicella spaziale**, **T-Rex**, **briganti**) e per le roccaforti
(classica, torre di guardia, castello). La LOGICA DEI COLORI resta ESATTA: le
skin del Drago usano le stesse chiavi semantiche `drago*` (in gioco il pezzo
prende aspetto E colore di chi lo ha spostato per ultimo; viola neutro se
nessuno), quelle delle roccaforti le chiavi `giocatore*` (sempre tinte del
colore del clan). Architettura: `PlayerCosmetics` è un PASSTHROUGH opaco
nell'engine (`PlayerConfig.cosmetics` → `PublicPlayer.cosmetics`, nessuna regola
lo tocca; id validi in `DRAGON_SKIN_IDS`/`STRONGHOLD_SKIN_IDS`, vocabolario
condiviso con il server); gli sprite vivono nel registro
`render/sprites/cosmetics.ts` con ripiego sul classico per id ignoti (client
vecchi/nuovi sempre compatibili). **Pulsante «🎒 Inventario» spostato nel MENU
PRINCIPALE** (subito sopra «Negozio»): funziona SEMPRE, anche senza account —
`game/localCosmetics.ts` salva le skin su QUESTO DISPOSITIVO (localStorage,
stessa validazione degli id) e `SetupScreen` le applica ai posti umani di ogni
nuova partita locale (i bot restano classici); se invece esiste già una
sessione «Online» valida, l'inventario passa in automatico alla modalità
account (`GET/POST /api/cosmetics`, così ti seguono su ogni dispositivo e le
vedono gli altri online) — la UI mostra sempre quale delle due modalità è
attiva. Server: `UserRecord.cosmetics` + endpoint dedicati; all'avvio online la
lobby legge le skin FRESCHE dall'account (`getCosmetics`) e le infila nei posti
→ `createGame`. Il pannello «Costruzioni» mostra l'icona della roccaforte con
la propria skin (verificato anche in una partita locale reale). Test:
`cosmetics.test.ts` engine (passthrough) e web (registro/matrici/chiavi di
tinta + collegamento fino a `LocalGameController`), `localCosmetics.test.ts`
(round-trip, merge, id invalidi, degrado senza localStorage) e lobby (skin →
vista di TUTTI online). i18n in 8 lingue (`inventario`, `inv*`, `skin.*`).
**Breve tutorial** (pulsante «a parte» in alto a destra del menu, distinto dal
«Libro delle Saghe»): tour interattivo passo-passo in 21 schede. La prima metà
mostra una PARTITA VERA che si svolge sulla tavola — istantanee DETERMINISTICHE
dal motore (`game/demoScript.ts`, seme verificato dal test: tocca a te per
primo, primo tiro ≠ 7 e produci): piazzi villaggio e sentiero, gli altri clan
piazzano, il secondo villaggio produce (esagoni evidenziati), tiri i dadi e
incassi (icone delle risorse ottenute), poi spiegazioni di costruzioni/costi,
Drago, Carte Saga, scambi, bonus e vittoria (con l'isola «a fine partita»
generata dai bot). La seconda metà spiega l'online con finte schermate
illustrative: l'arbitro-server, **il fatto che il server gratuito va in letargo
e al primo accesso ci mette 30–60 s a risvegliarsi** (con stato 🟠→🟢),
creazione account, codice invito, lobby e partita; chiude con i pulsanti «Gioca
coi bot» / «Prova l'online». Tutto tradotto nelle 7 lingue (chiavi `it.demo.*`,
copertura imposta dal tipo `Strings`). Navigazione avanti/indietro/salta, barre
di sezione, riproduzione automatica opzionale. Riusa `BoardCanvas` in sola
lettura. Test: `demoScript.test.ts` (determinismo + invarianti dell'arco).
All'apertura del Breve tutorial parte un **popup di benvenuto con coriandoli
pixel** (canvas, due ondate, gravità; classe dedicata `welcome-confetti`) e la
frase «Benvenuto nel magico mondo di Viking-Island» fra due file di 👏 animati;
si chiude col bottone/tap/Invio-Esc e rispetta prefers-reduced-motion.
**Palette colori LIBERA**: `PlayerColor` è ora un esadecimale qualsiasi (non più
5 nomi fissi). `render/sprites/palettes.ts` espone `FREE_PALETTE` (24 colori
vivaci, i primi 5 sono i classici) e `shadesFor(hex)` che ricava le tre tonalità
(piena/scura/chiara) sostituendo la vecchia mappa `PLAYER_COLORS`; i selettori
(setup e lobby online) mostrano la griglia di pastiglie **+ una pastiglia
arcobaleno «Personalizzato»** (`<input type=color>`) per QUALSIASI colore, con
lo stesso scambio anti-doppione. Lato server la lobby assegna i default dalla
palette e `setColor` accetta ogni `#rrggbb` valido (normalizzato minuscolo).
**Il Drago prende il colore di chi lo sposta**: lo stato porta
`board.dragonMovedBy` (null all'inizio, impostato in `muoviDrago`, esposto nella
vista); il renderer cuoce lo sprite del Drago con quel colore (chiavi `drago*`
mappate alle tonalità del giocatore in `bake.ts`), viola neutro finché nessuno
lo muove. Nuovo pannello **«Costruzioni»** (bottone accanto a «Carte» nella mano,
`BuildingsDialog`): mostra quanti sentieri/villaggi/roccaforti restano da
costruire (limite − piazzati, col villaggio promosso che torna disponibile),
con le icone tinte del proprio colore. Nuove chiavi i18n in 7 lingue
(`coloreCustom`, `costruzioni`, `costruzioniSub`, `disponibili`). Test:
`dragonColor.test.ts` (il Drago ricorda il suo ultimo «mover», anche nella vista).
**Fino a 6 giocatori con DUE taglie di tavola**: 2–4 → campo PICCOLO (raggio 2,
19 caselle, come sempre); 5–6 → campo GRANDE (raggio 3, 37 caselle, 96 vertici,
132 spigoli, 42 spigoli costieri, 11 approdi, banca 30, 2 tundra/deserti). La topologia
è ora memoizzata PER RAGGIO (`getTopology(radius)`), `isOnBoard`/`allBoardHexes`
accettano il raggio, e `constants.ts` espone un `BoardSpec` (sacchetti
terreni/segnalini/approdi + banca) con `SMALL_BOARD`/`LARGE_BOARD` e
`boardSpecForPlayers(n)`. `createGame` sceglie la taglia dal numero di giocatori
e salva `config.boardRadius` (esposto anche in `PlayerView`); il raggio viene
infilato in tutte le funzioni che usano la topologia (validate, legal, apply,
rules, longestRoad, production, view) e nei bot/renderer (`view.boardRadius`).
Il renderer è a misura: `boardCanvasSize(radius)` (piccolo 320×280, grande
416×364) e le funzioni di `layout.ts` accettano il raggio (origine al centro,
sprite invariati, tavola grande rimpicciolita via CSS), hit-testing
radius-aware. `MAX_PLAYERS=6` (server `MAX_SLOTS=6`); il Setup arriva a 6
vichinghi e mostra l'avviso «Campo piccolo/grande». Test: `largeBoard.test.ts`
(selezione taglia, dimensioni, partita completa a 6 con replay deterministico) e
`layout.test.ts` (geometria + hit-test del raggio 3).

## Checklist Fase 3 (online)

- ✅ `packages/server`: Fastify (REST `/api/register|login|logout|me`) +
     Socket.io con handshake autenticato dal token di sessione
- ✅ Account: hash scrypt (`node:crypto`, zero dipendenze native), sessioni
     token, storage JSON dietro interfaccia `Storage` (swap previsto a
     Drizzle SQLite/PostgreSQL + argon2id, formati versionati)
- ✅ Lobby: codici invito a 6 caratteri non ambigui, posti umani/bot gestiti
     dall'host, espulsione, chiusura, riconnessione (il posto resta legato
     all'utente a partita iniziata); colore del clan scelto nella lobby
     (`lobby:setColor`): ognuno cambia il PROPRIO, l'host anche quello dei bot,
     con scambio automatico per evitare duplicati (5 colori, viola incluso)
- ✅ `GameRoom` autoritativa: i client mandano `Action` come intenzioni, il
     server valida con lo stesso engine e rimanda a ciascun posto la SUA
     vista filtrata + eventi filtrati; bot sul server; partite finite
     salvate come seed+action_log (replay deterministico)
- ✅ Timer di turno opzionale (60/120s): allo scadere il server gioca la
     mossa di default (`defaultAction.ts`) — la partita non si blocca mai
- ✅ Client: interfaccia `GameController` comune; `RemoteGameController`
     (stessa GameScreen del locale, countdown ⏳, errori dal server non
     bloccanti); schermate Online (accesso/registrazione, crea/unisciti,
     stanza lobby); sessione ricordata in localStorage
- ✅ QA: 141 test verdi (engine 100, bot 9, server 21, web 11) + typecheck +
     lint; collaudo E2E con 2 browser reali: registrazione, lobby col codice,
     piazzamenti incrociati visti in tempo reale, zero errori console
- ✅ MVP senza backend: il client (es. su Netlify) è pienamente giocabile in
     locale anche senza server; la schermata Online fa un health-check e, se
     il server non c'è, lo dice chiaramente (l'URL resta modificabile per i
     server self-hosted)

## Checklist Fase 2 (hot-seat) — collaudata ✅

- ✅ Bugiardino: dialogo costi/PG/bonus/limiti pezzi, valori presi dalle costanti
     dell'engine, apribile col bottone «?» nella testata in qualunque fase
- ✅ Setup: toggle Umano/Bot su ogni riga (2–4 giocatori, almeno 1 umano,
     righe tutte rimovibili), menu «Online (in arrivo)» al posto di «Multigiocatore»
- ✅ Controller: `viewpoint` (l'umano al tavolo) + `handoff`; con 2+ umani il
     diario è filtrato da 'spettatore' (niente segreti condivisi sullo schermo)
- ✅ `hotseat.ts`: serializzazione pura di scarti simultanei e risposte alle
     offerte (prima i risponditori, il proponente conferma per ultimo; chi è
     già al tavolo ha precedenza) + 5 test dedicati
- ✅ `PassDeviceScreen` opaca a tutto schermo; chiusura automatica dei dialoghi
     locali al passaggio di mano; mosse della UI azzerate durante l'attesa
- ✅ QA: 120 test verdi + typecheck + lint; collaudo headless del flusso
     bot→umano→umano (overlay, conferma, rivelazione vista) senza errori console

## Checklist Fase 1

- ✅ 0. Scaffold monorepo (configs, package, PROGRESS.md, primo commit)
- ✅ 1. Engine: PRNG seedato + coordinate/topologia esagonale (54 vertici, 72 spigoli) + test
- ✅ 2. Engine: generazione tavola (terreni, segnalini, approdi, vincolo 6/8) + test
- ✅ 3. Engine: stato di gioco, azioni, `createGame`, fase di setup a serpentina + test
- ✅ 4. Engine: tiro dadi, produzione (penuria banca), costruzioni + test
- ✅ 5. Engine: scambi banca/approdi/tra giocatori + test
- ✅ 6. Engine: il Drago (scarto simultaneo >7, spostamento, furto) + test
- ✅ 7. Engine: Carte Saga (acquisto + 4 effetti + limiti) + test
- ✅ 8. Engine: Grande Via, Furia dei Berserker, punteggio, azioni legali, viste filtrate,
       60 partite random-legali + replay deterministico + fuzz legalità
- ✅ 9. Bot: random (baseline) + euristico 2 livelli — winrate 100% vs 3 random, 83% normale vs facile
- ✅ 10. Web: sprite pixel-art in codice, layout/hit-test testati, renderer Canvas 2 layer
- ✅ 11. Web: partita giocabile vs bot (controller locale, ActionBar, dialoghi, diario)
- ✅ 12. Web: schermate menu/setup/vittoria, responsive mobile/desktop
- ✅ 13. QA finale: `pnpm test` (115 test) + `typecheck` + `lint` + `build` verdi;
       collaudo in browser headless (setup, dadi, turni bot) senza errori console

## Come testare la Fase 3 (online)

```bash
pnpm install
pnpm test        # 141 test: motore (100), bot (9), server (21), web (11)
pnpm server      # terminale 1: server di gioco su http://localhost:8787
pnpm dev         # terminale 2: client su http://localhost:5173
```
Apri DUE browser (o uno normale + uno in incognito): in entrambi
menu → **Online** → **Registrati** (email qualsiasi, password ≥8 caratteri,
nome in gioco). Nel primo: **Crea partita** (timer opzionale) → appare il
**codice invito**; nel secondo: inserisci il codice → **Unisciti**. L'host può
aggiungere bot e poi **Salpa!**: ognuno vede solo la PROPRIA mano, le mosse
arrivano in tempo reale, i bot girano sul server. Chiudere e riaprire la
pagina riaggancia automaticamente la partita (riconnessione). Per giocare
da telefono in LAN: `pnpm dev --host` e, nel form di accesso, l'indirizzo
del server è già precompilato con l'host giusto.

Hot-seat (Fase 2): Nuova partita → metti 2+ righe su «Umano» col toggle →
tra un umano e l'altro appare «Passa il dispositivo». Partita solo vs bot =
identica alla Fase 1.

## Roadmap fasi successive

- **Fase 3.5 — Rifiniture online** (quando serviranno): Drizzle ORM
  (SQLite dev/PostgreSQL prod) e argon2id al posto di JSON+scrypt (interfacce
  già pronte), statistiche giocatore, rivincita nella stessa lobby, chat.
- **Fase 4 — Predisposizione monetizzazione**: registro palette/temi = skin, tabella
  `entitlements`, hook acquisti/ads nei punti marcati `PUNTO DI ESTENSIONE`.

## Decisioni architetturali

- **Engine puro e deterministico**: zero dipendenze (vincolato da ESLint `no-restricted-imports`),
  stato JSON-serializzabile, PRNG xoshiro128** nello stato → replay, validazione server-side,
  bot onesti (ricevono solo la vista filtrata `getPlayerView`).
- **Identificatori canonici**: vertice = tripla ordinata di esagoni incidenti, spigolo = coppia;
  adiacenze derivate matematicamente (54/72/30 verificati nei test), niente tabelle a mano.
- **`PiecesView`**: le regole geometriche (percorsi, piazzamenti, rapporti approdo) accettano
  sia `GameState` sia `PlayerView` → bot e UI riusano le stesse funzioni del motore.
- **Source-first**: i package esportano `./src/index.ts`; niente build step in dev.
- **Rendering**: Canvas 2D a 160×140 pixel logici scalato con `image-rendering: pixelated`;
  sprite = matrici di testo + palette semantiche (`render/sprites/`); hit-testing matematico
  sul bersaglio legale più vicino (mobile-friendly).
- **UI sostituibile**: `LocalGameController` (Fasi 1-2) e `RemoteGameController` (Fase 3)
  implementano la STESSA interfaccia `GameController` (`game/controller.ts`): la
  GameScreen non sa se gioca in locale o online.
- **Server autoritativo senza dipendenze native** (Fase 3): Fastify + Socket.io;
  i client inviano intenzioni, il server applica con lo stesso engine e rimanda
  viste/eventi filtrati per posto. Password scrypt (`node:crypto`) e storage JSON
  dietro interfaccia: lo swap a Drizzle/PostgreSQL + argon2id è un punto di
  sostituzione dichiarato, non una riscrittura.

## Comandi

`pnpm install` · `pnpm dev` · `pnpm server` · `pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm build`

## Punti di estensione Fase 4 (marcatori `PUNTO DI ESTENSIONE` nel codice)

- `packages/web/src/render/sprites/palettes.ts` — registro palette/temi = sistema skin.
- `packages/web/src/screens/MenuScreen.tsx` — bottone "Negozio" (disabilitato).
- `packages/engine/src/types.ts` (`PlayerState`) — campo `cosmetics` passthrough previsto.
- `packages/server/storage.ts` e README — tabella `entitlements` e hook acquisti/ads.

## Problemi noti / TODO

- Le animazioni (dadi, produzione) sono minimali; possibile polish futuro.
- Online: rivincita nella stessa lobby non ancora prevista (si crea una nuova lobby).
