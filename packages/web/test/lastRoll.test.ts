/** Test del controller locale: il popup del tiro si aggancia all'evento dadiTirati. */
import { describe, expect, it } from 'vitest';
import type { Action } from '@vikiland/engine';
import { LocalGameController, type GameSnapshot } from '../src/game/LocalGameController';

/** Partita con 2 umani e zero bot: niente timer, tutto sincrono. */
function makeController(): LocalGameController {
  return new LocalGameController({
    seed: 'roll-popup-test',
    players: [
      { name: 'Ann', color: 'rosso', isBot: false },
      { name: 'Bob', color: 'blu', isBot: false },
    ],
    avoidAdjacent68: true,
    targetGloryPoints: 10,
  });
}

/** Avanza confermando i passaggi di mano e giocando mosse fino a `stop`. */
function playUntil(c: LocalGameController, stop: (snap: GameSnapshot) => boolean): void {
  for (let guard = 0; guard < 200; guard++) {
    const snap = c.getSnapshot();
    if (snap.handoff !== null) {
      c.confirmHandoff();
      continue;
    }
    if (stop(snap)) return;
    // fineTurno se disponibile, altrimenti la prima mossa concreta.
    const move =
      snap.legalActions.find((m) => m.type === 'fineTurno') ??
      snap.legalActions.find((m) => m.type !== 'scartaDescr' && m.type !== 'proponiScambioDescr');
    expect(move).toBeDefined();
    expect(c.dispatch(move as Action)).toBeNull();
  }
  throw new Error('condizione di stop mai raggiunta');
}

describe('LocalGameController — lastRoll per il popup dei dadi', () => {
  it('parte nullo, si valorizza al tiro e ha un id crescente a ogni tiro', () => {
    const c = makeController();
    expect(c.getSnapshot().lastRoll).toBeNull();

    // Setup completo: lastRoll resta nullo (nessun dado di turno tirato).
    playUntil(c, (s) => s.view.phase.type === 'preRoll');
    expect(c.getSnapshot().lastRoll).toBeNull();

    // Primo tiro del primo giocatore di turno.
    const first = c.getSnapshot();
    expect(c.dispatch({ type: 'tiraDadi', player: first.viewpoint })).toBeNull();
    const roll = c.getSnapshot().lastRoll;
    expect(roll).not.toBeNull();
    expect(roll!.id).toBe(1);
    expect(roll!.total).toBe(roll!.dice[0] + roll!.dice[1]);
    for (const d of roll!.dice) {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(6);
    }

    // Si arriva al preRoll successivo: il tiro precedente resta in fotografia.
    playUntil(c, (s) => s.view.phase.type === 'preRoll');
    expect(c.getSnapshot().lastRoll!.id).toBe(1);

    // Secondo tiro: l'id cresce (la UI ri-anima anche totali uguali).
    const second = c.getSnapshot();
    expect(c.dispatch({ type: 'tiraDadi', player: second.viewpoint })).toBeNull();
    const roll2 = c.getSnapshot().lastRoll;
    expect(roll2!.id).toBe(2);
    expect(roll2!.total).toBe(roll2!.dice[0] + roll2!.dice[1]);

    c.dispose();
  });
});
