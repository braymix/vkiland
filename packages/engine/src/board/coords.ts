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
/** Raggio geometrico delle due tavole grandi (grande e gigante): esagono di base a 37 caselle. */
export const BOARD_RADIUS_LARGE = 3;

/**
 * CODICE della tavola: identità usata come chiave della topologia e salvata in
 * `config.boardRadius`. Per le tavole a esagono pieno il codice COINCIDE col
 * raggio geometrico (retro-compatibile coi salvataggi: 2 = piccola, 3 = gigante);
 * la tavola GRANDE è invece un esagono di raggio 3 "tagliato" (due lati in meno),
 * quindi ha un codice dedicato che NON è un raggio geometrico.
 *
 *  - PICCOLA  (2)  esagono raggio 2 → 19 caselle          (2–4 giocatori)
 *  - GRANDE   (5)  esagono raggio 3 con DUE LATI ADIACENTI in meno
 *                  (via il lato q=+3 e il lato r=-3, che condividono l'angolo
 *                  (3,-3)) → 30 caselle                    (5–6 giocatori)
 *  - GIGANTE  (3)  esagono raggio 3 pieno → 37 caselle     (7–8 giocatori)
 */
export const BOARD_CODE_SMALL = 2;
export const BOARD_CODE_GIGANTE = 3;
export const BOARD_CODE_GRANDE = 5;

interface BoardShape {
  /** Raggio geometrico usato dal renderer per centrare le caselle. */
  radius: number;
  /** Le caselle di terra, in ordine deterministico. */
  hexes: AxialCoord[];
  /** Insieme delle chiavi delle caselle, per l'appartenenza (isHexOnBoardCode). */
  set: Set<string>;
}

const boardShapeCache = new Map<number, BoardShape>();

/** Descrittore geometrico della tavola dato il suo CODICE (memoizzato). */
function boardShape(code: number = BOARD_RADIUS): BoardShape {
  const hit = boardShapeCache.get(code);
  if (hit) return hit;

  let radius: number;
  let hexes: AxialCoord[];
  if (code === BOARD_CODE_GRANDE) {
    // GRANDE = GIGANTE (raggio 3) con due lati ADIACENTI in meno: via il lato
    // q=+3 e il lato r=-3 (attaccati, condividono l'angolo (3,-3)).
    radius = BOARD_RADIUS_LARGE;
    hexes = allBoardHexes(BOARD_RADIUS_LARGE).filter(
      (c) => c.q < BOARD_RADIUS_LARGE && c.r > -BOARD_RADIUS_LARGE
    );
  } else {
    // Tavole a esagono pieno: il codice è anche il raggio geometrico.
    radius = code;
    hexes = allBoardHexes(code);
  }
  const shape: BoardShape = { radius, hexes, set: new Set(hexes.map(hexKey)) };
  boardShapeCache.set(code, shape);
  return shape;
}

/** Raggio geometrico (per la resa in pixel) della tavola col dato codice. */
export function boardGeomRadius(code: number = BOARD_RADIUS): number {
  return boardShape(code).radius;
}

/** Le caselle di terra della tavola col dato codice, in ordine deterministico. */
export function boardHexes(code: number = BOARD_RADIUS): AxialCoord[] {
  return boardShape(code).hexes;
}

/** true se la casella appartiene alla tavola col dato codice (forma reale, anche tagliata). */
export function isHexOnBoardCode(c: AxialCoord, code: number = BOARD_RADIUS): boolean {
  return boardShape(code).set.has(hexKey(c));
}

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
