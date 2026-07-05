/** Test dell'accumulatore di statistiche di partita. */
import { describe, expect, it } from 'vitest';
import type { GameEvent, ResourceCount } from '@vikiland/engine';
import { accumulateStats, emptyStats } from '../src/game/stats';

const zero: ResourceCount = { legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 0 };
function res(p: Partial<ResourceCount>): ResourceCount {
  return { ...zero, ...p };
}

function feed(events: GameEvent[], players = 2) {
  const stats = emptyStats(players);
  for (const e of events) accumulateStats(stats, e);
  return stats;
}

describe('accumulateStats', () => {
  it('conta i tiri nell\'istogramma e separa i sette', () => {
    const s = feed([
      { type: 'dadiTirati', player: 0, dice: [3, 4], total: 7 },
      { type: 'dadiTirati', player: 1, dice: [4, 4], total: 8 },
      { type: 'dadiTirati', player: 0, dice: [4, 4], total: 8 },
    ]);
    expect(s.totalRolls).toBe(3);
    expect(s.diceCounts[7]).toBe(1);
    expect(s.diceCounts[8]).toBe(2);
    expect(s.sevens).toBe(1);
    expect(s.perPlayer[0]!.rollsMade).toBe(2);
    expect(s.perPlayer[0]!.sevensRolled).toBe(1);
    expect(s.perPlayer[1]!.rollsMade).toBe(1);
  });

  it('somma la produzione totale e per tipo', () => {
    const s = feed([
      {
        type: 'risorseProdotte',
        gains: [
          { player: 0, resources: res({ legname: 2, orzo: 1 }) },
          { player: 1, resources: res({ pietra: 3 }) },
        ],
      },
    ]);
    expect(s.perPlayer[0]!.resourcesProduced).toBe(3);
    expect(s.perPlayer[0]!.byResource.legname).toBe(2);
    expect(s.perPlayer[1]!.resourcesProduced).toBe(3);
    expect(s.perPlayer[1]!.byResource.pietra).toBe(3);
  });

  it('distingue scambi con la banca e tra giocatori (entrambe le parti)', () => {
    const s = feed([
      { type: 'scambioEseguito', kind: 'banca', from: 0, to: null, give: zero, receive: zero },
      { type: 'scambioEseguito', kind: 'giocatori', from: 0, to: 1, give: zero, receive: zero },
    ]);
    expect(s.perPlayer[0]!.bankTrades).toBe(1);
    expect(s.perPlayer[0]!.playerTrades).toBe(1);
    expect(s.perPlayer[1]!.playerTrades).toBe(1);
    expect(s.perPlayer[1]!.bankTrades).toBe(0);
  });

  it('conta costruzioni, furti, scarti e Carte Saga', () => {
    const s = feed([
      { type: 'costruito', player: 0, kind: 'villaggio', position: 'x', gratis: false },
      { type: 'costruito', player: 0, kind: 'sentiero', position: 'y', gratis: false },
      { type: 'risorsaRubata', thief: 0, victim: 1, resource: null },
      { type: 'risorseScartate', player: 1, resources: null, total: 4 },
      { type: 'cartaSagaComprata', player: 0, card: null },
      { type: 'cartaSagaGiocata', player: 0, card: 'berserker' },
    ]);
    expect(s.perPlayer[0]!.villages).toBe(1);
    expect(s.perPlayer[0]!.roads).toBe(1);
    expect(s.perPlayer[0]!.robberiesMade).toBe(1);
    expect(s.perPlayer[1]!.robberiesSuffered).toBe(1);
    expect(s.perPlayer[1]!.discarded).toBe(4);
    expect(s.perPlayer[0]!.sagaBought).toBe(1);
    expect(s.perPlayer[0]!.sagaPlayed).toBe(1);
  });

  it('traccia il numero di turni e i movimenti del Drago', () => {
    const s = feed([
      { type: 'turnoIniziato', player: 0, turnNumber: 1 },
      { type: 'turnoIniziato', player: 1, turnNumber: 5 },
      { type: 'dragoMosso', player: 0, hex: 'h', cause: 'sette' },
    ]);
    expect(s.turns).toBe(5);
    expect(s.dragonMoves).toBe(1);
  });
});
