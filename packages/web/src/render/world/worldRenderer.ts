/**
 * Renderer della mappa di «Vikings Around the World» su Canvas.
 * Coordinate-mondo = (lon + 180, 85 - lat) in «gradi»; la camera converte in pixel.
 * Disegno piatto e netto (stile pixel-art: colori pieni, bordi spessi, glifi a blocchi).
 */
import { mapIndex, type FrozenMap, type PlayerId, type TerritoryKind, type WorldPlayerView } from '@vikiland/engine-world';

export interface Camera {
  /** Pixel dello schermo per grado. */
  scale: number;
  /** Coordinate-mondo del centro dello schermo. */
  cx: number;
  cy: number;
}

export interface WorldDrawInput {
  view: WorldPlayerView;
  camera: Camera;
  width: number;
  height: number;
  selected: string | null;
  /** territorio → costo/pedaggio mostrati sui territori raggiungibili. */
  reachable: Map<string, { cost: number; toll: number }>;
  /** Territori da evidenziare (scelte valide di setup/costruzione). */
  highlights: Set<string>;
  /** Territori «tolti» (editor mappe): disegnati spenti. */
  dimmed?: Set<string>;
}

export const WORLD_W = 370;
export const WORLD_H = 150;
const LAT_TOP = 85;

export const KIND_COLOR: Record<TerritoryKind, string> = {
  legname: '#3f7d3a',
  pietra: '#8f8f9a',
  lana: '#bde08f',
  orzo: '#e3c340',
  ferro: '#5d5d88',
  deserto: '#d9bd7c',
};
export const KIND_EMOJI: Record<TerritoryKind, string> = {
  legname: '🌲',
  pietra: '⛰️',
  lana: '🐑',
  orzo: '🌾',
  ferro: '⚒️',
  deserto: '🏜️',
};
export const PLAYER_COLORS = ['#d9534f', '#4a90d9', '#5cb85c', '#e7b94c', '#b86ad9', '#3cc8c8'];

/** lon/lat → coordinate-mondo. */
export const toWorld = (lon: number, lat: number): [number, number] => [lon + 180, LAT_TOP - lat];

export function worldToScreen(c: Camera, w: number, h: number, x: number, y: number): [number, number] {
  return [(x - c.cx) * c.scale + w / 2, (y - c.cy) * c.scale + h / 2];
}
export function screenToWorld(c: Camera, w: number, h: number, sx: number, sy: number): [number, number] {
  return [(sx - w / 2) / c.scale + c.cx, (sy - h / 2) / c.scale + c.cy];
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const FULL_WORLD: Bounds = { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H };

/** Riquadro (in coordinate-mondo) occupato dalla mappa: serve per «adatta allo schermo». */
export function mapBounds(map: FrozenMap): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of map.territories) {
    for (const ring of t.polygons) {
      for (const [lon, lat] of ring) {
        const [x, y] = toWorld(lon, lat);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : FULL_WORLD;
}

export function fitCamera(w: number, h: number, b: Bounds = FULL_WORLD): Camera {
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxY - b.minY);
  const scale = Math.min(w / bw, h / bh) * 0.94;
  return { scale, cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2 };
}

interface Cache {
  map: FrozenMap;
  paths: Map<string, Path2D>;
  centers: Map<string, [number, number]>;
  /** Larghezza della forma (unità-mondo): decide se il nome ci sta. */
  widths: Map<string, number>;
}

export class WorldRenderer {
  private cache: Cache | null = null;
  private hitCtx: CanvasRenderingContext2D | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  private ensure(map: FrozenMap): Cache {
    if (this.cache && this.cache.map === map) return this.cache;
    const paths = new Map<string, Path2D>();
    const centers = new Map<string, [number, number]>();
    const widths = new Map<string, number>();
    for (const t of map.territories) {
      const p = new Path2D();
      for (const ring of t.polygons) {
        ring.forEach(([lon, lat], i) => {
          const [x, y] = toWorld(lon, lat);
          if (i === 0) p.moveTo(x, y);
          else p.lineTo(x, y);
        });
        p.closePath();
      }
      paths.set(t.id, p);
      centers.set(t.id, toWorld(t.center[0], t.center[1]));
      let lo = Infinity;
      let hi = -Infinity;
      for (const ring of t.polygons) for (const [lon] of ring) { lo = Math.min(lo, lon); hi = Math.max(hi, lon); }
      widths.set(t.id, hi - lo);
    }
    this.cache = { map, paths, centers, widths };
    return this.cache;
  }

  center(map: FrozenMap, id: string): [number, number] | null {
    return this.ensure(map).centers.get(id) ?? null;
  }

  /** Territorio sotto il punto-schermo (con un po' di tolleranza per le isole minuscole). */
  hit(view: WorldPlayerView, cam: Camera, w: number, h: number, sx: number, sy: number): string | null {
    const cache = this.ensure(view.map);
    if (!this.hitCtx) this.hitCtx = document.createElement('canvas').getContext('2d');
    const ctx = this.hitCtx;
    const [wx, wy] = screenToWorld(cam, w, h, sx, sy);
    let found: string | null = null;
    if (ctx) {
      for (const [id, path] of cache.paths) {
        if (ctx.isPointInPath(path, wx, wy)) {
          found = id;
          break;
        }
      }
    }
    if (found) return found;
    // Tolleranza: il centro più vicino entro ~14 px.
    let best: string | null = null;
    let bestD = (14 / cam.scale) ** 2;
    for (const [id, [x, y]] of cache.centers) {
      const d = (x - wx) ** 2 + (y - wy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  }

  draw(input: WorldDrawInput): void {
    const { view, camera: cam, width: w, height: h } = input;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const dpr = this.canvas.width / w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cache = this.ensure(view.map);
    const idx = mapIndex(view.map);

    // Mare
    ctx.fillStyle = '#1b4a75';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const step = Math.max(14, cam.scale * 6);
    for (let y = ((h / 2 - cam.cy * cam.scale) % step) - step; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
      ctx.stroke();
    }

    // Mondo → schermo
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-cam.cx, -cam.cy);

    // Territori
    ctx.lineJoin = 'round';
    for (const t of view.map.territories) {
      const path = cache.paths.get(t.id)!;
      const st = view.territories[t.id]!;
      ctx.fillStyle = KIND_COLOR[t.kind];
      ctx.fill(path);
      if (st.owner !== null) {
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = colorOf(view, st.owner);
        ctx.fill(path);
        ctx.globalAlpha = 1;
      }
      if (input.dimmed?.has(t.id)) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#1b2430';
        ctx.fill(path);
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = 1.2 / cam.scale;
      ctx.strokeStyle = '#17202b';
      ctx.stroke(path);
    }
    // Evidenziazioni
    for (const id of input.highlights) {
      const path = cache.paths.get(id);
      if (!path) continue;
      ctx.lineWidth = 2 / cam.scale;
      ctx.strokeStyle = 'rgba(255,226,122,0.9)';
      ctx.stroke(path);
    }
    for (const id of input.reachable.keys()) {
      const path = cache.paths.get(id);
      if (!path) continue;
      ctx.lineWidth = 3 / cam.scale;
      ctx.strokeStyle = '#7fe08a';
      ctx.stroke(path);
    }
    if (input.selected) {
      const path = cache.paths.get(input.selected);
      if (path) {
        ctx.lineWidth = 4 / cam.scale;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke(path);
      }
    }

    // Rotte di mare (tratteggiate; se attraversano il bordo, due mezzi segmenti)
    ctx.lineWidth = 1.6 / cam.scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.setLineDash([5 / cam.scale, 5 / cam.scale]);
    for (const l of view.map.links) {
      if (l.kind !== 'mare') continue;
      const a = cache.centers.get(l.a)!;
      const b = cache.centers.get(l.b)!;
      this.segment(ctx, a, b);
    }
    ctx.setLineDash([]);

    // Strade
    for (const [id, owner] of Object.entries(view.roads)) {
      const l = idx.link.get(id);
      if (!l) continue;
      const a = cache.centers.get(l.a)!;
      const b = cache.centers.get(l.b)!;
      ctx.lineCap = 'round';
      ctx.lineWidth = 5 / cam.scale;
      ctx.strokeStyle = '#17202b';
      this.segment(ctx, a, b);
      ctx.lineWidth = 3 / cam.scale;
      ctx.strokeStyle = colorOf(view, owner);
      this.segment(ctx, a, b);
    }
    ctx.restore();

    // --- Sovraimpressioni in pixel-schermo (restano leggibili a ogni zoom) ---
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of view.map.territories) {
      const [wx, wy] = cache.centers.get(t.id)!;
      const [sx, sy] = worldToScreen(cam, w, h, wx, wy);
      if (sx < -40 || sy < -40 || sx > w + 40 || sy > h + 40) continue;
      const st = view.territories[t.id]!;
      const roomy = view.map.territories.length <= 45; // mappe d'area: territori grandi
      const small = cam.scale < (roomy ? 0.9 : 1.6);
      // materiale + numero
      if (!small) {
        ctx.font = '13px sans-serif';
        ctx.fillText(KIND_EMOJI[t.kind], sx, sy - 12);
      }
      if (st.number !== null) {
        const r = small ? 6 : 9;
        ctx.beginPath();
        ctx.arc(sx, sy + (small ? 0 : 3), r, 0, Math.PI * 2);
        ctx.fillStyle = '#f3e7c4';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#17202b';
        ctx.stroke();
        ctx.fillStyle = st.number === 6 || st.number === 8 ? '#c0392b' : '#17202b';
        ctx.font = `bold ${small ? 8 : 11}px monospace`;
        ctx.fillText(String(st.number), sx, sy + (small ? 0 : 3) + 0.5);
      }
      // edificio
      if (st.building && st.owner !== null) {
        this.drawBuilding(ctx, sx - (small ? 9 : 15), sy + (small ? -7 : -2), st.building, colorOf(view, st.owner), small ? 0.8 : 1.15);
      }
      if (!small) {
        let ax = sx + 16;
        if (st.porto) {
          ctx.font = '12px sans-serif';
          ctx.fillText('⚓', ax, sy - 2);
          ax += 14;
        }
        if (st.mercato) {
          ctx.font = '12px sans-serif';
          ctx.fillText('🪙', ax, sy - 2);
        }
      } else if (st.porto || st.mercato) {
        ctx.font = '9px sans-serif';
        ctx.fillText(st.porto ? '⚓' : '🪙', sx + 9, sy - 6);
      }
      // nome: solo se ci sta nella forma (o se il territorio è selezionato)
      if (cam.scale >= (roomy ? 1.4 : 4.6)) {
        ctx.font = '7px "Press Start 2P", monospace';
        const fits = ctx.measureText(t.name).width <= (cache.widths.get(t.id) ?? 0) * cam.scale * 1.2;
        if (fits || input.selected === t.id) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(10,16,24,0.85)';
          ctx.strokeText(t.name, sx, sy + 22);
          ctx.fillStyle = '#f0e9d6';
          ctx.fillText(t.name, sx, sy + 22);
        }
      }
      // costo di movimento
      const reach = input.reachable.get(t.id);
      if (reach) {
        const label = reach.toll > 0 ? `${reach.cost}·🪙${reach.toll}` : String(reach.cost);
        ctx.font = 'bold 11px monospace';
        const tw = ctx.measureText(label).width + 8;
        ctx.fillStyle = '#17202b';
        ctx.fillRect(sx - tw / 2, sy - 34, tw, 15);
        ctx.fillStyle = '#7fe08a';
        ctx.fillText(label, sx, sy - 26);
      }
    }
    // Jarl
    const offsets = new Map<string, number>();
    for (const p of view.players) {
      const c = cache.centers.get(p.jarl);
      if (!c) continue;
      // Nel setup il Jarl compare solo dopo il primo villaggio.
      if (view.phase.type === 'setup' && !Object.values(view.territories).some((t) => t.owner === p.id)) continue;
      const k = offsets.get(p.jarl) ?? 0;
      offsets.set(p.jarl, k + 1);
      const [sx, sy] = worldToScreen(cam, w, h, c[0], c[1]);
      this.drawJarl(ctx, sx + 14 + k * 9, sy + 12, colorOf(view, p.id), p.id === view.currentPlayer);
    }
  }

  /** Segmento fra due centri; se il giro più breve passa dal bordo, lo spezza. */
  private segment(ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number]): void {
    ctx.beginPath();
    if (Math.abs(a[0] - b[0]) > WORLD_W / 2) {
      const [l, r] = a[0] < b[0] ? [a, b] : [b, a];
      ctx.moveTo(l[0], l[1]);
      ctx.lineTo(l[0] - (WORLD_W - (r[0] - l[0])) / 2, (l[1] + r[1]) / 2);
      ctx.moveTo(r[0], r[1]);
      ctx.lineTo(r[0] + (WORLD_W - (r[0] - l[0])) / 2, (l[1] + r[1]) / 2);
    } else {
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
  }

  private drawBuilding(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    kind: 'villaggio' | 'citta' | 'sala',
    color: string,
    k: number
  ): void {
    const u = 3 * k;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#17202b';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = color;
    const house = (ox: number, w: number, hgt: number): void => {
      ctx.beginPath();
      ctx.rect(ox, -hgt * u, w * u, hgt * u);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox - u * 0.5, -hgt * u);
      ctx.lineTo(ox + (w * u) / 2, -(hgt + w * 0.6) * u);
      ctx.lineTo(ox + w * u + u * 0.5, -hgt * u);
      ctx.closePath();
      ctx.fillStyle = '#6b4a2b';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
    };
    if (kind === 'villaggio') house(-u, 2, 2);
    else if (kind === 'citta') {
      house(-2.2 * u, 2, 3);
      house(0.2 * u, 2, 2);
    } else {
      house(-1.5 * u, 3, 3);
      ctx.fillStyle = '#ffd24a';
      ctx.font = `${Math.round(9 * k)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('★', 0, -(7 * u));
    }
    ctx.restore();
  }

  private drawJarl(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, active: boolean): void {
    ctx.save();
    ctx.translate(x, y);
    if (active) {
      ctx.beginPath();
      ctx.arc(0, -4, 9, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = '#17202b';
    ctx.fillRect(-4, -12, 8, 6); // elmo (contorno)
    ctx.fillRect(-5, -6, 10, 11);
    ctx.fillStyle = '#c9ccd4';
    ctx.fillRect(-3, -11, 6, 4); // elmo
    ctx.fillStyle = color;
    ctx.fillRect(-4, -6, 8, 9); // corpo
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(-2, -7, 4, 2);
    ctx.restore();
  }
}

/** Colore di un giocatore (dalla partita; ripiego sulla tavolozza). */
export function colorOf(view: WorldPlayerView, id: PlayerId): string {
  return view.players[id]?.color ?? PLAYER_COLORS[id % PLAYER_COLORS.length]!;
}
