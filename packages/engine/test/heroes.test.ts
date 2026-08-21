import { describe, it, expect } from 'vitest';
import {
  createGame,
  getLegalActions,
  getPlayerView,
  getTopology,
  boardTopoKey,
  effectivePieceLimit,
  nextInt,
  seedRng,
  HERO_REGISTRY,
  ALL_HEROES,
  type Action,
  type GameState,
  type HeroId,
  type LegalMove,
} from '../src';
import {
  apply,
  applyOk,
  autoSetup,
  clearHands,
  expectError,
  expectResourceInvariants,
  give,
  greedyDiscard,
  greedyGain,
  makePlayers,
  mut,
} from './helpers';

/** Partita in modalità Eroi con ordine normalizzato 0..n-1. */
function heroGame(assignments: (HeroId | HeroId[] | null)[], seed = 'eroi-test'): GameState {
  const raw = createGame({
    seed,
    players: makePlayers(assignments.length),
    heroes: true,
    heroAssignments: assignments,
  });
  const asc = raw.players.map((p) => p.id);
  return mut(raw, (s) => {
    s.turnOrder = asc;
    s.setupOrder = [...asc, ...asc.slice().reverse()];
    s.currentPlayer = 0;
  });
}

/** Porta lo stato al prossimo inizio-turno del giocatore `pid` (via fineTurno). */
function beginTurnOf(state: GameState, pid: number): ReturnType<typeof applyOk> {
  let s = state;
  // Avanza finché non tocca al giocatore precedente in main, poi ne chiude il turno.
  const order = s.turnOrder;
  const prev = order[(order.indexOf(pid) - 1 + order.length) % order.length]!;
  while (s.currentPlayer !== prev) {
    s = apply(mut(s, (d) => toMainInPlace(d)), { type: 'fineTurno', player: s.currentPlayer });
  }
  const ready = mut(s, (d) => toMainInPlace(d));
  return applyOk(ready, { type: 'fineTurno', player: prev });
}

function toMainInPlace(s: GameState): void {
  s.phase = { type: 'main' };
  s.rolledThisTurn = true;
}

describe('registro eroi', () => {
  it('ogni eroe ha nome, abilità e rarità coerenti; i «Dono» hanno una risorsa', () => {
    expect(ALL_HEROES.length).toBe(10);
    for (const h of ALL_HEROES) {
      expect(HERO_REGISTRY[h.id]).toBe(h);
      expect(h.name.length).toBeGreaterThan(0);
      expect(h.ability.length).toBeGreaterThan(0);
      if (h.rarity === 'comune') expect(h.donoResource).toBeDefined();
      if (h.useKey) expect(h.usesPerGame).toBeGreaterThan(0);
    }
  });
});

describe('eroe comune — Dono (+1 a inizio turno)', () => {
  it('all’inizio del turno il portatore guadagna 1 del suo materiale', () => {
    let s = heroGame(['donoLegname', null]);
    s = autoSetup(s);
    s = clearHands(s);
    const before = s.players[0]!.resources.legname;
    const res = beginTurnOf(s, 0);
    expect(res.state.players[0]!.resources.legname).toBe(before + 1);
    expect(res.events.some((e) => e.type === 'eroeGuadagno' && e.player === 0)).toBe(true);
    expectResourceInvariants(res.state);
  });

  it('un giocatore senza eroe non guadagna nulla a inizio turno', () => {
    let s = heroGame(['donoLegname', null]);
    s = autoSetup(s);
    s = clearHands(s);
    const res = beginTurnOf(s, 1);
    for (const r of ['legname', 'pietra', 'lana', 'orzo', 'ferro'] as const) {
      expect(res.state.players[1]!.resources[r]).toBe(0);
    }
  });
});

describe('eroe non comune — Sindri (Maestro: +1 a ogni limite di pezzi)', () => {
  it('alza di 1 i massimi di sentieri, case e roccaforti', () => {
    const s = heroGame(['maestro', null]);
    expect(effectivePieceLimit(s, 0, 'sentiero')).toBe(16);
    expect(effectivePieceLimit(s, 0, 'villaggio')).toBe(6);
    expect(effectivePieceLimit(s, 0, 'roccaforte')).toBe(5);
    // Il giocatore senza Maestro resta ai limiti classici.
    expect(effectivePieceLimit(s, 1, 'sentiero')).toBe(15);
    expect(effectivePieceLimit(s, 1, 'villaggio')).toBe(5);
  });
});

describe('eroe non comune — Vegard (Apripista: 2 sentieri iniziali per casa)', () => {
  it('piazza 4 sentieri iniziali (2 per casa) invece di 2', () => {
    let s = heroGame(['apripista', null]);
    s = autoSetup(s);
    expect(s.players[0]!.roads.length).toBe(4);
    expect(s.players[0]!.initialRoads.length).toBe(4);
    expect(s.players[1]!.roads.length).toBe(2);
    expect(s.players[0]!.villages.length).toBe(2);
  });
});

describe('eroe non comune — Ulfar (Comandante: Berserker sposta il Drago 2 volte)', () => {
  it('dopo il primo spostamento torna in fase moveDragon; col secondo si conclude', () => {
    let s = heroGame(['comandante', null]);
    s = mut(s, (d) => {
      toMainInPlace(d);
      d.players[0]!.sagaCards = ['berserker'];
    });
    s = apply(s, { type: 'giocaBerserker', player: 0 });
    expect(s.phase.type).toBe('moveDragon');
    expect(s.heroBerserkerMovesLeft).toBe(2);
    const otherHex = s.board.hexes.find((h) => h.id !== s.board.dragonHex)!.id;
    s = apply(s, { type: 'muoviDrago', player: 0, hex: otherHex });
    // Nessun edificio ⇒ nessun furto ⇒ si torna a moveDragon per il 2° spostamento.
    expect(s.phase.type).toBe('moveDragon');
    const otherHex2 = s.board.hexes.find((h) => h.id !== s.board.dragonHex)!.id;
    s = apply(s, { type: 'muoviDrago', player: 0, hex: otherHex2 });
    expect(s.phase.type).toBe('main');
    expect(s.heroBerserkerMovesLeft).toBeUndefined();
  });

  it('senza Comandante il Berserker sposta il Drago una sola volta', () => {
    let s = heroGame(['donoLegname', null]);
    s = mut(s, (d) => {
      toMainInPlace(d);
      d.players[0]!.sagaCards = ['berserker'];
    });
    s = apply(s, { type: 'giocaBerserker', player: 0 });
    const otherHex = s.board.hexes.find((h) => h.id !== s.board.dragonHex)!.id;
    s = apply(s, { type: 'muoviDrago', player: 0, hex: otherHex });
    expect(s.phase.type).toBe('main');
  });
});

describe('eroe non comune — Njord (Signore dei Mari: trasforma un approdo)', () => {
  it('trasforma un approdo posseduto, consuma l’unico uso e poi si blocca', () => {
    let s = heroGame(['mutaporto', null]);
    const port = s.board.ports[0]!;
    const topo = getTopology(boardTopoKey(s.config.boardRadius, s.config.boardShape, s.board.hexes));
    const vertex = topo.edgeVertices[port.edge]![0]!;
    s = mut(s, (d) => {
      toMainInPlace(d);
      d.players[0]!.villages.push(vertex);
    });
    const target = port.kind === 'legname' ? 'ferro' : 'legname';
    s = apply(s, { type: 'eroeMutaporto', player: 0, edge: port.edge, kind: target });
    const changed = s.board.ports.find((p) => p.edge === port.edge)!;
    expect(changed.kind).toBe(target);
    expect(changed.ratio).toBe(2);
    expect(s.players[0]!.heroUses!.mutaporto).toBe(0);
    // Uso esaurito.
    expectError(s, { type: 'eroeMutaporto', player: 0, edge: port.edge, kind: 'lana' }, 'ABILITA_ESAURITA');
  });

  it('non si può trasformare un approdo non posseduto', () => {
    let s = heroGame(['mutaporto', null]);
    const port = s.board.ports[0]!;
    s = mut(s, (d) => toMainInPlace(d));
    expectError(s, { type: 'eroeMutaporto', player: 0, edge: port.edge, kind: 'lana' }, 'APPRODO_NON_TUO');
  });
});

describe('eroe non comune — Gest (Mercante: scambio 2-a-1, 4 volte a partita)', () => {
  it('esegue lo scambio 2-a-1 e si esaurisce dopo 4 usi', () => {
    let s = heroGame(['mercante', null]);
    s = mut(s, (d) => toMainInPlace(d));
    s = give(s, 0, { legname: 8 });
    expect(s.players[0]!.heroUses!.mercante).toBe(4);
    for (let i = 0; i < 4; i++) {
      s = apply(s, { type: 'eroeMercante', player: 0, give: 'legname', receive: 'pietra' });
    }
    expect(s.players[0]!.resources.legname).toBe(0);
    expect(s.players[0]!.resources.pietra).toBe(4);
    expect(s.players[0]!.heroUses!.mercante).toBe(0);
    expectResourceInvariants(s);
    // Quinto uso rifiutato (usi esauriti).
    s = give(s, 0, { legname: 2 });
    expectError(s, { type: 'eroeMercante', player: 0, give: 'legname', receive: 'pietra' }, 'ABILITA_ESAURITA');
  });

  it('la vista espone gli usi rimasti al proprietario e l’eroe a tutti', () => {
    let s = heroGame(['mercante', 'donoOrzo']);
    s = mut(s, (d) => toMainInPlace(d));
    const view0 = getPlayerView(s, 0);
    expect(view0.heroes).toBe(true);
    expect(view0.me!.heroUses!.mercante).toBe(4);
    expect(view0.players[0]!.heroes).toEqual(['mercante']);
    expect(view0.players[1]!.heroes).toEqual(['donoOrzo']);
  });
});

describe('più eroi per giocatore (numero di eroi > 1)', () => {
  it('assegna una LISTA di eroi distinti e ne inizializza gli usi a consumo', () => {
    const s = heroGame([['mercante', 'mutaporto', 'maestro'], null]);
    expect(s.players[0]!.heroes).toEqual(['mercante', 'mutaporto', 'maestro']);
    expect(s.players[0]!.heroUses!.mercante).toBe(4);
    expect(s.players[0]!.heroUses!.mutaporto).toBe(1);
    // Il Maestro (nella lista) alza comunque i limiti di pezzi.
    expect(effectivePieceLimit(s, 0, 'villaggio')).toBe(6);
  });

  it('scarta i doppioni nella lista di un clan', () => {
    const s = heroGame([['maestro', 'maestro', 'mercante'], null]);
    expect(s.players[0]!.heroes).toEqual(['maestro', 'mercante']);
  });

  it('con più eroi «Dono» i guadagni di inizio turno si sommano', () => {
    let s = heroGame([['donoLegname', 'donoPietra'], null]);
    s = autoSetup(s);
    s = clearHands(s);
    const beforeLegname = s.players[0]!.resources.legname;
    const beforePietra = s.players[0]!.resources.pietra;
    const res = beginTurnOf(s, 0);
    expect(res.state.players[0]!.resources.legname).toBe(beforeLegname + 1);
    expect(res.state.players[0]!.resources.pietra).toBe(beforePietra + 1);
    expectResourceInvariants(res.state);
  });

  it('la vista pubblica espone tutti gli eroi del clan', () => {
    let s = heroGame([['mercante', 'donoOrzo'], null]);
    s = mut(s, (d) => toMainInPlace(d));
    const view0 = getPlayerView(s, 0);
    expect(view0.players[0]!.heroes).toEqual(['mercante', 'donoOrzo']);
  });
});

describe('partita completa in modalità Eroi', () => {
  it('gioca fino alla fine rispettando gli invarianti (mosse casuali-legali)', () => {
    const heroes = ALL_HEROES.map((h) => h.id);
    let rng = seedRng('eroi-playout');
    let state = createGame({
      seed: 'eroi-playout',
      players: makePlayers(4),
      heroes: true,
      heroAssignments: [heroes[5]!, heroes[9]!, heroes[0]!, heroes[7]!], // Njord, Ulfar, Bjornar, Vegard
    });
    let steps = 0;
    while (state.phase.type !== 'gameOver' && steps < 4000) {
      const all: LegalMove[] = [];
      for (const p of state.players) all.push(...getLegalActions(state, p.id));
      const concrete: Action[] = [];
      for (const m of all) {
        if (m.type === 'scartaDescr') {
          concrete.push({ type: 'scarta', player: m.player, resources: greedyDiscard(state, m.player, m.amount) });
        } else if (m.type === 'guadagnaDescr') {
          concrete.push({ type: 'guadagnaCalamita', player: m.player, resources: greedyGain(state, m.amount) });
        } else if (m.type === 'proponiScambioDescr') {
          continue;
        } else {
          concrete.push(m);
        }
      }
      // Preferisci le costruzioni per garantire la terminazione.
      const builds = concrete.filter(
        (a) =>
          a.type === 'costruisciSentiero' ||
          a.type === 'costruisciVillaggio' ||
          a.type === 'costruisciRoccaforte' ||
          a.type === 'compraCartaSaga'
      );
      let pool = concrete;
      if (builds.length > 0) {
        const [coin, r] = nextInt(rng, 2);
        rng = r;
        if (coin === 1) pool = builds;
      }
      const [idx, r2] = nextInt(rng, pool.length);
      rng = r2;
      state = apply(state, pool[idx]!);
      expectResourceInvariants(state);
      steps++;
    }
    expect(state.phase.type).toBe('gameOver');
  });
});

describe('modalità Eroi spenta', () => {
  it('senza modalità Eroi le abilità attive sono rifiutate e non ci sono guadagni', () => {
    const raw = createGame({ seed: 'no-eroi', players: makePlayers(2) });
    const s = mut(raw, (d) => {
      d.turnOrder = [0, 1];
      d.currentPlayer = 0;
      toMainInPlace(d);
    });
    expectError(s, { type: 'eroeMercante', player: 0, give: 'legname', receive: 'pietra' }, 'EROI_SPENTI');
    expect(getPlayerView(s, 0).heroes).toBe(false);
  });
});
