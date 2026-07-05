/** Mappa a schermo intero: interattiva, chiudibile con ESC o bottone X. */
import { useEffect } from 'react';
import { BoardCanvas, type BoardTargets } from './BoardCanvas';
import type { PlayerView } from '@vikiland/engine';

interface Props {
  view: PlayerView;
  targets: BoardTargets;
  onPickVertex?: (v: string) => void;
  onPickEdge?: (e: string) => void;
  onPickHex?: (h: string) => void;
  onClose: () => void;
}

export function FullscreenMap({ view, targets, onPickVertex, onPickEdge, onPickHex, onClose }: Props) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fullscreen-map-backdrop">
      <div className="fullscreen-map">
        <button className="fullscreen-map-close" onClick={onClose} aria-label="Chiudi mappa">
          ✕
        </button>
        <BoardCanvas
          view={view}
          targets={targets}
          onPickVertex={onPickVertex}
          onPickEdge={onPickEdge}
          onPickHex={onPickHex}
        />
      </div>
    </div>
  );
}
