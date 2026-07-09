/**
 * Pannello di gestione partita a comparsa (bottom-sheet), aperto dal pulsante ☰
 * nell'HUD. Sostituisce la vecchia `.game-exit-bar`: raccoglie in un unico posto
 * il codice invito (solo online), lo stato dei giocatori e le azioni
 * Riprendi / Esci / Termina — con le stesse conferme di prima.
 */
import { useState } from 'react';
import type { PlayerColor } from '@vikiland/engine';
import { it, t } from '../i18n';
import { shadesFor } from '../render/sprites/palettes';
import { Dialog } from './dialogs/Dialog';

/** Un giocatore mostrato nella lista di gestione (con stato di connessione). */
export interface ManagePlayer {
  name: string;
  isBot: boolean;
  color: PlayerColor;
  /** Solo online: false = giocatore momentaneamente offline. */
  connected: boolean;
  isHost: boolean;
}

/** Contesto di gestione passato alla GameScreen: locale oppure online. */
export interface ManageInfo {
  online: boolean;
  /** Codice invito (solo online); null in locale. */
  code: string | null;
  isHost: boolean;
  players: ManagePlayer[];
  /** ⇠ Esci: torna al menu (locale) o esci dalla lobby (online). */
  onLeave: () => void;
  /** ✕ Termina per tutti (solo host online); null altrimenti. */
  onTerminate: (() => void) | null;
}

export function ManageSheet({
  manage,
  onClose,
}: {
  manage: ManageInfo;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);

  const copyCode = () => {
    if (!manage.code) return;
    navigator.clipboard?.writeText(manage.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Mentre una conferma è aperta si nasconde la tendina: il dialog (.dialog-backdrop,
  // z-50) sta SOTTO la sheet (z-60), quindi lasciandole entrambe la sheet coprirebbe
  // i pulsanti del popup (bug: non si riusciva a confermare l'uscita). Nascosta la
  // sheet, il popup resta solo e centrato; «Annulla» la fa riapparire.
  const confirming = leaveOpen || terminateOpen;

  return (
    <>
      {!confirming && (
        <>
          <div className="manage-scrim" onClick={onClose} aria-hidden="true" />
          <div className="manage-sheet" role="dialog" aria-label={it.gestionePartita}>
            <button className="manage-handle" onClick={onClose} aria-label={it.chiudi} />
            <h2 className="manage-title">{it.gestionePartita}</h2>

            {manage.online && manage.code && (
              <div className="invite-card">
                <span className="invite-label">{it.codiceInvito}</span>
                <span className="invite-code">{manage.code}</span>
                <button className="pxbtn pxbtn--small" onClick={copyCode}>
                  {copied ? it.copiato : it.copia}
                </button>
              </div>
            )}

            <div className="manage-players">
              {manage.players.map((p, i) => (
                <div key={i} className="manage-player">
                  <span className="player-chip" style={{ background: shadesFor(p.color).main }} />
                  <span className="manage-player-name">
                    {p.name}
                    {p.isBot && <span style={{ color: 'var(--ink-dim)' }}> (bot)</span>}
                    {p.isHost && <span style={{ color: 'var(--accent)' }}> ({it.hostTag})</span>}
                  </span>
                  {manage.online && !p.isBot && (
                    <span
                      className="conn-dot"
                      style={{ background: p.connected ? 'var(--ok)' : 'var(--danger)' }}
                      title={p.connected ? it.hostTag : it.statoOffline}
                    />
                  )}
                  {manage.online && !p.isBot && !p.connected && (
                    <span style={{ fontSize: 8, color: 'var(--danger)' }}>{it.statoOffline}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="manage-actions">
              <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={onClose}>
                ↩ {it.riprendi}
              </button>
              <button
                className="pxbtn pxbtn--ghost pxbtn--small"
                onClick={() => setLeaveOpen(true)}
              >
                ⇠ {it.esciPartita}
              </button>
              {manage.onTerminate && (
                <button
                  className="pxbtn pxbtn--danger pxbtn--small"
                  onClick={() => setTerminateOpen(true)}
                >
                  ✕ {it.terminaPartita}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {leaveOpen && (
        <Dialog title={it.esciPartitaTitolo}>
          <p style={{ fontSize: 9, lineHeight: 1.9 }}>
            {manage.online
              ? t(it.esciPartitaTesto, { code: manage.code ?? '' })
              : it.esciLocaleTesto}
          </p>
          <div className="dialog-buttons">
            <button className="pxbtn pxbtn--ghost" onClick={() => setLeaveOpen(false)}>
              {it.annulla}
            </button>
            <button
              className="pxbtn"
              onClick={() => {
                setLeaveOpen(false);
                manage.onLeave();
              }}
            >
              {it.esciPartitaConferma}
            </button>
          </div>
        </Dialog>
      )}

      {terminateOpen && manage.onTerminate && (
        <Dialog title={it.terminaTitolo}>
          <p style={{ fontSize: 9, lineHeight: 1.9 }}>{it.terminaTesto}</p>
          <div className="dialog-buttons">
            <button className="pxbtn pxbtn--ghost" onClick={() => setTerminateOpen(false)}>
              {it.annulla}
            </button>
            <button
              className="pxbtn pxbtn--danger"
              onClick={() => {
                setTerminateOpen(false);
                manage.onTerminate?.();
              }}
            >
              {it.terminaConferma}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
