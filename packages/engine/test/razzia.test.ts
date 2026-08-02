import { describe, expect, it } from 'vitest';
import {
  getLegalActions,
  getPlayerView,
  getTopology,
  type GameState,
  type Resource,
} from '../src';
import { produceResources } from '../src/production';
import type { GameEvent } from '../src/actions';
import {
  apply,
  applyOk,
  autoSetup,
  clearHands,
  expectError,
  expectResourceInvariants,
  mut,
  newGame,
  toMain,
} from './helpers';

/** Partita in fase main del giocatore 0, mani vuote. */
function inMain(seed = 'razzia'): GameState {
  return toMain(clearHands(autoSetup(newGame(4, seed))));
}

/** Un esagono produttivo (non tundra, con segnalino) e i suoi vertici. */
function hexFixture(state: GameState) {
  const hex = state.board.hexes.find((h) => h.terrain !== 'tundra' && h.token !== null)!;
  const verts = getTopology().hexVertices[hex.id]!;
  return { hex, verts, resource: hex.terrain as Resource };
}

function produce(state: GameState, total: number): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const s = mut(state, (draft) => produceResources(draft, total, events));
  return { state: s, events };
}

/** Chiude il turno del giocatore corrente (mani a posto: si finge di aver già tirato). */
function passTurn(s: GameState): GameState {
  const pid = s.currentPlayer;
  const ready = mut(s, (d) => {
    d.phase = { type: 'main' };
    d.rolledThisTurn = true;
  });
  return apply(ready, { type: 'fineTurno', player: pid });
}

describe('Razzia — gioco della carta', () => {
  it('posa la carta su una casella, la consuma e attiva la razzia', () => {
    const s0 = mut(inMain(), (d) => void d.players[0]!.sagaCards.push('razzia'));
    const hex = s0.board.hexes[0]!.id;
    const s = apply(s0, { type: 'giocaRazzia', player: 0, hex });
    expect(s.razzia).toEqual({ player: 0, hex });
    expect(s.players[0]!.sagaCards).not.toContain('razzia');
    expect(s.devCardPlayedThisTurn).toBe(true);
    // La vista espone la razzia (per illuminare la casella nel colore del clan).
    expect(getPlayerView(s, 1).razzia).toEqual({ player: 0, hex });
  });

  it('emette gli eventi cartaSagaGiocata + razziaPosata', () => {
    const s0 = mut(inMain(), (d) => void d.players[0]!.sagaCards.push('razzia'));
    const hex = s0.board.hexes[0]!.id;
    const { state, events } = applyOk(s0, { type: 'giocaRazzia', player: 0, hex });
    expect(state.razzia).toEqual({ player: 0, hex });
    expect(events.some((e) => e.type === 'cartaSagaGiocata' && e.card === 'razzia')).toBe(true);
    expect(events.some((e) => e.type === 'razziaPosata' && e.hex === hex)).toBe(true);
  });
});

describe('Razzia — validazione', () => {
  it('senza la carta in mano è rifiutata', () => {
    expectError(inMain(), { type: 'giocaRazzia', player: 0, hex: '0,0' }, 'CARTA_NON_DISPONIBILE');
  });

  it('su una casella inesistente è rifiutata', () => {
    const s = mut(inMain(), (d) => void d.players[0]!.sagaCards.push('razzia'));
    expectError(s, { type: 'giocaRazzia', player: 0, hex: 'non-esiste' }, 'ESAGONO_NON_VALIDO');
  });

  it('fuori dalla fase main è rifiutata', () => {
    const s = mut(clearHands(autoSetup(newGame(4, 'razzia'))), (d) => {
      d.phase = { type: 'preRoll' };
      d.players[0]!.sagaCards.push('razzia');
    });
    expectError(s, { type: 'giocaRazzia', player: 0, hex: s.board.hexes[0]!.id }, 'FASE_ERRATA');
  });

  it('è una sola Carta Saga per turno', () => {
    let s = mut(inMain(), (d) => void d.players[0]!.sagaCards.push('razzia', 'banchetto'));
    s = apply(s, { type: 'giocaRazzia', player: 0, hex: s.board.hexes[0]!.id });
    expectError(s, { type: 'giocaBanchetto', player: 0, resources: ['lana', 'orzo'] }, 'CARTA_GIA_GIOCATA');
  });

  it('è enumerata tra le mosse legali, una per casella', () => {
    const s = mut(inMain(), (d) => void d.players[0]!.sagaCards.push('razzia'));
    const razzie = getLegalActions(s, 0).filter((m) => m.type === 'giocaRazzia');
    expect(razzie).toHaveLength(s.board.hexes.length);
  });
});

describe('Razzia — produzione dirottata', () => {
  const base = clearHands(newGame(4, 'razzia-prod'));
  const { hex, verts, resource } = hexFixture(base);

  it('il razziatore incassa la produzione di TUTTI, gli altri nulla', () => {
    const s = mut(base, (d) => {
      d.players[1]!.villages.push(verts[0]!); // 1 risorsa
      d.players[2]!.strongholds.push(verts[2]!); // 2 risorse
      d.razzia = { player: 0, hex: hex.id === '0,0' ? verts[0]! : '0,0' }; // casella qualsiasi
    });
    const { state: dopo, events } = produce(s, hex.token!);
    expect(dopo.players[0]!.resources[resource]).toBe(3); // 1 + 2, tutto al razziatore
    expect(dopo.players[1]!.resources[resource]).toBe(0);
    expect(dopo.players[2]!.resources[resource]).toBe(0);
    // Evento dedicato al posto di risorseProdotte.
    expect(events.some((e) => e.type === 'razziaRiscossa' && e.player === 0)).toBe(true);
    expect(events.some((e) => e.type === 'risorseProdotte')).toBe(false);
    expectResourceInvariants(dopo);
  });

  it('anche la produzione del razziatore stesso resta sua (nessun doppione)', () => {
    const s = mut(base, (d) => {
      d.players[0]!.villages.push(verts[0]!);
      d.players[1]!.villages.push(verts[2]!);
      d.razzia = { player: 0, hex: '0,0' };
    });
    const { state: dopo } = produce(s, hex.token!);
    expect(dopo.players[0]!.resources[resource]).toBe(2); // la sua + quella di p1
    expect(dopo.players[1]!.resources[resource]).toBe(0);
    expectResourceInvariants(dopo);
  });

  it('rispetta la banca: il razziatore prende solo ciò che resta', () => {
    const s = mut(base, (d) => {
      d.players[1]!.villages.push(verts[0]!);
      d.players[2]!.villages.push(verts[2]!);
      d.bank[resource] = 1; // ne servirebbero 2
      d.razzia = { player: 0, hex: '0,0' };
    });
    const { state: dopo } = produce(s, hex.token!);
    expect(dopo.players[0]!.resources[resource]).toBe(1);
    expect(dopo.bank[resource]).toBe(0);
  });
});

describe('Razzia — durata (un giro)', () => {
  it('si spegne al ritorno del turno di chi l’ha giocata', () => {
    let s = mut(inMain(), (d) => void d.players[0]!.sagaCards.push('razzia'));
    s = apply(s, { type: 'giocaRazzia', player: 0, hex: s.board.hexes[0]!.id });
    expect(s.razzia).not.toBeNull();
    // Giro degli avversari: resta attiva.
    s = passTurn(s); // → giocatore 1
    expect(s.currentPlayer).toBe(1);
    expect(s.razzia).not.toBeNull();
    s = passTurn(s); // → 2
    s = passTurn(s); // → 3
    expect(s.razzia).not.toBeNull();
    // Torna il turno del razziatore: la razzia si spegne.
    s = passTurn(s); // → 0
    expect(s.currentPlayer).toBe(0);
    expect(s.razzia).toBeNull();
  });
});
