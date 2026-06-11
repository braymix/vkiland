/**
 * "Cottura" degli sprite: matrice di testo + palette → canvas riusabile.
 * La cache è per (id sprite, id palette, colore giocatore): un cambio di
 * skin invalida solo le chiavi, non gli sprite.
 */
import type { PlayerColor } from '@vikiland/engine';
import type { SpriteDef } from './defs';
import { DIGIT_FONT } from './defs';
import { getActiveTheme, PLAYER_COLORS, type ThemePalette } from './palettes';

const cache = new Map<string, HTMLCanvasElement>();

function resolveColor(
  key: string,
  theme: ThemePalette,
  playerColor: PlayerColor | null
): string {
  if (key === 'giocatoreMain' || key === 'giocatoreDark' || key === 'giocatoreLight') {
    const pc = PLAYER_COLORS[playerColor ?? 'rosso'];
    return key === 'giocatoreMain' ? pc.main : key === 'giocatoreDark' ? pc.dark : pc.light;
  }
  return theme.colors[key] ?? '#ff00ff'; // magenta = chiave mancante (debug)
}

export function bakeSprite(
  id: string,
  def: SpriteDef,
  playerColor: PlayerColor | null = null
): HTMLCanvasElement {
  const theme = getActiveTheme();
  const key = `${theme.id}|${id}|${playerColor ?? '-'}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const h = def.rows.length;
  const w = def.rows[0]!.length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    const row = def.rows[y]!;
    for (let x = 0; x < w; x++) {
      const ch = row[x]!;
      if (ch === '.') continue;
      const colorKey = def.map[ch];
      if (!colorKey) continue;
      ctx.fillStyle = resolveColor(colorKey, theme, playerColor);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  cache.set(key, canvas);
  return canvas;
}

/** Disegna uno sprite centrato sul punto dato (coordinate logiche intere). */
export function drawSpriteCentered(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  cx: number,
  cy: number
): void {
  ctx.drawImage(sprite, Math.round(cx - sprite.width / 2), Math.round(cy - sprite.height / 2));
}

/** Versione data-URL ingrandita (nearest-neighbor) per la UI DOM. */
export function spriteDataURL(
  id: string,
  def: SpriteDef,
  scale = 3,
  playerColor: PlayerColor | null = null
): string {
  const key = `url|${getActiveTheme().id}|${id}|${scale}|${playerColor ?? '-'}`;
  const cached = urlCache.get(key);
  if (cached) return cached;
  const base = bakeSprite(id, def, playerColor);
  const canvas = document.createElement('canvas');
  canvas.width = base.width * scale;
  canvas.height = base.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL();
  urlCache.set(key, url);
  return url;
}
const urlCache = new Map<string, string>();

/** Scrive una stringa di cifre (e ':') col font 3×5. Ritorna la larghezza. */
export function drawDigits(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string
): number {
  let cx = x;
  ctx.fillStyle = color;
  for (const ch of text) {
    const glyph = DIGIT_FONT[ch];
    if (!glyph) {
      cx += 2;
      continue;
    }
    for (let gy = 0; gy < 5; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        if (glyph[gy]![gx] === '1') ctx.fillRect(cx + gx, y + gy, 1, 1);
      }
    }
    cx += 4;
  }
  return cx - x - 1;
}

export function digitsWidth(text: string): number {
  return text.length * 4 - 1;
}
