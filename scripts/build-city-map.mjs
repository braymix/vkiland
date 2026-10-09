/**
 * «Gioca nella tua città»: costruisce la mappa di una città per
 * Vikings Around the World partendo dal suo confine OpenStreetMap.
 *
 * Uso:
 *   node scripts/build-city-map.mjs "<città>" <id> [distretti=24] [--nome "Titolo"]
 *   es.  node scripts/build-city-map.mjs "Milano, Italia" milano 24
 *
 * Come funziona (tutto offline nel gioco: il JSON generato si committa):
 *  1. Nominatim restituisce il poligono amministrativo della città;
 *  2. si campiona l'interno e si raggruppa con k-medie (deterministico) in N
 *     «distretti»; ogni distretto è la cella di Voronoi del suo centro,
 *     ritagliata sul confine della città;
 *  3. i nomi arrivano da un reverse-geocoding Nominatim (quartiere/zona);
 *  4. buildAreaMap fonde, proietta e bilancia come per le altre mappe.
 *
 * Dati © contributori di OpenStreetMap (ODbL). Rispetta la policy di
 * Nominatim: 1 richiesta/secondo e User-Agent identificativo.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import polygonClipping from 'polygon-clipping';
import { buildAreaMap } from './lib/areaMap.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const nameIdx = args.indexOf('--nome');
const title = nameIdx >= 0 ? args.splice(nameIdx, 2)[1] : null;
const [query, id, countArg] = args;
if (!query || !id) throw new Error('Uso: build-city-map.mjs "<città>" <id> [distretti] [--nome "Titolo"]');
const N = Math.max(15, Math.min(40, Number(countArg ?? 24)));
const UA = 'vikiland-map-builder/1.0 (https://github.com/braymix/vkiland)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function nominatim(path) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`https://nominatim.openstreetmap.org/${path}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'it' } });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error(`Nominatim ${res.status}`);
    await sleep(4000 * (attempt + 1)); // troppo veloci: si rallenta
  }
  throw new Error('Nominatim non risponde (limite di richieste)');
}

const hits = await nominatim(
  `search?q=${encodeURIComponent(query)}&format=json&limit=1&polygon_geojson=1&polygon_threshold=0.0004`
);
if (!hits[0]?.geojson) throw new Error('Confine non trovato per: ' + query);
const geo = hits[0].geojson;
const rings = geo.type === 'Polygon' ? [geo.coordinates[0]] : geo.type === 'MultiPolygon' ? geo.coordinates.map((p) => p[0]) : null;
if (!rings) throw new Error('La ricerca non ha restituito un confine (' + geo.type + ')');
const area = (r) => Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0)) / 2;
const city = rings.reduce((a, b) => (area(b) > area(a) ? b : a)).slice(0, -1);
const cityName = (hits[0].display_name ?? query).split(',')[0];
console.log('Confine:', hits[0].display_name, '-', city.length, 'vertici');

// coordinate piane locali
const lat0 = city.reduce((s, p) => s + p[1], 0) / city.length;
const lon0 = city.reduce((s, p) => s + p[0], 0) / city.length;
const cosL = Math.cos((lat0 * Math.PI) / 180);
const toPlane = ([lon, lat]) => [(lon - lon0) * cosL, lat - lat0];
const toGeo = ([x, y]) => [x / cosL + lon0, y + lat0];
const poly = city.map(toPlane);

const inside = (p, ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

// campionamento + k-medie deterministico
const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
const step = Math.sqrt(((maxX - minX) * (maxY - minY)) / 5000);
const samples = [];
for (let x = minX; x <= maxX; x += step) for (let y = minY; y <= maxY; y += step) if (inside([x, y], poly)) samples.push([x, y]);
const sites = [samples.reduce((best, p) => (Math.hypot(p[0], p[1]) < Math.hypot(best[0], best[1]) ? p : best))];
while (sites.length < N) {
  let bi = 0, bd = -1;
  samples.forEach((p, i) => {
    const d = Math.min(...sites.map((c) => Math.hypot(p[0] - c[0], p[1] - c[1])));
    if (d > bd) { bd = d; bi = i; }
  });
  sites.push(samples[bi]);
}
for (let it = 0; it < 15; it++) {
  const sum = sites.map(() => [0, 0, 0]);
  for (const p of samples) {
    let bi = 0, bd = Infinity;
    sites.forEach((c, i) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2; if (d < bd) { bd = d; bi = i; } });
    sum[bi][0] += p[0]; sum[bi][1] += p[1]; sum[bi][2]++;
  }
  sum.forEach((s, i) => { if (s[2]) sites[i] = [s[0] / s[2], s[1] / s[2]]; });
}

// celle di Voronoi ritagliate sul confine
const BIG = 5;
const cells = sites.map((si, i) => {
  let cell = [[[...poly, poly[0]]]];
  for (let j = 0; j < sites.length; j++) {
    if (j === i) continue;
    const sj = sites[j];
    const mx = (si[0] + sj[0]) / 2, my = (si[1] + sj[1]) / 2;
    const dx = sj[0] - si[0], dy = sj[1] - si[1];
    const l = Math.hypot(dx, dy);
    const nx = dx / l, ny = dy / l; // verso sj
    const tx = -ny, ty = nx;
    const half = [
      [mx + tx * BIG, my + ty * BIG],
      [mx + tx * BIG - nx * BIG, my + ty * BIG - ny * BIG],
      [mx - tx * BIG - nx * BIG, my - ty * BIG - ny * BIG],
      [mx - tx * BIG, my - ty * BIG],
      [mx + tx * BIG, my + ty * BIG],
    ];
    cell = polygonClipping.intersection(cell, [half]);
    if (cell.length === 0) break;
  }
  return cell;
});
const live = cells.map((c, i) => ({ c, i })).filter(({ c }) => c.length > 0);
// la cella può essere un multipoligono: si tiene l'anello esterno più grande
const outer = (c) => c.map((p) => p[0].slice(0, -1)).reduce((a, b) => (area(b) > area(a) ? b : a));
const planeRings = live.map(({ c }) => outer(c));

// adiacenza esatta: due celle confinano se condividono ≥2 vertici sulla bisettrice
const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-7;
const terraPairs = [];
for (let a = 0; a < live.length; a++) {
  for (let b = a + 1; b < live.length; b++) {
    const si = sites[live[a].i], sj = sites[live[b].i];
    const mx = (si[0] + sj[0]) / 2, my = (si[1] + sj[1]) / 2;
    const l = Math.hypot(sj[0] - si[0], sj[1] - si[1]);
    const nx = (sj[0] - si[0]) / l, ny = (sj[1] - si[1]) / l;
    const onLine = planeRings[a].filter((v) => Math.abs((v[0] - mx) * nx + (v[1] - my) * ny) < 1e-8);
    const distinct = onLine.filter((v, i) => onLine.findIndex((w) => near(v, w)) === i);
    if (distinct.length >= 2) terraPairs.push([a, b]);
  }
}

// nomi dai quartieri OSM (reverse geocoding)
const used = new Map();
const areas = [];
for (let k = 0; k < live.length; k++) {
  const [lon, lat] = toGeo(sites[live[k].i]);
  let nm = `Distretto ${k + 1}`;
  try {
    const r = await nominatim(`reverse?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&zoom=16&format=json&addressdetails=1`);
    const a = r.address ?? {};
    nm = a.neighbourhood ?? a.quarter ?? a.suburb ?? a.city_district ?? a.borough ?? a.village ?? a.hamlet ?? nm;
  } catch (e) {
    console.warn('reverse fallito:', e.message);
  }
  nm = nm.length > 28 ? nm.slice(0, 28) : nm;
  const c = (used.get(nm) ?? 0) + 1;
  used.set(nm, c);
  areas.push({ name: c === 1 ? nm : `${nm} ${c}`, rings: [planeRings[k].map(toGeo)] });
  await sleep(2200);
}

const map = buildAreaMap({
  id,
  name: title ?? `${cityName} (${areas.length} distretti)`,
  scale: 'citta',
  target: areas.length,
  areas,
  terraPairs,
  credits: 'Confine della città e nomi dei quartieri: © contributori di OpenStreetMap (ODbL).',
});
const outDir = resolve(root, 'packages/engine-world/src/maps');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, `${id}.json`), JSON.stringify(map));
console.log(id, map.territories.length, 'territori,', map.links.length, 'collegamenti →', map.territories.map((t) => t.name).join(', '));
