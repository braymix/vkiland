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

  it('il Drago blocca SOLO il suo esagono, non gli altri con lo stesso numero', () => {
    // Scenario segnalato: due esagoni con lo STESSO segnalino numerico. Il Drago
    // ne copre uno solo → l'altro deve continuare a produrre normalmente, e
    // nessun altro esagono/numero uguale deve risultare bloccato.
    const topo = getTopology();
    const nonTundra = base.board.hexes.filter((h) => h.terrain !== 'tundra');
    // Cerca una coppia di esagoni con lo STESSO numero e vertici DISGIUNTI (così
    // i piazzamenti non si sovrappongono). La tavola classica ha numeri doppi.
    let pair: { drago: typeof nonTundra[number]; libero: typeof nonTundra[number] } | null = null;
    for (const a of nonTundra) {
      for (const b of nonTundra) {
        if (a.id === b.id || a.token !== b.token) continue;
        const disjoint = !topo.hexVertices[a.id]!.some((v) => topo.hexVertices[b.id]!.includes(v));
        if (disjoint) {
          pair = { drago: a, libero: b };
          break;
        }
      }
      if (pair) break;
    }
    expect(pair, 'la tavola dovrebbe avere due esagoni con lo stesso numero').not.toBeNull();
    const { drago, libero } = pair!;
    const vDrago = topo.hexVertices[drago.id]![0]!;
    const vLibero = topo.hexVertices[libero.id]![0]!;

    const s = mut(base, (d) => {
      d.board.dragonHex = drago.id; // il Drago copre SOLO questo esagono
      d.players[0]!.villages.push(vDrago); // edificio sull'esagono col Drago…
      d.players[0]!.villages.push(vLibero); // …e sull'altro, stesso numero
    });
    const resDrago = drago.terrain as Resource;
    const resLibero = libero.terrain as Resource;

    const { state: dopo } = produce(s, drago.token!);
    if (resDrago === resLibero) {
      // Stessa risorsa: contribuisce SOLO l'esagono libero (1); quello col Drago 0.
      expect(dopo.players[0]!.resources[resDrago]).toBe(1);
    } else {
      // L'esagono col Drago NON produce; l'altro con lo stesso numero SÌ.
      expect(dopo.players[0]!.resources[resDrago]).toBe(0);
      expect(dopo.players[0]!.resources[resLibero]).toBe(1);
    }
    expectResourceInvariants(dopo);
  });

  it('un vertice fra DUE caselle con lo stesso numero frutta ENTRAMBE le risorse', () => {
    // Scenario segnalato: un insediamento al confine di due caselle che portano
    // lo STESSO segnalino (es. 4-legname e 4-pietra) deve incassare 1 di ciascuna
    // quando esce quel numero, non solo la prima. Si cerca sul campo un vertice
    // con due caselle produttive di pari numero e terreni diversi.
    const topo = getTopology();
    const byId = new Map(base.board.hexes.map((h) => [h.id, h]));
    let found: { vertex: string; token: number; a: Resource; b: Resource } | null = null;
    for (const v of topo.vertices) {
      const land = topo.vertexLandHexes[v]!.map((id) => byId.get(id)!).filter(
        (h) => h.terrain !== 'tundra' && h.token !== null
      );
      const pair = land.find((a) =>
        land.some((b) => b !== a && b.token === a.token && b.terrain !== a.terrain)
      );
      if (!pair) continue;
      const other = land.find(
        (b) => b !== pair && b.token === pair.token && b.terrain !== pair.terrain
      )!;
      found = { vertex: v, token: pair.token!, a: pair.terrain as Resource, b: other.terrain as Resource };
      break;
    }
    expect(found, 'il seme di test dovrebbe offrire un vertice a doppio numero').not.toBeNull();
    const { vertex, token, a, b } = found!;
    const s = mut(base, (d) => d.players[0]!.villages.push(vertex));
    const { state: dopo } = produce(s, token);
    expect(dopo.players[0]!.resources[a]).toBe(1);
    expect(dopo.players[0]!.resources[b]).toBe(1);
    expectResourceInvariants(dopo);
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
