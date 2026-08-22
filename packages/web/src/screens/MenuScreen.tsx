/** Schermata iniziale (dopo l'entrata): l'hub da cui si raggiunge tutto. */
import { useEffect, useState } from 'react';
import {
  readyChestCount,
  pendingMissionCount,
  pendingShopCount,
  type PlayerProgression,
} from '@vikiland/engine';
import { it } from '../i18n';
import { inv } from '../i18n/inventory';
import { localDayKey } from '../game/progression';
import { Dialog } from '../components/dialogs/Dialog';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/** Autore del gioco (riconoscimenti). */
const AUTHOR = 'Michele Panarotto';
const AUTHOR_EMAIL = 'michelepanarotto00@gmail.com';

/**
 * Pallino rosso «da fare»: appare accanto a un pulsante del menu col NUMERO di
 * azioni in sospeso in quel menu (missioni da vincere, casse pronte, riscatti
 * del Negozio). Se il conteggio è 0 non mostra nulla.
 */
function ActionBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="menu-badge" aria-label={inv.azioniDaFare(count)}>
      {count}
    </span>
  );
}

export function MenuScreen({
  hasAccount,
  isTester,
  progression,
  onNewGame,
  onLibro,
  onInventory,
  onMissions,
  onShop,
  onAccount,
  onDemo,
}: {
  hasAccount: boolean;
  /** Account «tester»: nei riconoscimenti riceve un ringraziamento speciale. */
  isTester: boolean;
  /** Progressione corrente: alimenta i pallini rossi «da fare» sui pulsanti. */
  progression: PlayerProgression;
  onNewGame: () => void;
  onLibro: () => void;
  onInventory: () => void;
  onMissions: () => void;
  onShop: () => void;
  onAccount: () => void;
  onDemo: () => void;
}) {
  const [creditsOpen, setCreditsOpen] = useState(false);
  // Orologio per i badge «da fare»: le casse diventano pronte e la bacheca
  // scade col passare del tempo. Basta un colpo ogni 30s (durate nell'ordine
  // delle ore), così un pallino compare anche restando fermi sul menu.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Azioni in sospeso per menu (i tester hanno tutto sbloccato, ma i riscatti/
  // casse/missioni restano azioni compibili: il conteggio vale comunque).
  const missionsPending = pendingMissionCount(progression, now);
  const chestsPending = readyChestCount(progression, now);
  const shopPending = pendingShopCount(progression, localDayKey(now));
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
        {/* Missioni: partite casuali da vincere per casse gratis (facile/normale).
            Funziona anche senza account (progressione sul dispositivo). */}
        <button className="pxbtn pxbtn--ghost" onClick={onMissions}>
          🗺️ {inv.missioniTitolo}
          <ActionBadge count={missionsPending} />
        </button>
        {/* «Come si gioca» rinominato: è il Libro delle Saghe (tutorial). */}
        <button className="pxbtn pxbtn--ghost" onClick={onLibro}>
          {it.libroSaghe}
        </button>
        {/* Inventario: skin del Drago e delle roccaforti. Funziona anche senza
            account (salvate sul dispositivo) — utilizzabile da subito in locale. */}
        <button className="pxbtn pxbtn--ghost" onClick={onInventory}>
          🎒 {it.inventario}
          <ActionBadge count={chestsPending} />
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
          <ActionBadge count={shopPending} />
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
