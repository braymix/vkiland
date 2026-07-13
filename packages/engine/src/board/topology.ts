/**
 * Topologia della tavola: vertici, spigoli e tutte le mappe di adiacenza,
 * derivate matematicamente dagli id canonici (vedi coords.ts).
 *
 * È una struttura IMMUTABILE e identica per ogni partita (la tavola standard
 * è sempre l'esagono di raggio 2): viene quindi precomputata una sola volta e
 * memoizzata a livello di modulo — NON fa parte dello stato serializzato.
 */
import {
  type AxialCoord,
  BOARD_RADIUS,
  boardHexes,
  edgeId,
  hexEdgeIds,
  hexKey,
  hexNeighbors,
  hexVertexIds,
  isHexOnBoardCode,
  parseEdgeId,
  parseVertexId,
  vertexId,
} from './coords';

export interface BoardTopology {
  /** Le 19 caselle di terra, in ordine deterministico. */
  hexKeys: readonly string[];
  /** I 54 vertici edificabili (almeno un esagono di terra). */
  vertices: readonly string[];
  /** I 72 spigoli percorribili (almeno un esagono di terra). */
  edges: readonly string[];
  /** esagono di terra → i suoi 6 vertici. */
  hexVertices: Readonly<Record<string, readonly string[]>>;
  /** esagono di terra → i suoi 6 spigoli (solo quelli validi, cioè tutti). */
  hexEdges: Readonly<Record<string, readonly string[]>>;
  /** vertice → esagoni di TERRA incidenti (1..3): determina la produzione. */
  vertexLandHexes: Readonly<Record<string, readonly string[]>>;
  /** vertice → spigoli validi incidenti (2 o 3). */
  vertexEdges: Readonly<Record<string, readonly string[]>>;
  /** spigolo → i suoi 2 vertici estremi. */
  edgeVertices: Readonly<Record<string, readonly [string, string]>>;
  /** vertice → vertici adiacenti (regola della distanza, percorsi). */
  vertexNeighbors: Readonly<Record<string, readonly string[]>>;
  /**
   * I 30 spigoli costieri (esattamente 1 esagono di terra) ordinati
   * percorrendo la costa: qui vengono piazzati gli Approdi.
   */
  coastalRing: readonly string[];
}

/** Una topologia per CODICE tavola (piccola/grande/gigante): immutabile, memoizzata a modulo. */
const cache = new Map<number, BoardTopology>();

export function getTopology(code: number = BOARD_RADIUS): BoardTopology {
  const hit = cache.get(code);
  if (hit) return hit;

  const land = boardHexes(code);
  const hexKeys = land.map(hexKey);

  const vertexSet = new Set<string>();
  const edgeSet = new Set<string>();
  const hexVertices: Record<string, string[]> = {};
  const hexEdges: Record<string, string[]> = {};

  for (const hex of land) {
    const vs = hexVertexIds(hex);
    const es = hexEdgeIds(hex);
    hexVertices[hexKey(hex)] = vs;
    hexEdges[hexKey(hex)] = es;
    for (const v of vs) vertexSet.add(v);
    for (const e of es) edgeSet.add(e);
  }

  const vertices = [...vertexSet].sort();
  const edges = [...edgeSet].sort();

  // vertice → esagoni di terra incidenti
  const vertexLandHexes: Record<string, string[]> = {};
  for (const v of vertices) {
    vertexLandHexes[v] = parseVertexId(v)
      .filter((c) => isHexOnBoardCode(c, code))
      .map(hexKey);
  }

  // spigolo → vertici estremi: per lo spigolo {A,B} sono le triple {A,B,C}
  // con C = ciascuno dei 2 vicini comuni di A e B.
  const edgeVertices: Record<string, readonly [string, string]> = {};
  for (const e of edges) {
    const [a, b] = parseEdgeId(e);
    const bNeighbors = new Set(hexNeighbors(b).map(hexKey));
    const common = hexNeighbors(a).filter((c) => bNeighbors.has(hexKey(c)));
    // Due esagoni adiacenti hanno sempre esattamente 2 vicini in comune.
    const [c1, c2] = common as [AxialCoord, AxialCoord];
    edgeVertices[e] = [vertexId(a, b, c1), vertexId(a, b, c2)];
  }

  // vertice → spigoli incidenti: per il vertice {A,B,C} le coppie AB, BC, AC
  // che esistono come spigoli validi (≥1 esagono di terra).
  const vertexEdges: Record<string, string[]> = {};
  for (const v of vertices) {
    const [a, b, c] = parseVertexId(v);
    vertexEdges[v] = [edgeId(a, b), edgeId(b, c), edgeId(a, c)].filter((e) =>
      edgeSet.has(e)
    );
  }

  // vertice → vertici adiacenti (l'altro estremo di ogni spigolo incidente)
  const vertexNeighbors: Record<string, string[]> = {};
  for (const v of vertices) {
    vertexNeighbors[v] = vertexEdges[v]!.map((e) => {
      const [v1, v2] = edgeVertices[e]!;
      return v1 === v ? v2 : v1;
    });
  }

  // Spigoli costieri: esattamente 1 esagono di terra.
  const coastal = edges.filter((e) => {
    const [a, b] = parseEdgeId(e);
    return Number(isHexOnBoardCode(a, code)) + Number(isHexOnBoardCode(b, code)) === 1;
  });

  // Ordina la costa percorrendola: in ogni vertice costiero si incontrano
  // esattamente 2 spigoli costieri, quindi formano un unico anello chiuso.
  const coastalByVertex = new Map<string, string[]>();
  for (const e of coastal) {
    for (const v of edgeVertices[e]!) {
      const list = coastalByVertex.get(v) ?? [];
      list.push(e);
      coastalByVertex.set(v, list);
    }
  }
  const start = coastal[0]!; // 'coastal' è già ordinato lessicograficamente
  const ring: string[] = [start];
  let prevVertex = edgeVertices[start]![0];
  let current = start;
  while (ring.length < coastal.length) {
    const [v1, v2] = edgeVertices[current]!;
    const nextVertex = v1 === prevVertex ? v2 : v1;
    const candidates = coastalByVertex.get(nextVertex)!.filter((e) => e !== current);
    current = candidates[0]!;
    ring.push(current);
    prevVertex = nextVertex;
  }

  const topo: BoardTopology = {
    hexKeys,
    vertices,
    edges,
    hexVertices,
    hexEdges,
    vertexLandHexes,
    vertexEdges,
    edgeVertices,
    vertexNeighbors,
    coastalRing: ring,
  };
  cache.set(code, topo);
  return topo;
}
