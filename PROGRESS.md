# PROGRESS — Vikiland

> Aggiornato a ogni step. Legenda: ✅ fatto · 🔄 in corso · ⬜ da fare

## Stato attuale

**FASE 2 COMPLETATA** ✅ — hot-seat: 2–4 giocatori sullo stesso dispositivo,
ognuno umano o bot, con schermo di passaggio del dispositivo tra un umano e
l'altro (nessuna fuga di informazione). Aggiunto il bugiardino dei costi
(bottone «?» in partita). In attesa di collaudo prima della Fase 3 (online).
Fase 1 collaudata e approvata dall'utente.

## Checklist Fase 2

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

## Come testare la Fase 2

```bash
pnpm install
pnpm test        # 120 test: motore (100), bot (9), web (11)
pnpm dev         # http://localhost:5173  (per il telefono: pnpm dev --host)
```
Hot-seat: Nuova partita → metti 2+ righe su «Umano» col toggle → Salpa! →
tra il turno di un umano e l'altro appare «Passa il dispositivo»; la mano del
prossimo si rivela solo dopo «Sono {nome}!». Col 7 gli scarti di più umani
avvengono uno alla volta; nelle offerte rispondono prima gli altri, il
proponente conferma per ultimo. Il bugiardino è sotto il bottone «?» in alto.
Partita solo vs bot = identica alla Fase 1 (mai passaggi di mano).

## Roadmap fasi successive

- **Fase 3 — Online**: `packages/server` (Fastify + Socket.io), stato autoritativo sul server
  (stesso engine = anti-cheat), account email+password (argon2id), lobby con codici invito,
  riconnessione, statistiche, timer di turno. DB: SQLite dev / PostgreSQL prod (Drizzle).
  Client: `RemoteGameController` con la stessa interfaccia del locale.
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
- **UI sostituibile**: `LocalGameController` (Fase 1-2) e futuro `RemoteGameController` (Fase 3)
  condividono interfaccia `subscribe/getSnapshot/dispatch`.

## Comandi

`pnpm install` · `pnpm dev` · `pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm build`

## Punti di estensione Fase 4 (marcatori `PUNTO DI ESTENSIONE` nel codice)

- `packages/web/src/render/sprites/palettes.ts` — registro palette/temi = sistema skin.
- `packages/web/src/screens/MenuScreen.tsx` — bottoni "Multigiocatore" e "Negozio" (disabilitati).
- `packages/engine/src/types.ts` (`PlayerState`) — campo `cosmetics` passthrough previsto.
- `packages/server/README.md` — tabella `entitlements` e hook acquisti/ads (sketch Fase 3/4).

## Problemi noti / TODO

- I bot rispondono agli scambi ma non li propongono (scelta di design Fase 1, flag previsto).
- Le animazioni (dadi, produzione) sono minimali; possibile polish in Fase 2.
