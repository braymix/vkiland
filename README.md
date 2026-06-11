# VIKILAND

Gioco da tavolo digitale per browser: colonizza un'isola del nord alla guida di un clan
vichingo. Costruisci sentieri, villaggi e roccaforti, commercia con gli approdi, difenditi
dal Drago e conquista 10 Punti Gloria.

Tema, nomi e grafica (pixel art) sono completamente originali; le meccaniche sono ispirate
ai classici giochi da tavolo di colonizzazione con esagoni.

## Struttura del monorepo

| Package | Descrizione |
|---|---|
| `packages/engine` | Motore di gioco **puro** (zero dipendenze): stato + validazione/applicazione mosse, deterministico con PRNG seedato. Riusato identico da bot, hot-seat e server. |
| `packages/bots` | IA euristiche dei giocatori artificiali (dipende solo dall'engine). |
| `packages/web` | Frontend React + TypeScript + Vite, tabellone pixel-art su Canvas. |
| `packages/server` | Backend multiplayer online (Fase 3, non ancora implementato). |

## Comandi

```bash
pnpm install      # installa tutto il workspace
pnpm dev          # avvia il frontend (Vite)
pnpm test         # esegue i test di tutti i package
pnpm typecheck    # tsc --noEmit su tutti i package
pnpm lint         # ESLint
pnpm build        # build di produzione del frontend
```

## Stato del progetto

Vedi [PROGRESS.md](./PROGRESS.md) per la roadmap e lo stato di avanzamento.
