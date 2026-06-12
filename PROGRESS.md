# PROGRESS — Viking-Island (ex Vikiland)

> Aggiornato a ogni step. Legenda: ✅ fatto · 🔄 in corso · ⬜ da fare

## Stato attuale

**FASE 3 COMPLETATA E COLLAUDATA IN PRODUZIONE** ✅ — multiplayer ONLINE:
server autoritativo (Fastify + Socket.io, stesso engine = anti-cheat),
account email+password, lobby con codici invito a 6 caratteri, bot lato
server, riconnessione, timer di turno opzionale con mossa automatica.
Deploy verificato dall'utente: client su Netlify + server su Render
(blueprint render.yaml), «funziona tutto correttamente».
Fasi 1 e 2 collaudate e approvate dall'utente (hot-seat, bugiardino,
mappa a schermo intero, mirini viola sugli approdi). Rifiniture extra:
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
installabile a schermata home, gioco locale/hot-seat funzionante OFFLINE.

## Checklist Fase 3 (online)

- ✅ `packages/server`: Fastify (REST `/api/register|login|logout|me`) +
     Socket.io con handshake autenticato dal token di sessione
- ✅ Account: hash scrypt (`node:crypto`, zero dipendenze native), sessioni
     token, storage JSON dietro interfaccia `Storage` (swap previsto a
     Drizzle SQLite/PostgreSQL + argon2id, formati versionati)
- ✅ Lobby: codici invito a 6 caratteri non ambigui, posti umani/bot gestiti
     dall'host, espulsione, chiusura, riconnessione (il posto resta legato
     all'utente a partita iniziata)
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
