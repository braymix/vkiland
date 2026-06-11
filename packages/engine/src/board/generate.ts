/** Generazione procedurale (e deterministica, dato l'RNG) della tavola. */
import { PORT_KINDS_POOL, PORT_RING_INDICES, TERRAIN_POOL, TOKEN_POOL } from '../constants';
import { shuffle, type RngState } from '../rng';
import type { Board, Hex, Port } from '../types';
import { allBoardHexes, hexKey, hexNeighbors } from './coords';
import { getTopology } from './topology';

function hasAdjacent68(hexes: readonly Hex[]): boolean {
  const byKey = new Map(hexes.map((h) => [h.id, h]));
  for (const h of hexes) {
    if (h.token !== 6 && h.token !== 8) continue;
    for (const n of hexNeighbors({ q: h.q, r: h.r })) {
      const nh = byKey.get(hexKey(n));
      if (nh && (nh.token === 6 || nh.token === 8)) return true;
    }
  }
  return false;
}

export function generateBoard(
  rngIn: RngState,
  avoidAdjacent68: boolean
): [Board, RngState] {
  const topo = getTopology();
  let rng = rngIn;

  // 1) Terreni mescolati sulle 19 caselle (in ordine deterministico).
  const [terrains, rngAfterTerrains] = shuffle(rng, TERRAIN_POOL);
  rng = rngAfterTerrains;
  const hexes: Hex[] = allBoardHexes().map((c, i) => ({
    id: hexKey(c),
    q: c.q,
    r: c.r,
    terrain: terrains[i]!,
    token: null,
  }));

  // 2) Segnalini numerici sulle caselle non-tundra, con retry deterministico
  //    per il vincolo "niente 6/8 adiacenti" (consuma RNG a ogni tentativo).
  const nonTundra = hexes.filter((h) => h.terrain !== 'tundra');
  for (let attempt = 0; attempt < 1000; attempt++) {
    const [tokens, next] = shuffle(rng, TOKEN_POOL);
    rng = next;
    nonTundra.forEach((h, i) => {
      h.token = tokens[i]!;
    });
    if (!avoidAdjacent68 || !hasAdjacent68(hexes)) break;
    // In caso (statisticamente impossibile) di 1000 fallimenti, resta l'ultima.
  }

  // 3) Approdi: tipi mescolati sulle 9 posizioni fisse dell'anello costiero.
  const [kinds, rngAfterPorts] = shuffle(rng, PORT_KINDS_POOL);
  rng = rngAfterPorts;
  const ports: Port[] = PORT_RING_INDICES.map((ringIdx, i) => {
    const kind = kinds[i]!;
    return { edge: topo.coastalRing[ringIdx]!, kind, ratio: kind === 'generico' ? 3 : 2 };
  });

  // 4) Il Drago parte dalla tundra.
  const tundra = hexes.find((h) => h.terrain === 'tundra')!;

  return [{ hexes, ports, dragonHex: tundra.id }, rng];
}
