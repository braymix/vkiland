/** Mappa a schermo intero: interattiva, chiudibile con ESC o bottone X. */
import { useEffect, type CSSProperties } from 'react';
import { BoardCanvas, type BoardTargets } from './BoardCanvas';
import { boardCanvasSize } from '../render/layout';
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

  // Proporzioni REALI della tavola: così l'ingrandimento riempie lo schermo
  // (larghezza in verticale, altezza in orizzontale) SENZA deformare né
  // ritagliare. Senza questo la mappa restava un quadrato 90vmin, più piccola
  // della tavola in pagina su mobile in verticale — «l'ingrandimento non si
  // vedeva». Espone il rapporto come variabile CSS, letta dal `.board-wrap`.
  const dims = boardCanvasSize(view.boardRadius);
  const mapStyle = { '--board-ar': dims.w / dims.h } as CSSProperties;

  return (
    <div className="fullscreen-map-backdrop">
      <div className="fullscreen-map" style={mapStyle}>
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
