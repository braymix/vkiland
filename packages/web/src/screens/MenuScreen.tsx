/** Schermata iniziale (dopo l'entrata): l'hub da cui si raggiunge tutto. */
import { useState } from 'react';
import { it } from '../i18n';
import { Dialog } from '../components/dialogs/Dialog';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/** Autore del gioco (riconoscimenti). */
const AUTHOR = 'Michele Panarotto';
const AUTHOR_EMAIL = 'michelepanarotto00@gmail.com';

export function MenuScreen({
  hasAccount,
  onNewGame,
  onLibro,
  onInventory,
  onAccount,
  onDemo,
}: {
  hasAccount: boolean;
  onNewGame: () => void;
  onLibro: () => void;
  onInventory: () => void;
  onAccount: () => void;
  onDemo: () => void;
}) {
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
        {/* Nuova partita: da qui la «partita classica» (offline vs bot) e,
            con un account, anche l'online. Niente più popup scherzoso. */}
        <button className="pxbtn" onClick={onNewGame}>
          {it.nuovaPartita}
        </button>
        {/* «Come si gioca» rinominato: è il Libro delle Saghe (tutorial). */}
        <button className="pxbtn pxbtn--ghost" onClick={onLibro}>
          {it.libroSaghe}
        </button>
        {/* Inventario: skin del Drago e delle roccaforti. Funziona anche senza
            account (salvate sul dispositivo) — utilizzabile da subito in locale. */}
        <button className="pxbtn pxbtn--ghost" onClick={onInventory}>
          🎒 {it.inventario}
        </button>
        {/* Gestione account: se non hai un account porta all'entrata (accedi). */}
        <button className="pxbtn pxbtn--ghost" onClick={onAccount}>
          👤 {it.gestioneAccount}
          {!hasAccount && (
            <span style={{ color: 'var(--ink-dim)', fontSize: 8 }}> · {it.accedi}</span>
          )}
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
    </div>
  );
}
