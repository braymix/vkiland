/** Generazione procedurale (e deterministica, dato l'RNG) della tavola. */
import { SMALL_BOARD, type BoardSpec } from '../constants';
import { nextInt, shuffle, type RngState } from '../rng';
import type { Board, BoardShapeChoice, Hex, Port } from '../types';
import {
  type AxialCoord,
  boardHexes,
  hexKey,
  hexNeighbors,
  rientranzeRegionRadius,
} from './coords';
import { getTopology, shapeSignature, type BoardTopology, type TopoKey } from './topology';

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

function cubeDist(c: AxialCoord): number {
  return Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r));
}

/**
 * Fa crescere un'ISOLA connessa e frastagliata di `count` caselle, entro un
 * esagono di raggio `regionRadius`, partendo dal centro. A ogni passo aggiunge
 * una casella di frontiera (adiacente all'isola) scelta a caso, ma con PESO
 * MAGGIORE alle caselle con pochi vicini già scelti: così crescono penisole e
 * golfi (bordo irregolare) invece di un blocco tondo. Connessa per costruzione
 * (si aggiunge solo ciò che tocca l'isola); i «mari interni» eventuali sono
 * voluti (i ponti li attraversano). Deterministica dato l'RNG.
 */
function growIsland(
  rngIn: RngState,
  count: number,
  regionRadius: number,
  compact = false
): [AxialCoord[], RngState] {
  let rng = rngIn;
  const chosen: AxialCoord[] = [];
  const chosenSet = new Set<string>();
  const frontier: AxialCoord[] = [];
  const frontierSet = new Set<string>();

  const chosenNeighbors = (c: AxialCoord): number =>
    hexNeighbors(c).reduce((n, x) => n + (chosenSet.has(hexKey(x)) ? 1 : 0), 0);

  const add = (c: AxialCoord): void => {
    chosen.push(c);
    chosenSet.add(hexKey(c));
    for (const n of hexNeighbors(c)) {
      const k = hexKey(n);
      if (cubeDist(n) > regionRadius || chosenSet.has(k) || frontierSet.has(k)) continue;
      frontier.push(n);
      frontierSet.add(k);
    }
  };

  add({ q: 0, r: 0 });
  while (chosen.length < count && frontier.length > 0) {
    // Pesi (estrazione pesata deterministica). Due modi:
    //  - FRASTAGLIATO (default): 6 per una casella con 1 solo vicino scelto,
    //    calando fino a 1 con 6 vicini → penisole e golfi (bordo irregolare).
    //  - COMPATTO (`compact`): al contrario, favorisce forte le caselle con più
    //    vicini già scelti → riempie prima le concavità, crescendo un'isola
    //    rotonda quasi esagonale senza golfi (di norma nessun ponte).
    const weights = frontier.map((c) => {
      const n = chosenNeighbors(c);
      return compact ? (1 + n) ** 3 : Math.max(1, 7 - n);
    });
    let total = 0;
    for (const w of weights) total += w;
    const [roll, r2] = nextInt(rng, total);
    rng = r2;
    let idx = 0;
    let acc = 0;
    for (; idx < weights.length; idx++) {
      acc += weights[idx]!;
      if (roll < acc) break;
    }
    const picked = frontier[idx]!;
    // swap-pop dalla frontiera
    frontier[idx] = frontier[frontier.length - 1]!;
    frontier.pop();
    frontierSet.delete(hexKey(picked));
    add(picked);
  }
  return [chosen, rng];
}

/**
 * Posizioni degli approdi su una costa di lunghezza qualsiasi: `count` approdi
 * distribuiti il più uniformemente possibile lungo l'anello, con almeno uno
 * spigolo di stacco fra due consecutivi (così non condividono un vertice).
 * Ripiega su meno approdi se la costa è troppo corta.
 */
function spreadPortIndices(ringLength: number, count: number): number[] {
  const n = Math.min(count, Math.floor(ringLength / 2));
  if (n <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(Math.floor((i * ringLength) / n));
  return out;
}

export function generateBoard(
  rngIn: RngState,
  avoidAdjacent68: boolean,
  spec: BoardSpec = SMALL_BOARD,
  shape?: BoardShapeChoice
): [Board, RngState] {
  let rng = rngIn;

  // 0) La FORMA della tavola: esagono fisso della taglia, oppure isola casuale
  //    «con rientranze» con lo stesso numero di caselle (così i sacchetti
  //    terreni/segnalini restano validi identici).
  let land: AxialCoord[];
  let topoKey: TopoKey;
  if (shape === 'libera') {
    // Campo libero: isola COMPATTA di `terrainPool.length` caselle, cresciuta
    // dentro l'esagono del raggio geometrico (spec.code) scelto per contenerla.
    // Se le caselle riempiono l'intero esagono la forma è un esagono perfetto.
    const [grown, rngAfterShape] = growIsland(rng, spec.terrainPool.length, spec.code, true);
    rng = rngAfterShape;
    land = grown;
    topoKey = shapeSignature(grown.map((c) => ({ id: hexKey(c) })));
  } else if (shape === 'rientranze') {
    const [grown, rngAfterShape] = growIsland(
      rng,
      spec.terrainPool.length,
      rientranzeRegionRadius(spec.code)
    );
    rng = rngAfterShape;
    land = grown;
    topoKey = shapeSignature(grown.map((c) => ({ id: hexKey(c) })));
  } else {
    land = boardHexes(spec.code);
    topoKey = spec.code;
  }
  const topo: BoardTopology = getTopology(topoKey);

  // 1) Terreni mescolati sulle caselle della tavola (in ordine deterministico).
  const [terrains, rngAfterTerrains] = shuffle(rng, spec.terrainPool);
  rng = rngAfterTerrains;
  const hexes: Hex[] = land.map((c, i) => ({
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
    const [tokens, next] = shuffle(rng, spec.tokenPool);
    rng = next;
    nonTundra.forEach((h, i) => {
      h.token = tokens[i]!;
    });
    if (!avoidAdjacent68 || !hasAdjacent68(hexes)) break;
    // In caso (statisticamente impossibile) di 1000 fallimenti, resta l'ultima.
  }

  // 3) Approdi: tipi mescolati sulle posizioni dell'anello costiero. Sulle
  //    tavole fisse si usano le posizioni calibrate a mano; sull'isola «con
  //    rientranze» la costa è più lunga e irregolare, quindi si distribuiscono
  //    gli approdi uniformemente sull'anello effettivo.
  const [kinds, rngAfterPorts] = shuffle(rng, spec.portKinds);
  rng = rngAfterPorts;
  const ringIndices =
    shape === 'rientranze' || shape === 'libera'
      ? spreadPortIndices(topo.coastalRing.length, spec.portKinds.length)
      : spec.portRingIndices;
  const ports: Port[] = ringIndices.map((ringIdx, i) => {
    const kind = kinds[i]!;
    return { edge: topo.coastalRing[ringIdx]!, kind, ratio: kind === 'generico' ? 3 : 2 };
  });

  // 4) Il Drago parte dalla tundra.
  const tundra = hexes.find((h) => h.terrain === 'tundra')!;

  return [{ hexes, ports, dragonHex: tundra.id, dragonMovedBy: null }, rng];
}
