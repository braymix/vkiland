/**
 * Genera le icone PWA di Viking-Island da una matrice pixel-art (stesso
 * approccio degli sprite di gioco). PNG scritti a mano con node:zlib:
 * nessuna dipendenza. Output: packages/web/public/icons/*.png
 *
 *   node scripts/gen-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Logo: elmo vichingo con corna e barba rossa (16×16) ------------------
const PALETTE = {
  '.': null, // trasparente (o sfondo, vedi sotto)
  d: '#3a3128', // contorni scuri
  C: '#e8e0c8', // corna (osso)
  c: '#b3a98c', // ombra corna
  h: '#aab3c6', // elmo (acciaio)
  H: '#7d8696', // ombra elmo
  g: '#e7b94c', // fregio dorato dell'elmo
  f: '#e9bd8f', // viso
  n: '#1a1612', // occhi
  B: '#c0392b', // barba rossa
  b: '#7e241a', // ombra barba
};

const LOGO = [
  '................',
  '...dd......dd...',
  '..dCCd....dCCd..',
  '..dCCddddddCCd..',
  '..dCChhhhhhCCd..',
  '...dhHHHHHHhd...',
  '...dhhgggghhd...',
  '...dddddddddd...',
  '...dffffffffd...',
  '..dbfnffffnfbd..',
  '..dBffffffffBd..',
  '..dBBffffffBBd..',
  '..dBBBffffBBBd..',
  '...dBBBBBBBBd...',
  '....dBBBBBBd....',
  '.....dddddd.....',
];

// --- Mini encoder PNG (RGBA, filtro 0) -------------------------------------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function pngRGBA(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filtro 0
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Rasterizzazione -------------------------------------------------------
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

/**
 * Disegna il logo (16×16) dentro un'icona size×size.
 * - bg: colore di sfondo (null = trasparente)
 * - logoFrac: frazione del lato occupata dal logo (per le maskable serve aria)
 */
function renderIcon(size, bg, logoFrac) {
  const rgba = Buffer.alloc(size * size * 4);
  if (bg) {
    const [r, g, b] = hex(bg);
    for (let i = 0; i < size * size; i++) {
      rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = 255;
    }
  }
  const cell = Math.max(1, Math.floor((size * logoFrac) / 16));
  const off = Math.floor((size - cell * 16) / 2);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const key = LOGO[y][x];
      const color = PALETTE[key];
      if (!color) continue;
      const [r, g, b] = hex(color);
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          const px = off + x * cell + dx;
          const py = off + y * cell + dy;
          const i = (py * size + px) * 4;
          rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255;
        }
      }
    }
  }
  return pngRGBA(size, size, rgba);
}

const BG = '#1d2733'; // --bg del tema
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'web', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const files = [
  ['icon-192.png', renderIcon(192, BG, 0.92)],
  ['icon-512.png', renderIcon(512, BG, 0.92)],
  // Maskable: il sistema ritaglia fino al 20% per lato → logo più piccolo.
  ['icon-maskable-192.png', renderIcon(192, BG, 0.66)],
  ['icon-maskable-512.png', renderIcon(512, BG, 0.66)],
  ['apple-touch-icon.png', renderIcon(180, BG, 0.86)],
  ['favicon-32.png', renderIcon(32, BG, 1)],
  ['favicon-16.png', renderIcon(16, null, 1)],
];
for (const [name, buf] of files) {
  writeFileSync(join(outDir, name), buf);
  console.log('scritto', name, buf.length, 'byte');
}
