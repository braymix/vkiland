/**
 * Canvas interattivo della tavola: rendering pixel-art + hit-testing + ZOOM.
 *
 * Gesti supportati:
 *  - pinch con due dita (mobile) per ingrandire/ridurre, ancorato al centro del gesto;
 *  - rotella del mouse (desktop), ancorata al cursore;
 *  - trascinamento (un dito/mouse) per spostarsi quando si è ingranditi;
 *  - il TAP (giù+su senza spostamento) piazza come prima: trascinare non piazza mai.
 *
 * Lo zoom è una trasformazione CSS sul canvas dentro un contenitore con
 * overflow nascosto: i pixel restano nitidi (image-rendering) e l'hit-testing
 * continua a funzionare invariato, perché getBoundingClientRect() tiene già
 * conto della trasformazione.
 */
import { useEffect, useRef, useState } from 'react';
import type { EdgeId, HexId, PlayerView, VertexId } from '@vikiland/engine';
import { renderBoard } from '../render/boardRenderer';
import {
  boardCanvasSize,
  nearestEdge,
  nearestHex,
  nearestVertex,
} from '../render/layout';

export interface BoardTargets {
  vertices?: VertexId[];
  /** Vertici bersaglio di un attacco (modalità Battaglia): mirino rosso. */
  attackVertices?: VertexId[];
  edges?: EdgeId[];
  hexes?: HexId[];
}

interface Props {
  view: PlayerView;
  targets: BoardTargets;
  onPickVertex?: ((v: VertexId) => void) | undefined;
  onPickEdge?: ((e: EdgeId) => void) | undefined;
  onPickHex?: ((h: HexId) => void) | undefined;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const TAP_SLOP_PX = 8; // oltre questo movimento non è più un tap

interface ZoomState {
  scale: number;
  tx: number;
  ty: number;
}

export function BoardCanvas({ view, targets, onPickVertex, onPickEdge, onPickHex }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, tx: 0, ty: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Stato dei gesti (mutabile, fuori dal ciclo di render).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({
    moved: false,
    downX: 0,
    downY: 0,
    lastX: 0,
    lastY: 0,
    pinchDist: 0,
    pinchStart: { scale: 1, tx: 0, ty: 0 },
    pinchWorld: { x: 0, y: 0 },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderBoard(canvas, view, {
      highlightVertices: targets.vertices,
      highlightAttackVertices: targets.attackVertices,
      highlightEdges: targets.edges,
      highlightHexes: targets.hexes,
    });
  }, [view, targets]);

  /** Origine LAYOUT del canvas in coordinate client (ignora la trasformazione). */
  const layoutOrigin = () => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const rect = wrap.getBoundingClientRect();
    return { x: rect.left + canvas.offsetLeft, y: rect.top + canvas.offsetTop };
  };

  /** Mantiene la tavola dentro la cornice e la scala nei limiti. */
  const clampZoom = (z: ZoomState): ZoomState => {
    const canvas = canvasRef.current;
    const w = canvas?.clientWidth ?? 1;
    const h = canvas?.clientHeight ?? 1;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, z.scale));
    return {
      scale,
      tx: Math.min(0, Math.max(w - w * scale, z.tx)),
      ty: Math.min(0, Math.max(h - h * scale, z.ty)),
    };
  };

  /** Nuova trasformazione che tiene fermo il punto-mondo sotto l'ancora. */
  const zoomAround = (anchorClientX: number, anchorClientY: number, newScale: number) => {
    const z = zoomRef.current;
    const o = layoutOrigin();
    const mx = anchorClientX - o.x;
    const my = anchorClientY - o.y;
    const worldX = (mx - z.tx) / z.scale;
    const worldY = (my - z.ty) / z.scale;
    setZoom(clampZoom({ scale: newScale, tx: mx - worldX * newScale, ty: my - worldY * newScale }));
  };

  // Rotella del mouse: listener non-passivo (serve preventDefault sullo scroll).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const factor = ev.deltaY < 0 ? 1.18 : 1 / 1.18;
      zoomAround(ev.clientX, ev.clientY, zoomRef.current.scale * factor);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(ev.pointerId);
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const g = gesture.current;
    if (pointers.current.size === 1) {
      g.moved = false;
      g.downX = ev.clientX;
      g.downY = ev.clientY;
      g.lastX = ev.clientX;
      g.lastY = ev.clientY;
    } else if (pointers.current.size === 2) {
      // Inizio pinch: si memorizzano distanza, punto medio e trasformazione.
      g.moved = true; // un pinch non è mai un tap
      const [a, b] = [...pointers.current.values()];
      const z = zoomRef.current;
      const o = layoutOrigin();
      const midX = (a!.x + b!.x) / 2 - o.x;
      const midY = (a!.y + b!.y) / 2 - o.y;
      g.pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1;
      g.pinchStart = { ...z };
      g.pinchWorld = { x: (midX - z.tx) / z.scale, y: (midY - z.ty) / z.scale };
    }
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const entry = pointers.current.get(ev.pointerId);
    if (!entry) return;
    entry.x = ev.clientX;
    entry.y = ev.clientY;
    const g = gesture.current;

    if (pointers.current.size === 2) {
      // Pinch: scala proporzionale alla distanza tra le dita, ancorata al centro.
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1;
      const o = layoutOrigin();
      const midX = (a!.x + b!.x) / 2 - o.x;
      const midY = (a!.y + b!.y) / 2 - o.y;
      const scale = g.pinchStart.scale * (dist / g.pinchDist);
      setZoom(
        clampZoom({
          scale,
          tx: midX - g.pinchWorld.x * scale,
          ty: midY - g.pinchWorld.y * scale,
        })
      );
      return;
    }

    if (pointers.current.size === 1) {
      const dx = ev.clientX - g.lastX;
      const dy = ev.clientY - g.lastY;
      if (
        !g.moved &&
        Math.hypot(ev.clientX - g.downX, ev.clientY - g.downY) > TAP_SLOP_PX
      ) {
        g.moved = true;
      }
      if (g.moved && zoomRef.current.scale > 1) {
        const z = zoomRef.current;
        setZoom(clampZoom({ scale: z.scale, tx: z.tx + dx, ty: z.ty + dy }));
      }
      g.lastX = ev.clientX;
      g.lastY = ev.clientY;
    }
  };

  const onPointerEnd = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const wasTap = pointers.current.size === 1 && !gesture.current.moved;
    pointers.current.delete(ev.pointerId);
    if (pointers.current.size === 1) {
      // Da pinch a trascinamento: si riparte dal dito rimasto.
      const [p] = [...pointers.current.values()];
      gesture.current.lastX = p!.x;
      gesture.current.lastY = p!.y;
      gesture.current.moved = true;
    }
    if (ev.type === 'pointercancel') return;
    if (wasTap) handleTap(ev.clientX, ev.clientY);
  };

  /** Tap: risolve il bersaglio LEGALE più vicino (raggio generoso, mobile-friendly). */
  const handleTap = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); // include la trasformazione
    const { w, h } = boardCanvasSize(view.boardRadius);
    const x = ((clientX - rect.left) / rect.width) * w;
    const y = ((clientY - rect.top) / rect.height) * h;
    const radius = view.boardRadius;
    // Priorità: vertici, poi spigoli, poi esagoni (dal bersaglio più piccolo).
    // I bersagli d'attacco (edifici avversari) sono cliccabili come i vertici.
    const clickableVertices = [...(targets.vertices ?? []), ...(targets.attackVertices ?? [])];
    if (clickableVertices.length && onPickVertex) {
      const v = nearestVertex(x, y, clickableVertices, radius);
      if (v) {
        onPickVertex(v);
        return;
      }
    }
    if (targets.edges?.length && onPickEdge) {
      const e = nearestEdge(x, y, targets.edges, radius);
      if (e) {
        onPickEdge(e);
        return;
      }
    }
    if (targets.hexes?.length && onPickHex) {
      const h = nearestHex(x, y, targets.hexes, radius);
      if (h) onPickHex(h);
    }
  };

  const dims = boardCanvasSize(view.boardRadius);

  return (
    <div ref={wrapRef} className="board-wrap area-board pixel-frame">
      <canvas
        ref={canvasRef}
        className="board-canvas"
        style={{
          width: '100%',
          aspectRatio: `${dims.w} / ${dims.h}`,
          transform: `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})`,
          transformOrigin: '0 0',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      />
      {zoom.scale > 1.01 && (
        <button
          className="pxbtn pxbtn--ghost pxbtn--small board-zoom-reset"
          onClick={() => setZoom({ scale: 1, tx: 0, ty: 0 })}
          aria-label="Reimposta zoom"
        >
          1×
        </button>
      )}
    </div>
  );
}
