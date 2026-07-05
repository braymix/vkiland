/**
 * Statistiche di partita raccolte lato client dal flusso di eventi del motore.
 *
 * I controller (locale e online) processano già ogni `GameEvent` per il diario:
 * qui lo stesso flusso alimenta un accumulatore. Si contano SOLO eventi pubblici
 * (tiri, scambi, costruzioni, furti, produzione), così le statistiche sono
 * identiche su tutti i client anche online, dove gli eventi sono filtrati ma mai
 * eliminati (i campi nascosti diventano null, i conteggi restano).
 *
 * Nota online: un client che si riconnette a metà partita conta solo dagli
 * eventi ricevuti. Nel caso normale (connesso dall'inizio) i numeri sono completi.
 */
import type { GameEvent, Resource } from '@vikiland/engine';

const RESOURCES: Resource[] = ['legname', 'pietra', 'lana', 'orzo', 'ferro'];

export interface PlayerStats {
  /** Risorse ricevute dalla produzione (tiro dei dadi). */
  resourcesProduced: number;
  /** Produzione divisa per tipo (per il grafico a colori). */
  byResource: Record<Resource, number>;
  bankTrades: number;
  playerTrades: number;
  roads: number;
  villages: number;
  strongholds: number;
  sagaBought: number;
  sagaPlayed: number;
  /** Quante volte HA rubato col Drago. */
  robberiesMade: number;
  /** Quante volte è stato derubato. */
  robberiesSuffered: number;
  /** Tiri di dado effettuati (turni in cui ha tirato). */
  rollsMade: number;
  /** Sette tirati di persona. */
  sevensRolled: number;
  /** Carte risorsa scartate per il Drago. */
  discarded: number;
}

export interface GameStats {
  /** Conteggi dei totali dei dadi: indice = totale (2..12); 0 e 1 inutilizzati. */
  diceCounts: number[];
  totalRolls: number;
  sevens: number;
  dragonMoves: number;
  turns: number;
  perPlayer: PlayerStats[];
}

function emptyPlayer(): PlayerStats {
  return {
    resourcesProduced: 0,
    byResource: { legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 0 },
    bankTrades: 0,
    playerTrades: 0,
    roads: 0,
    villages: 0,
    strongholds: 0,
    sagaBought: 0,
    sagaPlayed: 0,
    robberiesMade: 0,
    robberiesSuffered: 0,
    rollsMade: 0,
    sevensRolled: 0,
    discarded: 0,
  };
}

export function emptyStats(playerCount: number): GameStats {
  return {
    diceCounts: new Array(13).fill(0),
    totalRolls: 0,
    sevens: 0,
    dragonMoves: 0,
    turns: 0,
    perPlayer: Array.from({ length: playerCount }, emptyPlayer),
  };
}

function sumResources(r: Record<Resource, number>): number {
  return RESOURCES.reduce((acc, k) => acc + (r[k] ?? 0), 0);
}

/** Aggiorna le statistiche con un evento (muta `stats` in loco). */
export function accumulateStats(stats: GameStats, e: GameEvent): void {
  const who = (id: number): PlayerStats | undefined => stats.perPlayer[id];
  switch (e.type) {
    case 'turnoIniziato':
      stats.turns = Math.max(stats.turns, e.turnNumber);
      break;
    case 'dadiTirati': {
      if (e.total >= 2 && e.total <= 12) stats.diceCounts[e.total]!++;
      stats.totalRolls++;
      const p = who(e.player);
      if (p) {
        p.rollsMade++;
        if (e.total === 7) p.sevensRolled++;
      }
      if (e.total === 7) stats.sevens++;
      break;
    }
    case 'risorseProdotte':
      for (const g of e.gains) {
        const p = who(g.player);
        if (!p) continue;
        p.resourcesProduced += sumResources(g.resources);
        for (const r of RESOURCES) p.byResource[r] += g.resources[r] ?? 0;
      }
      break;
    case 'risorseScartate': {
      const p = who(e.player);
      if (p) p.discarded += e.total;
      break;
    }
    case 'dragoMosso':
      stats.dragonMoves++;
      break;
    case 'risorsaRubata': {
      const thief = who(e.thief);
      if (thief) thief.robberiesMade++;
      const victim = who(e.victim);
      if (victim) victim.robberiesSuffered++;
      break;
    }
    case 'costruito': {
      const p = who(e.player);
      if (!p) break;
      if (e.kind === 'sentiero') p.roads++;
      else if (e.kind === 'villaggio') p.villages++;
      else p.strongholds++;
      break;
    }
    case 'cartaSagaComprata': {
      const p = who(e.player);
      if (p) p.sagaBought++;
      break;
    }
    case 'cartaSagaGiocata': {
      const p = who(e.player);
      if (p) p.sagaPlayed++;
      break;
    }
    case 'scambioEseguito': {
      const from = who(e.from);
      if (e.kind === 'banca') {
        if (from) from.bankTrades++;
      } else {
        if (from) from.playerTrades++;
        const to = e.to !== null ? who(e.to) : undefined;
        if (to) to.playerTrades++;
      }
      break;
    }
    default:
      break;
  }
}
