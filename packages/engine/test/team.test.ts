import { describe, expect, it } from 'vitest';
import {
  applyAction,
  bankTradeRatio,
  boardTopoKey,
  createGame,
  friendsOf,
  getLegalActions,
  getPlayerView,
  getTopology,
  isLegal,
  longestRoadLength,
  nextInt,
  scoreBreakdown,
  seedRng,
  zeroResources,
  type Action,
  type EdgeId,
  type GameState,
  type LegalMove,
  type PlayerConfig,
  type Resource,
} from '../src';
import {
  apply,
  applyOk,
  expectError,
  expectResourceInvariants,
  give,
  greedyDiscard,
  greedyGain,
  mut,
  toMain,
} from './helpers';

/** Conteggio risorse compatto: `rc({ legname: 1 })`. */
function rc(o: Partial<Record<Resource, number>>) {
  return { ...zeroResources(), ...o };
}

const NAMES = ['Bjorn', 'Astrid', 'Leif', 'Sigrid', 'Ragnar', 'Freya', 'Olaf', 'Ingrid'];
const PERSONAL_COLORS = [
  '#c0392b', '#2e6fb7', '#3e8f4e', '#d9a525', '#e84393', '#00cec9', '#a0522d', '#7f8c8d',
];
const TEAM_COLORS = ['#8e44ad', '#e67e22', '#16a085', '#34495e'];

function makePlayers(n: number): PlayerConfig[] {
  return Array.from({ length: n }, (_, i) => ({
    name: NAMES[i]!,
    color: PERSONAL_COLORS[i]!,
    isBot: false,
  }));
}

/** Partita a squadre con ordine normalizzato 0..n-1 (come `newGame` dei test). */
function teamGame(teams: number[], extra: Record<string, unknown> = {}): GameState {
  const n = teams.length;
  const raw = createGame({
    seed: 'squadra-di-test',
    players: makePlayers(n),
    teams,
    teamColors: TEAM_COLORS,
    ...extra,
  });
  const ascending = raw.players.map((p) => p.id);
  return mut(raw, (s) => {
    s.turnOrder = ascending;
    s.setupOrder = [...ascending, ...ascending.slice().reverse()];
    s.currentPlayer = 0;
  });
}

function topoOf(s: GameState) {
  return getTopology(boardTopoKey(s.config.boardRadius, s.config.boardShape, s.board.hexes));
}

/** Partita SENZA squadre (per i confronti con la modalità classica). */
function newGameNoTeams(): GameState {
  return createGame({ seed: 'senza-squadre', players: makePlayers(4) });
}

describe('modalità squadra — creazione e validazione', () => {
  it('accetta due squadre di ugual dimensione e imposta il bersaglio combinato', () => {
    // 4 giocatori, 2 squadre da 2, bersaglio-per-giocatore 8 ⇒ 16 combinati.
    const s = teamGame([0, 1, 0, 1]);
    expect(s.config.teams).toEqual([0, 1, 0, 1]);
    expect(s.config.targetGloryPoints).toBe(16);
    expect(s.teamTradesThisTurn).toBe(0);
  });

  it('il valore per-giocatore è impostabile', () => {
    const s = teamGame([0, 1, 0, 1], { teamTargetPerPlayer: 5 });
    expect(s.config.targetGloryPoints).toBe(10); // 2 × 5
  });

  it('rifiuta squadre di dimensione diversa', () => {
    expect(() => teamGame([0, 0, 0, 1])).toThrow(/ugual dimensione/);
  });

  it('rifiuta una sola squadra', () => {
    expect(() => teamGame([0, 0, 0, 0])).toThrow(/almeno due squadre/);
  });

  it('rifiuta colori di squadra mancanti', () => {
    expect(() =>
      createGame({ seed: 'x', players: makePlayers(4), teams: [0, 1, 0, 1] })
    ).toThrow(/colore per ogni squadra/);
  });

  it('conserva i nomi di squadra (ripuliti) e li espone nella vista', () => {
    const s = teamGame([0, 1, 0, 1], { teamNames: ['  Draghi  ', 'Lupi'] });
    // Ripuliti (trim) e indicizzati per squadra.
    expect(s.config.teamNames).toEqual(['Draghi', 'Lupi']);
    const view = getPlayerView(s, 0);
    expect(view.teamNames).toEqual(['Draghi', 'Lupi']);
  });

  it('senza nomi non aggiunge `teamNames` (la UI userà «Squadra A/B»)', () => {
    const s = teamGame([0, 1, 0, 1]);
    expect(s.config.teamNames).toBeUndefined();
    expect(getPlayerView(s, 0).teamNames).toBeUndefined();
  });

  it('ignora un array di soli nomi vuoti', () => {
    const s = teamGame([0, 1, 0, 1], { teamNames: ['', '   '] });
    expect(s.config.teamNames).toBeUndefined();
  });
});

describe('modalità squadra — strade in comune (connettività)', () => {
  it('un giocatore può costruire attaccandosi alla strada di un compagno', () => {
    let s = teamGame([0, 1, 0, 1]);
    const topo = topoOf(s);
    const e: EdgeId = Object.keys(topo.edgeVertices)[0]!;
    const [v1] = topo.edgeVertices[e]!;
    const e2 = topo.vertexEdges[v1!]!.find((x) => x !== e)!;
    // Il compagno (giocatore 2) ha una strada su `e`; il giocatore 0 costruisce `e2`.
    s = mut(s, (st) => {
      st.players[2]!.roads.push(e);
    });
    s = give(toMain(s), 0, { legname: 1, pietra: 1 });
    expect(isLegal(s, { type: 'costruisciSentiero', player: 0, edge: e2 })).toBeNull();
  });

  it('senza squadre la stessa strada altrui NON connette', () => {
    // Stessa geometria, ma partita classica: la strada del giocatore 2 è avversaria.
    let s = mut(teamGame([0, 1, 0, 1]), (st) => {
      delete st.config.teams;
      delete st.config.teamColors;
      delete st.teamTradesThisTurn;
    });
    const topo = topoOf(s);
    const e: EdgeId = Object.keys(topo.edgeVertices)[0]!;
    const [v1] = topo.edgeVertices[e]!;
    const e2 = topo.vertexEdges[v1!]!.find((x) => x !== e)!;
    s = mut(s, (st) => {
      st.players[2]!.roads.push(e);
    });
    s = give(toMain(s), 0, { legname: 1, pietra: 1 });
    const err = isLegal(s, { type: 'costruisciSentiero', player: 0, edge: e2 });
    expect(err?.code).toBe('NON_CONNESSO');
  });
});

describe('modalità squadra — La Grande Via combinata', () => {
  it("somma la rete dei compagni e assegna il bonus alla squadra", () => {
    const s0 = teamGame([0, 1, 0, 1]);
    const topo = topoOf(s0);
    // Costruisce un cammino semplice di 5 spigoli e lo divide fra i due compagni.
    const start = topo.vertices[0]!;
    const visited = new Set<string>([start]);
    const path: EdgeId[] = [];
    let v = start;
    while (path.length < 5) {
      const e = topo.vertexEdges[v]!.find((edge) => {
        const [a, b] = topo.edgeVertices[edge]!;
        const next = a === v ? b! : a!;
        return !visited.has(next) && !path.includes(edge);
      });
      if (!e) break;
      const [a, b] = topo.edgeVertices[e]!;
      const next = a === v ? b! : a!;
      path.push(e);
      visited.add(next);
      v = next;
    }
    expect(path.length).toBe(5);

    const s = mut(s0, (st) => {
      st.players[0]!.roads.push(path[0]!, path[1]!, path[2]!);
      st.players[2]!.roads.push(path[3]!, path[4]!);
    });
    const teamLen = longestRoadLength(s, 0, boardTopoKey(s.config.boardRadius, s.config.boardShape, s.board.hexes), friendsOf(s.config.teams, 0));
    expect(teamLen).toBe(5);
    // La lunghezza del solo giocatore 0 è minore (rete spezzata).
    const soloLen = longestRoadLength(s, 0, boardTopoKey(s.config.boardRadius, s.config.boardShape, s.board.hexes));
    expect(soloLen).toBeLessThan(5);
  });
});

describe('modalità squadra — approdi in comune', () => {
  it('un edificio del compagno su un approdo abbassa il rapporto per tutta la squadra', () => {
    const s0 = teamGame([0, 1, 0, 1]);
    const radius = boardTopoKey(s0.config.boardRadius, s0.config.boardShape, s0.board.hexes);
    const topo = getTopology(radius);
    const port = s0.board.ports.find((p) => p.kind === 'generico')!;
    const [pv1] = topo.edgeVertices[port.edge]!;
    // Il compagno (giocatore 2) ha un villaggio sull'approdo generico (3:1).
    const s = mut(s0, (st) => {
      st.players[2]!.villages.push(pv1!);
    });
    const teamRatio = bankTradeRatio(s, 0, 'legname', radius, friendsOf(s.config.teams, 0));
    expect(teamRatio).toBe(3);
    // Da solo (senza compagni) il giocatore 0 non ha l'approdo: resta 4:1.
    const soloRatio = bankTradeRatio(s, 0, 'legname', radius);
    expect(soloRatio).toBe(4);
  });
});

describe('modalità squadra — Furia dei Berserker combinata', () => {
  it('somma i Berserker dei compagni per la Furia', () => {
    let s = teamGame([0, 1, 0, 1]);
    // Il giocatore 0 (squadra A) ha già giocato 2 Berserker; il 2 ne gioca 1.
    s = mut(s, (st) => {
      st.players[0]!.playedBerserkers = 2;
      st.players[2]!.sagaCards.push('berserker');
      st.currentPlayer = 2;
    });
    s = toMain(s);
    const res = applyAction(s, { type: 'giocaBerserker', player: 2 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const holder = res.state.largestArmy.holder;
    expect(holder).not.toBeNull();
    // Il detentore è un membro della squadra A (0 o 2) con conteggio combinato 3.
    expect(res.state.config.teams![holder!]).toBe(0);
    expect(res.state.largestArmy.count).toBe(3);
    expect(scoreBreakdown(res.state, holder!).furia).toBeGreaterThan(0);
  });
});

describe('modalità squadra — scambi solo fra compagni', () => {
  it('vieta lo scambio con un avversario', () => {
    const s = give(toMain(teamGame([0, 1, 0, 1])), 0, { legname: 2 });
    const err = isLegal(s, {
      type: 'proponiScambio',
      player: 0,
      give: { legname: 1, pietra: 0, lana: 0, orzo: 0, ferro: 0 },
      receive: { legname: 0, pietra: 0, lana: 1, orzo: 0, ferro: 0 },
      to: 1, // avversario
    });
    expect(err?.code).toBe('SCAMBIO_SOLO_SQUADRA');
  });

  it('impone scambi uno-a-uno', () => {
    const s = give(toMain(teamGame([0, 1, 0, 1])), 0, { legname: 2 });
    const err = isLegal(s, {
      type: 'proponiScambio',
      player: 0,
      give: { legname: 2, pietra: 0, lana: 0, orzo: 0, ferro: 0 },
      receive: { legname: 0, pietra: 0, lana: 1, orzo: 0, ferro: 0 },
      to: 2,
    });
    expect(err?.code).toBe('SCAMBIO_UNO_A_UNO');
  });

  it('limita a due scambi conclusi per turno', () => {
    let s = give(toMain(teamGame([0, 1, 0, 1])), 0, { legname: 3 });
    s = give(s, 2, { lana: 3 });
    const propose = () =>
      apply(s, {
        type: 'proponiScambio',
        player: 0,
        give: { legname: 1, pietra: 0, lana: 0, orzo: 0, ferro: 0 },
        receive: { legname: 0, pietra: 0, lana: 1, orzo: 0, ferro: 0 },
        to: 2,
      });
    // Primo scambio: proposta + accettazione (offerta diretta ⇒ esegue subito).
    s = propose();
    s = apply(s, { type: 'rispondiScambio', player: 2, offerId: s.pendingTrade!.id, accept: true });
    expect(s.teamTradesThisTurn).toBe(1);
    // Secondo scambio.
    s = propose();
    s = apply(s, { type: 'rispondiScambio', player: 2, offerId: s.pendingTrade!.id, accept: true });
    expect(s.teamTradesThisTurn).toBe(2);
    // Terzo: bocciato.
    const err = isLegal(s, {
      type: 'proponiScambio',
      player: 0,
      give: { legname: 1, pietra: 0, lana: 0, orzo: 0, ferro: 0 },
      receive: { legname: 0, pietra: 0, lana: 1, orzo: 0, ferro: 0 },
      to: 2,
    });
    expect(err?.code).toBe('TROPPI_SCAMBI');
  });
});

describe('modalità squadra — scambio «a tutta la squadra» in automatico', () => {
  it('l\'offerta aperta si conclude appena un compagno accetta (avversari esclusi)', () => {
    let s = give(toMain(teamGame([0, 1, 0, 1])), 0, { legname: 1 });
    s = give(s, 2, { lana: 1 });
    // Offerta alla squadra (to: null): legname 1 ↔ lana 1.
    s = apply(s, { type: 'proponiScambio', player: 0, give: rc({ legname: 1 }), receive: rc({ lana: 1 }), to: null });
    // Un avversario non può rispondere a un'offerta di squadra.
    expectError(
      s,
      { type: 'rispondiScambio', player: 1, offerId: s.pendingTrade!.id, accept: true },
      'RISPOSTA_NON_AMMESSA'
    );
    // Il compagno accetta: lo scambio si esegue subito, senza conferma.
    s = apply(s, { type: 'rispondiScambio', player: 2, offerId: s.pendingTrade!.id, accept: true });
    expect(s.pendingTrade).toBeNull();
    expect(s.players[0]!.resources.lana).toBe(1);
    expect(s.players[0]!.resources.legname).toBe(0);
    expect(s.players[2]!.resources.legname).toBe(1);
    expect(s.teamTradesThisTurn).toBe(1);
  });

  it('il rifiuto di un compagno non chiude l\'offerta (resta per gli altri)', () => {
    // 3 giocatori per squadra: 0 offre, 2 rifiuta, 4 accetta.
    let s = give(toMain(teamGame([0, 1, 0, 1, 0, 1])), 0, { legname: 1 });
    s = give(s, 4, { lana: 1 });
    s = apply(s, { type: 'proponiScambio', player: 0, give: rc({ legname: 1 }), receive: rc({ lana: 1 }), to: null });
    s = apply(s, { type: 'rispondiScambio', player: 2, offerId: s.pendingTrade!.id, accept: false });
    expect(s.pendingTrade).not.toBeNull(); // ancora aperta
    s = apply(s, { type: 'rispondiScambio', player: 4, offerId: s.pendingTrade!.id, accept: true });
    expect(s.pendingTrade).toBeNull();
    expect(s.players[0]!.resources.lana).toBe(1);
    expect(s.players[4]!.resources.legname).toBe(1);
  });

  it("quando TUTTI i compagni rifiutano, l'offerta si chiude con un esito chiaro", () => {
    let s = give(toMain(teamGame([0, 1, 0, 1])), 0, { legname: 1 });
    s = apply(s, { type: 'proponiScambio', player: 0, give: rc({ legname: 1 }), receive: rc({ lana: 1 }), to: null });
    // L'unico compagno (2) rifiuta: l'offerta si chiude ed emette l'evento dedicato.
    const res = applyOk(s, { type: 'rispondiScambio', player: 2, offerId: s.pendingTrade!.id, accept: false });
    expect(res.state.pendingTrade).toBeNull();
    expect(res.events.some((e) => e.type === 'scambioRifiutato')).toBe(true);
  });
});

describe('modalità squadra — mano dei compagni visibile', () => {
  it('si vede la mano dei compagni ma non quella degli avversari', () => {
    let s = give(teamGame([0, 1, 0, 1]), 2, { orzo: 3 });
    s = give(s, 1, { ferro: 2 });
    const view = getPlayerView(s, 0);
    expect(view.players[2]!.hand).toBeDefined();
    expect(view.players[2]!.hand!.resources.orzo).toBe(3);
    expect(view.players[1]!.hand).toBeUndefined(); // avversario: nascosto
    expect(view.players[0]!.hand).toBeUndefined(); // sé stessi: sta in `me`
  });

  it('fuori dalla modalità squadra nessuna mano è rivelata', () => {
    const s = give(newGameNoTeams(), 1, { orzo: 2 });
    const view = getPlayerView(s, 0);
    expect(view.players.every((p) => p.hand === undefined)).toBe(true);
  });
});

describe('modalità squadra — vittoria combinata', () => {
  it('la squadra vince coi Punti Gloria sommati dei compagni', () => {
    // Bersaglio 8 (2 × 4). Squadra A: 4 + 4 = 8 punti combinati.
    let s = teamGame([0, 1, 0, 1], { teamTargetPerPlayer: 4 });
    s = mut(s, (st) => {
      st.players[0]!.villages = ['a1', 'a2', 'a3', 'a4'];
      st.players[2]!.villages = ['b1', 'b2', 'b3', 'b4'];
    });
    // Da soli né 0 né 2 arrivano al bersaglio (4 < 8).
    s = give(toMain(s), 0, { legname: 4 });
    const res = applyAction(s, { type: 'scambioBanca', player: 0, give: 'legname', receive: 'lana' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.phase.type).toBe('gameOver');
    if (res.state.phase.type === 'gameOver') {
      expect(res.state.config.teams![res.state.phase.winner]).toBe(0);
    }
  });
});

function runTeamPlayout(seed: string, extra: Record<string, unknown>): GameState {
  let state = createGame({
    seed,
    players: makePlayers(4),
    teams: [0, 1, 0, 1],
    teamColors: TEAM_COLORS,
    teamTargetPerPlayer: 6, // bersaglio 12 combinato: termina in tempi ragionevoli
    ...extra,
  });
  let rng = seedRng(`playout-${seed}`);
  const maxActions = 40000;
  let count = 0;
  while (state.phase.type !== 'gameOver' && count < maxActions) {
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
    expect(concrete.length).toBeGreaterThan(0);
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
    count++;
  }
  return state;
}

describe('modalità squadra — partita completa casuale-legale', () => {
  it('termina rispettando gli invarianti, con vittoria di squadra', () => {
    let state = createGame({
      seed: 'partita-squadra',
      players: makePlayers(4),
      teams: [0, 1, 0, 1],
      teamColors: TEAM_COLORS,
      teamTargetPerPlayer: 6, // bersaglio 12 combinato: termina in tempi ragionevoli
    });
    let rng = seedRng('playout-squadra');
    const maxActions = 30000;
    let count = 0;
    while (state.phase.type !== 'gameOver' && count < maxActions) {
      const all: LegalMove[] = [];
      for (const p of state.players) all.push(...getLegalActions(state, p.id));
      const concrete: Action[] = [];
      for (const m of all) {
        if (m.type === 'scartaDescr') {
          concrete.push({ type: 'scarta', player: m.player, resources: greedyDiscard(state, m.player, m.amount) });
        } else if (m.type === 'guadagnaDescr') {
          concrete.push({ type: 'guadagnaCalamita', player: m.player, resources: greedyGain(state, m.amount) });
        } else if (m.type === 'proponiScambioDescr') {
          continue; // scambi coperti dai test dedicati
        } else {
          concrete.push(m);
        }
      }
      expect(concrete.length).toBeGreaterThan(0);
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
      count++;
    }
    expect(state.phase.type).toBe('gameOver');
    if (state.phase.type === 'gameOver') {
      // La squadra del vincitore ha davvero raggiunto il bersaglio combinato.
      const teams = state.config.teams!;
      const winTeam = teams[state.phase.winner];
      const combined = state.players
        .filter((p) => teams[p.id] === winTeam)
        .reduce((s, p) => s + scoreBreakdown(state, p.id).totale, 0);
      expect(combined).toBeGreaterThanOrEqual(state.config.targetGloryPoints);
    }
  });

  it('è giocabile insieme a Calamità e Battaglia', () => {
    const state = runTeamPlayout('squadra-tutto', { calamities: true, battle: true });
    expect(state.phase.type).toBe('gameOver');
    expectResourceInvariants(state);
  });

  it("è giocabile con la tavola «con rientranze»", () => {
    const state = runTeamPlayout('squadra-rientranze', { boardShape: 'rientranze' });
    expect(state.phase.type).toBe('gameOver');
    expectResourceInvariants(state);
  });
});

describe('modalità squadra — compatibile con la Battaglia', () => {
  it('non si può attaccare un edificio di un compagno', () => {
    const s0 = teamGame([0, 1, 0, 1], { battle: true });
    const radius = boardTopoKey(s0.config.boardRadius, s0.config.boardShape, s0.board.hexes);
    const topo = getTopology(radius);
    const e: EdgeId = Object.keys(topo.edgeVertices)[0]!;
    const [v1] = topo.edgeVertices[e]!;
    // Il compagno (2) ha un edificio su v1, raggiunto da una strada del giocatore 0.
    let s = mut(s0, (st) => {
      st.players[2]!.villages.push(v1!);
      st.players[0]!.roads.push(e);
    });
    s = give(toMain(s), 0, { legname: 2, pietra: 1, ferro: 2 });
    const err = isLegal(s, { type: 'attaccaEdificio', player: 0, vertex: v1! });
    expect(err?.code).toBe('BERSAGLIO_NON_RAGGIUNTO');
  });
});
