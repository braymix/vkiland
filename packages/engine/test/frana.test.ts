import { describe, expect, it } from 'vitest';
import {
  boardTopoKey,
  createGame,
  franaTargets,
  getLegalActions,
  legalRoadEdges,
  type CalamityCard,
  type GameState,
} from '../src';
import { revealCalamity } from '../src/calamities';
import type { GameEvent } from '../src/actions';
import { apply, autoSetup, expectError, makePlayers, mut } from './helpers';

/** Partita in modalità Calamità, ordine normalizzato 0..3, portata in fase main. */
function calamityGame(seed = 'frana'): GameState {
  const raw = createGame({ seed, players: makePlayers(4), calamities: true });
  const norm = mut(raw, (s) => {
    s.turnOrder = [0, 1, 2, 3];
    s.setupOrder = [0, 1, 2, 3, 3, 2, 1, 0];
    s.currentPlayer = 0;
  });
  return autoSetup(norm);
}

function radiusOf(s: GameState) {
  return boardTopoKey(s.config.boardRadius, s.config.boardShape, s.board.hexes);
}

/** Aggiunge a `pid` una strada MARGINALE non iniziale (estende la rete). Ritorna lo spigolo. */
function addMarginalRoad(s: GameState, pid: number): { state: GameState; edge: string } {
  const edge = legalRoadEdges(s, pid, radiusOf(s))[0]!;
  return { state: mut(s, (d) => void d.players[pid]!.roads.push(edge)), edge };
}

/** Forza la prossima carta calamità e la rivela (su un clone). */
function revealFrana(s: GameState): { state: GameState; opened: boolean; events: GameEvent[] } {
  const events: GameEvent[] = [];
  let opened = false;
  const card: CalamityCard = { kind: 'frana' };
  const state = mut(s, (d) => {
    d.calamities!.deck = [card];
    d.calamities!.current = null;
    opened = revealCalamity(d, events);
  });
  return { state, opened, events };
}

describe('Frana — bersagli (franaTargets)', () => {
  it('esclude le due strade iniziali; include solo le marginali costruite dopo', () => {
    const base = calamityGame();
    const r = radiusOf(base);
    // Solo strade iniziali ⇒ nessun bersaglio.
    expect(franaTargets(base.players[0]!, r)).toHaveLength(0);
    // Con una strada marginale in più: quella (e solo quella) è un bersaglio.
    const { state, edge } = addMarginalRoad(base, 0);
    expect(franaTargets(state.players[0]!, r)).toEqual([edge]);
  });
});

describe('Frana — rivelazione', () => {
  it('con una strada marginale del leader delle strade apre la fase di scelta', () => {
    const { state, edge } = addMarginalRoad(calamityGame(), 0); // p0 ha 3 strade (più di tutti)
    const { state: dopo, opened } = revealFrana(state);
    expect(opened).toBe(true);
    expect(dopo.phase).toEqual({ type: 'calamityFrana', player: 0 });
    expect(franaTargets(dopo.players[0]!, radiusOf(dopo))).toEqual([edge]);
  });

  it('se il giocatore con più strade ha solo le due iniziali, non crolla nulla', () => {
    const { state: dopo, opened } = revealFrana(calamityGame());
    expect(opened).toBe(false);
    expect(dopo.phase.type).not.toBe('calamityFrana');
  });
});

describe('Frana — risoluzione e regole', () => {
  it('la strada scelta crolla e si passa al tiro', () => {
    const { state, edge } = addMarginalRoad(calamityGame(), 0);
    const { state: pending } = revealFrana(state);
    expect(pending.players[0]!.roads).toContain(edge);
    const done = apply(pending, { type: 'franaSentiero', player: 0, edge });
    expect(done.players[0]!.roads).not.toContain(edge);
    expect(done.phase.type).toBe('preRoll');
  });

  it('è enumerata tra le mosse legali solo per il giocatore colpito', () => {
    const { state, edge } = addMarginalRoad(calamityGame(), 0);
    const { state: pending } = revealFrana(state);
    const mine = getLegalActions(pending, 0).filter((m) => m.type === 'franaSentiero');
    expect(mine.map((m) => (m.type === 'franaSentiero' ? m.edge : ''))).toEqual([edge]);
    expect(getLegalActions(pending, 1).filter((m) => m.type === 'franaSentiero')).toHaveLength(0);
  });

  it('rifiuta una strada INIZIALE (indistruttibile dalla frana)', () => {
    const { state } = addMarginalRoad(calamityGame(), 0);
    const { state: pending } = revealFrana(state);
    const iniziale = pending.players[0]!.initialRoads[0]!;
    expectError(pending, { type: 'franaSentiero', player: 0, edge: iniziale }, 'FRANA_NON_VALIDA');
  });

  it('rifiuta se non è il giocatore colpito', () => {
    const { state } = addMarginalRoad(calamityGame(), 0);
    const { state: pending } = revealFrana(state);
    const edge = franaTargets(pending.players[0]!, radiusOf(pending))[0]!;
    expectError(pending, { type: 'franaSentiero', player: 1, edge }, 'NON_IL_TUO_TURNO');
  });

  it('rifiuta fuori dalla fase Frana', () => {
    const { state, edge } = addMarginalRoad(calamityGame(), 0);
    expectError(state, { type: 'franaSentiero', player: 0, edge }, 'FASE_ERRATA');
  });
});
