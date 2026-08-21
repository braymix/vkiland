/** Schermata iniziale (dopo l'entrata): l'hub da cui si raggiunge tutto. */
import { useState } from 'react';
import { it } from '../i18n';
import { inv } from '../i18n/inventory';
import { Dialog } from '../components/dialogs/Dialog';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/** Autore del gioco (riconoscimenti). */
const AUTHOR = 'Michele Panarotto';
const AUTHOR_EMAIL = 'michelepanarotto00@gmail.com';

export function MenuScreen({
  hasAccount,
  isTester,
  onNewGame,
  onLibro,
  onInventory,
  onShop,
  onAccount,
  onDemo,
}: {
  hasAccount: boolean;
  /** Account «tester»: nei riconoscimenti riceve un ringraziamento speciale. */
  isTester: boolean;
  onNewGame: () => void;
  onLibro: () => void;
  onInventory: () => void;
  onShop: () => void;
  onAccount: () => void;
  onDemo: () => void;
}) {
  const [creditsOpen, setCreditsOpen] = useState(false);
  // Popup di ringraziamento: appare aprendo i riconoscimenti se sei un tester.
  const [testerOpen, setTesterOpen] = useState(false);
  const openCredits = () => {
    setCreditsOpen(true);
    if (isTester) setTesterOpen(true);
  };
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
        {/* Negozio: per ora una cassa gratuita al giorno (si apre all'istante).
            Punto di crescita futuro (altre casse, temi, cosmetici — mai
            pay-to-win). Funziona anche senza account (progressione locale). */}
        <button className="pxbtn pxbtn--ghost" onClick={onShop}>
          🛒 {it.negozio}
        </button>
      </div>

      <LanguageSwitcher />

      {/* Riconoscimenti: piccolo link in fondo che apre un popup con l'autore. */}
      <button className="credits-link" onClick={openCredits}>
        ⚑ {it.crediti}
      </button>

      {/* Ringraziamento ai tester: appare SOPRA i riconoscimenti. */}
      {testerOpen && (
        <Dialog title={inv.testerTitolo}>
          <div className="credits-box">
            <div className="credits-logo" aria-hidden="true">
              🛡️
            </div>
            <p className="credits-invite">{inv.testerMessaggio}</p>
            <div className="credits-thanks">{inv.testerExtra}</div>
          </div>
          <div className="dialog-buttons">
            <button className="pxbtn" onClick={() => setTesterOpen(false)}>
              {inv.chiudi}
            </button>
          </div>
        </Dialog>
      )}

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
