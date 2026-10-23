/**
 * Generazione procedurale (deterministica dato l'RNG) della mappa «CASTELLO»:
 * una struttura esagonale ad ANELLI concentrici. Dal centro verso fuori:
 *
 *   mastio (terra) · [muro · cortile] × N · fossato · (borgo fuori le mura)
 *
 * Le MURA e il FOSSATO sono anelli di caselle NON di terra: separano i cortili.
 * Si attraversano SOLO attraverso attraversamenti espliciti, che il motore
 * aggiunge alla topologia come spigoli percorribili (vedi `topology.ts`):
 *
 *   - PORTE   (`gates`):   varchi nelle mura; sul fossato sono ponti levatoi.
 *   - SCALE   (`ladders`): «scavalcano» il muro (i «porti» di questa mappa); si
 *     possono costruire solo con un proprio edificio ai piedi (regola in
 *     `validate.ts`/`legal.ts`).
 *   - PASSAGGI SEGRETI (`tunnels`): gallerie che saltano un cortile (collegano
 *     due cortili non adiacenti); id dedicato `T:<vertice>|<vertice>`.
 *   - BRECCE  (`breaches`): una casella di muro crollata, diventata terra, che
 *     unisce i due cortili ai suoi lati.
 *
 * Il tutto è una funzione pura e stabile del solo RNG, così la mappa è
 * ricostruibile e i test deterministici.
 */
import { nextInt, shuffle, type RngState } from '../rng';
import {
  type AxialCoord,
  allBoardHexes,
  edgeId,
  hexKey,
  hexNeighbors,
  hexVertexIds,
  parseHexKey,
} from './coords';

/**
 * Descrizione SERIALIZZABILE del castello: basta a ricostruire la topologia
 * (gli attraversamenti) e a disegnarlo. Vive in `Board.castle`.
 */
export interface CastleLayout {
  /** Numero di mura (= cortili attorno al mastio) scelto dal giocatore. */
  rings: number;
  /** Anelli di muro/fossato, dal più interno al più esterno (per il renderer). */
  walls: { radius: number; kind: 'mura' | 'fossato' }[];
  /** Caselle «piazza d'armi»: cortile non costruito (non terra), a ciottolato. */
  plazas: string[];
  /** Caselle di muro crollate: ora sono TERRA (già incluse in `Board.hexes`). */
  breaches: string[];
  /** Spigoli-porta (varchi); sul fossato si disegnano come ponti levatoi. */
  gates: string[];
  /** Spigoli-scala (i «porti» del castello): si costruiscono solo coi piedi a terra. */
  ladders: string[];
  /** Gallerie `T:<vertice>|<vertice>` fra cortili non adiacenti. */
  tunnels: string[];
}

const TUNNEL_PREFIX = 'T:';

export function isTunnelId(id: string): boolean {
  return id.startsWith(TUNNEL_PREFIX);
}

/** Costruisce l'id di una galleria dalle due estremità (ordinate, canonico). */
export function tunnelId(v1: string, v2: string): string {
  const [a, b] = [v1, v2].sort();
  return `${TUNNEL_PREFIX}${a}|${b}`;
}

/** Le due estremità (vertici) di una galleria. */
export function parseTunnelId(id: string): [string, string] {
  const parts = id.slice(TUNNEL_PREFIX.length).split('|');
  return [parts[0]!, parts[1]!];
}

function cubeDist(c: AxialCoord): number {
  return Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r));
}

/** Un attraversamento candidato del muro: lo spigolo {w1,w2} e il raggio del muro. */
interface Crossing {
  edge: string;
  radius: number;
}

/**
 * Candidati-attraversamento su un dato insieme di terra: spigoli di solo MARE
 * (nessuna casella di terra) i cui DUE vertici toccano la terra su lati opposti
 * — cioè un varco in un muro largo una casella. Stessa identità «a rombo» dei
 * ponti (vedi `buildTopology`): per ogni casella di terra c1 e ogni coppia di
 * vicini CONSECUTIVI entrambi di mare (w1,w2), l'altro vicino comune è
 * c2 = w1+w2−c1; se c2 è terra, {w1,w2} è un varco. Il raggio del muro è il
 * raggio (cubo) delle caselle w1/w2.
 */
function candidateCrossings(land: readonly AxialCoord[], landSet: Set<string>): Crossing[] {
  const seen = new Set<string>();
  const out: Crossing[] = [];
  for (const c1 of land) {
    const n = hexNeighbors(c1);
    for (let i = 0; i < 6; i++) {
      const w1 = n[i]!;
      const w2 = n[(i + 1) % 6]!;
      if (landSet.has(hexKey(w1)) || landSet.has(hexKey(w2))) continue;
      const c2 = { q: w1.q + w2.q - c1.q, r: w1.r + w2.r - c1.r };
      if (!landSet.has(hexKey(c2))) continue;
      const e = edgeId(w1, w2);
      if (seen.has(e)) continue;
      seen.add(e);
      out.push({ edge: e, radius: Math.max(cubeDist(w1), cubeDist(w2)) });
    }
  }
  return out;
}

/** Le due caselle (acqua) ai lati di uno spigolo-attraversamento. */
function crossingWaterHexes(edge: string): [AxialCoord, AxialCoord] {
  const [a, b] = edge.split(';');
  return [parseHexKey(a!), parseHexKey(b!)];
}

/**
 * Sceglie fino a `count` attraversamenti «distanziati» da una lista di candidati
 * dello stesso muro: greedy su un ordine mescolato, scartando quelli che
 * condividono una casella d'acqua con uno già scelto (così i varchi non sono
 * attaccati). Deterministico dato l'RNG.
 */
function pickSpaced(
  rngIn: RngState,
  candidates: Crossing[],
  count: number
): [Crossing[], RngState] {
  let rng = rngIn;
  const [order, r2] = shuffle(rng, candidates);
  rng = r2;
  const picked: Crossing[] = [];
  const usedWater = new Set<string>();
  for (const cand of order) {
    if (picked.length >= count) break;
    const [w1, w2] = crossingWaterHexes(cand.edge);
    const k1 = hexKey(w1);
    const k2 = hexKey(w2);
    if (usedWater.has(k1) || usedWater.has(k2)) continue;
    picked.push(cand);
    usedWater.add(k1);
    usedWater.add(k2);
    // Marca anche i vicini-muro, così due varchi non restano a una casella.
    for (const nb of [...hexNeighbors(w1), ...hexNeighbors(w2)]) usedWater.add(hexKey(nb));
  }
  return [picked, rng];
}

export interface CastleResult {
  /** Le caselle di terra, in ordine deterministico (mastio → fuori). */
  land: AxialCoord[];
  /** Raggio geometrico esterno (per centrare il canvas). */
  radius: number;
  /** Il descrittore serializzabile (attraversamenti, mura, brecce, piazze). */
  castle: CastleLayout;
}

/**
 * Genera un castello con `rings` mura/cortili (2..4). Deterministico dato l'RNG.
 * Struttura PULITA ad anelli pieni:
 *
 *   mastio(r0) · muro(r1) · cortile(r2) · muro(r3) · cortile(r4) · … · fossato
 *
 * I cortili sono anelli di terra interi (letti bene a colpo d'occhio); la
 * casualità sta negli attraversamenti (porte, scale, gallerie) e nelle brecce.
 * Non assegna terreni/segnalini: è pura geometria + attraversamenti (quelli li
 * mette `generateBoard`, come per le altre forme).
 */
export function generateCastle(rngIn: RngState, rings: number): [CastleResult, RngState] {
  let rng = rngIn;
  const n = Math.max(2, Math.min(4, Math.round(rings)));

  // 1) Ruolo di ciascun raggio: mastio(0) · [muro · cortile] × n · fossato.
  //    Mura sui raggi dispari, cortili sui pari; il fossato chiude fuori.
  const walls: { radius: number; kind: 'mura' | 'fossato' }[] = [];
  const wallRadiiSet = new Set<number>();
  const landRadiiSet = new Set<number>([0]); // mastio
  for (let i = 1; i <= n; i++) {
    const wallR = 2 * i - 1;
    const courtR = 2 * i;
    walls.push({ radius: wallR, kind: 'mura' });
    wallRadiiSet.add(wallR);
    landRadiiSet.add(courtR);
  }
  const moatR = 2 * n + 1;
  walls.push({ radius: moatR, kind: 'fossato' });
  const outerR = moatR;

  const all = allBoardHexes(outerR);

  // 2) Terra = mastio + anelli di cortile interi; mura/fossato = non terra.
  const landSet = new Set<string>();
  for (const c of all) if (landRadiiSet.has(cubeDist(c))) landSet.add(hexKey(c));

  // 3) BRECCE: ~45% per ciascun MURO (mai il fossato) una casella di muro, con
  //    terra sia dentro sia fuori, crolla e diventa terra (unisce i cortili).
  const breaches: string[] = [];
  for (const wall of walls) {
    if (wall.kind !== 'mura') continue;
    const [roll, rB] = nextInt(rng, 100);
    rng = rB;
    if (roll >= 45) continue;
    const candidates = all.filter((c) => {
      if (cubeDist(c) !== wall.radius) return false;
      const nbs = hexNeighbors(c);
      const inner = nbs.some((x) => landSet.has(hexKey(x)) && cubeDist(x) < wall.radius);
      const outer = nbs.some((x) => landSet.has(hexKey(x)) && cubeDist(x) > wall.radius);
      return inner && outer;
    });
    if (candidates.length === 0) continue;
    const [idx, rI] = nextInt(rng, candidates.length);
    rng = rI;
    const k = hexKey(candidates[idx]!);
    landSet.add(k);
    breaches.push(k);
  }

  // Niente diradamento: gli anelli restano pieni per una lettura pulita.
  const plazas: string[] = [];
  const land = all.filter((c) => landSet.has(hexKey(c)));

  // 5) ATTRAVERSAMENTI calcolati sulla terra finale, raggruppati per muro.
  const crossings = candidateCrossings(land, landSet);
  const byWall = new Map<number, Crossing[]>();
  for (const cr of crossings) {
    const list = byWall.get(cr.radius) ?? [];
    list.push(cr);
    byWall.set(cr.radius, list);
  }

  const gates: string[] = [];
  const ladders: string[] = [];
  for (const wall of walls) {
    const list = byWall.get(wall.radius) ?? [];
    if (list.length === 0) continue;
    // 1..3 porte per muro (distanziate).
    const [gCount, rG] = nextInt(rng, 3);
    rng = rG;
    const [picked, rP] = pickSpaced(rng, list, gCount + 1);
    rng = rP;
    const gateEdges = new Set(picked.map((p) => p.edge));
    for (const p of picked) gates.push(p.edge);
    // SCALE (solo mura, non il fossato): 1..2 fra i candidati non-porta.
    if (wall.kind === 'mura') {
      const rest = list.filter((c) => !gateEdges.has(c.edge));
      const [lCount, rL] = nextInt(rng, 2);
      rng = rL;
      const [pickedL, rPL] = pickSpaced(rng, rest, lCount + 1);
      rng = rPL;
      for (const p of pickedL) ladders.push(p.edge);
    }
  }

  // 6) PASSAGGI SEGRETI (solo con ≥3 mura): 0..2 gallerie che collegano un
  //    cortile al cortile due «anelli di terra» più in là (salta un cortile).
  const tunnels: string[] = [];
  if (n >= 3) {
    // Raggi dei cortili (anelli di terra, escluso il mastio) in ordine.
    const landRadii = [...new Set(land.map((c) => cubeDist(c)))]
      .filter((x) => x >= 2)
      .sort((a, b) => a - b);
    const [tCount, rT] = nextInt(rng, 3);
    rng = rT;
    for (let t = 0; t < tCount && landRadii.length >= 3; t++) {
      const [ji, rJ] = nextInt(rng, landRadii.length - 2);
      rng = rJ;
      const rInner = landRadii[ji]!;
      const rOuter = landRadii[ji + 2]!;
      const inner = land.filter((c) => cubeDist(c) === rInner);
      const outer = land.filter((c) => cubeDist(c) === rOuter);
      if (inner.length === 0 || outer.length === 0) continue;
      const [ai, rA] = nextInt(rng, inner.length);
      rng = rA;
      const hexA = inner[ai]!;
      // Casella esterna più «allineata» (minima distanza esagonale) a hexA.
      let hexB = outer[0]!;
      let best = Infinity;
      for (const c of outer) {
        const d = Math.max(
          Math.abs(c.q - hexA.q),
          Math.abs(c.r - hexA.r),
          Math.abs(c.q + c.r - hexA.q - hexA.r)
        );
        if (d < best) {
          best = d;
          hexB = c;
        }
      }
      const id = tunnelId(hexVertexIds(hexA)[0]!, hexVertexIds(hexB)[0]!);
      if (!tunnels.includes(id)) tunnels.push(id);
    }
  }

  const castle: CastleLayout = {
    rings: n,
    walls,
    plazas: plazas.sort(),
    breaches: breaches.sort(),
    gates: gates.sort(),
    ladders: ladders.sort(),
    tunnels: tunnels.sort(),
  };

  return [{ land, radius: outerR, castle }, rng];
}

/** Tutti gli spigoli-attraversamento del castello (porte + scale + gallerie). */
export function castleCrossingEdges(castle: CastleLayout): string[] {
  return [...castle.gates, ...castle.ladders, ...castle.tunnels];
}
