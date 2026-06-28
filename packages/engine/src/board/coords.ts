/**
 * Coordinate assiali per esagoni "pointy-top" (punta in alto) e identificatori
 * canonici di vertici e spigoli.
 *
 * Idea chiave: ogni VERTICE della griglia è il punto d'incontro di esattamente
 * 3 esagoni (anche "marini", cioè fuori dalla tavola: esistono comunque come
 * coordinate), e ogni SPIGOLO è il confine tra esattamente 2 esagoni adiacenti.
 * Usando come id la tripla/coppia ordinata di esagoni otteniamo identificatori
 * canonici e tutte le adiacenze si derivano matematicamente, senza tabelle
 * scritte a mano.
 */

export interface AxialCoord {
  q: number;
  r: number;
}

/**
 * Direzioni dei 6 vicini in ordine CICLICO (NW, NE, E, SE, SW, W).
 * L'ordine ciclico è essenziale: due vicini consecutivi condividono un vertice
 * con l'esagono centrale, quindi i 6 vertici sono le triple {c, n_i, n_{i+1}}.
 */
export const HEX_DIRECTIONS: readonly AxialCoord[] = [
  { q: 0, r: -1 }, // NW
  { q: 1, r: -1 }, // NE
  { q: 1, r: 0 }, // E
  { q: 0, r: 1 }, // SE
  { q: -1, r: 1 }, // SW
  { q: -1, r: 0 }, // W
];

/** Raggio della tavola PICCOLA (2–4 giocatori): esagono → 19 caselle (3-4-5-4-3). */
export const BOARD_RADIUS = 2;
/** Raggio della tavola GRANDE (5–6 giocatori): esagono → 37 caselle (4-5-6-7-6-5-4). */
export const BOARD_RADIUS_LARGE = 3;

export function hexKey(c: AxialCoord): string {
  return `${c.q},${c.r}`;
}

export function parseHexKey(key: string): AxialCoord {
  const parts = key.split(',');
  return { q: Number(parts[0]), r: Number(parts[1]) };
}

export function hexNeighbors(c: AxialCoord): AxialCoord[] {
  return HEX_DIRECTIONS.map((d) => ({ q: c.q + d.q, r: c.r + d.r }));
}

/** Distanza esagonale (in cubo: x=q, z=r, y=-q-r). */
export function hexDistance(a: AxialCoord, b: AxialCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

export function isOnBoard(c: AxialCoord, radius: number = BOARD_RADIUS): boolean {
  return Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r)) <= radius;
}

/** Tutte le caselle della tavola in ordine deterministico (r crescente, poi q). */
export function allBoardHexes(radius: number = BOARD_RADIUS): AxialCoord[] {
  const out: AxialCoord[] = [];
  for (let r = -radius; r <= radius; r++) {
    for (let q = -radius; q <= radius; q++) {
      if (isOnBoard({ q, r }, radius)) out.push({ q, r });
    }
  }
  return out;
}

function compareCoords(a: AxialCoord, b: AxialCoord): number {
  return a.q !== b.q ? a.q - b.q : a.r - b.r;
}

/** Id canonico di un vertice: le 3 coordinate incidenti, ordinate. */
export function vertexId(a: AxialCoord, b: AxialCoord, c: AxialCoord): string {
  return [a, b, c].sort(compareCoords).map(hexKey).join(';');
}

/** Id canonico di uno spigolo: le 2 coordinate adiacenti, ordinate. */
export function edgeId(a: AxialCoord, b: AxialCoord): string {
  return [a, b].sort(compareCoords).map(hexKey).join(';');
}

export function parseVertexId(id: string): [AxialCoord, AxialCoord, AxialCoord] {
  const parts = id.split(';');
  return [parseHexKey(parts[0]!), parseHexKey(parts[1]!), parseHexKey(parts[2]!)];
}

export function parseEdgeId(id: string): [AxialCoord, AxialCoord] {
  const parts = id.split(';');
  return [parseHexKey(parts[0]!), parseHexKey(parts[1]!)];
}

/** I 6 vertici di un esagono: triple {c, vicino_i, vicino_i+1} in ordine ciclico. */
export function hexVertexIds(c: AxialCoord): string[] {
  const n = hexNeighbors(c);
  return n.map((ni, i) => vertexId(c, ni, n[(i + 1) % 6]!));
}

/** I 6 spigoli di un esagono: coppie {c, vicino_i}. */
export function hexEdgeIds(c: AxialCoord): string[] {
  return hexNeighbors(c).map((ni) => edgeId(c, ni));
}
