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
  legname: { def: PINO, id: 'pino', at: [[-5, -8], [5, -7], [0, 8]] },
  pietra: { def: ROCCIA_DECO, id: 'roccia', at: [[-4, -8], [4, 8]] },
  lana: { def: PECORA, id: 'pecora', at: [[-3, -8], [3, 8]] },
  orzo: { def: SPIGA, id: 'spiga', at: [[-5, -8], [5, -8], [0, 8]] },
  ferro: { def: MINERALE, id: 'minerale', at: [[-4, -8], [4, 8]] },
  tundra: { def: CRISTALLO_GHIACCIO, id: 'ghiaccio', at: [[-5, -8], [5, -7], [0, 8]] },
};

/** Marcatore di evidenziazione (anello bianco con bordo scuro). */
const MIRINO: SpriteDef = {
  map: { n: 'nero', b: 'bianco' },
  rows: ['.nnnnn.', 'nbbbbbn', 'nb...bn', 'nb...bn', 'nb...bn', 'nbbbbbn', '.nnnnn.'],
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

/** Disco del segnalino numerico con cifre e tacche di probabilità. */
function drawToken(ctx: CanvasRenderingContext2D, cx: number, cy: number, token: number): void {
  const widths = [2, 4, 5, 5, 5, 5, 5, 5, 5, 4, 2]; // semi-larghezze del disco 11px
  ctx.fillStyle = color('segnalino');
  for (let dy = -5; dy <= 5; dy++) {
    const hw = widths[dy + 5]!;
    ctx.fillRect(cx - hw, cy + dy, hw * 2, 1);
  }
  ctx.fillStyle = color('segnalinoBordo');
  for (let dy = -5; dy <= 5; dy++) {
    const hw = widths[dy + 5]!;
    ctx.fillRect(cx - hw, cy + dy, 1, 1);
    ctx.fillRect(cx + hw - 1, cy + dy, 1, 1);
  }
  ctx.fillRect(cx - widths[0]!, cy - 5, widths[0]! * 2, 1);
  ctx.fillRect(cx - widths[10]!, cy + 5, widths[10]! * 2, 1);

  const text = String(token);
  const isHot = token === 6 || token === 8;
  const tw = digitsWidth(text);
  drawDigits(ctx, text, cx - Math.floor(tw / 2), cy - 4, color(isHot ? 'cifraCalda' : 'cifra'));
  // Tacche di probabilità sotto il numero.
  const pips = pipWeight(token);
  const px = cx - (pips * 2 - 1) / 2;
  ctx.fillStyle = color(isHot ? 'cifraCalda' : 'cifra');
  for (let i = 0; i < pips; i++) {
    ctx.fillRect(Math.round(px) + i * 2, cy + 2, 1, 1);
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
  for (let y = 0; y < CANVAS_H; y += 2) {
    for (let x = 0; x < CANVAS_W; x++) {
      if ((x * 7 + y * 13) % 53 === 0) ctx.fillRect(x, y, 2, 1);
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

  // Approdi: drakkar al largo + cerchio di sfondo + etichetta del rapporto (+ icona risorsa).
  for (const port of view.board.ports) {
    const anchor = portAnchor(port.edge);
    // Cerchio di sfondo che evidenzia il porto (grigio scuro per generici, colorato per specifici).
    ctx.fillStyle = port.kind === 'generico' ? 'rgba(75, 90, 110, 0.6)' : 'rgba(180, 140, 60, 0.5)';
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color('accento-scuro');
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Drakkar sopra il cerchio.
    drawSpriteCentered(ctx, bakeSprite('drakkar', DRAKKAR), anchor.x, anchor.y);
    // Etichetta del rapporto sotto il drakkar.
    const label = `${port.ratio}:1`;
    const tw = digitsWidth(label);
    const ty = anchor.y + 7;
    ctx.fillStyle = color('nero');
    ctx.fillRect(anchor.x - Math.floor(tw / 2) - 1, ty - 1, tw + 2, 7);
    drawDigits(ctx, label, anchor.x - Math.floor(tw / 2), ty, color('bianco'));
    // Icona della risorsa specifica sopra il drakkar (se non generico).
    if (port.kind !== 'generico') {
      const icon = bakeSprite(`icona-${port.kind}`, ICONA_RISORSA[port.kind]!);
      drawSpriteCentered(ctx, icon, anchor.x, anchor.y - 9);
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
  const t0 = 3.5 / len;
  const steps = Math.ceil(len);
  ctx.fillStyle = colors.dark;
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (i / steps) * (1 - 2 * t0);
    if (t > 1 - t0) break;
    const x = Math.round(p1.x + dx * t);
    const y = Math.round(p1.y + dy * t);
    ctx.fillRect(x - 1, y - 1, 3, 3);
  }
  ctx.fillStyle = colors.main;
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (i / steps) * (1 - 2 * t0);
    if (t > 1 - t0) break;
    const x = Math.round(p1.x + dx * t);
    const y = Math.round(p1.y + dy * t);
    ctx.fillRect(x, y, 1, 1);
  }
}

export function renderBoard(
  canvas: HTMLCanvasElement,
  view: PlayerView,
  ui: BoardUiState = {}
): void {
  const topo = getTopology();
  void topo;
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
      drawSpriteCentered(ctx, bakeSprite('villaggio', VILLAGGIO, p.color), pt.x, pt.y - 1);
    }
    for (const v of p.strongholds) {
      const pt = vertexPoint(v);
      drawSpriteCentered(ctx, bakeSprite('roccaforte', ROCCAFORTE, p.color), pt.x, pt.y - 1);
    }
  }

  // Il Drago sull'esagono bloccato.
  const dragonCenter = hexCenterById(view.board.dragonHex);
  drawSpriteCentered(ctx, bakeSprite('drago', DRAGO), dragonCenter.x, dragonCenter.y + 1);

  // Evidenziazioni delle mosse legali.
  const marker = bakeSprite('mirino', MIRINO);
  for (const v of ui.highlightVertices ?? []) {
    const pt = vertexPoint(v);
    drawSpriteCentered(ctx, marker, pt.x, pt.y);
  }
  for (const e of ui.highlightEdges ?? []) {
    const [p1, p2] = edgeEndpoints(e);
    drawSpriteCentered(ctx, marker, Math.round((p1.x + p2.x) / 2), Math.round((p1.y + p2.y) / 2));
  }
  for (const h of ui.highlightHexes ?? []) {
    const c = hexCenterById(h);
    drawSpriteCentered(ctx, marker, c.x, c.y - 8);
  }
}
