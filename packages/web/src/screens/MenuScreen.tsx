/** Schermata iniziale. */
import { useState } from 'react';
import { it } from '../i18n/it';
import { Dialog } from '../components/dialogs/Dialog';

export function MenuScreen({
  onNewGame,
  onOnline,
  onTutorial,
}: {
  onNewGame: () => void;
  onOnline: () => void;
  onTutorial: () => void;
}) {
  const [memeOpen, setMemeOpen] = useState(false);
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h1 className="menu-title">{it.titolo}</h1>
      <div className="menu-sub">{it.sottotitolo}</div>
      <div className="menu-buttons">
        <button className="pxbtn" onClick={() => setMemeOpen(true)}>
          {it.nuovaPartita}
        </button>
        <button className="pxbtn pxbtn--ghost" onClick={onOnline}>
          {it.multigiocatore}
        </button>
        <button className="pxbtn pxbtn--ghost" onClick={onTutorial}>
          {it.comeSiGioca}
        </button>
        {/* PUNTO DI ESTENSIONE (Fase 4 — monetizzazione): negozio di skin/temi
            (cosmetici, mai pay-to-win) collegato agli entitlements del profilo. */}
        <button className="pxbtn pxbtn--ghost" disabled>
          {it.negozio}
        </button>
      </div>

      {/* Popup scherzoso pre-partita. PUNTO DI ESTENSIONE (Fase 4): qui un
          giorno andranno davvero ads/abbonamento — per ora è solo un meme. */}
      {memeOpen && (
        <Dialog title={it.memeTitolo}>
          <p style={{ fontSize: 9, lineHeight: 1.9 }}>{it.memeTesto}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="pxbtn pxbtn--ghost" disabled>
              {it.memePubblicita}
            </button>
            <button className="pxbtn pxbtn--ghost" disabled>
              {it.memePro}
            </button>
            <button
              className="pxbtn"
              onClick={() => {
                setMemeOpen(false);
                onNewGame();
              }}
            >
              {it.memeAvanti}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
