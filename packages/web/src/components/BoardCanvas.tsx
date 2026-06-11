/**
 * Canvas interattivo della tavola: rendering pixel-art + hit-testing.
 * Il tap viene risolto sul bersaglio LEGALE più vicino (raggio generoso:
 * funziona bene anche con le dita su mobile, perché i bersagli sono radi).
 */
import { useEffect, useRef } from 'react';
import type { EdgeId, HexId, PlayerView, VertexId } from '@vikiland/engine';
import { renderBoard } from '../render/boardRenderer';
import {
  CANVAS_H,
  CANVAS_W,
  nearestEdge,
  nearestHex,
  nearestVertex,
} from '../render/layout';

export interface BoardTargets {
  vertices?: VertexId[];
  edges?: EdgeId[];
  hexes?: HexId[];
}

interface Props {
  view: PlayerView;
  targets: BoardTargets;
  onPickVertex?: (v: VertexId) => void;
  onPickEdge?: (e: EdgeId) => void;
  onPickHex?: (h: HexId) => void;
}

export function BoardCanvas({ view, targets, onPickVertex, onPickEdge, onPickHex }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderBoard(canvas, view, {
      highlightVertices: targets.vertices,
      highlightEdges: targets.edges,
      highlightHexes: targets.hexes,
    });
  }, [view, targets]);

  const handlePointer = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * CANVAS_W;
    const y = ((ev.clientY - rect.top) / rect.height) * CANVAS_H;

    // Priorità: vertici, poi spigoli, poi esagoni (dal bersaglio più piccolo).
    if (targets.vertices?.length && onPickVertex) {
      const v = nearestVertex(x, y, targets.vertices);
      if (v) {
        onPickVertex(v);
        return;
      }
    }
    if (targets.edges?.length && onPickEdge) {
      const e = nearestEdge(x, y, targets.edges);
      if (e) {
        onPickEdge(e);
        return;
      }
    }
    if (targets.hexes?.length && onPickHex) {
      const h = nearestHex(x, y, targets.hexes);
      if (h) onPickHex(h);
    }
  };

  return (
    <div className="board-wrap area-board pixel-frame">
      <canvas
        ref={canvasRef}
        className="board-canvas"
        style={{ width: '100%', aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        onPointerDown={handlePointer}
      />
    </div>
  );
}
