import { describe, expect, it } from 'vitest';
import {
  RESOURCES,
  createGame,
  getLegalActions,
  getPlayerView,
  zeroResources,
  type GameState,
  type Resource,
  type ResourceCount,
} from '@vikiland/engine';
import { createHeuristicBot } from '../src';

/**
 * Scambi dei bot in MODALITÀ SQUADRA: le decisioni devono guardare al beneficio
 * dell'INTERA squadra (le mani dei compagni sono visibili). Squadre [0,1,0,1]:
 * A = {0,2}, B = {1,3}.
 */
function teamGame(): GameState {
  const s = createGame({
    seed: 'bot-squadra',
    players: [
      { name: 'A0', color: '#c0392b', isBot: true },
      { name: 'B1', color: '#2e6fb7', isBot: true },
      { name: 'A2', color: '#3e8f4e', isBot: true },
      { name: 'B3', color: '#d9a525', isBot: true },
    ],
    teams: [0, 1, 0, 1],
    teamColors: ['#8e44ad', '#e67e22'],
  });
  s.turnOrder = [0, 1, 2, 3];
  s.setupOrder = [0, 1, 2, 3, 3, 2, 1, 0];
  s.currentPlayer = 0;
  s.turnNumber = 1;
  s.rolledThisTurn = true;
  s.phase = { type: 'main' };
  // Reti minime così l'obiettivo corrente è "villaggio/roccaforte" con costi noti.
  for (const p of s.players) {
    p.villages = [];
    p.strongholds = [];
    p.roads = [];
    p.resources = zeroResources();
  }
  return s;
}

function setHand(s: GameState, pid: number, rc: Partial<ResourceCount>) {
  for (const r of RESOURCES) s.players[pid]!.resources[r] = rc[r] ?? 0;
}

function decide(s: GameState, pid: number) {
  const bot = createHeuristicBot('normale');
  return bot.decide({
    view: getPlayerView(s, pid),
    legalActions: getLegalActions(s, pid),
    player: pid,
    rngSeed: `squadra:${pid}`,
  });
}

describe('scambi dei bot in modalità squadra', () => {
  it('un compagno accetta di cedere un surplus che serve al proponente', () => {
    // 0 (proponente) ha un villaggio piazzabile? No rete: obiettivo = sentiero
    // (serve legname+pietra). Diamo a 0 tutto tranne la pietra, e al compagno 2
    // pietra in abbondanza (surplus). L'offerta di 0: dà lana, chiede pietra.
    const s = teamGame();
    setHand(s, 0, { legname: 2, lana: 2 }); // manca la pietra per il sentiero
    setHand(s, 2, { pietra: 5 }); // pietra in surplus per il compagno
    // Offerta di squadra: 0 dà lana (1), chiede pietra (1), a tutta la squadra.
    const give = zeroResources();
    give.lana = 1;
    const receive = zeroResources();
    receive.pietra = 1;
    s.pendingTrade = { id: 1, from: 0, give, receive, to: null, responses: {} };
    // Il compagno 2 deve ACCETTARE (cede pietra che non gli serve, aiuta il team).
    const action = decide(s, 2);
    expect(action).toEqual({ type: 'rispondiScambio', player: 2, offerId: 1, accept: true });
  });

  it('un compagno rifiuta di cedere una risorsa che serve anche a lui', () => {
    // Il compagno 2 punta a una roccaforte (orzo 2, ferro 3): ha 2 ferro e gliene
    // serve ancora. Cedere ferro peggiora il suo obiettivo → rifiuta. Il proponente
    // ha risorse in abbondanza (non ha bisogno del ferro): nessun beneficio di squadra.
    const s = teamGame();
    s.players[2]!.villages = ['v-compagno']; // obiettivo = roccaforte
    setHand(s, 0, { legname: 3, pietra: 3, lana: 3, orzo: 3, ferro: 3 }); // proponente sazio
    setHand(s, 2, { ferro: 2, orzo: 2 }); // gli serve ancora ferro per la roccaforte
    const give = zeroResources();
    give.lana = 1;
    const receive = zeroResources();
    receive.ferro = 1;
    s.pendingTrade = { id: 2, from: 0, give, receive, to: null, responses: {} };
    const action = decide(s, 2);
    expect(action).toEqual({ type: 'rispondiScambio', player: 2, offerId: 2, accept: false });
  });

  it('propone alla squadra chiedendo ciò che un compagno ha in avanzo', () => {
    // 0 ha bisogno di pietra per il sentiero; il compagno 2 ne ha in surplus.
    const s = teamGame();
    setHand(s, 0, { legname: 3, lana: 2 }); // surplus di legname/lana, manca pietra
    setHand(s, 2, { pietra: 6 }); // il compagno ha pietra da vendere
    const action = decide(s, 0);
    expect(action.type).toBe('proponiScambio');
    if (action.type === 'proponiScambio') {
      expect(action.to).toBeNull(); // a tutta la squadra
      // Chiede pietra (che il compagno ha in avanzo) e la riceve 1:1.
      const wanted = RESOURCES.find((r) => action.receive[r] > 0) as Resource;
      expect(wanted).toBe('pietra');
      expect(RESOURCES.reduce((n, r) => n + action.give[r], 0)).toBe(1);
      expect(RESOURCES.reduce((n, r) => n + action.receive[r], 0)).toBe(1);
    }
  });
});
