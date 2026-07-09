/** «Annulla»: si può tornare indietro sull'ultimo piazzamento, solo nel proprio turno. */
import { describe, expect, it } from 'vitest';
import type { Action } from '@vikiland/engine';
import { LocalGameController, type GameSetup } from '../src/game/LocalGameController';

/** Due umani (nessun bot ⇒ niente timer asincroni: tutto sincrono e deterministico). */
function twoHumans(seed: string): GameSetup {
  return {
    seed,
    players: [
      { name: 'A', color: '#c0392b', isBot: false },
      { name: 'B', color: '#2e6fb7', isBot: false },
    ],
    avoidAdjacent68: true,
    targetGloryPoints: 10,
    calamities: false,
    battle: false,
  };
}

describe('Annulla (undo) dei piazzamenti', () => {
  it('prima di piazzare nulla non c’è niente da annullare', () => {
    const c = new LocalGameController(twoHumans('undo-1'));
    expect(c.getSnapshot().canUndo).toBe(false);
    c.dispose();
  });

  it('piazzato un villaggio nel setup: canUndo, e undo lo rimuove davvero', () => {
    const c = new LocalGameController(twoHumans('undo-2'));
    let snap = c.getSnapshot();
    const me = snap.viewpoint;
    const move = snap.legalActions.find((m): m is Action => m.type === 'piazzaVillaggioIniziale');
    expect(move).toBeDefined();

    c.dispatch(move!);
    snap = c.getSnapshot();
    expect(snap.view.players[me]!.villages).toHaveLength(1);
    expect(snap.canUndo).toBe(true);

    c.undo();
    snap = c.getSnapshot();
    expect(snap.view.players[me]!.villages).toHaveLength(0);
    expect(snap.canUndo).toBe(false);
    // Stato ripristinato: si torna a poter piazzare il villaggio iniziale.
    expect(snap.legalActions.some((m) => m.type === 'piazzaVillaggioIniziale')).toBe(true);
    c.dispose();
  });

  it('finito il proprio piazzamento (tocca all’altro umano) l’undo si chiude', () => {
    const c = new LocalGameController(twoHumans('undo-3'));
    let snap = c.getSnapshot();
    const v = snap.legalActions.find((m): m is Action => m.type === 'piazzaVillaggioIniziale')!;
    c.dispatch(v);
    expect(c.getSnapshot().canUndo).toBe(true);

    const e = c.getSnapshot().legalActions.find((m): m is Action => m.type === 'piazzaSentieroIniziale')!;
    c.dispatch(e);
    snap = c.getSnapshot();
    // Ora c'è il passaggio di mano al secondo umano: niente undo finché è il suo turno.
    expect(snap.handoff).not.toBeNull();
    expect(snap.canUndo).toBe(false);
    c.dispose();
  });
});
