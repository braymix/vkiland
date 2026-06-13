/**
 * Renderer della tavola su Canvas 2D a risoluzione logica (160×140),
 * scalato via CSS con image-rendering: pixelated.
 *
 * Due livelli: lo strato STATICO (mare, terreni, segnalini, approdi) viene
 * pre-renderizzato su un canvas fuori schermo e ridisegnato solo quando
 * cambia la tavola; lo strato DINAMICO (sentieri, edifici, Drago,
 * evidenziazioni) viene ricomposto a ogni cambiamento di stato.
 */
import {
  getTopology,
  pipWeight,
  type EdgeId,
  type HexId,
  type PlayerColor,
  type PlayerView,
  type TerrainType,
  type VertexId,
} from '@vikiland/engine';
import {
  CANVAS_H,
  CANVAS_W,
  edgeEndpoints,
  hexCenterById,
  hexHalfWidthAt,
  HEX_CORNER_Y,
  portAnchor,
  vertexPoint,
  type Point,
} from './layout';
import { bakeSprite, drawDigits, drawSpriteCentered, digitsWidth } from './sprites/bake';
import {
  CRISTALLO_GHIACCIO,
  DRAGO,
  DRAKKAR,
  ICONA_RISORSA,
  MINERALE,
  PECORA,
  PINO,
  ROCCAFORTE,
  ROCCIA_DECO,
  SPIGA,
  VILLAGGIO,
  type SpriteDef,
} from './sprites/defs';
import { getActiveTheme, PLAYER_COLORS } from './sprites/palettes';

export interface BoardUiState {
  /** Bersagli evidenziati (mosse legali della modalità attiva). */
  highlightVertices?: VertexId[] | undefined;
  highlightEdges?: EdgeId[] | undefined;
  highlightHexes?: HexId[] | undefined;
}

const TERRAIN_FILL: Record<TerrainType, [string, string]> = {
  legname: ['foresta', 'forestaBordo'],
  pietra: ['cava', 'cavaBordo'],
  lana: ['pascolo', 'pascoloBordo'],
  orzo: ['campo', 'campoBordo'],
  ferro: ['miniera', 'minieraBordo'],
  tundra: ['tundra', 'tundraBordo'],
};

const TERRAIN_DECO: Record<TerrainType, { def: SpriteDef; id: string; at: [number, number][] }> = {
  legname: { def: PINO, id: 'pino', at: [[-10, -14], [10, -13], [0, 15]] },
  pietra: { def: ROCCIA_DECO, id: 'roccia', at: [[-9, -14], [9, 14]] },
  lana: { def: PECORA, id: 'pecora', at: [[-9, -14], [9, 14]] },
  orzo: { def: SPIGA, id: 'spiga', at: [[-11, -14], [11, -14], [0, 15]] },
  ferro: { def: MINERALE, id: 'minerale', at: [[-9, -14], [9, 14]] },
  tundra: { def: CRISTALLO_GHIACCIO, id: 'ghiaccio', at: [[-10, -14], [10, -13], [0, 15]] },
};

/** Marcatore di evidenziazione (anello bianco con bordo scuro). */
const MIRINO: SpriteDef = {
  map: { n: 'nero', b: 'bianco' },
  rows: [
    '..nnnnnnnnn..',
    '.nbbbbbbbbbn.',
    'nbb.......bbn',
    'nb.........bn',
    'nb.........bn',
    'nb.........bn',
    'nb.........bn',
    'nb.........bn',
    'nb.........bn',
    'nb.........bn',
    'nbb.......bbn',
    '.nbbbbbbbbbn.',
    '..nnnnnnnnn..',
  ],
};

/** Variante VIOLA del marcatore: vertici che danno diritto a un approdo. */
const MIRINO_PORTO: SpriteDef = {
  map: { n: 'nero', b: 'mirinoPorto' },
  rows: MIRINO.rows,
};

let staticCanvas: HTMLCanvasElement | null = null;
let staticKey = '';

function color(key: string): string {
  return getActiveTheme().colors[key] ?? '#ff00ff';
}

function boardSignature(view: PlayerView): string {
  return (
    view.board.hexes.map((h) => `${h.terrain}${h.token ?? ''}`).join('|') +
    '#' +
    view.board.ports.map((p) => `${p.edge}${p.kind}`).join('|')
  );
}

/**
 * Riempie un esagono pixel-perfetto riga per riga; il bordo da 1px è
 * l'insieme dei pixel interni con almeno un vicino (4-connesso) esterno.
 */
function fillHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, fill: string, border: string): void {
  const inside = (dx: number, dy: number): boolean => {
    const hw = hexHalfWidthAt(dy);
    return hw > 0 && dx >= -hw && dx < hw;
  };
  ctx.fillStyle = fill;
  for (let dy = -HEX_CORNER_Y; dy <= HEX_CORNER_Y; dy++) {
    const hw = hexHalfWidthAt(dy);
    if (hw <= 0) continue;
    ctx.fillRect(cx - hw, cy + dy, hw * 2, 1);
  }
  ctx.fillStyle = border;
  for (let dy = -HEX_CORNER_Y; dy <= HEX_CORNER_Y; dy++) {
    const hw = hexHalfWidthAt(dy);
    if (hw <= 0) continue;
    for (let dx = -hw; dx < hw; dx++) {
      if (!inside(dx - 1, dy) || !inside(dx + 1, dy) || !inside(dx, dy - 1) || !inside(dx, dy + 1)) {
        ctx.fillRect(cx + dx, cy + dy, 1, 1);
      }
    }
  }
}

/** Disco del segnalino numerico con cifre grandi e tacche di probabilità. */
const TOKEN_R = 10;
function tokenHalfWidthAt(dy: number): number {
  const r2 = (TOKEN_R + 0.4) ** 2 - dy * dy;
  return r2 <= 0 ? 0 : Math.round(Math.sqrt(r2));
}

function drawToken(ctx: CanvasRenderingContext2D, cx: number, cy: number, token: number): void {
  ctx.fillStyle = color('segnalino');
  for (let dy = -TOKEN_R; dy <= TOKEN_R; dy++) {
    const hw = tokenHalfWidthAt(dy);
    if (hw <= 0) continue;
    ctx.fillRect(cx - hw, cy + dy, hw * 2, 1);
  }
  // Bordo: i pixel del disco con un vicino (sopra/sotto/lato) fuori dal disco.
  ctx.fillStyle = color('segnalinoBordo');
  for (let dy = -TOKEN_R; dy <= TOKEN_R; dy++) {
    const hw = tokenHalfWidthAt(dy);
    if (hw <= 0) continue;
    const hwUp = tokenHalfWidthAt(dy - 1);
    const hwDown = tokenHalfWidthAt(dy + 1);
    ctx.fillRect(cx - hw, cy + dy, 1, 1);
    ctx.fillRect(cx + hw - 1, cy + dy, 1, 1);
    for (let dx = -hw; dx < hw; dx++) {
      const adx = Math.abs(dx + 0.5);
      if (adx >= hwUp || adx >= hwDown) ctx.fillRect(cx + dx, cy + dy, 1, 1);
    }
  }

  const text = String(token);
  const isHot = token === 6 || token === 8;
  const tw = digitsWidth(text, 2);
  drawDigits(ctx, text, cx - Math.floor(tw / 2), cy - 8, color(isHot ? 'cifraCalda' : 'cifra'), 2);
  // Tacche di probabilità sotto il numero (quadratini 2×2).
  const pips = pipWeight(token);
  const px = cx - (pips * 3 - 1) / 2;
  ctx.fillStyle = color(isHot ? 'cifraCalda' : 'cifra');
  for (let i = 0; i < pips; i++) {
    ctx.fillRect(Math.round(px) + i * 3, cy + 4, 2, 2);
  }
}

/**
 * Pontile dell'approdo: un'assicella di legno dal vertice costiero verso il
 * drakkar al largo. Si disegna SEMPRE (strato statico) — i due pontili di un
 * approdo (uno per ciascun vertice dello spigolo) convergono sotto lo scafo —
 * così si vede a colpo d'occhio DOVE costruire per usare il porto, anche
 * quando il mirino viola non è acceso.
 */
function drawPortJetty(ctx: CanvasRenderingContext2D, from: Point, to: Point): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const t0 = 7 / len; // respiro al vertice (lì ci va l'edificio)
  const t1 = 0.84; // si infila sotto lo scafo
  const steps = Math.ceil(len);
  // Prima il bordo scuro (4px), poi il legno chiaro (2px): assicella con rilievo.
  for (const [size, key] of [
    [4, 'scafoScuro'],
    [2, 'scafo'],
  ] as const) {
    ctx.fillStyle = color(key);
    const half = size / 2;
    for (let i = 0; i <= steps; i++) {
      const t = t0 + (i / steps) * (t1 - t0);
      if (t > t1) break;
      const x = Math.round(from.x + dx * t);
      const y = Math.round(from.y + dy * t);
      ctx.fillRect(x - half, y - half, size, size);
    }
  }
}

function renderStatic(view: PlayerView): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;

  // Mare con un dithering deterministico di onde.
  ctx.fillStyle = color('mare');
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = color('mareChiaro');
  for (let y = 0; y < CANVAS_H; y += 3) {
    for (let x = 0; x < CANVAS_W; x++) {
      if ((x * 7 + y * 13) % 53 === 0) ctx.fillRect(x, y, 3, 1);
    }
  }

  // Terreni con decorazioni e segnalini.
  for (const hex of view.board.hexes) {
    const { x, y } = hexCenterById(hex.id);
    const [fillKey, borderKey] = TERRAIN_FILL[hex.terrain];
    fillHex(ctx, x, y, color(fillKey), color(borderKey));
    const deco = TERRAIN_DECO[hex.terrain];
    for (const [dx, dy] of deco.at) {
      drawSpriteCentered(ctx, bakeSprite(deco.id, deco.def), x + dx, y + dy);
    }
    if (hex.token !== null) drawToken(ctx, x, y, hex.token);
  }

  // Approdi: pontili verso i vertici costieri + drakkar al largo + etichetta
  // del rapporto (+ icona risorsa).
  const topo = getTopology();
  for (const port of view.board.ports) {
    const anchor = portAnchor(port.edge);
    // Pontili PRIMA dello scafo: convergono e si infilano sotto la chiglia.
    for (const v of topo.edgeVertices[port.edge] ?? []) {
      drawPortJetty(ctx, vertexPoint(v), anchor);
    }
    drawSpriteCentered(ctx, bakeSprite('drakkar', DRAKKAR), anchor.x, anchor.y);
    const label = `${port.ratio}:1`;
    const tw = digitsWidth(label, 2);
    const ty = anchor.y + 9;
    ctx.fillStyle = color('nero');
    ctx.fillRect(anchor.x - Math.floor(tw / 2) - 2, ty - 2, tw + 4, 14);
    drawDigits(ctx, label, anchor.x - Math.floor(tw / 2), ty, color('bianco'), 2);
    if (port.kind !== 'generico') {
      const icon = bakeSprite(`icona-${port.kind}`, ICONA_RISORSA[port.kind]!, null, 2);
      drawSpriteCentered(ctx, icon, anchor.x, anchor.y - 15);
    }
  }

  return canvas;
}

/** Sentiero: linea spessa pixelata nel colore del clan, con bordo scuro. */
function drawRoad(
  ctx: CanvasRenderingContext2D,
  edge: EdgeId,
  playerColor: PlayerColor
): void {
  const [p1, p2] = edgeEndpoints(edge);
  const colors = PLAYER_COLORS[playerColor];
  // Accorcia il segmento per lasciare respiro ai vertici.
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  const t0 = 7 / len;
  const steps = Math.ceil(len);
  ctx.fillStyle = colors.dark;
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (i / steps) * (1 - 2 * t0);
    if (t > 1 - t0) break;
    const x = Math.round(p1.x + dx * t);
    const y = Math.round(p1.y + dy * t);
    ctx.fillRect(x - 2, y - 2, 5, 5);
  }
  ctx.fillStyle = colors.main;
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (i / steps) * (1 - 2 * t0);
    if (t > 1 - t0) break;
    const x = Math.round(p1.x + dx * t);
    const y = Math.round(p1.y + dy * t);
    ctx.fillRect(x - 1, y - 1, 3, 3);
  }
}

export function renderBoard(
  canvas: HTMLCanvasElement,
  view: PlayerView,
  ui: BoardUiState = {}
): void {
  const topo = getTopology();
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const key = boardSignature(view);
  if (!staticCanvas || staticKey !== key) {
    staticCanvas = renderStatic(view);
    staticKey = key;
  }
  ctx.drawImage(staticCanvas, 0, 0);

  // Sentieri di tutti i giocatori.
  for (const p of view.players) {
    for (const e of p.roads) drawRoad(ctx, e, p.color);
  }

  // Edifici.
  for (const p of view.players) {
    for (const v of p.villages) {
      const pt = vertexPoint(v);
      drawSpriteCentered(ctx, bakeSprite('villaggio', VILLAGGIO, p.color), pt.x, pt.y - 2);
    }
    for (const v of p.strongholds) {
      const pt = vertexPoint(v);
      drawSpriteCentered(ctx, bakeSprite('roccaforte', ROCCAFORTE, p.color), pt.x, pt.y - 2);
    }
  }

  // Il Drago sull'esagono bloccato.
  const dragonCenter = hexCenterById(view.board.dragonHex);
  drawSpriteCentered(ctx, bakeSprite('drago', DRAGO), dragonCenter.x, dragonCenter.y + 2);

  // Evidenziazioni delle mosse legali. I vertici degli approdi usano il
  // mirino VIOLA al posto del bianco: si vede subito quale piazzamento
  // dà diritto allo scambio 3:1/2:1.
  const marker = bakeSprite('mirino', MIRINO);
  const markerPorto = bakeSprite('mirino-porto', MIRINO_PORTO);
  const portVertices = new Set<string>(
    view.board.ports.flatMap((p) => topo.edgeVertices[p.edge] ?? [])
  );
  for (const v of ui.highlightVertices ?? []) {
    const pt = vertexPoint(v);
    drawSpriteCentered(ctx, portVertices.has(v) ? markerPorto : marker, pt.x, pt.y);
  }
  for (const e of ui.highlightEdges ?? []) {
    const [p1, p2] = edgeEndpoints(e);
    drawSpriteCentered(ctx, marker, Math.round((p1.x + p2.x) / 2), Math.round((p1.y + p2.y) / 2));
  }
  for (const h of ui.highlightHexes ?? []) {
    const c = hexCenterById(h);
    drawSpriteCentered(ctx, marker, c.x, c.y - 16);
  }
}
