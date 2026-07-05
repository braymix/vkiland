/** Calamità rivelata: modal full-screen con nome, descrizione, effetto. */
import { useEffect, useRef, useState } from 'react';
import type { CalamityCard } from '@vikiland/engine';
import { it } from '../i18n';
import { calamityDesc, calamityName } from '../game/calamityText';

export function CalamityRevealedModal({
  card,
  remaining,
  onClose,
}: {
  card: CalamityCard;
  remaining: number;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(true);
  // onClose è una arrow function ricreata a ogni render del genitore: la teniamo in
  // una ref così il timer sotto parte una volta sola al mount e non si resetta mai.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onCloseRef.current(), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        animation: 'fadeIn 200ms ease-in',
        cursor: 'pointer',
      }}
      onClick={() => {
        setVisible(false);
        setTimeout(() => onCloseRef.current(), 300);
      }}
    >
      <div
        style={{
          background: 'var(--bg)',
          border: '3px solid var(--accent)',
          padding: '24px 32px',
          borderRadius: 0,
          textAlign: 'center',
          maxWidth: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          animation: 'slideUp 300ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: 'var(--accent)' }}>
          ⚡ {calamityName(card)}
        </div>
        <div style={{ fontSize: 14, marginBottom: 12, color: 'var(--ink)', lineHeight: 1.6 }}>
          {calamityDesc(card)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 16 }}>
          {remaining} {it.calamita.rimaste}
        </div>
        <button
          className="pxbtn pxbtn--small"
          style={{ marginTop: 16 }}
          onClick={() => {
            setVisible(false);
            setTimeout(() => onCloseRef.current(), 300);
          }}
        >
          {it.chiudi}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
