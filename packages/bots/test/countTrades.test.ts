import { expect, it } from 'vitest';
import { createHeuristicBot } from '../src';
import { runBotGame } from './runner';

it('misura: in 10 partite tra bot gli scambi accadono davvero', () => {
  const counts: Record<string, number> = {};
  for (let i = 0; i < 10; i++) {
    runBotGame(`misura-scambi-${i}`, [
      createHeuristicBot('normale'),
      createHeuristicBot('difficile'),
      createHeuristicBot('esperto'),
      createHeuristicBot('esperto'),
    ], 8000, (t) => { counts[t] = (counts[t] ?? 0) + 1; });
  }
  console.log('azioni di scambio su 10 partite:', {
    proposte: counts['proponiScambio'] ?? 0,
    risposte: counts['rispondiScambio'] ?? 0,
    conferme: counts['confermaScambio'] ?? 0,
    ritiri: counts['annullaScambio'] ?? 0,
    banca: counts['scambioBanca'] ?? 0,
  });
  expect(counts['proponiScambio'] ?? 0).toBeGreaterThan(0);
  expect(counts['confermaScambio'] ?? 0).toBeGreaterThan(0);
}, 120_000);
