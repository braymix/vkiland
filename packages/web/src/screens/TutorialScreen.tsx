/**
 * «Libro delle Saghe»: tutorial a capitoli su regole e uso dell'app.
 * Overlay a tutto schermo, usabile dal menu, dalla partita e dall'Online
 * (che lo apre direttamente sul capitolo «Giocare online»).
 */
import { useEffect, useRef, useState } from 'react';
import { BUILD_COSTS, SAGA_DECK_COMPOSITION, flattenResources, RESOURCES } from '@vikiland/engine';
import type { SagaCard } from '@vikiland/engine';
import { it, t } from '../i18n/it';
import { TUTORIAL, type TutorialBlock } from '../i18n/tutorial';
import { ResIcon, SagaIcon } from '../components/icons';

const BUILD_LABEL = {
  sentiero: it.sentiero,
  villaggio: it.villaggio,
  roccaforte: it.roccaforte,
  cartaSaga: it.compraCarta,
} as const;

/** Le 5 Carte Saga con quante copie ha il mazzo. */
const SAGA_KINDS: SagaCard[] = ['berserker', 'sagaDegliEroi', 'costruttoriDiSentieri', 'banchetto', 'tributo'];
const sagaCount = (card: SagaCard) => SAGA_DECK_COMPOSITION.filter((c) => c === card).length;

function Block({ block }: { block: TutorialBlock }) {
  switch (block.t) {
    case 'h':
      return <h3 className="tutorial-h">{block.text}</h3>;
    case 'p':
      return <p className="tutorial-p">{block.text}</p>;
    case 'list':
      return (
        <ul className="tutorial-list">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'tip':
      return <div className="tutorial-tip">⚑ {block.text}</div>;
    case 'cost':
      return (
        <div className="tutorial-cost">
          <span className="tutorial-cost-label">{BUILD_LABEL[block.kind]}</span>
          <span style={{ display: 'inline-flex', gap: 2 }}>
            {flattenResources(BUILD_COSTS[block.kind]).map((r, i) => (
              <ResIcon key={i} r={r} scale={2} />
            ))}
          </span>
          <span className="tutorial-cost-note">{block.note}</span>
        </div>
      );
    case 'resRow':
      return (
        <div className="tutorial-resrow">
          {RESOURCES.map((r) => (
            <span key={r} className="tutorial-resrow-item">
              <ResIcon r={r} scale={3} />
              <span>{it.risorsa[r]}</span>
            </span>
          ))}
        </div>
      );
    case 'sagaList':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SAGA_KINDS.map((card) => (
            <div key={card} className="tutorial-saga">
              <SagaIcon card={card} scale={3} />
              <div>
                <b>
                  {it.cartaSaga[card]} ×{sagaCount(card)}
                </b>
                <div className="tutorial-cost-note">{it.descrizioneCarta[card]}</div>
              </div>
            </div>
          ))}
        </div>
      );
  }
}

export function TutorialScreen({
  onClose,
  initialChapter = 0,
}: {
  onClose: () => void;
  initialChapter?: number;
}) {
  const [idx, setIdx] = useState(Math.min(Math.max(0, initialChapter), TUTORIAL.length - 1));
  const contentRef = useRef<HTMLDivElement>(null);
  const chapter = TUTORIAL[idx]!;

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [idx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(TUTORIAL.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="tutorial-screen">
      <div className="tutorial-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ color: 'var(--accent)', fontSize: 12, flex: 1 }}>{it.libroSaghe}</h2>
          <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="tutorial-chips">
          {TUTORIAL.map((c, i) => (
            <button
              key={i}
              className={`pxbtn pxbtn--small ${i === idx ? '' : 'pxbtn--ghost'}`}
              onClick={() => setIdx(i)}
            >
              {c.chip}
            </button>
          ))}
        </div>
        <div ref={contentRef} className="tutorial-content pixel-frame">
          <h2 className="tutorial-title">{chapter.title}</h2>
          {chapter.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>
        <div className="tutorial-nav">
          <button
            className="pxbtn pxbtn--ghost"
            disabled={idx === 0}
            onClick={() => setIdx(idx - 1)}
          >
            ← {it.indietro}
          </button>
          <span style={{ fontSize: 8, color: 'var(--ink-dim)' }}>
            {t(it.capitoloDi, { n: idx + 1, tot: TUTORIAL.length })}
          </span>
          {idx < TUTORIAL.length - 1 ? (
            <button className="pxbtn" onClick={() => setIdx(idx + 1)}>
              {it.avanti} →
            </button>
          ) : (
            <button className="pxbtn" onClick={onClose}>
              {it.chiudi}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
