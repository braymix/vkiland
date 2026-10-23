/** La mappa «Castello» è giocabile dai bot: partite complete, nessuna mossa illegale. */
import { describe, expect, it } from 'vitest';
import { createHeuristicBot } from '../src';
import { runBotGame } from './runner';

describe('bot su mappa castello', () => {
  it('4 euristici terminano la partita senza mosse illegali (2 e 3 anelli)', () => {
    for (const rings of [2, 3]) {
      for (let i = 0; i < 4; i++) {
        const { winner, steps } = runBotGame(
          `castle-bot-${rings}-${i}`,
          [
            createHeuristicBot('normale'),
            createHeuristicBot('normale'),
            createHeuristicBot('facile'),
            createHeuristicBot('facile'),
          ],
          12000,
          undefined,
          false,
          false,
          { boardShape: 'castello', castleRings: rings }
        );
        expect(winner, `anelli ${rings}, partita ${i} non conclusa (${steps} passi)`).not.toBeNull();
      }
    }
  }, 120_000);
});
