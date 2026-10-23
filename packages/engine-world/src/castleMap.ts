/**
 * Mappa «CASTELLO» per Vikings Around the World: una `MapDefinition` generata
 * proceduralmente (deterministica dato il seed) a forma di castello esagonale ad
 * ANELLI concentrici.
 *
 * Modello del Mondo = territori (poligoni) + collegamenti (grafo). Qui i
 * territori sono un esagono PIENO di raggio N (N = numero di anelli/mura, 2..4):
 * ogni «anello» è il guscio di territori a una data distanza dal mastio.
 *
 * Le MURA sono i confini fra anelli consecutivi DOVE MANCA un collegamento: il
 * Jarl non può passare. I varchi sono collegamenti espliciti:
 *   - PORTA   → collegamento `terra` fra due anelli (passaggio normale; sul
 *     bordo esterno è disegnata come ponte levatoio sul fossato);
 *   - SCALA   → collegamento `muro`: si «scavalca» a caro prezzo di movimento
 *     (vedi `MOVE_COST_MURO`), senza bisogno di edifici;
 *   - BRECCIA → una porta in più (muro crollato): collegamento `terra`;
 *   - PASSAGGIO SEGRETO → collegamento `terra` fra anelli NON adiacenti.
 *
 * Tutto il resto dei confini fra anelli resta muro pieno (nessun collegamento).
 * I metadati grafici (segmenti di muro, contorno del fossato, quali link sono
 * porte/scale/passaggi) sono pre-calcolati in `castle` per il renderer.
 */
import { isProductive, linkId } from './map';
import { nextInt, seedRng, shuffle, type RngState } from './rng';
import type { CastleMeta, LinkDef, MapDefinition, TerritoryDef, TerritoryKind } from './types';

/** Direzioni assiali dei 6 vicini, in ordine ciclico. */
const DIRS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

const U = 4; // dimensione esagono in «gradi» lon/lat (il renderer riadatta)

function cube(q: number, r: number): number {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
}

/** Centro del territorio (lon/lat sintetici) per l'esagono assiale (q,r), pointy-top. */
function centerOf(q: number, r: number): [number, number] {
  const x = U * Math.sqrt(3) * (q + r / 2);
  const y = U * 1.5 * r;
  return [round(x), round(-y)];
}

/** I 6 vertici dell'esagono (pointy-top) attorno a un centro. */
function hexPolygon(cx: number, cy: number, size = U): [number, number][] {
  const pts: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI / 180) * (60 * k - 90); // vertice in alto
    pts.push([round(cx + size * Math.cos(ang)), round(cy + size * Math.sin(ang))]);
  }
  return pts;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const KEY = (q: number, r: number): string => `${q},${r}`;
const idOf = (q: number, r: number): string => `c_${q}_${r}`;

/** Pesi delle 5 risorse produttive (come la Classica: 4/4/4/3/3). */
const KINDS: [TerritoryKind, number][] = [
  ['legname', 4],
  ['orzo', 4],
  ['lana', 4],
  ['pietra', 3],
  ['ferro', 3],
];

/** Sacchetto terreni: `deserts` deserti + le produttive distribuite coi pesi. */
function terrainBag(total: number, deserts: number): TerritoryKind[] {
  const productive = Math.max(0, total - deserts);
  const sumW = KINDS.reduce((a, [, w]) => a + w, 0);
  const counts = KINDS.map(([, w]) => Math.floor((productive * w) / sumW));
  let rem = productive - counts.reduce((a, b) => a + b, 0);
  for (let i = 0; rem > 0; i = (i + 1) % KINDS.length, rem--) counts[i]!++;
  const bag: TerritoryKind[] = [];
  KINDS.forEach(([k], i) => {
    for (let j = 0; j < counts[i]!; j++) bag.push(k);
  });
  for (let j = 0; j < deserts; j++) bag.push('deserto');
  return bag;
}

/** Mazzo di numeri «a campana» (2..12, mai 7) della taglia richiesta. */
const NUM_VALUES = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
const NUM_WEIGHTS = [1, 2, 3, 4, 5, 5, 4, 3, 2, 1];
function numberBag(count: number): number[] {
  const sumW = NUM_WEIGHTS.reduce((a, b) => a + b, 0);
  const counts = NUM_WEIGHTS.map((w) => Math.floor((count * w) / sumW));
  let rem = count - counts.reduce((a, b) => a + b, 0);
  for (let i = 0; rem > 0; i = (i + 1) % NUM_VALUES.length, rem--) counts[i]!++;
  const bag: number[] = [];
  NUM_VALUES.forEach((v, i) => {
    for (let j = 0; j < counts[i]!; j++) bag.push(v);
  });
  return bag;
}

interface Pair {
  a: string;
  b: string;
  /** anello minore della coppia (il confine è fra `lo` e `lo+1`). */
  lo: number;
  /** per i varchi sul bordo esterno (ponte levatoio). */
  outer: boolean;
}

/** Genera la `MapDefinition` del castello con `rings` mura/anelli (2..4). */
export function generateCastleMap(seed: string, rings: number): MapDefinition {
  let rng: RngState = seedRng(`${seed}|castle`);
  const n = Math.max(2, Math.min(4, Math.round(rings)));

  // 1) Celle = esagono pieno di raggio n (anelli 0..n). Ordine deterministico.
  const cells: { q: number; r: number }[] = [];
  for (let r = -n; r <= n; r++) {
    for (let q = -n; q <= n; q++) {
      if (cube(q, r) <= n) cells.push({ q, r });
    }
  }
  const cellSet = new Set(cells.map((c) => KEY(c.q, c.r)));
  const total = cells.length; // 1 + 3n(n+1): 19 / 37 / 61

  // 2) Terreni e numeri dimensionati sulla terra effettiva.
  const deserts = Math.max(1, Math.round(total / 18));
  const [bag, rngA] = shuffle(rng, terrainBag(total, deserts));
  rng = rngA;
  const kindByCell = new Map<string, TerritoryKind>();
  cells.forEach((c, i) => kindByCell.set(KEY(c.q, c.r), bag[i]!));

  const perRing = new Map<number, number>();
  const territories: TerritoryDef[] = cells.map((c) => {
    const [lon, lat] = centerOf(c.q, c.r);
    const ring = cube(c.q, c.r);
    const idxInRing = (perRing.get(ring) ?? 0) + 1;
    perRing.set(ring, idxInRing);
    // Mastio al centro, Borgo fuori dal fossato, cortili in mezzo.
    const name = ring === 0 ? 'Mastio' : ring === n ? `Borgo ${idxInRing}` : `Cortile ${ring}.${idxInRing}`;
    const continent = ring === 0 ? 'Mastio' : ring === n ? 'Borgo' : `Cortile ${ring}`;
    return {
      id: idOf(c.q, c.r),
      name,
      continent,
      kind: kindByCell.get(KEY(c.q, c.r))!,
      coastal: ring === n,
      center: [lon, lat],
      polygons: [hexPolygon(lon, lat)],
    };
  });

  // 3) Collegamenti.
  const links: LinkDef[] = [];
  const addLink = (a: string, b: string, kind: LinkDef['kind']): void => {
    links.push({ a, b, kind });
  };

  // 3a) Dentro lo stesso anello: sempre `terra` (si gira per il cortile).
  //     Fra anelli adiacenti: candidati-varco, scelti poi come porta/scala.
  const sameRing: [string, string][] = [];
  const crossByWall = new Map<number, Pair[]>(); // chiave = anello minore
  const seen = new Set<string>();
  for (const c of cells) {
    const ring = cube(c.q, c.r);
    for (const [dq, dr] of DIRS) {
      const nq = c.q + dq;
      const nr = c.r + dr;
      if (!cellSet.has(KEY(nq, nr))) continue;
      const a = idOf(c.q, c.r);
      const b = idOf(nq, nr);
      const key = [a, b].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const nring = cube(nq, nr);
      if (nring === ring) {
        sameRing.push([a, b]);
      } else {
        const lo = Math.min(ring, nring);
        const list = crossByWall.get(lo) ?? [];
        list.push({ a, b, lo, outer: Math.max(ring, nring) === n });
        crossByWall.set(lo, list);
      }
    }
  }
  for (const [a, b] of sameRing) addLink(a, b, 'terra');

  // 3b) Per ogni muro (confine fra anello lo e lo+1): 1..2 PORTE (terra) e 0..1
  //     SCALE (muro). Distanziate. Garantita almeno una porta (connettività).
  const gates: string[] = [];
  const scale: string[] = [];
  const drawbridges: string[] = [];
  const wallSegs: CastleMeta['walls'] = [];
  const moatSegs: CastleMeta['moat'] = [];
  const territoryById = new Map(territories.map((t) => [t.id, t]));
  const centerById = (id: string): [number, number] => territoryById.get(id)!.center;

  for (let lo = 0; lo < n; lo++) {
    const cands = crossByWall.get(lo) ?? [];
    if (cands.length === 0) continue;
    const [order, r1] = shuffle(rng, cands);
    rng = r1;
    const usedEnds = new Set<string>();
    const opened = new Set<string>(); // chiavi a|b aperte (porta o scala)

    const pick = (count: number, kind: 'gate' | 'scala'): void => {
      let taken = 0;
      for (const p of order) {
        if (taken >= count) break;
        const k = [p.a, p.b].sort().join('|');
        if (opened.has(k)) continue;
        // distanzia: niente due varchi che condividono un territorio
        if (usedEnds.has(p.a) || usedEnds.has(p.b)) continue;
        opened.add(k);
        usedEnds.add(p.a);
        usedEnds.add(p.b);
        if (kind === 'gate') {
          addLink(p.a, p.b, 'terra');
          gates.push(linkId(p.a, p.b));
        } else {
          addLink(p.a, p.b, 'muro');
          scale.push(linkId(p.a, p.b));
        }
        taken++;
      }
    };

    // L'ultimo confine (cortile esterno ↔ borgo) è il FOSSATO: i suoi varchi sono
    // ponti levatoi e ce ne sono di più, così l'ingresso non è un collo di bottiglia.
    const isMoat = lo === n - 1;
    const [gExtra, rg] = nextInt(rng, 2);
    rng = rg;
    pick(gExtra + 1 + (isMoat ? 1 : 0), 'gate');
    if (lo >= 1) {
      const [sExtra, rs] = nextInt(rng, 2);
      rng = rs;
      pick(sExtra, 'scala');
    }
    // Sicurezza: se nessun varco aperto (candidati tutti scartati), apri il primo.
    if (opened.size === 0 && order[0]) {
      addLink(order[0].a, order[0].b, 'terra');
      gates.push(linkId(order[0].a, order[0].b));
      opened.add([order[0].a, order[0].b].sort().join('|'));
    }

    // 3c) BRECCIA: ~40% una porta in più (muro crollato).
    const [br, rb] = nextInt(rng, 100);
    rng = rb;
    if (br < 40) {
      for (const p of order) {
        const k = [p.a, p.b].sort().join('|');
        if (opened.has(k)) continue;
        addLink(p.a, p.b, 'terra');
        gates.push(linkId(p.a, p.b));
        opened.add(k);
        break;
      }
    }

    // Ponti levatoi: tutte le porte di questo confine, se è il fossato.
    if (isMoat) {
      for (const g of gates) {
        if (cands.some((c) => linkId(c.a, c.b) === g) && !drawbridges.includes(g)) drawbridges.push(g);
      }
    }

    // 3d) Segmenti di MURO (o di FOSSATO) dove NON c'è varco → grafica.
    for (const p of cands) {
      const k = [p.a, p.b].sort().join('|');
      if (opened.has(k)) continue;
      const seg = edgeBetween(centerById(p.a), centerById(p.b));
      if (isMoat) moatSegs.push(seg);
      else wallSegs.push(seg);
    }
  }

  // 3e) PASSAGGI SEGRETI (solo con ≥3 anelli): 0..2 `terra` fra anelli lontani.
  const tunnels: string[] = [];
  if (n >= 3) {
    const [tc, rt] = nextInt(rng, 3);
    rng = rt;
    for (let t = 0; t < tc; t++) {
      // collega un territorio dell'anello 1 a uno dell'anello 3 «allineato».
      const inner = cells.filter((c) => cube(c.q, c.r) === 1);
      const outer = cells.filter((c) => cube(c.q, c.r) === 3);
      if (inner.length === 0 || outer.length === 0) break;
      const [ai, ra] = nextInt(rng, inner.length);
      rng = ra;
      const A = inner[ai]!;
      // il più vicino in direzione (minima distanza esagonale)
      let B = outer[0]!;
      let best = Infinity;
      for (const c of outer) {
        const d = cube(c.q - A.q, c.r - A.r);
        if (d < best) {
          best = d;
          B = c;
        }
      }
      const a = idOf(A.q, A.r);
      const b = idOf(B.q, B.r);
      const id = linkId(a, b);
      if (tunnels.includes(id) || gates.includes(id) || scale.includes(id)) continue;
      addLink(a, b, 'terra');
      tunnels.push(id);
    }
  }

  const ringOf: Record<string, number> = {};
  for (const c of cells) ringOf[idOf(c.q, c.r)] = cube(c.q, c.r);

  const castle: CastleMeta = { rings: n, ringOf, walls: wallSegs, moat: moatSegs, gates, drawbridges, scale, tunnels };

  const productive = total - deserts;
  const map: MapDefinition = {
    id: 'castello',
    name: `Castello · ${n} anelli`,
    scale: 'regione',
    projection: 'equirettangolare',
    territories,
    links,
    numberPool: numberBag(productive),
    minPlayers: 2,
    maxPlayers: 6,
    castle,
  };
  return map;
}

/**
 * Il LATO condiviso da due esagoni adiacenti: perpendicolare al segmento fra i
 * centri, al punto medio, lungo esattamente un lato (= U, il raggio dell'esagono).
 */
function edgeBetween(
  a: [number, number],
  b: [number, number]
): [[number, number], [number, number]] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * (U / 2);
  const py = (dx / len) * (U / 2);
  return [
    [round(mx + px), round(my + py)],
    [round(mx - px), round(my - py)],
  ];
}

/** «Bellezza» di un numero: i puntini del dado (6/8 → 5 … 2/12 → 1). */
function pips(num: number): number {
  return 6 - Math.abs(7 - num);
}

/**
 * Assegna i numeri ai territori produttivi del castello PESANDO PER ANELLO: più si
 * va verso il Mastio più i numeri sono belli (6/8), verso il Borgo più brutti
 * (2/12). Resta casuale: ogni territorio riceve un punteggio «anello + rumore»,
 * i territori si ordinano per punteggio e ricevono i numeri dal migliore al
 * peggiore (con spareggi casuali). Gli anelli vicini si sovrappongono un po', ma
 * in media il centro è nettamente più ricco del bordo.
 *
 * Il vincolo «6 e 8 non adiacenti» NON si applica qui: i 6/8 si concentrano di
 * proposito vicino al centro, quindi sarebbe quasi sempre impossibile da rispettare.
 */
export function assignCastleNumbers(def: MapDefinition, rng: RngState): [Record<string, number>, RngState] {
  const castle = def.castle!;
  const productive = def.territories.filter(isProductive);
  const NOISE = 0.35; // ampiezza del caso rispetto alla distanza fra anelli (1/N)
  let s = rng;
  const [pool, s1] = shuffle(s, def.numberPool);
  s = s1;
  const sortedPool = [...pool].sort((a, b) => pips(b) - pips(a)); // stabile: lo spareggio è lo shuffle
  const scored: { id: string; score: number }[] = [];
  for (const t of productive) {
    const [roll, s2] = nextInt(s, 1000);
    s = s2;
    const inner = (castle.rings - (castle.ringOf[t.id] ?? castle.rings)) / castle.rings; // 1 = Mastio
    scored.push({ id: t.id, score: inner + (roll / 1000 - 0.5) * 2 * NOISE });
  }
  scored.sort((a, b) => b.score - a.score);
  const num: Record<string, number> = {};
  scored.forEach((t, i) => {
    num[t.id] = sortedPool[i]!;
  });
  return [num, s];
}
