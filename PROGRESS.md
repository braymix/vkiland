# PROGRESS — Vikiland

> Aggiornato a ogni step. Legenda: ✅ fatto · 🔄 in corso · ⬜ da fare

## Stato attuale

**Fase 1 — Motore di gioco + partita contro bot** · step 0 (scaffold) in corso.

## Checklist Fase 1

- 🔄 0. Scaffold monorepo (configs, package, PROGRESS.md, primo commit)
- ⬜ 1. Engine: PRNG seedato + coordinate/topologia esagonale (54 vertici, 72 spigoli) + test
- ⬜ 2. Engine: generazione tavola (terreni, segnalini, approdi, vincolo 6/8) + test
- ⬜ 3. Engine: stato di gioco, azioni, `createGame`, fase di setup a serpentina + test
- ⬜ 4. Engine: tiro dadi, produzione (penuria banca), costruzioni + test
- ⬜ 5. Engine: scambi banca/approdi/tra giocatori + test
- ⬜ 6. Engine: il Drago (scarto simultaneo >7, spostamento, furto) + test
- ⬜ 7. Engine: Carte Saga (acquisto + 4 effetti + limiti) + test
- ⬜ 8. Engine: Grande Via, Furia dei Berserker, punteggio, azioni legali, viste filtrate, partita completa (200 seed, replay deterministico)
- ⬜ 9. Bot: random (baseline) + euristico (piazzamento, costruzioni, scambi, drago) + simulazioni
- ⬜ 10. Web: scaffold Vite, sprite pixel-art, layout/hit-test, renderer tavola
- ⬜ 11. Web: partita giocabile vs bot (controller locale, ActionBar, dialoghi, log)
- ⬜ 12. Web: schermate menu/setup/vittoria, responsive mobile, polish
- ⬜ 13. QA finale (test+typecheck+lint), PROGRESS.md aggiornato, push

## Roadmap fasi successive

- **Fase 2 — Hot-seat**: vista filtrata per l'umano attivo, `PassDeviceScreen` tra i turni,
  più umani nel setup (bot misti già supportati dall'engine).
- **Fase 3 — Online**: `packages/server` (Fastify + Socket.io), stato autoritativo sul server
  (stesso engine = anti-cheat), account email+password (argon2id), lobby con codici invito,
  riconnessione, statistiche, timer di turno. DB: SQLite dev / PostgreSQL prod (Drizzle).
- **Fase 4 — Predisposizione monetizzazione**: registro palette/temi = skin, tabella
  `entitlements`, hook acquisti/ads nei punti marcati `PUNTO DI ESTENSIONE`.

## Decisioni architetturali

- **Engine puro e deterministico**: zero dipendenze (vincolato da ESLint), stato JSON-serializzabile,
  PRNG xoshiro128** nello stato → replay, validazione server-side, bot onesti (vista filtrata).
- **Identificatori canonici**: vertice = tripla ordinata di esagoni incidenti, spigolo = coppia;
  tutte le adiacenze derivate matematicamente, nessuna tabella a mano.
- **Source-first**: i package esportano `./src/index.ts`; niente build step in dev.
- **Rendering**: Canvas 2D a risoluzione logica 256×224 scalata con `image-rendering: pixelated`;
  sprite = matrici di testo + palette semantiche (il registro palette è la base delle skin).
- **UI sostituibile**: `LocalGameController` (Fase 1-2) e futuro `RemoteGameController` (Fase 3)
  condividono la stessa interfaccia.

## Comandi

`pnpm install` · `pnpm dev` · `pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm build`

## Punti di estensione Fase 4

- `packages/server/README.md` — tabella `entitlements`, hook acquisti/ads (sketch).
- (in arrivo) `packages/web/src/render/sprites/palettes.ts` — registro palette = skin.
- (in arrivo) `MenuScreen` — bottone "Negozio" disabilitato.

## Problemi noti / TODO

- Nessuno al momento.
