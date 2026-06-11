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

export function FullscreenMap(props: Props) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [props.onClose]);

  return (
    <div className="fullscreen-map-backdrop">
      <div className="fullscreen-map">
        <button className="fullscreen-map-close" onClick={props.onClose} aria-label="Chiudi mappa">
          ✕
        </button>
        <BoardCanvas
          view={props.view}
          targets={props.targets}
          onPickVertex={props.onPickVertex}
          onPickEdge={props.onPickEdge}
          onPickHex={props.onPickHex}
        />
      </div>
    </div>
  );
}
