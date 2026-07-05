import { describe, expect, it } from 'vitest';
import {
  CALAMITY_DECK_COMPOSITION,
  RESOURCES,
  applyAction,
  createGame,
  effectiveBankRatio,
  getLegalActions,
  getTopology,
  legalRoadEdges,
  materialMultiplier,
  type Action,
  type CalamityCard,
  type GameState,
  type Resource,
} from '../src';
import type { GameEvent } from '../src/actions';
import { dragonPhaseAfterSeven, rollTimePhase } from '../src/calamityRules';
import { produceResources } from '../src/production';
import {
  apply,
  autoSetup,
  expectResourceInvariants,
  greedyDiscard,
  greedyGain,
  makePlayers,
  mut,
  newGame,
  randomPlayout,
} from './helpers';

const R = 2; // raggio tavola piccola

/** Partita CON CALAMITÀ, ordine normalizzato a 0..n-1 (come `newGame`). */
function calGame(n = 3, seed = 'cal'): GameState {
  const raw = createGame({ seed, players: makePlayers(n), calamities: true });
  const asc = raw.players.map((p) => p.id);
  return mut(raw, (s) => {
    s.turnOrder = asc;
    s.setupOrder = [...asc, ...asc.slice().reverse()];
    s.currentPlayer = 0;
  });
}

/** Inietta una calamità attiva in uno stato qualsiasi (per i test dei modificatori). */
function withCalamity(state: GameState, card: CalamityCard | null): GameState {
  return mut(state, (s) => {
    s.calamities = { deck: [], current: card };
  });
}

/** Azzera le mani (risorse in banca) dentro una bozza mutabile. */
function zeroHands(s: GameState): void {
  for (const p of s.players) {
    for (const r of RESOURCES) {
      s.bank[r] += p.resources[r];
      p.resources[r] = 0;
    }
  }
}
function handTo(s: GameState, pid: number, rc: Partial<Record<Resource, number>>): void {
  for (const r of RESOURCES) {
    const n = rc[r] ?? 0;
    s.players[pid]!.resources[r] += n;
    s.bank[r] -= n;
  }
}

/**
 * Rivela `card` forzando un NUOVO GIRO: prepara "fine turno dell'ultimo giocatore"
 * e applica `fineTurno`, che dentro `beginTurn` pesca e applica la calamità.
 * `setup` configura mani/punti PRIMA della rivelazione.
 */
function revealNewRound(
  base: GameState,
  card: CalamityCard,
  setup?: (s: GameState) => void
): { state: GameState; events: GameEvent[] } {
  const last = base.turnOrder[base.turnOrder.length - 1]!;
  const prepared = mut(base, (s) => {
    s.currentPlayer = last;
    s.phase = { type: 'main' };
    s.rolledThisTurn = true;
    s.devCardPlayedThisTurn = false;
    s.pendingTrade = null;
    s.calamities = { deck: [card], current: null };
    setup?.(s);
  });
  const res = applyAction(prepared, { type: 'fineTurno', player: last });
  if (!res.ok) throw new Error('fineTurno rifiutato: ' + res.error.code);
  return { state: res.state, events: res.events };
}

/** Risolve le fasi interattive delle calamità applicando la prima mossa legale. */
function drain(state: GameState): GameState {
  let s = state;
  for (let guard = 0; guard < 80; guard++) {
    if (
      s.phase.type !== 'calamityDiscard' &&
      s.phase.type !== 'calamityGain' &&
      s.phase.type !== 'calamityRoads'
    ) {
      return s;
    }
    let moved = false;
    for (const p of s.players) {
      const m = getLegalActions(s, p.id)[0];
      if (!m) continue;
      let action: Action;
      if (m.type === 'scartaDescr') {
        action = { type: 'scarta', player: m.player, resources: greedyDiscard(s, m.player, m.amount) };
      } else if (m.type === 'guadagnaDescr') {
        action = { type: 'guadagnaCalamita', player: m.player, resources: greedyGain(s, m.amount) };
      } else if (m.type === 'proponiScambioDescr') {
        continue;
      } else {
        action = m;
      }
      s = apply(s, action);
      moved = true;
      break;
    }
    if (!moved) return s;
  }
  return s;
}

function produce(state: GameState, total: number): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const s = mut(state, (d) => produceResources(d, total, events));
  return { state: s, events };
}

// ---------------------------------------------------------------------------

describe('Calamità — mazzo, modalità e determinismo', () => {
  it('mazzo di 38 carte, deterministico dal seed; assente in partita standard', () => {
    expect(CALAMITY_DECK_COMPOSITION.length).toBe(38);
    const a = createGame({ seed: 'x', players: makePlayers(3), calamities: true });
    const b = createGame({ seed: 'x', players: makePlayers(3), calamities: true });
    expect(a.calamities?.deck.length).toBe(38);
    expect(JSON.stringify(a.calamities!.deck)).toBe(JSON.stringify(b.calamities!.deck));

    const std = createGame({ seed: 'x', players: makePlayers(3) });
    expect(std.calamities).toBeUndefined();
    // La modalità standard non consuma PRNG extra: tavola identica a prima.
    const std2 = createGame({ seed: 'x', players: makePlayers(3) });
    expect(JSON.stringify(std.board)).toBe(JSON.stringify(std2.board));
    expect(JSON.stringify(std.turnOrder)).toBe(JSON.stringify(std2.turnOrder));
  });

  it('rivela una carta a inizio giro; il mazzo cala; a mazzo vuoto il giro è normale', () => {
    const afterSetup = autoSetup(calGame(3));
    expect(afterSetup.calamities?.current).not.toBeNull(); // 1° giro rivelato
    expect(afterSetup.calamities?.deck.length).toBe(37);

    // Mazzo vuoto → nessuna calamità e preRoll normale.
    const last = afterSetup.turnOrder[afterSetup.turnOrder.length - 1]!;
    const prepared = mut(afterSetup, (s) => {
      s.currentPlayer = last;
      s.phase = { type: 'main' };
      s.rolledThisTurn = true;
      s.calamities = { deck: [], current: { kind: 'abbondanza' } };
    });
    const r = applyAction(prepared, { type: 'fineTurno', player: last });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.calamities?.current).toBeNull();
      expect(r.state.phase.type).toBe('preRoll');
    }
  });
});

describe('Calamità persistenti — produzione', () => {
  const base = autoSetup(calGame(3));
  const hex = base.board.hexes.find((h) => h.terrain !== 'tundra' && h.token !== null)!;

  it('materialMultiplier: doppio=2, bloccato=0, abbondanza=2, altrimenti 1', () => {
    const r = hex.terrain as Resource;
    const other = RESOURCES.find((x) => x !== r)!;
    expect(materialMultiplier(withCalamity(base, { kind: 'materialeDoppio', resource: r }), r)).toBe(2);
    expect(materialMultiplier(withCalamity(base, { kind: 'materialeDoppio', resource: r }), other)).toBe(1);
    expect(materialMultiplier(withCalamity(base, { kind: 'materialeBloccato', resource: r }), r)).toBe(0);
    expect(materialMultiplier(withCalamity(base, { kind: 'abbondanza' }), r)).toBe(2);
    expect(materialMultiplier(withCalamity(base, null), r)).toBe(1);
  });

  it('produzione: villaggio rende 2 col materiale raddoppiato, 0 se bloccato', () => {
    const vv = getTopology(R).hexVertices[hex.id]!;
    const res = hex.terrain as Resource;
    const seed = mut(base, (d) => {
      zeroHands(d);
      d.board.dragonHex = base.board.hexes.find((h) => h.id !== hex.id)!.id; // Drago altrove
      d.players[0]!.villages = [vv[0]!];
    });
    // Normale = 1
    expect(produce(seed, hex.token!).state.players[0]!.resources[res]).toBe(1);
    // Doppio = 2
    expect(
      produce(withCalamity(seed, { kind: 'materialeDoppio', resource: res }), hex.token!).state
        .players[0]!.resources[res]
    ).toBe(2);
    // Bloccato = 0
    expect(
      produce(withCalamity(seed, { kind: 'materialeBloccato', resource: res }), hex.token!).state
        .players[0]!.resources[res]
    ).toBe(0);
    // Abbondanza = 2 anche senza specificare il materiale
    expect(
      produce(withCalamity(seed, { kind: 'abbondanza' }), hex.token!).state.players[0]!.resources[res]
    ).toBe(2);
  });
});

describe('Calamità persistenti — scambi e divieti', () => {
  const base = autoSetup(newGame(3));

  it('rapporto di scambio scontato: scambiTre=3, scambioDue sul materiale=2, mercatoOro=2', () => {
    const noPorts = mut(base, (s) => {
      s.players[0]!.villages = [];
      s.players[0]!.strongholds = [];
    });
    expect(effectiveBankRatio(withCalamity(noPorts, { kind: 'scambiTre' }), 0, 'legname', R)).toBe(3);
    expect(
      effectiveBankRatio(withCalamity(noPorts, { kind: 'scambioDue', resource: 'legname' }), 0, 'legname', R)
    ).toBe(2);
    expect(
      effectiveBankRatio(withCalamity(noPorts, { kind: 'scambioDue', resource: 'legname' }), 0, 'orzo', R)
    ).toBe(4); // altro materiale: nessuno sconto
    expect(effectiveBankRatio(withCalamity(noPorts, { kind: 'mercatoOro' }), 0, 'orzo', R)).toBe(2);
  });

  it('scambiTre: si scambia davvero 3:1', () => {
    const s = mut(base, (d) => {
      zeroHands(d);
      d.players[0]!.villages = [];
      d.players[0]!.strongholds = [];
      handTo(d, 0, { legname: 3 });
      d.phase = { type: 'main' };
      d.rolledThisTurn = true;
      d.currentPlayer = 0;
      d.calamities = { deck: [], current: { kind: 'scambiTre' } };
    });
    const r = applyAction(s, { type: 'scambioBanca', player: 0, give: 'legname', receive: 'orzo' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.players[0]!.resources.legname).toBe(0);
      expect(r.state.players[0]!.resources.orzo).toBe(1);
    }
  });

  function mainWithResources(card: CalamityCard): GameState {
    return mut(base, (d) => {
      handTo(d, 0, { legname: 4, pietra: 4, orzo: 4, ferro: 4, lana: 4 });
      d.phase = { type: 'main' };
      d.rolledThisTurn = true;
      d.currentPlayer = 0;
      d.calamities = { deck: [], current: card };
    });
  }

  it('bufera vieta i sentieri, assedio vieta le roccaforti, mare in tempesta vieta la banca', () => {
    const edge = legalRoadEdges(base, 0, R)[0]!;
    const rc = applyAction(mainWithResources({ kind: 'bufera' }), {
      type: 'costruisciSentiero',
      player: 0,
      edge,
    });
    expect(rc.ok).toBe(false);
    if (!rc.ok) expect(rc.error.code).toBe('CALAMITA_SENTIERO');

    const village = base.players[0]!.villages[0]!;
    const ra = applyAction(mainWithResources({ kind: 'assedio' }), {
      type: 'costruisciRoccaforte',
      player: 0,
      vertex: village,
    });
    expect(ra.ok).toBe(false);
    if (!ra.ok) expect(ra.error.code).toBe('CALAMITA_ROCCAFORTE');

    const rm = applyAction(mainWithResources({ kind: 'mareInTempesta' }), {
      type: 'scambioBanca',
      player: 0,
      give: 'legname',
      receive: 'orzo',
    });
    expect(rm.ok).toBe(false);
    if (!rm.ok) expect(rm.error.code).toBe('CALAMITA_SCAMBIO');
  });

  it('niente Saga e Drago fermo bloccano il Berserker (codici diversi)', () => {
    const withBerserker = (card: CalamityCard) =>
      mut(base, (d) => {
        d.players[0]!.sagaCards = ['berserker'];
        d.phase = { type: 'main' };
        d.rolledThisTurn = true;
        d.currentPlayer = 0;
        d.devCardPlayedThisTurn = false;
        d.calamities = { deck: [], current: card };
      });
    const r1 = applyAction(withBerserker({ kind: 'nienteSaga' }), { type: 'giocaBerserker', player: 0 });
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error.code).toBe('CALAMITA_SAGA');

    const r2 = applyAction(withBerserker({ kind: 'dragoFermo' }), { type: 'giocaBerserker', player: 0 });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error.code).toBe('CALAMITA_DRAGO');

    // getLegalActions non deve nemmeno proporre il Berserker in questi giri.
    const s = withBerserker({ kind: 'nienteSaga' });
    expect(getLegalActions(s, 0).some((m) => m.type === 'giocaBerserker')).toBe(false);
  });

  it('dragoFermo salta lo spostamento del Drago sul 7; il Drago prima del tiro impone moveDragon', () => {
    expect(dragonPhaseAfterSeven(withCalamity(base, { kind: 'dragoFermo' })).type).toBe('main');
    expect(dragonPhaseAfterSeven(withCalamity(base, null)).type).toBe('moveDragon');
    expect(rollTimePhase(withCalamity(base, { kind: 'dragoPrimaDelTiro' })).type).toBe('moveDragon');
    expect(rollTimePhase(withCalamity(base, null)).type).toBe('preRoll');
  });
});

describe('Calamità istantanee — automatiche', () => {
  const base = autoSetup(calGame(3));

  it('tuttiUnoDiTutto: ognuno guadagna 1 di ogni materiale', () => {
    const { state } = revealNewRound(base, { kind: 'tuttiUnoDiTutto' }, (s) => {
      zeroHands(s);
    });
    for (const p of state.players) {
      for (const r of RESOURCES) expect(p.resources[r]).toBe(1);
    }
    expectResourceInvariants(state);
  });

  it('tuttiPiu2(ferro): ognuno guadagna 2 ferro', () => {
    const { state } = revealNewRound(base, { kind: 'tuttiPiu2', resource: 'ferro' }, (s) => {
      zeroHands(s);
    });
    for (const p of state.players) expect(p.resources.ferro).toBe(2);
    expectResourceInvariants(state);
  });

  it('leaderScartaTutto: chi ha più punti perde tutte le risorse', () => {
    const { state } = revealNewRound(base, { kind: 'leaderScartaTutto' }, (s) => {
      zeroHands(s);
      // Player 1 è il leader (3 villaggi = 3 PG); gli altri 1.
      s.players[0]!.villages = ['a'];
      s.players[1]!.villages = ['a', 'b', 'c'];
      s.players[2]!.villages = ['a'];
      handTo(s, 1, { legname: 3, orzo: 2 });
      handTo(s, 0, { legname: 1 });
    });
    expect(state.players[1]!.resources.legname).toBe(0);
    expect(state.players[1]!.resources.orzo).toBe(0);
    expect(state.players[0]!.resources.legname).toBe(1); // non-leader intatto
    expectResourceInvariants(state);
  });

  it('razzia: il leader dà 1 risorsa a ciascun avversario', () => {
    const { state } = revealNewRound(base, { kind: 'razzia' }, (s) => {
      zeroHands(s);
      s.players[0]!.villages = ['a'];
      s.players[1]!.villages = ['a', 'b', 'c']; // leader
      s.players[2]!.villages = ['a'];
      handTo(s, 1, { legname: 5 });
    });
    // Il leader ha ceduto 2 risorse (una per avversario); gli avversari +1 ciascuno.
    const opp = state.players[0]!.resources.legname + state.players[2]!.resources.legname;
    expect(opp).toBe(2);
    expect(state.players[1]!.resources.legname).toBe(3);
    expectResourceInvariants(state);
  });

  it('donoDegliDei: tutti pescano 1 Carta Saga; bottino: solo chi ha meno punti', () => {
    const before = base.sagaDeck.length;
    const dono = revealNewRound(base, { kind: 'donoDegliDei' }).state;
    for (const p of dono.players) {
      expect(p.sagaCards.length + p.sagaCardsBoughtThisTurn.length).toBeGreaterThan(0);
    }
    expect(dono.sagaDeck.length).toBe(before - dono.players.length);

    const bottino = revealNewRound(base, { kind: 'bottino' }, (s) => {
      s.players[0]!.villages = ['a', 'b']; // 2 PG
      s.players[1]!.villages = ['a']; // 1 PG (ultimo)
      s.players[2]!.villages = ['a', 'b']; // 2 PG
    }).state;
    expect(bottino.players[1]!.sagaCardsBoughtThisTurn.length).toBe(1);
    expect(bottino.players[0]!.sagaCardsBoughtThisTurn.length).toBe(0);
  });
});

describe('Calamità istantanee — interattive', () => {
  const base = autoSetup(calGame(3));

  it('tuttiScartanoMeta: apre lo scarto (metà) e poi torna al tiro', () => {
    const { state } = revealNewRound(base, { kind: 'tuttiScartanoMeta' }, (s) => {
      zeroHands(s);
      handTo(s, 0, { legname: 4 }); // scarta 2
      handTo(s, 1, { orzo: 5 }); // scarta 2
    });
    expect(state.phase.type).toBe('calamityDiscard');
    if (state.phase.type === 'calamityDiscard') {
      expect(state.phase.mustDiscard[0]).toBe(2);
      expect(state.phase.mustDiscard[1]).toBe(2);
      expect(state.phase.mustDiscard[2]).toBeUndefined(); // 0 carte
    }
    const done = drain(state);
    expect(done.phase.type).toBe('preRoll');
    expect(done.players[0]!.resources.legname).toBe(2);
    expectResourceInvariants(done);
  });

  it('scartaFino7: solo chi ha più di 7 risorse scarta fino a 7', () => {
    const { state } = revealNewRound(base, { kind: 'scartaFino7' }, (s) => {
      zeroHands(s);
      handTo(s, 0, { legname: 9 }); // scarta 2 → 7
      handTo(s, 1, { orzo: 5 }); // resta a 5
    });
    expect(state.phase.type).toBe('calamityDiscard');
    if (state.phase.type === 'calamityDiscard') {
      expect(state.phase.mustDiscard[0]).toBe(2);
      expect(state.phase.mustDiscard[1]).toBeUndefined();
    }
    const done = drain(state);
    expect(done.phase.type).toBe('preRoll');
    expect([...RESOURCES].reduce((n, r) => n + done.players[0]!.resources[r], 0)).toBe(7);
  });

  it('ultimoPesca4: chi ha meno punti guadagna 4 risorse dalla banca', () => {
    const { state } = revealNewRound(base, { kind: 'ultimoPesca4' }, (s) => {
      s.players[0]!.villages = ['a', 'b']; // 2 PG
      s.players[1]!.villages = ['a']; // 1 PG (ultimo)
      s.players[2]!.villages = ['a', 'b']; // 2 PG
      zeroHands(s);
    });
    expect(state.phase.type).toBe('calamityGain');
    if (state.phase.type === 'calamityGain') expect(state.phase.mustGain[1]).toBe(4);
    const done = drain(state);
    expect(done.phase.type).toBe('preRoll');
    const gained = [...RESOURCES].reduce((n, r) => n + done.players[1]!.resources[r], 0);
    expect(gained).toBe(4);
    expectResourceInvariants(done);
  });

  it('ultimoStrade2: chi ha meno strade ne piazza 2 gratis', () => {
    const { state } = revealNewRound(base, { kind: 'ultimoStrade2' }, (s) => {
      // Player 1 e 2 hanno molte strade fittizie ⇒ player 0 ne ha meno.
      s.players[1]!.roads = [...s.players[1]!.roads, 'f1', 'f2', 'f3'];
      s.players[2]!.roads = [...s.players[2]!.roads, 'g1', 'g2', 'g3'];
    });
    expect(state.phase.type).toBe('calamityRoads');
    if (state.phase.type === 'calamityRoads') {
      expect(state.phase.queue[0]).toBe(0);
      expect(state.phase.remaining).toBe(2);
    }
    const roadsBefore = state.players[0]!.roads.length;
    const done = drain(state);
    expect(done.phase.type).toBe('preRoll');
    expect(done.players[0]!.roads.length).toBe(roadsBefore + 2);
  });
});

describe('Calamità — partite complete casuali-legali', () => {
  it('40 partite con calamità terminano, invarianti ok, replay deterministico', () => {
    for (let i = 0; i < 40; i++) {
      const seed = `cal-full-${i}`;
      const { state, actions, finished } = randomPlayout(seed, { calamities: true });
      expect(finished, `seed ${seed} non terminata`).toBe(true);
      expectResourceInvariants(state);

      let s = createGame({
        seed,
        players: makePlayers(state.players.length),
        calamities: true,
      });
      for (const a of actions) {
        const r = applyAction(s, a);
        expect(r.ok, `replay rifiutato: ${a.type}`).toBe(true);
        if (r.ok) s = r.state;
      }
      expect(JSON.stringify(s)).toBe(JSON.stringify(state));
    }
  }, 120_000);
});
