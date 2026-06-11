import { describe, expect, it } from 'vitest';
import {
  applyAction,
  getLegalActions,
  getTopology,
  totalResources,
  type GameState,
} from '../src';
import {
  apply,
  autoSetup,
  clearHands,
  expectError,
  expectResourceInvariants,
  give,
  greedyDiscard,
  mut,
  newGame,
} from './helpers';

/** Cerca un seed la cui partita (post-setup) tira un 7 al primo lancio. */
function gameWithFirstRollSeven(): GameState {
  for (let i = 0; i < 3000; i++) {
    const g = autoSetup(newGame(4, `sette-${i}`));
    const r = applyAction(g, { type: 'tiraDadi', player: 0 });
    if (r.ok && r.state.dice![0] + r.state.dice![1] === 7) return g;
  }
  throw new Error('Nessun seed con primo tiro = 7 trovato');
}

describe('il Drago — tiro del 7 e scarto', () => {
  it('col 7 scartano metà (per difetto) solo i giocatori con più di 7 carte', () => {
    let g = clearHands(gameWithFirstRollSeven());
    g = give(g, 1, { legname: 5, pietra: 4 }); // 9 carte → scarta 4
    g = give(g, 2, { lana: 7 }); // 7 carte → non scarta
    g = give(g, 3, { orzo: 4, ferro: 4 }); // 8 carte → scarta 4
    const s = apply(g, { type: 'tiraDadi', player: 0 });
    expect(s.phase.type).toBe('discard');
    if (s.phase.type === 'discard') {
      expect(s.phase.mustDiscard).toEqual({ 1: 4, 3: 4 });
    }
  });

  it('lo scarto è simultaneo (qualsiasi ordine) e validato nel contenuto', () => {
    let g = clearHands(gameWithFirstRollSeven());
    g = give(g, 1, { legname: 9 });
    g = give(g, 3, { ferro: 8 });
    let s = apply(g, { type: 'tiraDadi', player: 0 });

    // Contenuti errati.
    expectError(
      s,
      { type: 'scarta', player: 1, resources: { legname: 3, pietra: 0, lana: 0, orzo: 0, ferro: 0 } },
      'SCARTO_ERRATO' // totale sbagliato (deve essere 4)
    );
    expectError(
      s,
      { type: 'scarta', player: 1, resources: { legname: 0, pietra: 4, lana: 0, orzo: 0, ferro: 0 } },
      'SCARTO_ERRATO' // carte che non possiede
    );
    expectError(
      s,
      { type: 'scarta', player: 2, resources: { legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 0 } },
      'NIENTE_DA_SCARTARE'
    );

    // Ordine libero: prima p3, poi p1.
    s = apply(s, { type: 'scarta', player: 3, resources: greedyDiscard(s, 3, 4) });
    expect(s.phase.type).toBe('discard');
    expect(totalResources(s.players[3]!.resources)).toBe(4);
    s = apply(s, { type: 'scarta', player: 1, resources: greedyDiscard(s, 1, 4) });
    // Finiti gli scarti si passa allo spostamento del Drago.
    expect(s.phase).toEqual({ type: 'moveDragon', cause: 'sette' });
    expectResourceInvariants(s);
  });

  it('senza nessuno oltre il limite si passa direttamente al Drago', () => {
    const g = clearHands(gameWithFirstRollSeven());
    const s = apply(g, { type: 'tiraDadi', player: 0 });
    expect(s.phase).toEqual({ type: 'moveDragon', cause: 'sette' });
  });
});

describe('il Drago — spostamento e furto', () => {
  /** Stato pronto in moveDragon per p0, mani azzerate. */
  function inMoveDragon(): GameState {
    return mut(clearHands(autoSetup(newGame(4, 'drago-base'))), (d) => {
      d.phase = { type: 'moveDragon', cause: 'sette' };
      d.rolledThisTurn = true;
      d.dice = [3, 4];
    });
  }

  it('il Drago deve cambiare esagono', () => {
    const s = inMoveDragon();
    expectError(s, { type: 'muoviDrago', player: 0, hex: s.board.dragonHex }, 'DRAGO_FERMO');
    expectError(s, { type: 'muoviDrago', player: 0, hex: '99,99' }, 'ESAGONO_NON_VALIDO');
  });

  it('senza vittime adiacenti si prosegue in main; con vittime si apre il furto', () => {
    const topo = getTopology();
    const s = inMoveDragon();

    // Esagono senza edifici avversari adiacenti (nessuno ha carte comunque).
    const libero = s.board.hexes.find(
      (h) =>
        h.id !== s.board.dragonHex &&
        topo.hexVertices[h.id]!.every((v) =>
          s.players.every((p) => !p.villages.includes(v) && !p.strongholds.includes(v))
        )
    )!;
    const senzaVittime = apply(s, { type: 'muoviDrago', player: 0, hex: libero.id });
    expect(senzaVittime.phase.type).toBe('main');

    // Esagono con un villaggio di p1, che ha carte → fase steal con candidato 1.
    const conP1 = give(s, 1, { lana: 3 });
    const bersaglio = conP1.board.hexes.find(
      (h) =>
        h.id !== conP1.board.dragonHex &&
        topo.hexVertices[h.id]!.some((v) => conP1.players[1]!.villages.includes(v)) &&
        topo.hexVertices[h.id]!.every((v) => !conP1.players[0]!.villages.includes(v))
    )!;
    const inFurto = apply(conP1, { type: 'muoviDrago', player: 0, hex: bersaglio.id });
    expect(inFurto.phase.type).toBe('steal');
    if (inFurto.phase.type === 'steal') {
      expect(inFurto.phase.candidates).toContain(1);
      expect(inFurto.phase.candidates).not.toContain(0);
    }

    // Il furto trasferisce esattamente 1 carta casuale (deterministica dal seed).
    const dopoFurto = apply(inFurto, { type: 'ruba', player: 0, target: 1 });
    expect(totalResources(dopoFurto.players[0]!.resources)).toBe(1);
    expect(totalResources(dopoFurto.players[1]!.resources)).toBe(2);
    expect(dopoFurto.phase.type).toBe('main');
    expectResourceInvariants(dopoFurto);

    // Bersaglio non in lista → rifiutato.
    expectError(inFurto, { type: 'ruba', player: 0, target: 2 }, 'BERSAGLIO_NON_VALIDO');
  });

  it('un avversario adiacente ma senza carte non è derubabile', () => {
    const topo = getTopology();
    const s = inMoveDragon(); // mani tutte vuote
    const bersaglio = s.board.hexes.find(
      (h) =>
        h.id !== s.board.dragonHex &&
        topo.hexVertices[h.id]!.some((v) => s.players[1]!.villages.includes(v))
    )!;
    const dopo = apply(s, { type: 'muoviDrago', player: 0, hex: bersaglio.id });
    expect(dopo.phase.type).toBe('main'); // niente furto possibile
  });

  it('le mosse legali del Drago elencano tutti gli esagoni tranne quello attuale', () => {
    const s = inMoveDragon();
    const moves = getLegalActions(s, 0);
    expect(moves).toHaveLength(18);
    expect(moves.every((m) => m.type === 'muoviDrago' && m.hex !== s.board.dragonHex)).toBe(true);
  });
});

describe('il Drago — Berserker', () => {
  it('giocato PRIMA del tiro: niente scarto, e si torna al preRoll', () => {
    let g = clearHands(autoSetup(newGame(4, 'berserker-preroll')));
    g = give(g, 1, { legname: 9 }); // oltre il limite: ma il Berserker NON fa scartare
    g = mut(g, (d) => {
      d.players[0]!.sagaCards.push('berserker');
    });
    let s = apply(g, { type: 'giocaBerserker', player: 0 });
    expect(s.phase).toEqual({ type: 'moveDragon', cause: 'berserker' });
    expect(s.players[0]!.playedBerserkers).toBe(1);

    // Sposta su un esagono senza vittime: si torna a preRoll (dadi ancora da tirare).
    const topo = getTopology();
    const libero = s.board.hexes.find(
      (h) =>
        h.id !== s.board.dragonHex &&
        topo.hexVertices[h.id]!.every((v) =>
          s.players.every((p) => !p.villages.includes(v) && !p.strongholds.includes(v))
        )
    )!;
    s = apply(s, { type: 'muoviDrago', player: 0, hex: libero.id });
    expect(s.phase).toEqual({ type: 'preRoll' });
    expect(s.rolledThisTurn).toBe(false);
    expect(totalResources(s.players[1]!.resources)).toBe(9); // nessuno scarto
  });

  it('giocato DOPO il tiro: si torna in main', () => {
    const g = mut(clearHands(autoSetup(newGame(4, 'berserker-main'))), (d) => {
      d.phase = { type: 'main' };
      d.rolledThisTurn = true;
      d.players[0]!.sagaCards.push('berserker');
    });
    let s = apply(g, { type: 'giocaBerserker', player: 0 });
    expect(s.phase).toEqual({ type: 'moveDragon', cause: 'berserker' });
    const topo = getTopology();
    const libero = s.board.hexes.find(
      (h) =>
        h.id !== s.board.dragonHex &&
        topo.hexVertices[h.id]!.every((v) =>
          s.players.every((p) => !p.villages.includes(v) && !p.strongholds.includes(v))
        )
    )!;
    s = apply(s, { type: 'muoviDrago', player: 0, hex: libero.id });
    expect(s.phase).toEqual({ type: 'main' });
  });
});
