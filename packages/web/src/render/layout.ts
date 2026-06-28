/**
 * Geometria della tavola in PIXEL LOGICI (risoluzione bassa, poi scalata
 * con image-rendering: pixelated) e hit-testing matematico.
 *
 * La tavola può avere due TAGLIE (raggio 2 = piccola/2–4 giocatori, raggio 3 =
 * grande/5–6): tutte le funzioni accettano il raggio (default 2). Il canvas
 * logico e l'origine crescono col raggio, così gli sprite restano della stessa
 * dimensione e la tavola più grande viene semplicemente rimpicciolita via CSS.
 *
 * Modulo puro (niente DOM): è coperto da test in Vitest.
 */
import {
  BOARD_RADIUS,
  getTopology,
  isOnBoard,
  parseEdgeId,
  parseHexKey,
  parseVertexId,
  type EdgeId,
  type HexId,
  type VertexId,
} from '@vikiland/engine';

/** Larghezza esagono 48px, passo verticale 42px (pointy-top). */
export const HEX_W = 48;
export const HEX_HALF_W = 24;
export const HEX_CORNER_Y = 28; // punta nord/sud
export const HEX_SIDE_Y = 14; // spigoli laterali
const ROW_STEP = 42;

/** Margine attorno alla terra per i drakkar degli approdi (calibrato su R=2). */
const MARGIN_X = 64;
const MARGIN_Y = 56;

export interface Point {
  x: number;
  y: number;
}

/** Dimensione del canvas logico per il raggio dato (R=2 → 320×280). */
export function boardCanvasSize(radius: number = BOARD_RADIUS): { w: number; h: number } {
  return { w: 2 * (HEX_W * radius + MARGIN_X), h: 2 * (ROW_STEP * radius + MARGIN_Y) };
}

/** Origine (centro) del canvas per il raggio dato. */
function originFor(radius: number): Point {
  return { x: HEX_W * radius + MARGIN_X, y: ROW_STEP * radius + MARGIN_Y };
}

/** Dimensioni di default (tavola piccola): retro-compatibilità per UI e test. */
export const CANVAS_W = boardCanvasSize(BOARD_RADIUS).w;
export const CANVAS_H = boardCanvasSize(BOARD_RADIUS).h;

export function hexCenter(q: number, r: number, radius: number = BOARD_RADIUS): Point {
  const o = originFor(radius);
  return { x: o.x + HEX_W * q + HEX_HALF_W * r, y: o.y + ROW_STEP * r };
}

export function hexCenterById(hexId: HexId, radius: number = BOARD_RADIUS): Point {
  const { q, r } = parseHexKey(hexId);
  return hexCenter(q, r, radius);
}

/**
 * Punto di un vertice = baricentro dei 3 centri degli esagoni incidenti.
 * Con questa geometria il risultato è SEMPRE intero (vedi test).
 */
export function vertexPoint(vertexId: VertexId, radius: number = BOARD_RADIUS): Point {
  const [a, b, c] = parseVertexId(vertexId);
  const ca = hexCenter(a.q, a.r, radius);
  const cb = hexCenter(b.q, b.r, radius);
  const cc = hexCenter(c.q, c.r, radius);
  return { x: (ca.x + cb.x + cc.x) / 3, y: (ca.y + cb.y + cc.y) / 3 };
}

export function edgeEndpoints(edgeId: EdgeId, radius: number = BOARD_RADIUS): [Point, Point] {
  const topo = getTopology(radius);
  const [v1, v2] = topo.edgeVertices[edgeId]!;
  return [vertexPoint(v1, radius), vertexPoint(v2, radius)];
}

export function edgeMidpoint(edgeId: EdgeId, radius: number = BOARD_RADIUS): Point {
  const [p1, p2] = edgeEndpoints(edgeId, radius);
  return { x: Math.round((p1.x + p2.x) / 2), y: Math.round((p1.y + p2.y) / 2) };
}

/**
 * Ancoraggio dell'approdo: dal punto medio dello spigolo costiero, spinto
 * verso il centro dell'esagono di MARE (così il drakkar galleggia al largo).
 */
export function portAnchor(edgeId: EdgeId, radius: number = BOARD_RADIUS): Point {
  const [a, b] = parseEdgeId(edgeId);
  const landFirst = isOnBoard(a, radius);
  const land = hexCenter(landFirst ? a.q : b.q, landFirst ? a.r : b.r, radius);
  const sea = hexCenter(landFirst ? b.q : a.q, landFirst ? b.r : a.r, radius);
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
  radius: number = BOARD_RADIUS,
  maxDist = 20
): VertexId | null {
  return nearest(x, y, candidates, (v) => vertexPoint(v, radius), maxDist);
}

export function nearestEdge(
  x: number,
  y: number,
  candidates: Iterable<EdgeId>,
  radius: number = BOARD_RADIUS,
  maxDist = 20
): EdgeId | null {
  return nearest(x, y, candidates, (e) => edgeMidpoint(e, radius), maxDist);
}

export function nearestHex(
  x: number,
  y: number,
  candidates: Iterable<HexId>,
  radius: number = BOARD_RADIUS,
  maxDist = 28
): HexId | null {
  return nearest(x, y, candidates, (h) => hexCenterById(h, radius), maxDist);
}

/** Maschera dell'esagono pixel-perfetta: mezza-larghezza a ogni riga. */
export function hexHalfWidthAt(dy: number): number {
  const ady = Math.abs(dy);
  if (ady > HEX_CORNER_Y) return -1; // fuori
  if (ady <= HEX_SIDE_Y) return HEX_HALF_W;
  return Math.round((HEX_HALF_W * (HEX_CORNER_Y - ady)) / (HEX_CORNER_Y - HEX_SIDE_Y));
}
