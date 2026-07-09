import { describe, expect, it } from 'vitest';
import {
  ATTACK_COST,
  battleTargets,
  getLegalActions,
  getTopology,
  type EdgeId,
  type GameState,
} from '../src';
import { apply, expectError, expectResourceInvariants, give, mut, newGame } from './helpers';

/**
 * Scenario sintetico per la modalità Battaglia: il giocatore 0 ha una strada
 * incidente a un vertice dove il giocatore 1 ha un edificio. Costruito a mano
 * (`mut`) per avere geometria certa senza dipendere dal setup a serpentina.
 */
const topo = getTopology(2);
const ATTACK_EDGE: EdgeId = topo.edges[0]!;
const [TARGET_VERTEX, OTHER_VERTEX] = topo.edgeVertices[ATTACK_EDGE]!;

function battleGame(kind: 'villaggio' | 'roccaforte'): GameState {
  const base = newGame(2, 'battaglia-test');
  return mut(base, (s) => {
    s.config.battle = true;
    for (const p of s.players) {
      p.villages = [];
      p.strongholds = [];
      p.roads = [];
    }
    // Il giocatore 1 possiede l'edificio bersaglio; il giocatore 0 la strada.
    if (kind === 'roccaforte') s.players[1]!.strongholds = [TARGET_VERTEX];
    else s.players[1]!.villages = [TARGET_VERTEX];
    s.players[0]!.roads = [ATTACK_EDGE];
    s.currentPlayer = 0;
    s.rolledThisTurn = true;
    s.phase = { type: 'main' };
  });
}

describe('modalità Battaglia', () => {
  it('battleTargets elenca solo gli edifici avversari raggiunti da una propria strada', () => {
    const s = battleGame('villaggio');
    expect(battleTargets(s, 0)).toEqual([TARGET_VERTEX]);
    // Il proprietario non attacca sé stesso.
    expect(battleTargets(s, 1)).toEqual([]);
  });

  it('distrugge la casetta avversaria pagando 3 lana, 2 ferro, 2 legname', () => {
    let s = give(battleGame('villaggio'), 0, ATTACK_COST);
    const bancaFerroPrima = s.bank.ferro;
    s = apply(s, { type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX });
    expect(s.players[1]!.villages).not.toContain(TARGET_VERTEX);
    expect(s.players[1]!.villages).toHaveLength(0);
    // Il costo è tornato alla banca; le risorse del clan attaccante azzerate.
    expect(s.players[0]!.resources.ferro).toBe(0);
    expect(s.bank.ferro).toBe(bancaFerroPrima + ATTACK_COST.ferro);
    expectResourceInvariants(s);
  });

  it('declassa la roccaforte avversaria a casetta (resta dell’avversario)', () => {
    let s = give(battleGame('roccaforte'), 0, ATTACK_COST);
    s = apply(s, { type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX });
    expect(s.players[1]!.strongholds).not.toContain(TARGET_VERTEX);
    expect(s.players[1]!.villages).toContain(TARGET_VERTEX);
  });

  it('rifiuta l’attacco senza le risorse necessarie', () => {
    const s = battleGame('villaggio');
    expectError(s, { type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX }, 'RISORSE_INSUFFICIENTI');
  });

  it('rifiuta l’attacco su un edificio non raggiunto da una propria strada', () => {
    // Sposto la strada del giocatore 0 lontano dal bersaglio.
    const s = mut(give(battleGame('villaggio'), 0, ATTACK_COST), (st) => {
      st.players[0]!.roads = [];
    });
    expectError(s, { type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX }, 'BERSAGLIO_NON_RAGGIUNTO');
  });

  it('rifiuta l’attacco se la modalità Battaglia è spenta', () => {
    const s = mut(give(battleGame('villaggio'), 0, ATTACK_COST), (st) => {
      st.config.battle = false;
    });
    expectError(s, { type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX }, 'BATTAGLIA_SPENTA');
  });

  it('a modalità spenta non compare tra le mosse legali; ad attiva sì', () => {
    const spenta = mut(give(battleGame('villaggio'), 0, ATTACK_COST), (st) => {
      st.config.battle = false;
    });
    expect(getLegalActions(spenta, 0).some((m) => m.type === 'attaccaEdificio')).toBe(false);

    const attiva = give(battleGame('villaggio'), 0, ATTACK_COST);
    const move = getLegalActions(attiva, 0).find((m) => m.type === 'attaccaEdificio');
    expect(move).toEqual({ type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX });
  });

  it('non è un bersaglio l’edificio proprio nemmeno con una strada adiacente', () => {
    const s = mut(newGame(2, 'battaglia-self'), (st) => {
      st.config.battle = true;
      for (const p of st.players) {
        p.villages = [];
        p.strongholds = [];
        p.roads = [];
      }
      st.players[0]!.villages = [TARGET_VERTEX];
      st.players[0]!.roads = [ATTACK_EDGE];
    });
    expect(battleTargets(s, 0)).toEqual([]);
    void OTHER_VERTEX;
  });
});
