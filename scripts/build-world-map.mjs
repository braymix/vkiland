/**
 * Costruisce la mappa «Il Mondo» di Vikings Around the World.
 *
 * Uso: node scripts/build-world-map.mjs <ne_110m_admin_0_countries.geojson>
 * (Natural Earth, dominio pubblico: https://www.naturalearthdata.com).
 * Unisce i paesi nei 32 territori descritti in scripts/world-map-spec.json,
 * semplifica i poligoni e scrive packages/engine-world/src/maps/mondo.json,
 * che VA COMMITTATO: il gioco non scarica mai dati a runtime.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import polygonClipping from 'polygon-clipping';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const geoPath = process.argv[2];
if (!geoPath) throw new Error('Passa il percorso del geojson Natural Earth 110m.');
const spec = JSON.parse(readFileSync(resolve(root, 'scripts/world-map-spec.json'), 'utf8'));
const geo = JSON.parse(readFileSync(geoPath, 'utf8'));

const byCountry = {};
for (const [tid, list] of Object.entries(spec.countries)) for (const c of list) byCountry[c] = tid;

/** Taglia un anello con il semipiano lon<=cut (side='w') oppure lon>=cut ('e'). */
function clip(ring, cut, side) {
  const inside = (p) => (side === 'w' ? p[0] <= cut : p[0] >= cut);
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const ia = inside(a);
    const ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const t = (cut - a[0]) / (b[0] - a[0]);
      out.push([cut, a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

function area(r) {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/** Douglas-Peucker su anello chiuso (aperto internamente). */
function simplify(pts, tol) {
  if (pts.length < 5) return pts;
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
  keep[0] = true; keep[half] = true;
  rec(0, half, keep);
  rec(half, pts.length - 1, keep);
  keep[pts.length - 1] = true;
  return pts.filter((_, i) => keep[i]);
}

const acc = {};
const add = (tid, ring) => ((acc[tid] ??= []).push(ring));

for (const f of geo.features) {
  const p = f.properties;
  const iso = p.ADM0_A3 || p.ISO_A3;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const sp = spec.split[iso];
  for (const poly of polys) {
    let ring = poly[0].slice(0, -1);
    if (sp) {
      if (iso === 'RUS' && ring.every((q) => q[0] < -100)) ring = ring.map((q) => [q[0] + 360, q[1]]);
      const wRing = clip(ring, sp.cutLon, 'w');
      const eRing = clip(ring, sp.cutLon, 'e');
      // Alaska/Hawaii (tutto a ovest di -125): restano a «ovest» senza taglio.
      if (iso === 'USA' && ring.every((q) => q[0] < -125)) { add(sp.west, ring); continue; }
      if (wRing.length >= 3) add(sp.west, wRing);
      if (eRing.length >= 3) add(sp.east, eRing);
      continue;
    }
    const tid = byCountry[iso];
    if (tid) add(tid, ring);
  }
}

const round = (n) => Math.round(n * 10) / 10;
const territories = spec.territories.map((t) => {
  const rings = (acc[t.id] ?? []).filter((r) => r.length >= 3);
  if (rings.length === 0) throw new Error('Nessuna geometria per ' + t.id);
  // Unisce i paesi del territorio in un'unica forma (sparisce il confine interno).
  const polys = rings.map((r) => [[...r, r[0]]]);
  let merged;
  try {
    merged = polygonClipping.union(polys[0], ...polys.slice(1));
  } catch {
    merged = polys; // fallback: nessuna unione
  }
  const outer = merged.map((poly) => poly[0].slice(0, -1)); // solo anelli esterni
  const biggest = Math.max(...outer.map(area));
  const polygons = outer
    .filter((r) => area(r) >= Math.min(biggest, 4))
    .map((r) => simplify(r, 0.45).map(([x, y]) => [round(x), round(y)]))
    .filter((r) => r.length >= 3);
  return { ...t, polygons };
});

const out = {
  id: spec.id, name: spec.name, scale: spec.scale, projection: spec.projection,
  territories, links: spec.links, numberPool: spec.numberPool,
  minPlayers: spec.minPlayers, maxPlayers: spec.maxPlayers,
};
const dest = resolve(root, 'packages/engine-world/src/maps/mondo.json');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(out));
console.log('Scritto', dest, territories.length, 'territori,', (JSON.stringify(out).length / 1024).toFixed(0), 'KB');
