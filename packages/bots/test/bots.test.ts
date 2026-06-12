import { describe, expect, it } from 'vitest';
import {
  cloneState,
  createGame,
  getLegalActions,
  getPlayerView,
  getTopology,
  totalResources,
  type GameState,
  type PlayerConfig,
} from '@vikiland/engine';
import { createHeuristicBot, placementScore } from '../src';

const PLAYERS: PlayerConfig[] = [
  { name: 'Bjorn', color: 'rosso', isBot: true },
  { name: 'Astrid', color: 'blu', isBot: true },
  { name: 'Leif', color: 'verde', isBot: true },
  { name: 'Sigrid', color: 'giallo', isBot: true },
];

function decideFor(state: GameState, pid: number, bot = createHeuristicBot('normale')) {
  return bot.decide({
    view: getPlayerView(state, pid),
    legalActions: getLegalActions(state, pid),
    player: pid,
    rngSeed: 'test',
  });
}

/** Chirurgia di stato per costruire scenari mirati. */
function mut(state: GameState, fn: (s: GameState) => void): GameState {
  const s = cloneState(state);
  fn(s);
  return s;
}

describe('piazzamento iniziale euristico', () => {
  it('sceglie il vertice con il punteggio massimo', () => {
    const g = createGame({ seed: 'piazzamento', players: PLAYERS });
    // Il primo a piazzare è il vincitore del tiro per l'ordine.
    const first = g.turnOrder[0]!;
    const action = decideFor(g, first);
    expect(action.type).toBe('piazzaVillaggioIniziale');
    if (action.type !== 'piazzaVillaggioIniziale') return;
    const view = getPlayerView(g, first);
    const bestScore = Math.max(
      ...getLegalActions(g, first).map((m) =>
        m.type === 'piazzaVillaggioIniziale' ? placementScore(view, first, m.vertex) : -1
      )
    );
    expect(placementScore(view, first, action.vertex)).toBe(bestScore);
  });
});

describe('politiche di turno', () => {
  it('lo scarto protegge il costo dell’obiettivo ed è sempre valido', () => {
    const g = mut(createGame({ seed: 'scarto', players: PLAYERS }), (d) => {
      d.setupIndex = d.setupOrder.length;
      d.turnNumber = 1;
      d.currentPlayer = 1;
      d.phase = { type: 'discard', mustDiscard: { 0: 5 } };
      d.players[0]!.resources = { legname: 4, pietra: 2, lana: 2, orzo: 1, ferro: 1 };
      d.bank.legname -= 4;
      d.bank.pietra -= 2;
      d.bank.lana -= 2;
      d.bank.orzo -= 1;
      d.bank.ferro -= 1;
    });
    const action = decideFor(g, 0);
    expect(action.type).toBe('scarta');
    if (action.type !== 'scarta') return;
    expect(totalResources(action.resources)).toBe(5);
    for (const [r, n] of Object.entries(action.resources)) {
      expect(n).toBeLessThanOrEqual(g.players[0]!.resources[r as keyof typeof action.resources]);
    }
  });

  it('il Drago non viene mai messo su un proprio esagono produttivo (se evitabile)', () => {
    const topo = getTopology();
    let g = createGame({ seed: 'drago-bot', players: PLAYERS });
    // p0 ha un villaggio su un esagono produttivo; p1 su un altro.
    const produttivi = g.board.hexes.filter((h) => h.token !== null);
    const mio = produttivi[0]!;
    const altrui = produttivi[1]!;
    g = mut(g, (d) => {
      d.setupIndex = d.setupOrder.length;
      d.turnNumber = 1;
      d.currentPlayer = 0;
      d.phase = { type: 'moveDragon', cause: 'sette' };
      d.rolledThisTurn = true;
      d.players[0]!.villages.push(topo.hexVertices[mio.id]![0]!);
      d.players[1]!.villages.push(topo.hexVertices[altrui.id]![0]!);
      d.players[1]!.resources.lana = 2;
      d.bank.lana -= 2;
    });
    const action = decideFor(g, 0);
    expect(action.type).toBe('muoviDrago');
    if (action.type !== 'muoviDrago') return;
    const colpiti = topo.hexVertices[action.hex]!;
    expect(colpiti.some((v) => g.players[0]!.villages.includes(v))).toBe(false);
  });

  it('ruba al giocatore con più Punti Gloria pubblici', () => {
    const g = mut(createGame({ seed: 'furto-bot', players: PLAYERS }), (d) => {
      d.setupIndex = d.setupOrder.length;
      d.turnNumber = 1;
      d.currentPlayer = 0;
      d.phase = { type: 'steal', candidates: [1, 2], cause: 'sette' };
      d.rolledThisTurn = true;
      d.players[2]!.villages.push('v-finto-1', 'v-finto-2', 'v-finto-3'); // p2 in testa
      d.players[1]!.resources.lana = 1;
      d.players[2]!.resources.ferro = 1;
      d.bank.lana -= 1;
      d.bank.ferro -= 1;
    });
    const action = decideFor(g, 0);
    expect(action).toEqual({ type: 'ruba', player: 0, target: 2 });
  });

  it('con le risorse per la roccaforte la costruisce sul villaggio migliore', () => {
    const topo = getTopology();
    let g = createGame({ seed: 'roccaforte-bot', players: PLAYERS });
    const hexes = [...g.board.hexes]
      .filter((h) => h.token !== null)
      .sort((a, b) => (6 - Math.abs(a.token! - 7)) - (6 - Math.abs(b.token! - 7)));
    const debole = hexes[0]!; // pip basso
    const forte = hexes[hexes.length - 1]!; // pip alto
    g = mut(g, (d) => {
      d.setupIndex = d.setupOrder.length;
      d.turnNumber = 1;
      d.currentPlayer = 0;
      d.phase = { type: 'main' };
      d.rolledThisTurn = true;
      d.players[0]!.villages.push(topo.hexVertices[debole.id]![0]!, topo.hexVertices[forte.id]![3]!);
      d.players[0]!.resources = { legname: 0, pietra: 0, lana: 0, orzo: 2, ferro: 3 };
      d.bank.orzo -= 2;
      d.bank.ferro -= 3;
    });
    const action = decideFor(g, 0);
    expect(action.type).toBe('costruisciRoccaforte');
    if (action.type !== 'costruisciRoccaforte') return;
    expect(action.vertex).toBe(topo.hexVertices[forte.id]![3]!);
  });

  it('rifiuta scambi che non aiutano l’obiettivo', () => {
    const g = mut(createGame({ seed: 'scambio-bot', players: PLAYERS }), (d) => {
      d.setupIndex = d.setupOrder.length;
      d.turnNumber = 1;
      d.currentPlayer = 1;
      d.phase = { type: 'main' };
      d.rolledThisTurn = true;
      // p1 offre 1 lana per 2 ferro di p0: p0 non ha obiettivi che richiedono lana.
      d.players[0]!.resources.ferro = 2;
      d.bank.ferro -= 2;
      d.players[1]!.resources.lana = 1;
      d.bank.lana -= 1;
      d.pendingTrade = {
        id: 0,
        from: 1,
        give: { legname: 0, pietra: 0, lana: 1, orzo: 0, ferro: 0 },
        receive: { legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 2 },
        to: null,
        responses: {},
      };
      d.tradeCounter = 1;
    });
    const action = decideFor(g, 0);
    expect(action).toEqual({ type: 'rispondiScambio', player: 0, offerId: 0, accept: false });
  });
});
