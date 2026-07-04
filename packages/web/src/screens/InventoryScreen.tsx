/**
 * INVENTARIO: le skin legate all'account (salvate sul server, visibili a tutti
 * in partita). Due scaffali: l'aspetto del Drago — che in gioco prende aspetto
 * E colore di chi lo ha spostato per ultimo (logica dei colori invariata) — e
 * l'aspetto delle proprie roccaforti (sempre tinte del colore del clan).
 */
import { useEffect, useRef, useState } from 'react';
import type { PlayerCosmetics } from '@vikiland/engine';
import { it } from '../i18n';
import { apiGetCosmetics, apiSetCosmetics, type OnlineSession } from '../online/connection';
import { spriteDataURL } from '../render/sprites/bake';
import { DRAGON_SKINS, STRONGHOLD_SKINS, type SkinOption } from '../render/sprites/cosmetics';

/** Le roccaforti in anteprima si tingono di un colore di esempio (rosso classico). */
const PREVIEW_COLOR = '#c0392b';

function SkinCard({
  opt,
  selected,
  tint,
  onPick,
}: {
  opt: SkinOption;
  selected: boolean;
  tint: string | null;
  onPick: () => void;
}) {
  const label = (it.skin as Record<string, string>)[opt.id] ?? opt.id;
  return (
    <button
      className={`skin-card ${selected ? 'skin-card--on' : ''}`}
      onClick={onPick}
      aria-pressed={selected}
    >
      <img src={spriteDataURL(`inv-${opt.id}`, opt.def, 4, tint)} alt="" />
      <span className="skin-name">{label}</span>
      {selected && <span className="skin-badge">✓ {it.invSelezionato}</span>}
    </button>
  );
}

export function InventoryScreen({
  session,
  onBack,
}: {
  session: OnlineSession;
  onBack: () => void;
}) {
  const [cosmetics, setCosmetics] = useState<PlayerCosmetics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void apiGetCosmetics(session)
      .then(setCosmetics)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Errore di rete'));
  }, [session]);

  useEffect(() => () => {
    if (savedTimer.current !== null) clearTimeout(savedTimer.current);
  }, []);

  /** Selezione ottimista + salvataggio sull'account (il server valida gli id). */
  const pick = (patch: PlayerCosmetics) => {
    if (!cosmetics) return;
    const next = { ...cosmetics, ...patch };
    setCosmetics(next);
    void apiSetCosmetics(session, next)
      .then((fromServer) => {
        setCosmetics(fromServer);
        setSaved(true);
        if (savedTimer.current !== null) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaved(false), 1600);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Errore di rete'));
  };

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>{it.inventario}</h2>
      <div className="menu-sub" style={{ fontSize: 9 }}>
        {it.invSottotitolo}
      </div>
      <div className="setup-grid pixel-frame" style={{ maxWidth: 460 }}>
        {error && <div style={{ fontSize: 9, color: 'var(--danger)' }}>{error}</div>}
        {!cosmetics && !error && (
          <div style={{ fontSize: 9, color: 'var(--ink-dim)' }}>{it.connessioneInCorso}</div>
        )}
        {cosmetics && (
          <>
            <div className="inv-section">{it.invDrago}</div>
            <div className="inv-info">{it.invDragoInfo}</div>
            <div className="skin-grid">
              {DRAGON_SKINS.map((opt) => (
                <SkinCard
                  key={opt.id}
                  opt={opt}
                  tint={null}
                  selected={(cosmetics.dragon ?? 'drago') === opt.id}
                  onPick={() => pick({ dragon: opt.id })}
                />
              ))}
            </div>
            <div className="inv-section">{it.invRocca}</div>
            <div className="inv-info">{it.invRoccaInfo}</div>
            <div className="skin-grid">
              {STRONGHOLD_SKINS.map((opt) => (
                <SkinCard
                  key={opt.id}
                  opt={opt}
                  tint={PREVIEW_COLOR}
                  selected={(cosmetics.stronghold ?? 'roccaforte') === opt.id}
                  onPick={() => pick({ stronghold: opt.id })}
                />
              ))}
            </div>
            <div className="inv-saved" data-visible={saved}>
              {it.invSalvato}
            </div>
          </>
        )}
      </div>
      <button className="pxbtn pxbtn--ghost" onClick={onBack}>
        {it.indietro}
      </button>
    </div>
  );
}
