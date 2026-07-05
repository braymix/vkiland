/** Schermata iniziale. */
import { useState } from 'react';
import { it } from '../i18n';
import { Dialog } from '../components/dialogs/Dialog';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/** Autore del gioco (riconoscimenti). */
const AUTHOR = 'Michele Panarotto';
const AUTHOR_EMAIL = 'michelepanarotto00@gmail.com';

export function MenuScreen({
  onNewGame,
  onOnline,
  onTutorial,
  onDemo,
  onInventory,
}: {
  onNewGame: () => void;
  onOnline: () => void;
  onTutorial: () => void;
  onDemo: () => void;
  onInventory: () => void;
}) {
  const [memeOpen, setMemeOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      {/* Pulsante «a parte», in alto a destra: lancia il tour interattivo passo-passo. */}
      <button className="pxbtn pxbtn--small menu-demo-btn" onClick={onDemo}>
        ▶ {it.demo.apri}
      </button>
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
        {/* Inventario: skin del Drago e delle roccaforti. Funziona anche senza
            account (salvate sul dispositivo) — utilizzabile da subito in locale. */}
        <button className="pxbtn pxbtn--ghost" onClick={onInventory}>
          🎒 {it.inventario}
        </button>
        {/* PUNTO DI ESTENSIONE (Fase 4 — monetizzazione): negozio di skin/temi
            (cosmetici, mai pay-to-win) collegato agli entitlements del profilo. */}
        <button className="pxbtn pxbtn--ghost" disabled>
          {it.negozio}
        </button>
      </div>

      <LanguageSwitcher />

      {/* Riconoscimenti: piccolo link in fondo che apre un popup con l'autore. */}
      <button className="credits-link" onClick={() => setCreditsOpen(true)}>
        ⚑ {it.crediti}
      </button>

      {creditsOpen && (
        <Dialog title={it.crediti}>
          <div className="credits-box">
            <div className="credits-logo" aria-hidden="true">
              ⚔️
            </div>
            <div className="credits-made">{it.creditiFattoDa}</div>
            <div className="credits-name">{AUTHOR}</div>
            <p className="credits-invite">{it.creditiInvito}</p>
            <a className="credits-mail" href={`mailto:${AUTHOR_EMAIL}`}>
              ✉ {AUTHOR_EMAIL}
            </a>
            <div className="credits-thanks">{it.creditiGrazie}</div>
          </div>
          <div className="dialog-buttons">
            <button className="pxbtn" onClick={() => setCreditsOpen(false)}>
              {it.chiudi}
            </button>
          </div>
        </Dialog>
      )}

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
