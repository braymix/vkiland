/**
 * Costruttore generico di mappe d'area per «Vikings Around the World».
 *
 * Input: un insieme di AREE (poligoni lon/lat con nome, gruppo e materiale
 * facoltativi) — paesi, regioni, quartieri…; output: una `MapDefinition`
 * (stesso formato di `mondo.json`): territori fusi fino a `target`, forme
 * normalizzate (proiezione con cos(lat), adattate al riquadro del mondo),
 * collegamenti di terra dai bordi condivisi, rotte di mare per collegare le
 * isole, materiali bilanciati, gruppi («continenti») e mazzo di numeri.
 * Tutto deterministico: stesso input = stessa mappa.
 */
import polygonClipping from 'polygon-clipping';

const KINDS = ['legname', 'lana', 'orzo', 'pietra', 'ferro'];
const NUMBER_WEIGHTS = { 2: 2, 3: 3, 4: 3, 5: 4, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 };
const VKEY = 1e5; // arrotondamento dei vertici (≈1 m) per riconoscere i bordi condivisi

const key = (p) => `${Math.round(p[0] * VKEY)},${Math.round(p[1] * VKEY)}`;
const edgeKey = (a, b) => {
  const ka = key(a);
  const kb = key(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};

function ringArea(r) {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function simplifyRing(pts, tol) {
  if (pts.length < 6) return pts;
  const d2 = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = dx * dx + dy * dy || 1e-12;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
    const x = a[0] + t * dx - p[0];
    const y = a[1] + t * dy - p[1];
    return x * x + y * y;
  };
  const rec = (lo, hi, keep) => {
    let m = 0;
    let idx = -1;
    for (let i = lo + 1; i < hi; i++) {
      const v = d2(pts[i], pts[lo], pts[hi]);
      if (v > m) { m = v; idx = i; }
    }
    if (m > tol * tol && idx > 0) { keep[idx] = true; rec(lo, idx, keep); rec(idx, hi, keep); }
  };
  const half = Math.floor(pts.length / 2);
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[half] = keep[pts.length - 1] = true;
  rec(0, half, keep);
  rec(half, pts.length - 1, keep);
  return pts.filter((_, i) => keep[i]);
}

/** Punto interno più «profondo» (griglia grossolana): dove mettere numero e pedina. */
function labelPoint(rings) {
  const big = rings.reduce((a, b) => (ringArea(b) > ringArea(a) ? b : a));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of big) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const inside = (px, py) => {
    let c = false;
    for (let i = 0, j = big.length - 1; i < big.length; j = i++) {
      const [xi, yi] = big[i];
      const [xj, yj] = big[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const distEdge = (px, py) => {
    let best = Infinity;
    for (let i = 0; i < big.length; i++) {
      const [x1, y1] = big[i];
      const [x2, y2] = big[(i + 1) % big.length];
      const dx = x2 - x1, dy = y2 - y1;
      const l = dx * dx + dy * dy || 1e-12;
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l));
      const d = Math.hypot(x1 + t * dx - px, y1 + t * dy - py);
      if (d < best) best = d;
    }
    return best;
  };
  let best = null;
  let bestD = -1;
  const N = 36;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const px = minX + ((maxX - minX) * i) / N;
      const py = minY + ((maxY - minY) * j) / N;
      if (!inside(px, py)) continue;
      const d = distEdge(px, py);
      if (d > bestD) { bestD = d; best = [px, py]; }
    }
  }
  return best ?? [(minX + maxX) / 2, (minY + maxY) / 2];
}

/**
 * @param {object} o
 * @param {string} o.id @param {string} o.name @param {'mondo'|'continente'|'nazione'|'regione'|'citta'} o.scale
 * @param {{name:string, group?:string, material?:string, rings:number[][][]}[]} o.areas  anelli esterni lon/lat
 * @param {number} o.target numero massimo di territori (si fondono i più piccoli)
 * @param {[number,number][]=} o.terraPairs  coppie di indici (di `areas`) già note come confinanti
 * @param {number=} o.deserts  quanti deserti (default ~7%)
 * @param {string=} o.credits
 */
export function buildAreaMap(o) {
  // --- 1) aree di lavoro ------------------------------------------------
  let feats = o.areas.map((a, i) => ({
    idx: i,
    name: a.name,
    group: a.group ?? null,
    material: a.material ?? null,
    rings: a.rings.map((r) => r.map((p) => [p[0], p[1]])),
    members: [i],
  }));
  const areaOf = (f) => f.rings.reduce((s, r) => s + ringArea(r), 0);
  const edgesOf = (f) => {
    const set = new Set();
    for (const r of f.rings) for (let i = 0; i < r.length; i++) set.add(edgeKey(r[i], r[(i + 1) % r.length]));
    return set;
  };
  const sharedCount = (a, b) => {
    let n = 0;
    for (const e of a.edges) if (b.edges.has(e)) n++;
    return n;
  };
  const refresh = () => feats.forEach((f) => { f.edges = edgesOf(f); f.area = areaOf(f); });
  refresh();

  // --- 2) fusione dei più piccoli nel vicino con il bordo più lungo ------
  const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  let forced = new Set((o.terraPairs ?? []).map(([a, b]) => pairKey(a, b)));
  while (feats.length > o.target) {
    const order = [...feats].sort((a, b) => a.area - b.area);
    let merged = false;
    for (const small of order) {
      let best = null;
      let bestN = 0;
      for (const other of feats) {
        if (other === small) continue;
        const n = sharedCount(small, other) + (small.members.some((m) => other.members.some((q) => forced.has(pairKey(m, q)))) ? 1 : 0);
        if (n > bestN) { bestN = n; best = other; }
      }
      if (!best) continue;
      let union;
      try {
        const polys = [...small.rings, ...best.rings].map((r) => [[...r, r[0]]]);
        union = polygonClipping.union(polys[0], ...polys.slice(1)).map((p) => p[0].slice(0, -1));
      } catch {
        union = [...small.rings, ...best.rings];
      }
      const keepName = best.area >= small.area ? best : small;
      best.rings = union;
      best.name = keepName.name;
      best.group = keepName.group ?? best.group ?? small.group;
      best.material = keepName.material ?? best.material ?? small.material;
      best.members = [...best.members, ...small.members];
      feats = feats.filter((f) => f !== small);
      refresh();
      merged = true;
      break;
    }
    if (!merged) break;
  }

  // --- 3) proiezione normalizzata nel riquadro del mondo ------------------
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of feats) for (const r of f.rings) for (const [x, y] of r) {
    minLon = Math.min(minLon, x); maxLon = Math.max(maxLon, x); minLat = Math.min(minLat, y); maxLat = Math.max(maxLat, y);
  }
  const lat0 = (minLat + maxLat) / 2;
  const cosLat = Math.cos((lat0 * Math.PI) / 180);
  const spanX = (maxLon - minLon) * cosLat;
  const spanY = maxLat - minLat;
  const s = Math.min(330 / spanX, 135 / spanY);
  const proj = ([lon, lat]) => [(lon - (minLon + maxLon) / 2) * cosLat * s, (lat - lat0) * s + 8];

  // --- 4) territori ------------------------------------------------------
  const edgeCount = new Map();
  for (const f of feats) for (const e of f.edges) edgeCount.set(e, (edgeCount.get(e) ?? 0) + 1);
  const territories = feats.map((f, i) => {
    const projected = f.rings.map((r) => r.map(proj));
    const big = Math.max(...projected.map(ringArea));
    const polygons = projected
      .filter((r) => ringArea(r) >= Math.min(big, 0.6))
      .map((r) => simplifyRing(r, 0.12).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]))
      .filter((r) => r.length >= 3);
    let outer = 0;
    for (const e of f.edges) if (edgeCount.get(e) === 1) outer++;
    const [cx, cy] = labelPoint(projected);
    return {
      id: `t${String(i + 1).padStart(2, '0')}`,
      name: f.name,
      continent: f.group ?? '',
      kind: f.material ?? null,
      coastal: f.edges.size > 0 && outer / f.edges.size >= 0.15,
      center: [Math.round(cx * 100) / 100, Math.round(cy * 100) / 100],
      polygons,
    };
  });

  // --- 5) collegamenti di terra ------------------------------------------
  const links = [];
  const have = new Set();
  const addLink = (a, b, kind) => {
    const k = pairKey(a, b);
    if (have.has(k) || a === b) return;
    have.add(k);
    links.push({ a: territories[a].id, b: territories[b].id, kind });
  };
  for (let a = 0; a < feats.length; a++) {
    for (let b = a + 1; b < feats.length; b++) {
      const touch =
        sharedCount(feats[a], feats[b]) > 0 ||
        feats[a].members.some((m) => feats[b].members.some((q) => forced.has(pairKey(m, q))));
      if (touch) addLink(a, b, 'terra');
    }
  }

  // --- 6) rotte di mare: collega ogni isola (componente) alla rete ---------
  const comp = feats.map((_, i) => i);
  const find = (x) => (comp[x] === x ? x : (comp[x] = find(comp[x])));
  for (const l of links) comp[find(territories.findIndex((t) => t.id === l.a))] = find(territories.findIndex((t) => t.id === l.b));
  const dist = (a, b) => Math.hypot(territories[a].center[0] - territories[b].center[0], territories[a].center[1] - territories[b].center[1]);
  for (;;) {
    const roots = [...new Set(feats.map((_, i) => find(i)))];
    if (roots.length <= 1) break;
    // collega la componente più piccola alla più vicina
    const size = (r) => feats.filter((_, i) => find(i) === r).length;
    roots.sort((a, b) => size(a) - size(b));
    const r = roots[0];
    let best = null;
    let bestD = Infinity;
    for (let a = 0; a < feats.length; a++) {
      if (find(a) !== r) continue;
      for (let b = 0; b < feats.length; b++) {
        if (find(b) === r) continue;
        const d = dist(a, b);
        if (d < bestD) { bestD = d; best = [a, b]; }
      }
    }
    const members = feats.map((_, i) => i).filter((i) => find(i) === r);
    addLink(best[0], best[1], 'mare');
    territories[best[0]].coastal = true;
    territories[best[1]].coastal = true;
    // seconda rotta: un'isola con un solo approdo sarebbe troppo fragile
    let second = null;
    let secondD = Infinity;
    for (const a of members) {
      for (let b = 0; b < feats.length; b++) {
        if (members.includes(b) || have.has(pairKey(a, b))) continue;
        const d = dist(a, b);
        if (d < secondD) { secondD = d; second = [a, b]; }
      }
    }
    if (second && secondD < bestD * 2.2) {
      addLink(second[0], second[1], 'mare');
      territories[second[0]].coastal = true;
      territories[second[1]].coastal = true;
    }
    comp[find(best[0])] = find(best[1]);
  }

  // --- 7) materiali -------------------------------------------------------
  const n = territories.length;
  const deserts = o.deserts ?? (n >= 20 ? Math.max(1, Math.round(n * 0.07)) : 0);
  const unset = territories.map((t, i) => ({ t, i, h: hash(`${o.id}:${t.name}`) })).filter(({ t }) => !t.kind).sort((a, b) => a.h - b.h);
  const counts = Object.fromEntries(KINDS.map((k) => [k, territories.filter((t) => t.kind === k).length]));
  let desertsLeft = Math.max(0, deserts - territories.filter((t) => t.kind === 'deserto').length);
  for (const { t } of unset) {
    if (desertsLeft > 0) { t.kind = 'deserto'; desertsLeft--; continue; }
    const k = KINDS.reduce((a, b) => (counts[b] < counts[a] ? b : a));
    t.kind = k;
    counts[k]++;
  }
  for (const k of KINDS) {
    if (!territories.some((t) => t.kind === k)) {
      const donor = territories.find((t) => t.kind !== 'deserto' && territories.filter((x) => x.kind === t.kind).length > 2);
      if (donor) donor.kind = k;
    }
  }

  // --- 8) gruppi («continenti») -------------------------------------------
  if (territories.some((t) => !t.continent)) {
    const k = Math.max(3, Math.min(5, Math.round(n / 6)));
    const pts = territories.map((t) => t.center);
    // k-medie con partenza deterministica (farthest-point)
    const centers = [pts[0]];
    while (centers.length < k) {
      let bi = 0, bd = -1;
      pts.forEach((p, i) => {
        const d = Math.min(...centers.map((c) => Math.hypot(p[0] - c[0], p[1] - c[1])));
        if (d > bd) { bd = d; bi = i; }
      });
      centers.push(pts[bi]);
    }
    let assign = pts.map(() => 0);
    for (let it = 0; it < 12; it++) {
      assign = pts.map((p) => centers.reduce((bi, c, ci) => (Math.hypot(p[0] - c[0], p[1] - c[1]) < Math.hypot(p[0] - centers[bi][0], p[1] - centers[bi][1]) ? ci : bi), 0));
      centers.forEach((_, ci) => {
        const m = pts.filter((_, i) => assign[i] === ci);
        if (m.length) centers[ci] = [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length];
      });
    }
    const mx = pts.reduce((s, p) => s + p[0], 0) / n;
    const my = pts.reduce((s, p) => s + p[1], 0) / n;
    const radius = Math.max(...pts.map((p) => Math.hypot(p[0] - mx, p[1] - my)));
    const dirs = ['Est', 'Sud-Est', 'Sud', 'Sud-Ovest', 'Ovest', 'Nord-Ovest', 'Nord', 'Nord-Est'];
    const used = new Map();
    const names = centers.map((c) => {
      const dx = c[0] - mx;
      const dy = c[1] - my; // y cresce verso nord nelle coordinate proiettate
      let nm = 'Centro';
      if (Math.hypot(dx, dy) > 0.28 * radius) nm = dirs[Math.round((((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360) / 45) % 8];
      const c2 = (used.get(nm) ?? 0) + 1;
      used.set(nm, c2);
      return c2 === 1 ? nm : `${nm} ${c2}`;
    });
    territories.forEach((t, i) => { if (!t.continent) t.continent = names[assign[i]]; });
  }

  // --- 9) numeri e giocatori ----------------------------------------------
  const productive = territories.filter((t) => t.kind !== 'deserto').length;
  const total = Object.values(NUMBER_WEIGHTS).reduce((a, b) => a + b, 0);
  const exact = Object.entries(NUMBER_WEIGHTS).map(([num, w]) => ({ num: Number(num), q: (w * productive) / total }));
  const pool = exact.map((e) => ({ ...e, c: Math.floor(e.q) }));
  let left = productive - pool.reduce((s, e) => s + e.c, 0);
  [...pool].sort((a, b) => b.q - b.c - (a.q - a.c)).forEach((e) => { if (left > 0) { e.c++; left--; } });
  const numberPool = pool.flatMap((e) => Array(e.c).fill(e.num));

  return {
    id: o.id,
    name: o.name,
    scale: o.scale,
    projection: 'equirettangolare',
    territories,
    links,
    numberPool,
    minPlayers: 2,
    maxPlayers: Math.max(2, Math.min(6, Math.floor(productive / 4))),
    ...(o.credits ? { credits: o.credits } : {}),
  };
}
