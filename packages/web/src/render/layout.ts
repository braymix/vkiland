/**
 * Geometria della tavola in PIXEL LOGICI (risoluzione bassa, poi scalata
 * con image-rendering: pixelated) e hit-testing matematico.
 *
 * Modulo puro (niente DOM): è coperto da test in Vitest.
 */
import {
  getTopology,
  isOnBoard,
  parseEdgeId,
  parseHexKey,
  parseVertexId,
  type EdgeId,
  type HexId,
  type VertexId,
} from '@vikiland/engine';

/** Risoluzione logica del canvas della tavola. */
export const CANVAS_W = 160;
export const CANVAS_H = 140;

const ORIGIN_X = 80;
const ORIGIN_Y = 70;

/** Larghezza esagono 24px, passo verticale 21px (pointy-top). */
export const HEX_W = 24;
export const HEX_HALF_W = 12;
export const HEX_CORNER_Y = 14; // punta nord/sud
export const HEX_SIDE_Y = 7; // spigoli laterali
const ROW_STEP = 21;

export interface Point {
  x: number;
  y: number;
}

export function hexCenter(q: number, r: number): Point {
  return { x: ORIGIN_X + HEX_W * q + HEX_HALF_W * r, y: ORIGIN_Y + ROW_STEP * r };
}

export function hexCenterById(hexId: HexId): Point {
  const { q, r } = parseHexKey(hexId);
  return hexCenter(q, r);
}

/**
 * Punto di un vertice = baricentro dei 3 centri degli esagoni incidenti.
 * Con questa geometria il risultato è SEMPRE intero (vedi test).
 */
export function vertexPoint(vertexId: VertexId): Point {
  const [a, b, c] = parseVertexId(vertexId);
  const ca = hexCenter(a.q, a.r);
  const cb = hexCenter(b.q, b.r);
  const cc = hexCenter(c.q, c.r);
  return { x: (ca.x + cb.x + cc.x) / 3, y: (ca.y + cb.y + cc.y) / 3 };
}

export function edgeEndpoints(edgeId: EdgeId): [Point, Point] {
  const topo = getTopology();
  const [v1, v2] = topo.edgeVertices[edgeId]!;
  return [vertexPoint(v1), vertexPoint(v2)];
}

export function edgeMidpoint(edgeId: EdgeId): Point {
  const [p1, p2] = edgeEndpoints(edgeId);
  return { x: Math.round((p1.x + p2.x) / 2), y: Math.round((p1.y + p2.y) / 2) };
}

/**
 * Ancoraggio dell'approdo: dal punto medio dello spigolo costiero, spinto
 * verso il centro dell'esagono di MARE (così il drakkar galleggia al largo).
 */
export function portAnchor(edgeId: EdgeId): Point {
  const [a, b] = parseEdgeId(edgeId);
  const landFirst = isOnBoard(a);
  const land = hexCenter(landFirst ? a.q : b.q, landFirst ? a.r : b.r);
  const sea = hexCenter(landFirst ? b.q : a.q, landFirst ? b.r : a.r);
  return {
    x: Math.round(land.x + 0.82 * (sea.x - land.x)),
    y: Math.round(land.y + 0.82 * (sea.y - land.y)),
  };
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Il più vicino tra i candidati entro maxDist pixel logici (null se nessuno). */
function nearest<T extends string>(
  x: number,
  y: number,
  candidates: Iterable<T>,
  pointOf: (id: T) => Point,
  maxDist: number
): T | null {
  let best: T | null = null;
  let bestD = maxDist * maxDist;
  for (const id of candidates) {
    const p = pointOf(id);
    const d = dist2(x, y, p.x, p.y);
    if (d <= bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

export function nearestVertex(
  x: number,
  y: number,
  candidates: Iterable<VertexId>,
  maxDist = 10
): VertexId | null {
  return nearest(x, y, candidates, vertexPoint, maxDist);
}

export function nearestEdge(
  x: number,
  y: number,
  candidates: Iterable<EdgeId>,
  maxDist = 10
): EdgeId | null {
  return nearest(x, y, candidates, edgeMidpoint, maxDist);
}

export function nearestHex(
  x: number,
  y: number,
  candidates: Iterable<HexId>,
  maxDist = 14
): HexId | null {
  return nearest(x, y, candidates, hexCenterById, maxDist);
}

/** Maschera dell'esagono pixel-perfetta: mezza-larghezza a ogni riga. */
export function hexHalfWidthAt(dy: number): number {
  const ady = Math.abs(dy);
  if (ady > HEX_CORNER_Y) return -1; // fuori
  if (ady <= HEX_SIDE_Y) return HEX_HALF_W;
  return Math.round((HEX_HALF_W * (HEX_CORNER_Y - ady)) / (HEX_CORNER_Y - HEX_SIDE_Y));
}
