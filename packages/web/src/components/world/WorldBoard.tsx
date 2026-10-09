/** Canvas della mappa: disegno, pan, zoom (rotella/pinch) e tocco sui territori. */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { WorldPlayerView } from '@vikiland/engine-world';
import {
  WORLD_H,
  WORLD_W,
  WorldRenderer,
  fitCamera,
  mapBounds,
  type Bounds,
  type Camera,
} from '../../render/world/worldRenderer';

export interface WorldBoardHandle {
  fit(): void;
  centerOn(territory: string, zoom?: number): void;
  zoomBy(factor: number): void;
}

interface Props {
  view: WorldPlayerView;
  selected: string | null;
  reachable: Map<string, { cost: number; toll: number }>;
  highlights: Set<string>;
  dimmed?: Set<string>;
  onSelect: (id: string | null) => void;
}

export const WorldBoard = forwardRef<WorldBoardHandle, Props>(function WorldBoard(
  { view, selected, reachable, highlights, dimmed, onSelect },
  ref
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WorldRenderer | null>(null);
  const camRef = useRef<Camera>({ scale: 2, cx: WORLD_W / 2, cy: WORLD_H / 2 });
  const sizeRef = useRef({ w: 300, h: 300 });
  const propsRef = useRef({ view, selected, reachable, highlights, dimmed });
  propsRef.current = { view, selected, reachable, highlights, dimmed };
  const rafRef = useRef(0);
  const initialised = useRef(false);
  const boundsRef = useRef<Bounds | null>(null);
  const boundsMap = useRef<unknown>(null);
  /** Riquadro della mappa attuale (ricalcolato solo se cambia la mappa). */
  const bounds = useCallback((): Bounds => {
    const m = propsRef.current.view.map;
    if (boundsMap.current !== m || !boundsRef.current) {
      boundsRef.current = mapBounds(m);
      boundsMap.current = m;
    }
    return boundsRef.current;
  }, []);

  const draw = useCallback(() => {
    rafRef.current = 0;
    const r = rendererRef.current;
    if (!r) return;
    const p = propsRef.current;
    r.draw({
      view: p.view,
      camera: camRef.current,
      width: sizeRef.current.w,
      height: sizeRef.current.h,
      selected: p.selected,
      reachable: p.reachable,
      highlights: p.highlights,
      ...(p.dimmed ? { dimmed: p.dimmed } : {}),
    });
  }, []);
  const schedule = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const clamp = useCallback((c: Camera): Camera => {
    const fit = fitCamera(sizeRef.current.w, sizeRef.current.h, bounds()).scale;
    return {
      scale: Math.max(fit * 0.9, Math.min(12, c.scale)),
      cx: Math.max(0, Math.min(WORLD_W, c.cx)),
      cy: Math.max(0, Math.min(WORLD_H, c.cy)),
    };
  }, [bounds]);

  useImperativeHandle(ref, () => ({
    fit() {
      camRef.current = fitCamera(sizeRef.current.w, sizeRef.current.h, bounds());
      schedule();
    },
    centerOn(id, zoom = 3.2) {
      const c = rendererRef.current?.center(propsRef.current.view.map, id);
      if (!c) return;
      camRef.current = clamp({ scale: Math.max(zoom, camRef.current.scale), cx: c[0], cy: c[1] });
      schedule();
    },
    zoomBy(f) {
      camRef.current = clamp({ ...camRef.current, scale: camRef.current.scale * f });
      schedule();
    },
  }));

  // Dimensioni e canvas
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    rendererRef.current = new WorldRenderer(canvas);
    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w === 0 || h === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w, h };
      if (!initialised.current) {
        initialised.current = true;
        // Nel setup si parte dal mondo intero; poi centrata sul Jarl di chi guarda.
        const v = propsRef.current.view;
        const me = v.viewer;
        const jarl = me !== null && v.phase.type !== 'setup' ? v.players[me]?.jarl : null;
        const c = jarl ? rendererRef.current?.center(v.map, jarl) : null;
        const fit = fitCamera(w, h, bounds());
        camRef.current = c ? clamp({ scale: Math.max(fit.scale, 3), cx: c[0], cy: c[1] }) : fit;
      } else camRef.current = clamp(camRef.current);
      schedule();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [schedule, clamp, bounds]);

  useEffect(() => {
    schedule();
  }, [view, selected, reachable, highlights, dimmed, schedule]);

  // Gesti: un dito = pan (o tocco), due dita = pinch, rotella = zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, startDist: 0, startScale: 1, down: { x: 0, y: 0 } });

  const local = (e: React.PointerEvent | React.WheelEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    gesture.current.moved = false;
    gesture.current.down = p;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.startDist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      gesture.current.startScale = camRef.current.scale;
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (gesture.current.startDist > 0) {
        camRef.current = clamp({ ...camRef.current, scale: (gesture.current.startScale * d) / gesture.current.startDist });
        gesture.current.moved = true;
        schedule();
      }
      return;
    }
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    if (Math.hypot(p.x - gesture.current.down.x, p.y - gesture.current.down.y) > 6) gesture.current.moved = true;
    if (gesture.current.moved) {
      const c = camRef.current;
      camRef.current = clamp({ ...c, cx: c.cx - dx / c.scale, cy: c.cy - dy / c.scale });
      schedule();
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const had = pointers.current.delete(e.pointerId);
    if (had && pointers.current.size === 0 && !gesture.current.moved) {
      const p = local(e);
      const id = rendererRef.current?.hit(
        propsRef.current.view,
        camRef.current,
        sizeRef.current.w,
        sizeRef.current.h,
        p.x,
        p.y
      );
      onSelect(id ?? null);
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    const p = local(e);
    const c = camRef.current;
    const { w, h } = sizeRef.current;
    // zoom verso il puntatore
    const wx = (p.x - w / 2) / c.scale + c.cx;
    const wy = (p.y - h / 2) / c.scale + c.cy;
    const next = clamp({ ...c, scale: c.scale * factor });
    camRef.current = clamp({
      scale: next.scale,
      cx: wx - (p.x - w / 2) / next.scale,
      cy: wy - (p.y - h / 2) / next.scale,
    });
    schedule();
  };

  return (
    <div ref={wrapRef} className="wboard" onWheel={onWheel}>
      <canvas
        ref={canvasRef}
        className="wboard-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
});
