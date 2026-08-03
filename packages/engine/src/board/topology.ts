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
  parseEdgeId,
  parseHexKey,
  parseVertexId,
  vertexId,
} from './coords';

/**
 * CHIAVE della topologia. Due forme:
 *  - `number` → tavola a forma FISSA (piccola/grande/gigante): il numero è il
 *    CODICE della tavola; la forma viene da `boardHexes(code)` ed è convessa
 *    (nessun ponte). Retro-compatibile con tutto il codice e i test esistenti.
 *  - `string` → tavola «con rientranze» (forma casuale, non esagonale): la
 *    stringa CODIFICA l'insieme delle caselle di terra (vedi `shapeSignature`),
 *    così la topologia è ricostruibile in modo deterministico dal solo tabellone
 *    (nessun registro globale, nessuna collisione, sopravvive alla
 *    serializzazione). Su queste tavole la topologia include anche i PONTI.
 */
export type TopoKey = number | string;

const SHAPE_PREFIX = 'S:';

/**
 * Firma canonica di una forma di tavola: le chiavi delle caselle di terra,
 * ordinate. È la `TopoKey` delle tavole «con rientranze» ed è una funzione pura
 * (e stabile) del solo insieme di caselle, quindi ricostruibile dal tabellone.
 */
export function shapeSignature(hexes: readonly { id: string }[]): string {
  return SHAPE_PREFIX + hexes.map((h) => h.id).slice().sort().join(';');
}

function isShapeKey(key: TopoKey): key is string {
  return typeof key === 'string';
}

function parseShapeKey(key: string): AxialCoord[] {
  return key.slice(SHAPE_PREFIX.length).split(';').filter(Boolean).map(parseHexKey);
}

/**
 * `TopoKey` per un tabellone: la firma della forma se è «con rientranze»,
 * altrimenti il codice numerico (comportamento classico). È l'unico punto in cui
 * si decide quale topologia usare, condiviso da engine, bot e renderer.
 */
export function boardTopoKey(
  boardRadius: number,
  boardShape: 'rientranze' | 'libera' | undefined,
  hexes: readonly { id: string }[]
): TopoKey {
  // Ogni forma NON esagonale (rientranze o campo libero) porta la topologia
  // nelle proprie caselle: si usa la firma. Solo l'esagono fisso usa il codice.
  return boardShape ? shapeSignature(hexes) : boardRadius;
}

export interface BoardTopology {
  /** Le 19 caselle di terra, in ordine deterministico. */
  hexKeys: readonly string[];
  /** I 54 vertici edificabili (almeno un esagono di terra). */
  vertices: readonly string[];
  /** I 72 spigoli percorribili (almeno un esagono di terra) + eventuali PONTI. */
  edges: readonly string[];
  /**
   * PONTI: spigoli di solo MARE (nessuna casella di terra) i cui DUE vertici
   * toccano però la terra — cioè attraversano un golfo largo «una strada». Sono
   * spigoli percorribili a tutti gli effetti (una strada normale), inclusi in
   * `edges`/`edgeVertices`/`vertexEdges`/`vertexNeighbors`; qui sono elencati a
   * parte solo perché il renderer li disegni come ponti sul mare. Vuoto sulle
   * tavole a forma fissa (convesse: nessun golfo).
   */
  bridges: readonly string[];
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

/** Una topologia per CHIAVE tavola (codice fisso o firma «con rientranze»): immutabile, memoizzata a modulo. */
const cache = new Map<TopoKey, BoardTopology>();

export function getTopology(key: TopoKey = BOARD_RADIUS): BoardTopology {
  const hit = cache.get(key);
  if (hit) return hit;

  // Le tavole a forma fissa (chiave numerica) sono convesse e SENZA ponti; le
  // tavole «con rientranze» (chiave-firma) portano la forma con sé e abilitano i
  // ponti sui golfi.
  const land = isShapeKey(key) ? parseShapeKey(key) : boardHexes(key);
  const topo = buildTopology(land, isShapeKey(key));
  cache.set(key, topo);
  return topo;
}

function buildTopology(land: readonly AxialCoord[], withBridges: boolean): BoardTopology {
  const hexKeys = land.map(hexKey);
  const landSet = new Set(hexKeys);

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

  // PONTI: uno spigolo di solo mare {W1,W2} è un ponte se i suoi DUE vertici
  // toccano la terra, cioè se ENTRAMBI i vicini comuni di W1,W2 sono terra. Si
  // scoprono dai «golfi»: per ogni casella di terra C1 e ogni coppia di vicini
  // consecutivi entrambi di mare (W1,W2), l'altro vicino comune è C2 = W1+W2−C1
  // (identità del rombo esagonale). Se C2 è terra, {W1,W2} è un ponte. Aggiunti
  // a `edgeSet` PRIMA di derivare vertici/adiacenze, così entrano da soli in
  // edgeVertices/vertexEdges/vertexNeighbors senza casi speciali.
  const bridgeSet = new Set<string>();
  if (withBridges) {
    for (const c1 of land) {
      const n = hexNeighbors(c1);
      for (let i = 0; i < 6; i++) {
        const w1 = n[i]!;
        const w2 = n[(i + 1) % 6]!;
        if (landSet.has(hexKey(w1)) || landSet.has(hexKey(w2))) continue;
        const c2 = { q: w1.q + w2.q - c1.q, r: w1.r + w2.r - c1.r };
        if (!landSet.has(hexKey(c2))) continue;
        const e = edgeId(w1, w2);
        bridgeSet.add(e);
        edgeSet.add(e);
      }
    }
  }

  const vertices = [...vertexSet].sort();
  const edges = [...edgeSet].sort();
  const bridges = [...bridgeSet].sort();

  // vertice → esagoni di terra incidenti
  const vertexLandHexes: Record<string, string[]> = {};
  for (const v of vertices) {
    vertexLandHexes[v] = parseVertexId(v)
      .filter((c) => landSet.has(hexKey(c)))
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

  // Spigoli costieri: esattamente 1 esagono di terra (i ponti hanno 0 terra e
  // restano quindi esclusi: nessun approdo su un ponte).
  const coastal = edges.filter((e) => {
    const [a, b] = parseEdgeId(e);
    return Number(landSet.has(hexKey(a))) + Number(landSet.has(hexKey(b))) === 1;
  });

  // Ordina la costa percorrendola. Su una tavola convessa la costa è un unico
  // anello chiuso di vertici di grado 2; su una tavola «con rientranze» possono
  // esserci più anelli (golfi/insenature) o vertici di «strozzatura» con più di
  // due spigoli costieri: si percorre a componenti, consumando gli spigoli, così
  // la costruzione non si blocca mai e resta identica sul caso convesso.
  const coastalByVertex = new Map<string, string[]>();
  for (const e of coastal) {
    for (const v of edgeVertices[e]!) {
      const list = coastalByVertex.get(v) ?? [];
      list.push(e);
      coastalByVertex.set(v, list);
    }
  }
  const remaining = new Set(coastal); // 'coastal' è già ordinato lessicograficamente
  const ring: string[] = [];
  for (const seed of coastal) {
    if (!remaining.has(seed)) continue;
    let current = seed;
    remaining.delete(current);
    ring.push(current);
    let prevVertex = edgeVertices[current]![0];
    for (;;) {
      const [v1, v2] = edgeVertices[current]!;
      const arrival = v1 === prevVertex ? v2 : v1;
      const next = (coastalByVertex.get(arrival) ?? []).find(
        (e) => e !== current && remaining.has(e)
      );
      if (!next) break;
      remaining.delete(next);
      ring.push(next);
      prevVertex = arrival;
      current = next;
    }
  }

  return {
    hexKeys,
    vertices,
    edges,
    bridges,
    hexVertices,
    hexEdges,
    vertexLandHexes,
    vertexEdges,
    edgeVertices,
    vertexNeighbors,
    coastalRing: ring,
  };
}
