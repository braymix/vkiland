/** Schermata iniziale. */
import { it } from '../i18n/it';

export function MenuScreen({
  onNewGame,
  onOnline,
}: {
  onNewGame: () => void;
  onOnline: () => void;
}) {
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h1 className="menu-title">{it.titolo}</h1>
      <div className="menu-sub">{it.sottotitolo}</div>
      <div className="menu-buttons">
        <button className="pxbtn" onClick={onNewGame}>
          {it.nuovaPartita}
        </button>
        <button className="pxbtn pxbtn--ghost" onClick={onOnline}>
          {it.multigiocatore}
        </button>
        {/* PUNTO DI ESTENSIONE (Fase 4 — monetizzazione): negozio di skin/temi
            (cosmetici, mai pay-to-win) collegato agli entitlements del profilo. */}
        <button className="pxbtn pxbtn--ghost" disabled>
          {it.negozio}
        </button>
      </div>
    </div>
  );
}
