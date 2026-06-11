import { describe, expect, it } from 'vitest';
import { gloryPoints, scoreBreakdown, type GameState } from '../src';
import {
  apply,
  applyOk,
  autoSetup,
  clearHands,
  expectError,
  give,
  mut,
  newGame,
  toMain,
} from './helpers';

function base(): GameState {
  return toMain(clearHands(autoSetup(newGame(4, 'punteggio'))));
}

describe('Punti Gloria', () => {
  it('villaggi 1, roccaforti 2, bonus 2+2, Eroi nascosti 1', () => {
    const s = mut(base(), (d) => {
      const p = d.players[0]!;
      p.villages = ['a', 'b', 'c'];
      p.strongholds = ['d', 'e'];
      p.sagaCards = ['sagaDegliEroi'];
      d.longestRoad = { holder: 0, length: 5 };
      d.largestArmy = { holder: 0, count: 3 };
    });
    const b = scoreBreakdown(s, 0);
    expect(b).toEqual({
      player: 0,
      villaggi: 3,
      roccaforti: 4,
      grandeVia: 2,
      furia: 2,
      eroiNascosti: 1,
      totale: 12,
    });
    expect(gloryPoints(s, 0, true)).toBe(12);
    expect(gloryPoints(s, 0, false)).toBe(11); // la vista pubblica esclude gli Eroi
  });

  it('si vince nel proprio turno raggiungendo l’obiettivo', () => {
    // p0 a 9 punti costruisce la roccaforte decisiva (7 + upgrade = +1 → 10).
    const s = mut(give(base(), 0, { orzo: 2, ferro: 3 }), (d) => {
      const p = d.players[0]!;
      p.villages = ['v1', 'v2', 'v3', ...p.villages]; // 5 villaggi (2 dal setup)
      p.strongholds = ['s1', 's2']; // 5 + 4 = 9 punti
    });
    const dopo = apply(s, {
      type: 'costruisciRoccaforte',
      player: 0,
      vertex: s.players[0]!.villages[3]!, // uno dei villaggi veri del setup
    });
    expect(dopo.phase).toEqual({ type: 'gameOver', winner: 0 });
  });

  it('la vittoria emette l’evento con il breakdown che rivela gli Eroi', () => {
    const s = mut(give(base(), 0, { lana: 1, orzo: 1, ferro: 1 }), (d) => {
      const p = d.players[0]!;
      p.villages = ['v1', 'v2', 'v3'];
      p.strongholds = ['s1', 's2', 's3']; // 3 + 6 = 9
      d.sagaDeck = ['berserker', 'sagaDegliEroi']; // la cima è un Eroe
      d.players[2]!.sagaCards = ['sagaDegliEroi'];
    });
    const res = applyOk(s, { type: 'compraCartaSaga', player: 0 });
    expect(res.state.phase).toEqual({ type: 'gameOver', winner: 0 });
    const vittoria = res.events.find((e) => e.type === 'vittoria');
    expect(vittoria).toBeDefined();
    if (vittoria && vittoria.type === 'vittoria') {
      expect(vittoria.winner).toBe(0);
      // Il breakdown finale rivela gli Eroi nascosti di TUTTI.
      expect(vittoria.breakdown.find((b) => b.player === 0)!.eroiNascosti).toBe(1);
      expect(vittoria.breakdown.find((b) => b.player === 2)!.eroiNascosti).toBe(1);
    }
  });

  it('NON si vince nel turno altrui: il bonus arrivato di rimbalzo conta a inizio turno', () => {
    // p1 è a 10 punti "latenti" mentre gioca p0: la partita prosegue finché
    // p0 non passa; al cambio turno p1 viene dichiarato vincitore.
    const s = mut(base(), (d) => {
      const p1 = d.players[1]!;
      p1.villages = ['a', 'b', 'c', 'd'];
      p1.strongholds = ['e', 'f', 'g']; // 4 + 6 = 10
      d.currentPlayer = 0;
    });
    expect(s.phase.type).toBe('main'); // p0 sta ancora giocando
    const dopo = apply(s, { type: 'fineTurno', player: 0 });
    expect(dopo.phase).toEqual({ type: 'gameOver', winner: 1 });
  });

  it('a partita conclusa ogni azione è rifiutata', () => {
    const s = mut(base(), (d) => {
      d.phase = { type: 'gameOver', winner: 2 };
    });
    expectError(s, { type: 'fineTurno', player: 0 }, 'PARTITA_FINITA');
    expectError(s, { type: 'tiraDadi', player: 0 }, 'PARTITA_FINITA');
  });
});
