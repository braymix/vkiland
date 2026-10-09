# 🌍 Vikings Around the World — *le regole sono cambiate!!!*

> Documento di partenza (regolamento + specifica tecnica + piano di lavoro) della
> **nuova modalità** di Viking-Island. Tutto ciò che esiste oggi diventa la
> **Modalità Classica** e NON va toccato nelle regole.
>
> Stato: ⬜ da fare. Aggiornare `PROGRESS.md` a ogni fase completata.

---

## 0. Istruzioni per chi implementa (leggere prima di tutto)

1. **Non modificare le regole della Classica.** `packages/engine` resta com'è.
   Le uniche modifiche ammesse fuori dai nuovi package sono "di raccordo":
   menu d'ingresso, `gameKind` su lobby/room, admin, i18n, routing schermate.
2. **Nuovo motore separato**: `packages/engine-world` (`@vikiland/engine-world`),
   puro, zero dipendenze, deterministico con PRNG seedato. Riusa *copiandolo o
   importandolo* solo ciò che è generico (`rng.ts`), mai le regole esagonali.
3. **La mappa è un DATO, non codice**: l'engine lavora su un grafo di territori
   (`MapDefinition`). Mondo, nazione, città: per l'engine è la stessa cosa.
4. Procedere **per fasi** (§9). Ogni fase: test verdi (`pnpm test`),
   `pnpm typecheck`, `pnpm lint`, aggiornamento `PROGRESS.md`, commit.
5. Stile del codice: lo stesso del repo (TypeScript, commenti in italiano,
   nomi di dominio in italiano, stringhe UI via i18n).
6. In caso di dubbio sulle regole: scegliere l'opzione **più semplice** e
   annotarla in §11 «Decisioni prese durante l'implementazione».

---

## 1. Visione in una riga

I clan vichinghi salpano alla conquista del **mondo vero**: la mappa non è più a
esagoni ma fatta di **territori reali** (nazioni, regioni, un domani i quartieri
della tua città). Ogni clan muove il proprio **Jarl** per esplorare, fonda
villaggi dove arriva, **riscuote pedaggi** da chi attraversa le sue terre e
accumula **argento** per costruire la Sala del Jarl.

**Principio guida: semplice.** Rispetto alla Classica si aggiunge UN concetto
centrale (il Jarl che si muove, con il pedaggio) e si toglie il Drago.

---

## 2. Componenti

### 2.1 Materiali (6)

| Materiale | Icona | Come si ottiene |
|---|---|---|
| legname | 🪵 | produzione (dadi) |
| pietra | 🪨 | produzione |
| lana | 🐑 | produzione |
| orzo | 🌾 | produzione |
| ferro | ⛏️ | produzione |
| **argento** | 🪙 | **NON dai dadi**: pedaggi, Mercati, banca (§5.4) |

L'argento è la "moneta": serve per le costruzioni di prestigio e paga i pedaggi.

### 2.2 Il tabellone: territori e collegamenti

- **Territorio**: nome, continente, materiale prodotto (o `deserto`, che non
  produce), numero 2–12 (assente per i deserti), flag `costiero`.
- **Collegamento** fra due territori:
  - `terra` — si può muovere a piedi e **costruirci una strada**;
  - `mare` — rotta marittima: si percorre solo partendo da un territorio dove
    il clan ha un **Porto** (§3), non ci si costruisce nulla.
- **Numeri**: i materiali sono fissati dalla mappa (tematici), i numeri sono
  **distribuiti a caso dal seed** a inizio partita con il vincolo che 6 e 8
  non siano su territori collegati (stessa idea di `avoidAdjacent68`).
  Opzione di partita: «Materiali casuali» = mescola anche i materiali.

### 2.3 Pezzi per clan

| Pezzo | Quantità |
|---|---|
| Jarl (pedina) | 1 |
| Strade | 15 |
| Villaggi | 6 |
| Città | 4 |
| Sala del Jarl | 1 |
| Porti | 3 |
| Mercati | 3 |

---

## 3. Costruzioni

| Costruzione | Costo | Dove | Effetto | PG |
|---|---|---|---|---|
| **Strada** | 1🪵 1🪨 | su un collegamento `terra` libero che tocca il territorio del **tuo Jarl** o un territorio **tuo** o un'altra tua strada | muoversi lungo le proprie strade costa la metà (§4.2); conta per «La Grande Via» | 0 |
| **Villaggio** | 1🪵 1🪨 1🐑 1🌾 | nel territorio dove si trova **il tuo Jarl**, se è **libero** (nessun edificio) e non è deserto | il territorio diventa **tuo**: produce 2 e incassa pedaggi | 1 |
| **Città** | 2🌾 3⛏️ | su un tuo villaggio (ovunque, il Jarl non serve) | produce 3 | 2 |
| **Sala del Jarl** | 2🪙 2⛏️ 1🪨 1🌾 | su una tua città (max 1 per clan) | produce 3; pedaggio doppio (§4.3) | 4 |
| **Porto** | 1🪵 1🐑 1⛏️ | su un tuo territorio **costiero** (max 1 per territorio) | abilita le rotte `mare` in partenza da lì; scambi con la banca **3:1** | 0 |
| **Mercato** | 1🪨 1🐑 1🌾 | su un tuo territorio (max 1 per territorio) | quando esce il numero del territorio, **+1 🪙** oltre alla produzione | 0 |

Regole generali:
- **Un solo proprietario per territorio**: un territorio con un edificio è di quel
  clan e nessun altro ci può costruire. Porto e Mercato sono **annessi**: non
  occupano un posto, si aggiungono a un territorio già tuo.
- Niente "regola della distanza" della Classica: si può fondare un villaggio
  accanto a quello di un avversario.
- Upgrade (Città, Sala) e annessi (Porto, Mercato) **non richiedono il Jarl**.
  Solo il **Villaggio** richiede che il Jarl sia lì: è il motore
  dell'espansione.

---

## 4. Il Jarl: movimento e pedaggio

### 4.1 Posizione
Ogni clan ha **un Jarl** su un territorio. Più Jarl possono stare nello stesso
territorio. Il Jarl non si può catturare né bloccare.

### 4.2 Movimento — **4 punti movimento per turno**
- Muoversi lungo un collegamento **dove hai una TUA strada**: costa **1 punto**.
- Muoversi lungo un collegamento `terra` **senza** tua strada: costa **2 punti**.
- Muoversi lungo una rotta `mare`: costa **2 punti** e si può fare solo
  **partendo da un territorio dove hai un Porto**.

Quindi: **fino a 4 territori sulle tue strade, 2 fuori**, combinabili (es. 2
passi su strada + 1 passo fuori). I punti non usati si perdono a fine turno.
Il movimento si fa **dopo il tiro** e può essere spezzato fra altre azioni
(muovo 1, costruisco, muovo ancora…) finché restano punti.

### 4.3 Pedaggio ("la tassa")
Quando il tuo Jarl **entra** in un territorio di un altro clan, paghi il pedaggio
al proprietario:
- se hai argento paghi **1 🪙**;
- altrimenti paghi **1 materiale a tua scelta**;
- se non hai nulla, non paghi nulla.
- Se il territorio ha la **Sala del Jarl**, il pedaggio è **doppio** (2 🪙, o
  2 materiali a scelta, o quel che hai fino a 2).

Limiti: si paga al massimo **una volta per territorio per turno** (andare e
tornare non costa due volte); niente pedaggio per il territorio in cui il Jarl
inizia il turno; niente pedaggio fra compagni di squadra (quando arriverà la
modalità Squadra).

UI: prima di confermare un passo che costa pedaggio, mostrare "Paghi 1🪙 a
<clan>" (ed eventuale scelta del materiale).

---

## 5. Il turno

### 5.1 Setup (ordine a serpentina come la Classica)
Ogni clan, in ordine 1→N poi N→1, piazza **1 villaggio + 1 strada** adiacente su
un territorio libero non deserto **con almeno un collegamento `terra` libero**
(le isole raggiungibili solo via mare non sono scelte valide nel setup). Il **Jarl** si mette sul territorio del
**secondo** villaggio. Il secondo villaggio dà subito 1 materiale del suo
territorio. (Con Carte/Numeri Coperti in futuro si potranno riusare le idee
della Classica — fuori dalla v1.)

### 5.2 Fasi del turno
1. **Tira** 2d6 → produzione (§5.3) o, con 7, la **Tassa del Re** (§5.5).
2. **Azioni libere**, in qualsiasi ordine e quante volte vuoi:
   - muovere il Jarl (entro i 4 punti),
   - scambiare (banca, porto, giocatori),
   - costruire.
3. **Fine turno**.

### 5.3 Produzione
Per ogni territorio con il numero uscito: il proprietario prende **2** materiali
del territorio con un Villaggio, **3** con Città o Sala del Jarl. Se c'è un
**Mercato**, anche **+1 🪙**. Banca illimitata (come la Classica).

### 5.4 Scambi
- Con la **banca**: 4:1 qualsiasi materiale (argento compreso).
- Con un **Porto** tuo: 3:1.
- **Argento in banca**: 1 🪙 → 2 materiali a scelta; 3 materiali qualsiasi → 1 🪙.
- Con gli altri giocatori: libero, come nella Classica (riusare il flusso
  proposta/accetta/conferma della UI esistente).

### 5.5 Il 7 — «Tassa del Re» (sostituisce il Drago)
1. Ogni clan con **più di 7 carte** (argento compreso) ne scarta la metà
   (per difetto) — riusare il dialogo di scarto della Classica.
2. Chi ha tirato prende **1 carta a caso** da un clan che ha un edificio nel
   territorio del suo Jarl **o in un territorio collegato** (a scelta se più
   d'uno; niente se nessuno).
3. Nessuna produzione.

Non c'è nessuna pedina che blocca i territori.

---

## 6. Punti Gloria e vittoria

| Fonte | PG |
|---|---|
| Villaggio | 1 |
| Città | 2 |
| Sala del Jarl | 4 |
| **La Grande Via**: strada continua più lunga, minimo 5 collegamenti | 2 |
| **Il Grande Viaggiatore**: chi possiede territori nel maggior numero di **continenti** (minimo 3; a parità resta a chi l'aveva) | 2 |

**Si vince a 10 PG** (impostabile da 8 a 15) alla fine della propria azione,
come nella Classica.

Fuori dalla v1 (idee per dopo, solo se la v1 regge): Carte Saga dedicate,
Calamità, Squadra, Eroi.

---

## 7. La prima mappa: «Il Mondo» (32 territori)

Mappa fatta a mano, 6 continenti. I nomi sono quelli di default: l'admin li
può cambiare (§8.5). 29 territori produttivi + 3 deserti.

Conteggio materiali: legname 7, lana 6, orzo 6, pietra 5, ferro 5, deserto 3.

| id | Nome | Continente | Materiale | Costiero | Centro (lon, lat) |
|---|---|---|---|---|---|
| `scandinavia` | Scandinavia | Europa | ferro | sì | 15, 63 |
| `islanda` | Islanda | Europa | lana | sì | -19, 65 |
| `britannia` | Isole Britanniche | Europa | lana | sì | -3, 54 |
| `europa_occ` | Europa Occidentale | Europa | orzo | sì | 3, 47 |
| `iberia` | Penisola Iberica | Europa | orzo | sì | -4, 40 |
| `italia` | Italia | Europa | pietra | sì | 12, 43 |
| `europa_centrale` | Europa Centrale | Europa | legname | sì | 15, 51 |
| `balcani` | Balcani | Europa | pietra | sì | 22, 43 |
| `russia_eur` | Russia Europea | Europa | legname | sì | 40, 56 |
| `medio_oriente` | Medio Oriente | Asia | pietra | sì | 37, 36 |
| `arabia` | Penisola Arabica | Asia | **deserto** | sì | 45, 23 |
| `persia` | Persia | Asia | ferro | sì | 54, 32 |
| `asia_centrale` | Asia Centrale | Asia | lana | no | 66, 45 |
| `siberia` | Siberia | Asia | legname | sì | 100, 62 |
| `india` | India | Asia | orzo | sì | 78, 22 |
| `cina` | Cina | Asia | orzo | sì | 105, 34 |
| `giappone` | Giappone e Corea | Asia | ferro | sì | 135, 37 |
| `sud_est_asia` | Sud-est Asiatico | Asia | legname | sì | 110, 5 |
| `nord_africa` | Nord Africa | Africa | orzo | sì | 10, 32 |
| `sahara` | Sahara | Africa | **deserto** | no | 10, 20 |
| `africa_occ` | Africa Occidentale | Africa | legname | sì | 0, 9 |
| `africa_or` | Africa Orientale | Africa | lana | sì | 37, 3 |
| `africa_australe` | Africa Australe | Africa | ferro | sì | 25, -22 |
| `groenlandia` | Groenlandia | America del Nord | **deserto** | sì | -41, 72 |
| `canada` | Canada | America del Nord | legname | sì | -100, 58 |
| `usa_est` | Stati Uniti Est | America del Nord | orzo | sì | -82, 37 |
| `usa_ovest` | Stati Uniti Ovest | America del Nord | ferro | sì | -112, 40 |
| `messico` | Messico e Centro America | America del Nord | pietra | sì | -100, 20 |
| `ande` | Ande | America del Sud | pietra | sì | -74, -8 |
| `brasile` | Brasile | America del Sud | legname | sì | -52, -10 |
| `argentina` | Argentina | America del Sud | lana | sì | -65, -35 |
| `australia` | Australia | Oceania | lana | sì | 134, -25 |

**Collegamenti `terra`** (42):
scandinavia–russia_eur, scandinavia–europa_centrale, europa_occ–iberia,
europa_occ–italia, europa_occ–europa_centrale, italia–europa_centrale,
italia–balcani, europa_centrale–balcani, europa_centrale–russia_eur,
balcani–russia_eur, balcani–medio_oriente, russia_eur–siberia,
russia_eur–asia_centrale, russia_eur–medio_oriente, medio_oriente–arabia,
medio_oriente–persia, medio_oriente–nord_africa, persia–asia_centrale,
persia–india, asia_centrale–siberia, asia_centrale–cina, siberia–cina,
india–cina, india–sud_est_asia, cina–sud_est_asia, cina–giappone,
nord_africa–sahara, nord_africa–africa_or, sahara–africa_occ, sahara–africa_or,
africa_occ–africa_or, africa_occ–africa_australe, africa_or–africa_australe,
canada–usa_est, canada–usa_ovest, usa_est–usa_ovest, usa_ovest–messico,
usa_est–messico, messico–ande, ande–brasile, ande–argentina, brasile–argentina.

**Rotte `mare`** (16, le "vie dei vichinghi"):
islanda–scandinavia, islanda–britannia, islanda–groenlandia,
groenlandia–canada, britannia–scandinavia, britannia–europa_occ,
iberia–nord_africa, italia–nord_africa, africa_occ–brasile,
arabia–africa_or, persia–arabia, africa_or–india, sud_est_asia–australia,
giappone–usa_ovest, siberia–canada (Bering), usa_est–britannia (Vinland).

Nota: Islanda, Isole Britanniche, Groenlandia e Australia sono raggiungibili **solo via mare** →
servono Porti. È voluto: rende il Porto importante.

**Pool numeri (29)**: 2×2, 3×3, 4×3, 5×4, 6×3, 8×3, 9×3, 10×3, 11×3, 12×2.

**Forme dei territori** (solo per il disegno): generarle con uno script
`scripts/build-world-map.mjs` (con `scripts/world-map-spec.json`: territori, collegamenti e paesi di ciascun territorio) che unisce i paesi di **Natural Earth 1:110m**
(dominio pubblico) secondo la tabella sopra, semplifica i poligoni e salva
`packages/engine-world/src/maps/mondo.json`. Se in ambiente non c'è rete, va
bene una prima versione con poligoni semplificati scritti a mano (bastano
8–20 punti per territorio) — l'importante è il formato (§8.1). Il JSON
generato **va committato**: il gioco non scarica mai dati a runtime.

Validazioni automatiche della mappa (test): grafo connesso considerando terra +
mare; ogni territorio non costiero non ha rotte mare; ogni rotta mare unisce due
costieri; materiali e pool numeri coerenti col numero di territori produttivi.

---

## 8. Specifica tecnica

### 8.1 Formato mappa (`MapDefinition`)

```ts
export type WorldResource = 'legname' | 'pietra' | 'lana' | 'orzo' | 'ferro' | 'argento';
export type ProducedResource = Exclude<WorldResource, 'argento'>;
export type TerritoryKind = ProducedResource | 'deserto';

export interface TerritoryDef {
  id: string;            // stabile, slug
  name: string;          // nome di default (sovrascrivibile dall'admin)
  continent: string;     // per «Il Grande Viaggiatore»
  kind: TerritoryKind;
  coastal: boolean;
  center: [number, number];        // lon, lat (etichette, pedina, numero)
  polygons: [number, number][][];  // lon, lat; più poligoni = isole
}

export interface LinkDef { a: string; b: string; kind: 'terra' | 'mare' }

export interface MapDefinition {
  id: string;            // 'mondo'
  name: string;
  scale: 'mondo' | 'nazione' | 'regione' | 'citta';
  projection: 'equirettangolare' | 'mercatore';
  territories: TerritoryDef[];
  links: LinkDef[];
  numberPool: number[];  // lunghezza = n. territori produttivi
  minPlayers: number;
  maxPlayers: number;
}
```

La mappa effettiva usata da una partita (dopo override admin e assegnazione dei
numeri) viene **congelata nello stato** (`state.map`): online tutti vedono la
stessa cosa e una partita in corso non cambia se l'admin modifica la mappa.

### 8.2 Stato e azioni (`packages/engine-world`)

Struttura file suggerita (specchio dell'engine classico, ma più piccola):

```
packages/engine-world/src/
  index.ts       types.ts      constants.ts   rng.ts (copia di engine/rng.ts)
  map.ts         (carica MapDefinition, override, numeri, adiacenze, validazione)
  game.ts        (createGame)   apply.ts   validate.ts   legal.ts
  movement.ts    (costi, percorsi, pedaggi)   production.ts
  longestRoad.ts scoring.ts     view.ts (getPlayerView)
  maps/mondo.json
test/ ...
```

Stato minimo:

```ts
interface WorldPlayerState {
  id: number; name: string; color: string; bot?: BotLevel; cosmetics?: PlayerCosmetics;
  hand: Record<WorldResource, number>;
  jarl: string;                       // territorio
  movePointsLeft: number;             // 4 a inizio turno
  tollsPaidThisTurn: string[];        // territori già pagati in questo turno
  pieces: { strade: number; villaggi: number; citta: number; sale: number; porti: number; mercati: number };
}

interface TerritoryState {
  id: string; number: number | null;
  owner: number | null;
  building: 'villaggio' | 'citta' | 'sala' | null;
  porto: boolean; mercato: boolean;
}

interface WorldGameState {
  kind: 'world';
  config: WorldGameConfig;            // seed, players, targetPoints, mapId, materialiCasuali
  map: FrozenMap;                     // MapDefinition finale + nomi applicati
  territories: Record<string, TerritoryState>;
  roads: Record<string, number>;      // linkId -> owner
  players: WorldPlayerState[];
  current: number;
  phase:
    | { type: 'setup'; step: number; expect: 'villaggio' | 'strada' }
    | { type: 'tiro' }
    | { type: 'scarto'; pending: number[] }     // Tassa del Re
    | { type: 'razzia'; candidates: number[] }  // scelta della vittima
    | { type: 'azioni' }
    | { type: 'fine'; winner: number };
  dice: [number, number] | null;
  trade: TradeOffer | null;
  grandeVia: number | null;
  grandeViaggiatore: number | null;
  rng: RngState;
  log: WorldEvent[];
}
```

Azioni:

```ts
type WorldAction =
  | { type: 'piazzaSetup'; territory: string }        // villaggio iniziale
  | { type: 'stradaSetup'; link: string }
  | { type: 'tira' }
  | { type: 'scarta'; cards: Partial<Record<WorldResource, number>> }
  | { type: 'razzia'; victim: number }
  | { type: 'muovi'; to: string; via: string; tollPayment?: WorldResource }  // un passo alla volta
  | { type: 'costruisci'; what: 'strada'; link: string }
  | { type: 'costruisci'; what: 'villaggio' | 'citta' | 'sala' | 'porto' | 'mercato'; territory: string }
  | { type: 'scambiaBanca'; give: WorldResource; giveCount: number; get: WorldResource }
  | { type: 'proponiScambio'; ... } | { type: 'rispondiScambio'; ... } | { type: 'confermaScambio'; ... }
  | { type: 'fineTurno' };
```

API pubblica, **identica nella forma** a quella dell'engine classico, così
server e controller possono essere generici:
`createGame`, `applyAction(state, action) → { state, events } | { error }`,
`isLegal`, `getLegalActions`, `getPlayerView`, `filterEventsForPlayer`.

Vista per giocatore: mani altrui solo come conteggio (come la Classica).

### 8.3 Bot (`packages/bots`, nuova cartella `src/world/`)
Bot euristico unico (livelli = rumore/profondità come oggi):
- valore di un territorio = probabilità del numero × peso del materiale che
  manca + bonus continente nuovo;
- muove il Jarl verso il miglior territorio libero raggiungibile, minimizzando
  i pedaggi (Dijkstra su costo = punti movimento + pedaggio stimato);
- costruisce nell'ordine: villaggio raggiungibile > città > strada verso
  l'obiettivo > porto se serve per un'isola/continente > mercato > sala;
- scambia con la banca quando gli manca 1 materiale per una costruzione.
Test di simulazione: N partite bot-vs-bot che **terminano tutte** con un
vincitore entro un tetto di turni, con invarianti (mani ≥ 0, pezzi entro i
limiti, un proprietario per territorio).

### 8.4 Server e online
- `LobbyConfig.gameKind: 'classica' | 'world'` (assente = `'classica'`,
  retrocompatibile). Per `world`: `mapId`, `targetGloryPoints`,
  `materialiCasuali`, `turnTimerSec`, `isPublic`.
- `GameRoom` (`packages/server/src/room.ts`) oggi chiama direttamente
  `createGame/applyAction` dell'engine classico. Estrarre un'interfaccia
  `GameEngineAdapter` (create, apply, view, filterEvents, defaultAction) con due
  implementazioni; la room sceglie in base a `gameKind`. `defaultAction.ts`
  (timer scaduto) ottiene una versione world: tira / scarta a caso / razzia sul
  primo / fine turno.
- Salvataggio partite (storage/storagePg) già serializza lo stato: aggiungere
  il campo `gameKind` per sapere con quale engine riaprirle.
- Lista partite pubbliche: mostrare un badge 🌍 per le partite world.

### 8.5 Admin: «Editor mappe» (solo account `pana`, vedi `admin.ts`)
Override salvato sul server, applicato alla `MapDefinition` a inizio partita:

```ts
interface MapOverride {
  mapId: string;
  names: Record<string, string>;   // id territorio -> nuovo nome
  removed: string[];               // territori tolti dalla mappa
}
```

- Endpoint: `GET /api/maps` (elenco mappe + override, pubblico),
  `POST /api/admin/maps/:id` (salva override, solo `isAdmin`), sul modello di
  `/api/censored`. Storage: `getMapOverrides/setMapOverride` in entrambe le
  implementazioni di storage.
- Sanitizzazione: nomi 1–40 caratteri, trim, passano anche dal filtro parole
  censurate; id sconosciuti scartati.
- **Togliere un territorio** rimuove anche i suoi collegamenti e un numero dal
  pool (si toglie il numero più "centrale" rimasto, deterministicamente).
  Rifiutare il salvataggio se: il grafo non è più connesso, restano meno di
  **15** territori produttivi, o sparisce un materiale.
- UI web: nuova schermata admin con la mappa disegnata, clic su un territorio →
  rinomina / togli / ripristina, pulsante «Salva» e «Ripristina tutto».
- In locale/hot-seat (senza server) si usa la mappa di default; se il client è
  connesso al server, scarica gli override all'avvio.

### 8.6 Web
- **Ingresso**: nel `MenuScreen` il vecchio «Nuova partita» diventa due
  pulsanti grandi:
  - ⚔️ **Viking-Island** — *Classica* (tutto il flusso attuale, invariato);
  - 🌍 **Vikings Around the World** — *le regole sono cambiate!!!*
  Stesso trattamento nel form online (crea lobby → scelta modalità).
- `screens/world/NewWorldGameScreen.tsx`: giocatori/bot/colori (riusare i
  componenti esistenti), mappa, punti vittoria, materiali casuali.
- `screens/world/WorldGameScreen.tsx` + `components/world/*`: HUD, mano a 6
  materiali, barra azioni (Muovi / Costruisci / Scambia / Fine turno),
  diario. Riusare dove possibile `GameLog`, `ChatPanel`, `DiceRollOverlay`,
  `DiscardDialog`, `TradeDialogs` (eventualmente generalizzandoli sul tipo di
  risorsa, senza cambiarne il comportamento nella Classica).
- **Renderer** `render/world/worldRenderer.ts` su Canvas, stile pixel-art:
  proiezione dei poligoni → riempimento con texture/colore del materiale,
  confini spessi, mare con le rotte tratteggiate, numero nel centro, edifici e
  bandierina del clan, Jarl come pedina con il colore del clan.
  Pan + zoom (rotella / pinch) e "fit to screen". Hit-testing per territorio
  (point-in-polygon) e per collegamento (distanza dal segmento fra i centri).
  Evidenziare i territori raggiungibili col costo e l'eventuale pedaggio.
- **Controller**: `LocalWorldController` e `RemoteWorldController` che
  implementano la stessa forma di `GameController` (`game/controller.ts`).
- Statistiche/missioni/progressione: in v1 basta registrare la partita
  (vittoria/sconfitta) con `gameKind: 'world'`; missioni dedicate in seguito.
- **i18n**: namespace `world` in `i18n/it.ts` (fonte) e nelle altre 7 lingue.
  Tutti i nomi dei territori passano da i18n **solo** se non sono stati
  rinominati dall'admin (il nome admin vince).

---

## 9. Piano di lavoro (fasi)

Ogni fase si chiude con test verdi, typecheck, lint, `PROGRESS.md` aggiornato.

**Fase 1 — Engine e mappa** ✅ quando:
- `packages/engine-world` nel workspace, con `mondo.json` e validazione mappa;
- tutte le regole §2–§6 implementate in `applyAction`/`isLegal`/`getLegalActions`;
- test: movimento (1 punto su strada, 2 fuori, mare solo con porto, 4 punti
  per turno), pedaggio (argento prima, scelta materiale, max 1 per territorio
  per turno, doppio con Sala, niente al territorio iniziale), costruzioni e
  limiti, produzione con Mercato, Tassa del Re, Grande Via, Grande Viaggiatore,
  vittoria, determinismo dal seed, partite casuali-legali complete.

**Fase 2 — Bot** ✅ quando: bot euristico + simulazioni che terminano.

**Fase 3 — Web locale e hot-seat** ✅ quando: due pulsanti all'ingresso,
setup partita, renderer della mappa con zoom, partita giocabile fino alla
vittoria contro bot e in hot-seat, Classica invariata.

**Fase 4 — Online** ✅ quando: `gameKind` in lobby/room/storage, adapter
engine, timer di turno, riconnessione, lobby pubblica con badge.

**Fase 5 — Editor mappe admin** ✅ quando: rinomina/togli/ripristina
territori con le validazioni di §8.5, applicato alle nuove partite locali e
online.

**Fase 6 — Tutorial e rifiniture**: tutorial breve (5–6 schermate:
Jarl, movimento, pedaggio, argento, costruzioni, vittoria), traduzioni
complete, missioni dedicate.

**Fase 7 — «Gioca nella tua città»** (dopo che 1–6 reggono):
- scelta della mappa per zoom: Mondo → Nazione → Regione → Città;
- generatore offline/admin che, da un'area OpenStreetMap (confini
  amministrativi via Overpass, licenza ODbL → attribuzione nei crediti),
  produce una `MapDefinition` da **15–40 territori**: unisce le zone troppo
  piccole, divide le troppo grandi, calcola i confini condivisi (`terra`) e
  quelli sull'acqua (`mare`);
- materiale dedotto dall'uso del suolo reale (boschi/parchi → legname,
  industriale → ferro, campi → orzo, colline/cave → pietra, pascoli → lana,
  centro storico → territorio con Mercato iniziale gratuito), poi
  ribilanciato perché ogni materiale ci sia;
- le mappe generate passano dall'Editor admin e vengono salvate sul server
  (mai scaricate durante una partita).

---

## 10. Cosa NON fare (per restare semplici)

- Niente Drago/ladrone, niente regola della distanza, niente carte sviluppo in v1.
- Niente più di 6 materiali e più di 6 tipi di costruzione.
- Niente sfondo a tile di OpenStreetMap/Google: i confini si disegnano in pixel
  art nostra.
- Niente modifiche al comportamento della Modalità Classica.

---

## 11. Decisioni prese durante l'implementazione

*(da compilare: ogni scelta non coperta da questo documento, con una riga di
motivazione)*

- Nome della modalità: «Vikings Around the World — le regole sono cambiate!!!».
- Mappa: poligoni da Natural Earth 1:110m (`scripts/build-world-map.mjs`), uniti per territorio con `polygon-clipping` (devDependency della radice, usata solo dallo script). Russia tagliata a 60°E (Europa/Siberia), USA a 100°O (Est/Ovest; Alaska e Hawaii a Ovest).
- `engine-world` non importa nulla da `@vikiland/engine` (lint di purezza esteso). `cloneState` condivide `map` (immutabile) e clona il resto in JSON.
- Id dei collegamenti: `a|b` con i due id in ordine alfabetico (`linkId`).
- Il tiro del 7: se resta UN solo clan da razziare il furto avviene da sé; con più candidati sceglie chi ha tirato (fase `razzia`). I candidati devono avere almeno 1 carta.
- Pedaggio: prima argento, poi materiali (scelti con `pay`, altrimenti dalle pile più grandi); se non si ha abbastanza si paga ciò che c'è. Il territorio di partenza del turno è già segnato come «pagato».
- Scambio banca con l'argento: 1 🪙 → 2 materiali a scelta; 3 materiali UGUALI → 1 🪙 (stesso rapporto 3:1 del Porto); altrimenti 4:1 (3:1 con un tuo Porto).
- Setup: sono valide solo le caselle non deserto con almeno un collegamento di terra libero; il secondo villaggio dà 1 materiale. L'ordine dei giocatori è fisso (posto 0 per primo).
- Strada: si può posare se tocca il territorio del Jarl, un tuo territorio o un'altra tua strada. «La Grande Via» è la pista più lunga di strade proprie, interrotta dai territori con edifici avversari.
- **Bilanciamento (misurato con 30 partite bot-vs-bot, 4 giocatori)**: con resa 1/2/2 una partita a 10 PG durava ~36 giri, a 12 PG ~41; il motivo è che un villaggio tocca UN solo territorio (nella Classica ne tocca fino a 3). Con resa **2/3/3** si scende a ~21 giri. Perciò: villaggio produce 2, città 3, Sala 3, bersaglio di default **10 PG** (§3, §5.3, §6 aggiornati).
- Vittoria controllata solo per chi gioca il turno, dopo ogni costruzione.
- Pezzi (villaggi/città/Sale/porti/mercati/strade) contati direttamente dal tabellone: una città libera il «pezzo» villaggio.
- Prima mappa: «Il Mondo», 32 territori (§7).
