import { describe, expect, it } from 'vitest';
import {
  ATTACK_COST,
  RESOURCES,
  createGame,
  getLegalActions,
  getPlayerView,
  getTopology,
  type GameState,
  type VertexId,
} from '@vikiland/engine';
import { createHeuristicBot } from '../src';

/**
 * Scenario sintetico: il bot (giocatore 0) ha una strada incidente a un
 * edificio del giocatore 1, con la modalità Battaglia attiva e le risorse per
 * attaccare. Variando i Punti Gloria dell'avversario si verifica quando il bot
 * decide di attaccare (minaccia) e quando no (avversario innocuo, niente surplus).
 */
const topo = getTopology(2);
const ATTACK_EDGE = topo.edges[0]!;
const TARGET: VertexId = topo.edgeVertices[ATTACK_EDGE]![0];
// Vertici distinti (per gonfiare i PG dell'avversario): l'unico che dev'essere
// raggiungibile è TARGET; gli altri servono solo a fare punteggio nel conteggio.
const FILLER = topo.vertices.filter((v) => v !== TARGET);

function scenario(opts: {
  ownerStrongholds: number;
  ownerVillages: number;
  surplus: number;
  assaltoCard?: boolean;
}): GameState {
  const s = createGame({
    seed: 'bot-battaglia',
    players: [
      { name: 'A', color: 'rosso', isBot: true },
      { name: 'B', color: 'blu', isBot: true },
    ],
    battle: true,
  });
  s.turnOrder = [0, 1];
  s.setupOrder = [0, 1, 1, 0];
  s.currentPlayer = 0;
  s.turnNumber = 1;
  s.rolledThisTurn = true;
  s.phase = { type: 'main' };
  for (const p of s.players) {
    p.villages = [];
    p.strongholds = [];
    p.roads = [];
  }
  s.players[0]!.roads = [ATTACK_EDGE];
  // L'avversario possiede l'edificio bersaglio (roccaforte) + altri per fare PG.
  const owner = s.players[1]!;
  owner.strongholds = [TARGET, ...FILLER.slice(0, opts.ownerStrongholds - 1)];
  owner.villages = FILLER.slice(opts.ownerStrongholds, opts.ownerStrongholds + opts.ownerVillages);
  // Risorse del bot: il costo d'attacco + eventuale surplus.
  for (const r of RESOURCES) s.players[0]!.resources[r] = ATTACK_COST[r];
  s.players[0]!.resources.lana += opts.surplus;
  s.players[0]!.resources.ferro += opts.surplus;
  if (opts.assaltoCard) s.players[0]!.sagaCards = ['assalto'];
  return s;
}

function decide(s: GameState, level: 'normale' | 'esperto') {
  const bot = createHeuristicBot(level);
  return bot.decide({
    view: getPlayerView(s, 0),
    legalActions: getLegalActions(s, 0),
    player: 0,
    rngSeed: 'battaglia-seed',
  });
}

describe('euristica di Battaglia dei bot', () => {
  it('l’attacco è effettivamente tra le mosse legali dello scenario', () => {
    const s = scenario({ ownerStrongholds: 4, ownerVillages: 1, surplus: 0 });
    const attack = getLegalActions(s, 0).find((m) => m.type === 'attaccaEdificio');
    expect(attack).toEqual({ type: 'attaccaEdificio', player: 0, vertex: TARGET });
  });

  it('attacca un avversario PROSSIMO alla vittoria (difesa, anche senza surplus)', () => {
    // Avversario a 9 PG (4 roccaforti = 8 + 1 villaggio = 9), target 10 → imminente.
    const s = scenario({ ownerStrongholds: 4, ownerVillages: 1, surplus: 0 });
    const action = decide(s, 'normale');
    expect(action).toEqual({ type: 'attaccaEdificio', player: 0, vertex: TARGET });
  });

  it('NON attacca un avversario innocuo se non ha surplus oltre l’obiettivo', () => {
    // Avversario a 2 PG (1 roccaforte): nessuna minaccia; il bot ha solo il costo esatto.
    const s = scenario({ ownerStrongholds: 1, ownerVillages: 0, surplus: 0 });
    const action = decide(s, 'normale');
    expect(action.type).not.toBe('attaccaEdificio');
  });

  it('preferisce la carta ASSALTO (gratis) all’attacco a pagamento', () => {
    // Avversario prossimo alla vittoria + carta Assalto in mano: il bot la gioca.
    const s = scenario({ ownerStrongholds: 4, ownerVillages: 1, surplus: 0, assaltoCard: true });
    const action = decide(s, 'normale');
    expect(action).toEqual({ type: 'giocaAssalto', player: 0, vertex: TARGET });
  });

  it('l’esperto colpisce il leader col surplus anche senza minaccia imminente', () => {
    // Avversario a 6 PG (3 roccaforti): entro attackWithin dell’esperto (4) e col surplus.
    const s = scenario({ ownerStrongholds: 3, ownerVillages: 0, surplus: 4 });
    const action = decide(s, 'esperto');
    expect(action).toEqual({ type: 'attaccaEdificio', player: 0, vertex: TARGET });
  });
});
