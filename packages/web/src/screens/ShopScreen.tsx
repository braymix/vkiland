/**
 * NEGOZIO. Per ora offre una sola cosa: una CASSA GRATUITA al giorno che si
 * apre ISTANTANEAMENTE (nessun caricamento, a differenza delle casse guadagnate
 * a fine partita). Come l'inventario funziona SEMPRE, anche senza account: la
 * progressione vive sul dispositivo (localStorage) e, se c'è una sessione
 * «Online» valida, resta invece legata all'account e ti segue ovunque. Il
 * «giorno» è la data locale del dispositivo: a mezzanotte la cassa torna
 * disponibile. Questo schermo è il punto di crescita del Negozio (in futuro:
 * altre casse, temi, cosmetici — mai pay-to-win).
 */
import { useEffect, useState } from 'react';
import {
  canClaimFreeChest,
  canRedeemUncommon,
  isHeroUnlocked,
  FRAGMENTS_PER_HERO,
  heroDef,
  UNCOMMON_HERO_IDS,
  type HeroId,
  type PlayerProgression,
  type ChestOpenResult,
  type RedeemResult,
} from '@vikiland/engine';
import { it } from '../i18n';
import { inv } from '../i18n/inventory';
import { loadSession, type OnlineSession } from '../online/connection';
import {
  loadProgression,
  claimFreeChestAndSave,
  redeemUncommonAndSave,
  localDayKey,
} from '../game/progression';
import { HeroArt } from '../components/HeroArt';
import { Dialog } from '../components/dialogs/Dialog';

/** Best-effort: notifica di sistema allo sblocco di un eroe (se già concesso il permesso). */
function notifyUnlock(heroName: string): void {
  try {
    if (typeof Notification === 'undefined') return;
    const show = () => new Notification(inv.notSbloccoTitolo, { body: inv.notSblocco(heroName) });
    if (Notification.permission === 'granted') show();
    else if (Notification.permission !== 'denied')
      void Notification.requestPermission().then((p) => {
        if (p === 'granted') show();
      });
  } catch {
    /* Notifiche non disponibili: resta comunque il popup in-app. */
  }
}

export function ShopScreen({ onBack }: { onBack: () => void }) {
  const [prog, setProg] = useState<PlayerProgression | null>(null);
  // Sessione online rilevata automaticamente (se assente o non più valida, il
  // Negozio resta comunque pienamente usabile in locale).
  const [session, setSession] = useState<OnlineSession | null>(null);
  const [openResult, setOpenResult] = useState<ChestOpenResult | null>(null);
  const [claiming, setClaiming] = useState(false);
  // Riscatto una-tantum di un eroe non comune a scelta.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);

  // Carica la progressione: dall'account se raggiungibile, altrimenti locale.
  useEffect(() => {
    const existing = loadSession();
    void loadProgression(existing)
      .then((p) => {
        setSession(existing);
        setProg(p);
      })
      .catch(() => setProg({}));
  }, []);

  const today = localDayKey();
  const available = prog ? canClaimFreeChest(prog, today) : false;
  const redeemAvailable = prog ? canRedeemUncommon(prog) : false;

  /** Riscatta l'eroe non comune scelto (una volta per account) e mostra l'esito. */
  const handleRedeem = async (heroId: HeroId) => {
    if (!prog || redeeming || !redeemAvailable) return;
    setRedeeming(true);
    try {
      const result = await redeemUncommonAndSave(session, heroId);
      if (result) {
        setProg(result.progression);
        setRedeemResult(result);
        setPickerOpen(false);
        notifyUnlock(heroDef(result.heroId)?.name ?? '');
      } else {
        // Riscatto già usato altrove: riallinea lo stato.
        void loadProgression(session).then(setProg);
      }
    } finally {
      setRedeeming(false);
    }
  };

  /** Riscuote la cassa gratuita del giorno (apre all'istante) e mostra l'esito. */
  const handleClaim = async () => {
    if (!prog || claiming || !available) return;
    setClaiming(true);
    try {
      const result = await claimFreeChestAndSave(session);
      if (result) {
        setProg(result.progression);
        setOpenResult(result);
        if (result.unlockedNow) notifyUnlock(heroDef(result.heroId)?.name ?? '');
      } else {
        // Un'altra sessione l'ha già riscossa oggi: riallinea lo stato.
        void loadProgression(session).then(setProg);
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>{it.negozio}</h2>
      <div className="menu-sub" style={{ fontSize: 9 }}>
        {inv.shopSottotitolo}
      </div>

      {!prog && <div style={{ fontSize: 9, color: 'var(--ink-dim)' }}>{it.connessioneInCorso}</div>}

      {prog && (
        <div className="setup-grid pixel-frame" style={{ maxWidth: 460 }}>
          <div className="inv-section">🎁 {inv.shopGratisTitolo}</div>
          <div className="inv-info">{inv.shopGratisInfo}</div>
          <div className="chest-grid">
            <div className={`chest-card ${available ? 'chest-card--ready' : ''}`}>
              <div className="chest-emoji" aria-hidden="true">
                {available ? '🎁' : '📭'}
              </div>
              {available ? (
                <button
                  className="pxbtn pxbtn--small"
                  disabled={claiming}
                  onClick={() => void handleClaim()}
                >
                  {inv.shopGratisApri}
                </button>
              ) : (
                <div className="chest-state">{inv.shopGratisFatta}</div>
              )}
            </div>
          </div>
          {!available && <div className="inv-info">{inv.shopGratisTornaDomani}</div>}
        </div>
      )}

      {/* Riscatto una-tantum: un eroe NON comune a scelta, gratis, una volta per account. */}
      {prog && (
        <div className="setup-grid pixel-frame" style={{ maxWidth: 460 }}>
          <div className="inv-section">🏅 {inv.shopRiscattoTitolo}</div>
          <div className="inv-info">{inv.shopRiscattoInfo}</div>
          {redeemAvailable ? (
            !pickerOpen ? (
              <button className="pxbtn pxbtn--small" onClick={() => setPickerOpen(true)}>
                {inv.shopRiscattoScegli}
              </button>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 8,
                }}
              >
                {UNCOMMON_HERO_IDS.map((id) => {
                  const def = heroDef(id)!;
                  const owned = isHeroUnlocked(prog, id);
                  return (
                    <button
                      key={id}
                      className="pixel-frame"
                      disabled={owned || redeeming}
                      onClick={() => void handleRedeem(id)}
                      style={{
                        textAlign: 'left',
                        padding: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: owned ? 'not-allowed' : 'pointer',
                        opacity: owned ? 0.5 : 1,
                        background: 'transparent',
                      }}
                      title={owned ? inv.sbloccato : def.description}
                    >
                      <HeroArt hero={id} size={40} emblem={def.emblem} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: 'var(--accent)' }}>{def.name}</div>
                        <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>
                          {owned ? inv.sbloccato : def.ability}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="inv-info">
              {inv.shopRiscattoFatto(heroDef(prog.redeemedUncommon)?.name ?? '')}
            </div>
          )}
        </div>
      )}

      <button className="pxbtn pxbtn--ghost" onClick={onBack}>
        {it.indietro}
      </button>

      {/* Esito del riscatto una-tantum: eroe non comune sbloccato. */}
      {redeemResult && (
        <Dialog title={inv.riscattoTitolo}>
          <div className="chest-open">
            <HeroArt
              hero={redeemResult.heroId}
              size={64}
              emblem={heroDef(redeemResult.heroId)?.emblem}
            />
            <div className="chest-open-name">{heroDef(redeemResult.heroId)?.name}</div>
            <div className="chest-open-body">
              {inv.notSblocco(heroDef(redeemResult.heroId)?.name ?? '')}
            </div>
          </div>
          <div className="dialog-buttons">
            <button className="pxbtn" onClick={() => setRedeemResult(null)}>
              {inv.chiudi}
            </button>
          </div>
        </Dialog>
      )}

      {/* Esito dell'apertura della cassa gratuita: sblocco, frammento o spreco. */}
      {openResult && (
        <Dialog
          title={
            openResult.wasted
              ? inv.notSprecatoTitolo
              : openResult.unlockedNow
                ? inv.notSbloccoTitolo
                : inv.notFrammentoTitolo
          }
        >
          <div className="chest-open">
            <HeroArt
              hero={openResult.heroId}
              size={64}
              emblem={heroDef(openResult.heroId)?.emblem}
            />
            <div className="chest-open-name">{heroDef(openResult.heroId)?.name}</div>
            <div className="chest-open-body">
              {openResult.wasted
                ? inv.notSprecato
                : openResult.unlockedNow
                  ? inv.notSblocco(heroDef(openResult.heroId)?.name ?? '')
                  : inv.notProgresso(openResult.fragments, FRAGMENTS_PER_HERO)}
            </div>
          </div>
          <div className="dialog-buttons">
            <button className="pxbtn" onClick={() => setOpenResult(null)}>
              {inv.chiudi}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
