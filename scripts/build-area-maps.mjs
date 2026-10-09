/**
 * Costruisce le mappe «Italia» (20 regioni) ed «Europa» (paesi) di
 * Vikings Around the World e le scrive in packages/engine-world/src/maps/.
 *
 * Uso:
 *   node scripts/build-area-maps.mjs <it_regions.geojson> <ne_110m_admin_0_countries.geojson>
 *
 * Fonti: confini regionali ISTAT (geojson-italy di openpolis, CC BY 3.0 IT) e
 * Natural Earth (dominio pubblico). I JSON generati vanno committati.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAreaMap } from './lib/areaMap.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [itPath, worldPath] = process.argv.slice(2);
if (!itPath || !worldPath) throw new Error('Uso: build-area-maps.mjs <it_regions.geojson> <ne_110m_countries.geojson>');
const outDir = resolve(root, 'packages/engine-world/src/maps');
mkdirSync(outDir, { recursive: true });

const outerRings = (geom) => (geom.type === 'Polygon' ? [geom.coordinates[0]] : geom.coordinates.map((p) => p[0])).map((r) => r.slice(0, -1));

// ------------------------------------------------------------------ Italia
const REGIONS = {
  Piemonte: ['orzo', 'Nord-Ovest'],
  "Valle d'Aosta/Vallée d'Aoste": ['pietra', 'Nord-Ovest', "Valle d'Aosta"],
  Liguria: ['ferro', 'Nord-Ovest'],
  Lombardia: ['ferro', 'Nord-Ovest'],
  'Trentino-Alto Adige/Südtirol': ['legname', 'Nord-Est', 'Trentino-Alto Adige'],
  Veneto: ['orzo', 'Nord-Est'],
  'Friuli-Venezia Giulia': ['legname', 'Nord-Est'],
  'Emilia-Romagna': ['orzo', 'Nord-Est'],
  Marche: ['pietra', 'Centro'],
  Toscana: ['lana', 'Centro'],
  Umbria: ['legname', 'Centro'],
  Lazio: ['pietra', 'Centro'],
  Campania: ['pietra', 'Sud'],
  Abruzzo: ['lana', 'Sud'],
  Molise: ['lana', 'Sud'],
  Puglia: ['orzo', 'Sud'],
  Basilicata: ['deserto', 'Sud'],
  Calabria: ['legname', 'Sud'],
  Sicilia: ['ferro', 'Isole'],
  Sardegna: ['lana', 'Isole'],
};
const it = JSON.parse(readFileSync(itPath, 'utf8'));
const italia = buildAreaMap({
  id: 'italia',
  name: 'Italia (20 regioni)',
  scale: 'nazione',
  target: 20,
  deserts: 1,
  credits: 'Confini regionali: ISTAT, rielaborazione openpolis (CC BY 3.0 IT).',
  areas: it.features.map((f) => {
    const [material, group, shortName] = REGIONS[f.properties.reg_name] ?? [];
    if (!material) throw new Error('Regione sconosciuta: ' + f.properties.reg_name);
    return { name: shortName ?? f.properties.reg_name, group, material, rings: outerRings(f.geometry) };
  }),
});
writeFileSync(resolve(outDir, 'italia.json'), JSON.stringify(italia));
console.log('italia', italia.territories.length, 'territori,', italia.links.length, 'collegamenti');

// ------------------------------------------------------------------ Europa
const COUNTRIES = {
  Norway: ['Norvegia', 'ferro', 'Nord'], Sweden: ['Svezia', 'ferro', 'Nord'], Finland: ['Finlandia', 'deserto', 'Nord'],
  Denmark: ['Danimarca', 'orzo', 'Nord'], Iceland: ['Islanda', 'deserto', 'Nord'], Ireland: ['Irlanda', 'lana', 'Nord'],
  'United Kingdom': ['Regno Unito', 'ferro', 'Nord'], Estonia: ['Estonia', 'lana', 'Nord'], Latvia: ['Lettonia', 'legname', 'Nord'],
  Lithuania: ['Lituania', null, 'Nord'],
  France: ['Francia', 'orzo', 'Ovest'], Germany: ['Germania', 'ferro', 'Ovest'], Netherlands: ['Paesi Bassi', 'orzo', 'Ovest'],
  Belgium: ['Belgio', 'pietra', 'Ovest'], Luxembourg: ['Lussemburgo', null, 'Ovest'], Switzerland: ['Svizzera', 'pietra', 'Ovest'],
  Austria: ['Austria', 'legname', 'Ovest'],
  Spain: ['Spagna', 'lana', 'Sud'], Portugal: ['Portogallo', null, 'Sud'], Italy: ['Italia', 'pietra', 'Sud'],
  Greece: ['Grecia', 'pietra', 'Sud'], Albania: ['Albania', 'lana', 'Sud'], 'North Macedonia': ['Macedonia del Nord', 'lana', 'Sud'],
  Montenegro: ['Montenegro', 'pietra', 'Sud'], Croatia: ['Croazia', 'pietra', 'Sud'], Slovenia: ['Slovenia', null, 'Sud'],
  'Bosnia and Herz.': ['Bosnia ed Erzegovina', 'legname', 'Sud'], Kosovo: ['Kosovo', 'ferro', 'Sud'], Serbia: ['Serbia', 'ferro', 'Sud'],
  Poland: ['Polonia', 'orzo', 'Est'], Czechia: ['Repubblica Ceca', 'pietra', 'Est'], Slovakia: ['Slovacchia', 'legname', 'Est'],
  Hungary: ['Ungheria', 'orzo', 'Est'], Romania: ['Romania', 'ferro', 'Est'], Bulgaria: ['Bulgaria', 'lana', 'Est'],
  Moldova: ['Moldavia', 'orzo', 'Est'], Ukraine: ['Ucraina', 'orzo', 'Est'], Belarus: ['Bielorussia', 'legname', 'Est'],
  Russia: ['Russia', 'legname', 'Est'],
};
const world = JSON.parse(readFileSync(worldPath, 'utf8'));
const clipWest = (ring, cut) => {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const ia = a[0] <= cut;
    const ib = b[0] <= cut;
    if (ia) out.push(a);
    if (ia !== ib) out.push([cut, a[1] + ((cut - a[0]) / (b[0] - a[0])) * (b[1] - a[1])]);
  }
  return out;
};
const europeAreas = [];
for (const f of world.features) {
  const name = f.properties.NAME;
  const spec = COUNTRIES[name];
  if (!spec) continue;
  let rings = outerRings(f.geometry);
  if (name === 'Russia') rings = rings.map((r) => clipWest(r, 50)).filter((r) => r.length >= 3);
  // niente territori d'oltremare (Guyana francese, ecc.)
  rings = rings.filter((r) => {
    const cx = r.reduce((s, p) => s + p[0], 0) / r.length;
    const cy = r.reduce((s, p) => s + p[1], 0) / r.length;
    return cx > -26 && cx < 52 && cy > 33 && cy < 73;
  });
  if (rings.length === 0) continue;
  europeAreas.push({ name: spec[0], group: spec[2], ...(spec[1] ? { material: spec[1] } : {}), rings });
}
const europa = buildAreaMap({
  id: 'europa',
  name: 'Europa (paesi)',
  scale: 'continente',
  target: 40,
  deserts: 2,
  credits: 'Confini: Natural Earth (dominio pubblico).',
  areas: europeAreas,
});
writeFileSync(resolve(outDir, 'europa.json'), JSON.stringify(europa));
console.log('europa', europa.territories.length, 'territori,', europa.links.length, 'collegamenti');
