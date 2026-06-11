import { describe, expect, it } from 'vitest';
import { getTopology, type GameState, type Resource } from '../src';
import { produceResources } from '../src/production';
import type { GameEvent } from '../src/actions';
import { clearHands, expectResourceInvariants, mut, newGame } from './helpers';

/** Trova un esagono produttivo e prepara piazzamenti manuali sui suoi vertici. */
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

describe('produzione delle risorse', () => {
  const base = clearHands(newGame(4));
  const { hex, verts, resource } = hexFixture(base);

  it('villaggio = 1 risorsa, roccaforte = 2', () => {
    const s = mut(base, (d) => {
      d.players[0]!.villages.push(verts[0]!);
      d.players[1]!.strongholds.push(verts[2]!);
    });
    const { state: dopo } = produce(s, hex.token!);
    expect(dopo.players[0]!.resources[resource]).toBe(1);
    expect(dopo.players[1]!.resources[resource]).toBe(2);
    expectResourceInvariants(dopo);
  });

  it('più edifici dello stesso giocatore sullo stesso esagono si sommano', () => {
    const s = mut(base, (d) => {
      d.players[0]!.villages.push(verts[0]!, verts[2]!);
      d.players[0]!.strongholds.push(verts[4]!);
    });
    const { state: dopo } = produce(s, hex.token!);
    expect(dopo.players[0]!.resources[resource]).toBe(4); // 1+1+2
  });

  it('un totale senza esagoni corrispondenti (es. 7) non produce nulla', () => {
    const s = mut(base, (d) => {
      d.players[0]!.villages.push(verts[0]!);
    });
    const { state: dopo, events } = produce(s, 7);
    expect(events).toHaveLength(0);
    expect(dopo.players[0]!.resources[resource]).toBe(0);
  });

  it('l’esagono occupato dal Drago non produce', () => {
    const s = mut(base, (d) => {
      d.players[0]!.villages.push(verts[0]!);
      d.board.dragonHex = hex.id;
    });
    const { state: dopo, events } = produce(s, hex.token!);
    // Possono produrre ALTRI esagoni con lo stesso numero, ma non questo.
    const gain = events.find((e) => e.type === 'risorseProdotte');
    expect(dopo.players[0]!.resources[resource]).toBe(
      gain && gain.type === 'risorseProdotte'
        ? (gain.gains.find((g) => g.player === 0)?.resources[resource] ?? 0)
        : 0
    );
    // Verifica diretta: senza Drago avrebbe preso almeno 1 in più.
    const { state: senzaDrago } = produce(
      mut(base, (d) => {
        d.players[0]!.villages.push(verts[0]!);
      }),
      hex.token!
    );
    expect(senzaDrago.players[0]!.resources[resource]).toBe(
      dopo.players[0]!.resources[resource] + 1
    );
  });

  it('penuria: più richiedenti e banca insufficiente ⇒ nessuno riceve quella risorsa', () => {
    const s = mut(base, (d) => {
      d.players[0]!.villages.push(verts[0]!);
      d.players[1]!.villages.push(verts[2]!);
      d.bank[resource] = 1; // ne servono 2
    });
    const { state: dopo, events } = produce(s, hex.token!);
    expect(dopo.players[0]!.resources[resource]).toBe(0);
    expect(dopo.players[1]!.resources[resource]).toBe(0);
    expect(events.some((e) => e.type === 'penuriaBanca' && e.resources.includes(resource))).toBe(
      true
    );
  });

  it('penuria: richiedente unico ⇒ prende quel che resta', () => {
    const s = mut(base, (d) => {
      d.players[0]!.strongholds.push(verts[0]!); // chiederebbe 2
      d.bank[resource] = 1;
    });
    const { state: dopo } = produce(s, hex.token!);
    expect(dopo.players[0]!.resources[resource]).toBe(1);
    expect(dopo.bank[resource]).toBe(0);
  });
});
