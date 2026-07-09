import { describe, expect, it } from 'vitest';
import {
  ATTACK_COST_EDIFICIO,
  ATTACK_COST_SENTIERO,
  battleTargets,
  createGame,
  getLegalActions,
  getTopology,
  roadBattleTargets,
  type EdgeId,
  type GameState,
} from '../src';
import {
  apply,
  expectError,
  expectResourceInvariants,
  give,
  makePlayers,
  mut,
  newGame,
} from './helpers';

/**
 * Scenario sintetico per la modalità Battaglia: il giocatore 0 ha una strada
 * incidente a un vertice dove il giocatore 1 ha un edificio. Costruito a mano
 * (`mut`) per avere geometria certa senza dipendere dal setup a serpentina.
 */
const topo = getTopology(2);
const ATTACK_EDGE: EdgeId = topo.edges[0]!;
const [TARGET_VERTEX, OTHER_VERTEX] = topo.edgeVertices[ATTACK_EDGE]!;
// Strada nemica adiacente alla mia (condivide OTHER_VERTEX): bersaglio dell'attacco leggero.
const ENEMY_EDGE: EdgeId = topo.vertexEdges[OTHER_VERTEX]!.find((e) => e !== ATTACK_EDGE)!;
const ENEMY_VS = topo.edgeVertices[ENEMY_EDGE]!;
const FAR_VERTEX = ENEMY_VS[0] === OTHER_VERTEX ? ENEMY_VS[1]! : ENEMY_VS[0]!;
// Seconda strada nemica sull'estremo lontano: serve per "ancorare" entrambi i lati.
const SECOND_ENEMY_EDGE: EdgeId = topo.vertexEdges[FAR_VERTEX]!.find((e) => e !== ENEMY_EDGE)!;

function battleGame(
  kind: 'villaggio' | 'roccaforte',
  opts: { initial?: boolean } = {}
): GameState {
  const base = newGame(2, 'battaglia-test');
  return mut(base, (s) => {
    s.config.battle = true;
    for (const p of s.players) {
      p.villages = [];
      p.strongholds = [];
      p.roads = [];
      p.initialVillages = [];
    }
    // Il giocatore 1 possiede l'edificio bersaglio; il giocatore 0 la strada.
    if (kind === 'roccaforte') s.players[1]!.strongholds = [TARGET_VERTEX];
    else s.players[1]!.villages = [TARGET_VERTEX];
    // Marca il bersaglio come insediamento iniziale ("casa indistruttibile").
    if (opts.initial) s.players[1]!.initialVillages = [TARGET_VERTEX];
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

  it('distrugge la casetta avversaria pagando 2 legname, 1 pietra, 1 lana, 2 ferro', () => {
    let s = give(battleGame('villaggio'), 0, ATTACK_COST_EDIFICIO);
    const bancaFerroPrima = s.bank.ferro;
    s = apply(s, { type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX });
    expect(s.players[1]!.villages).not.toContain(TARGET_VERTEX);
    expect(s.players[1]!.villages).toHaveLength(0);
    // Il costo è tornato alla banca; le risorse del clan attaccante azzerate.
    expect(s.players[0]!.resources.ferro).toBe(0);
    expect(s.bank.ferro).toBe(bancaFerroPrima + ATTACK_COST_EDIFICIO.ferro);
    expectResourceInvariants(s);
  });

  it('declassa la roccaforte avversaria a casetta (resta dell’avversario)', () => {
    let s = give(battleGame('roccaforte'), 0, ATTACK_COST_EDIFICIO);
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
    const s = mut(give(battleGame('villaggio'), 0, ATTACK_COST_EDIFICIO), (st) => {
      st.players[0]!.roads = [];
    });
    expectError(s, { type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX }, 'BERSAGLIO_NON_RAGGIUNTO');
  });

  it('rifiuta l’attacco se la modalità Battaglia è spenta', () => {
    const s = mut(give(battleGame('villaggio'), 0, ATTACK_COST_EDIFICIO), (st) => {
      st.config.battle = false;
    });
    expectError(s, { type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX }, 'BATTAGLIA_SPENTA');
  });

  it('a modalità spenta non compare tra le mosse legali; ad attiva sì', () => {
    const spenta = mut(give(battleGame('villaggio'), 0, ATTACK_COST_EDIFICIO), (st) => {
      st.config.battle = false;
    });
    expect(getLegalActions(spenta, 0).some((m) => m.type === 'attaccaEdificio')).toBe(false);

    const attiva = give(battleGame('villaggio'), 0, ATTACK_COST_EDIFICIO);
    const move = getLegalActions(attiva, 0).find((m) => m.type === 'attaccaEdificio');
    expect(move).toEqual({ type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX });
  });

  it('le due case iniziali sono indistruttibili finché restano casette', () => {
    const s = give(battleGame('villaggio', { initial: true }), 0, ATTACK_COST_EDIFICIO);
    // Non compare tra i bersagli né tra le mosse legali.
    expect(battleTargets(s, 0)).toEqual([]);
    expect(getLegalActions(s, 0).some((m) => m.type === 'attaccaEdificio')).toBe(false);
    // E un attacco forzato viene bocciato con l’errore dedicato.
    expectError(s, { type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX }, 'CASA_INDISTRUTTIBILE');
  });

  it('una roccaforte su un insediamento iniziale è attaccabile e torna casa indistruttibile', () => {
    let s = give(battleGame('roccaforte', { initial: true }), 0, ATTACK_COST_EDIFICIO);
    // La roccaforte iniziale è un bersaglio valido.
    expect(battleTargets(s, 0)).toEqual([TARGET_VERTEX]);
    s = apply(s, { type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX });
    // Declassata a casetta, ma resta un insediamento iniziale.
    expect(s.players[1]!.strongholds).not.toContain(TARGET_VERTEX);
    expect(s.players[1]!.villages).toContain(TARGET_VERTEX);
    expect(s.players[1]!.initialVillages).toContain(TARGET_VERTEX);
    // Ora è di nuovo indistruttibile: un secondo attacco (con altre risorse) è bocciato.
    const s2 = give(s, 0, ATTACK_COST_EDIFICIO);
    expect(battleTargets(s2, 0)).toEqual([]);
    expectError(s2, { type: 'attaccaEdificio', player: 0, vertex: TARGET_VERTEX }, 'CASA_INDISTRUTTIBILE');
  });

  it('la carta ASSALTO distrugge gratis una casetta avversaria e si consuma', () => {
    let s = mut(battleGame('villaggio'), (st) => {
      st.players[0]!.sagaCards = ['assalto'];
    });
    // Nessuna risorsa: l'attacco con la carta è gratis.
    const move = getLegalActions(s, 0).find((m) => m.type === 'giocaAssalto');
    expect(move).toEqual({ type: 'giocaAssalto', player: 0, vertex: TARGET_VERTEX });
    s = apply(s, { type: 'giocaAssalto', player: 0, vertex: TARGET_VERTEX });
    expect(s.players[1]!.villages).not.toContain(TARGET_VERTEX);
    expect(s.players[0]!.sagaCards).not.toContain('assalto');
    expect(s.devCardPlayedThisTurn).toBe(true);
    expectResourceInvariants(s);
  });

  it('la carta ASSALTO declassa una roccaforte avversaria', () => {
    let s = mut(battleGame('roccaforte'), (st) => {
      st.players[0]!.sagaCards = ['assalto'];
    });
    s = apply(s, { type: 'giocaAssalto', player: 0, vertex: TARGET_VERTEX });
    expect(s.players[1]!.strongholds).not.toContain(TARGET_VERTEX);
    expect(s.players[1]!.villages).toContain(TARGET_VERTEX);
  });

  it('la carta ASSALTO rispetta le case iniziali indistruttibili', () => {
    const s = mut(battleGame('villaggio', { initial: true }), (st) => {
      st.players[0]!.sagaCards = ['assalto'];
    });
    expect(getLegalActions(s, 0).some((m) => m.type === 'giocaAssalto')).toBe(false);
    expectError(s, { type: 'giocaAssalto', player: 0, vertex: TARGET_VERTEX }, 'CASA_INDISTRUTTIBILE');
  });

  it('senza la carta ASSALTO in mano l’azione è rifiutata', () => {
    const s = battleGame('villaggio'); // sagaCards vuoto
    expectError(s, { type: 'giocaAssalto', player: 0, vertex: TARGET_VERTEX }, 'CARTA_NON_DISPONIBILE');
  });

  it('il mazzo Saga include 3 carte ASSALTO solo in Battaglia', () => {
    const conBattaglia = createGame({
      seed: 'mazzo-battaglia',
      players: makePlayers(2),
      battle: true,
    });
    const senzaBattaglia = createGame({ seed: 'mazzo-battaglia', players: makePlayers(2) });
    expect(conBattaglia.sagaDeck.filter((c) => c === 'assalto')).toHaveLength(3);
    expect(senzaBattaglia.sagaDeck.filter((c) => c === 'assalto')).toHaveLength(0);
    expect(conBattaglia.sagaDeck.length).toBe(senzaBattaglia.sagaDeck.length + 3);
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

/**
 * Attacco LEGGERO: il giocatore 0 ha una strada che tocca l'estremo di una
 * strada del giocatore 1. Si può spezzare solo se la strada nemica è
 * "all'estremità" (collegata su un solo lato).
 */
function roadBattleGame(opts: { protectBoth?: boolean } = {}): GameState {
  const base = newGame(2, 'battaglia-strada');
  return mut(base, (s) => {
    s.config.battle = true;
    for (const p of s.players) {
      p.villages = [];
      p.strongholds = [];
      p.roads = [];
      p.initialVillages = [];
    }
    s.players[0]!.roads = [ATTACK_EDGE];
    s.players[1]!.roads = [ENEMY_EDGE];
    if (opts.protectBoth) {
      // Ancora entrambi gli estremi della strada nemica: edificio su OTHER_VERTEX
      // e una seconda strada su FAR_VERTEX → non è più "all'estremità".
      s.players[1]!.villages = [OTHER_VERTEX];
      s.players[1]!.roads = [ENEMY_EDGE, SECOND_ENEMY_EDGE];
    }
    s.currentPlayer = 0;
    s.rolledThisTurn = true;
    s.phase = { type: 'main' };
  });
}

describe('modalità Battaglia — attacco leggero (strade)', () => {
  it('roadBattleTargets elenca la strada avversaria all’estremità raggiunta', () => {
    const s = roadBattleGame();
    expect(roadBattleTargets(s, 0)).toContain(ENEMY_EDGE);
  });

  it('spezza la strada avversaria pagando 2 legname, 2 ferro', () => {
    let s = give(roadBattleGame(), 0, ATTACK_COST_SENTIERO);
    const bancaFerroPrima = s.bank.ferro;
    s = apply(s, { type: 'spezzaSentiero', player: 0, edge: ENEMY_EDGE });
    expect(s.players[1]!.roads).not.toContain(ENEMY_EDGE);
    expect(s.players[0]!.resources.ferro).toBe(0);
    expect(s.players[0]!.resources.legname).toBe(0);
    expect(s.bank.ferro).toBe(bancaFerroPrima + ATTACK_COST_SENTIERO.ferro);
    expectResourceInvariants(s);
  });

  it('compare tra le mosse legali quando la Battaglia è attiva', () => {
    const s = give(roadBattleGame(), 0, ATTACK_COST_SENTIERO);
    const move = getLegalActions(s, 0).find((m) => m.type === 'spezzaSentiero');
    expect(move).toEqual({ type: 'spezzaSentiero', player: 0, edge: ENEMY_EDGE });
  });

  it('rifiuta senza le risorse necessarie', () => {
    const s = roadBattleGame();
    expectError(s, { type: 'spezzaSentiero', player: 0, edge: ENEMY_EDGE }, 'RISORSE_INSUFFICIENTI');
  });

  it('non si può spezzare una strada collegata su entrambi i lati', () => {
    const s = give(roadBattleGame({ protectBoth: true }), 0, ATTACK_COST_SENTIERO);
    expect(roadBattleTargets(s, 0)).not.toContain(ENEMY_EDGE);
    expect(getLegalActions(s, 0).some((m) => m.type === 'spezzaSentiero' && m.edge === ENEMY_EDGE)).toBe(
      false
    );
    expectError(s, { type: 'spezzaSentiero', player: 0, edge: ENEMY_EDGE }, 'SENTIERO_PROTETTO');
  });

  it('rifiuta lo spezza se la strada non è raggiunta da una propria strada', () => {
    const s = mut(give(roadBattleGame(), 0, ATTACK_COST_SENTIERO), (st) => {
      st.players[0]!.roads = [];
    });
    expectError(s, { type: 'spezzaSentiero', player: 0, edge: ENEMY_EDGE }, 'SENTIERO_NON_RAGGIUNTO');
  });

  it('rifiuta lo spezza se la modalità Battaglia è spenta', () => {
    const s = mut(give(roadBattleGame(), 0, ATTACK_COST_SENTIERO), (st) => {
      st.config.battle = false;
    });
    expectError(s, { type: 'spezzaSentiero', player: 0, edge: ENEMY_EDGE }, 'BATTAGLIA_SPENTA');
  });
});
