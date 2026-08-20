/**
 * INVENTARIO: le skin del Drago e delle roccaforti, con i loro colori. Funziona
 * SEMPRE, anche senza account — tutto è salvato sul dispositivo (localStorage) e
 * utilizzabile subito in partite locali/hot-seat; se hai già una sessione
 * «Online» valida, resta invece legato all'account e ti segue su ogni
 * dispositivo (lo vede chiunque giochi con te). Due scaffali: il Drago — che in
 * gioco prende aspetto E colore di chi lo ha spostato per ultimo — e le proprie
 * roccaforti. Oltre alla forma si possono ritoccare i colori che NON dipendono
 * dal giocatore: occhi e fiamme del Drago, pietra della roccaforte (le bandiere
 * restano del colore del clan, servono a riconoscerlo).
 */
import { useEffect, useRef, useState } from 'react';
import {
  ALL_HEROES,
  RARITY_ORDER,
  FRAGMENTS_PER_HERO,
  CHEST_DISCOUNT_ACTIVE,
  MAX_CHESTS,
  chestReady,
  chestRemainingMs,
  fragmentsOf,
  heroDef,
  isHeroUnlocked,
  type PlayerCosmetics,
  type PlayerProgression,
  type ChestSlot,
  type ChestOpenResult,
  type HeroRarity,
} from '@vikiland/engine';
import { it } from '../i18n';
import { inv } from '../i18n/inventory';
import { getLocalCosmetics, setLocalCosmetics } from '../game/localCosmetics';
import { getLocalProgression, openChestAndSave } from '../game/progression';
import {
  apiGetCosmetics,
  apiGetProgression,
  apiSetCosmetics,
  loadSession,
  type OnlineSession,
} from '../online/connection';
import { HeroArt } from '../components/HeroArt';
import { Dialog } from '../components/dialogs/Dialog';
import { spriteDataURL } from '../render/sprites/bake';
import {
  DRAGON_SKINS,
  STRONGHOLD_SKINS,
  dragonOverrides,
  strongholdOverrides,
  DEFAULT_DRAGON_COLORS,
  DEFAULT_STRONGHOLD_COLORS,
  type SkinOption,
} from '../render/sprites/cosmetics';
import type { ColorOverrides } from '../render/sprites/bake';

/** Le roccaforti in anteprima si tingono di un colore di esempio (rosso classico). */
const PREVIEW_COLOR = '#c0392b';

/** Colore per rarità (come nella scelta eroe). */
const RARITY_COLOR: Record<HeroRarity, string> = {
  comune: '#9aa0a6',
  nonComune: '#3fa34d',
  rara: '#3f7fd6',
  leggendaria: '#d4af37',
};

/** Millisecondi → «H:MM:SS» per il conto alla rovescia del caricamento. */
function fmtRemaining(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

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

/** Una cassa in lavorazione: in caricamento (con timer) o pronta da aprire. */
function ChestSlotCard({
  chest,
  now,
  busy,
  onOpen,
}: {
  chest: ChestSlot;
  now: number;
  busy: boolean;
  onOpen: () => void;
}) {
  const ready = chestReady(chest, now);
  const remaining = chestRemainingMs(chest, now);
  return (
    <div className={`chest-card ${ready ? 'chest-card--ready' : ''}`}>
      <div className="chest-emoji" aria-hidden="true">
        {ready ? '🎁' : '📦'}
      </div>
      {ready ? (
        <button className="pxbtn pxbtn--small" disabled={busy} onClick={onOpen}>
          {inv.cassaApri}
        </button>
      ) : (
        <>
          <div className="chest-state">{inv.cassaCarica}</div>
          <div className="chest-timer">{inv.restano(fmtRemaining(remaining))}</div>
        </>
      )}
    </div>
  );
}

/** Collezione eroi: per rarità, sbloccati/bloccati col progresso dei frammenti. */
function HeroCollection({ prog }: { prog: PlayerProgression }) {
  const rarityLabel = (r: HeroRarity): string =>
    r === 'comune'
      ? it.eroi.rarita.comune
      : r === 'nonComune'
        ? it.eroi.rarita.nonComune
        : r === 'rara'
          ? it.eroi.rarita.rara
          : it.eroi.rarita.leggendaria;
  return (
    <>
      {RARITY_ORDER.map((rarity) => {
        const heroes = ALL_HEROES.filter((h) => h.rarity === rarity);
        if (heroes.length === 0) return null;
        return (
          <div key={rarity} className="hero-collection">
            <div className="hero-collection-rarity" style={{ color: RARITY_COLOR[rarity] }}>
              {rarityLabel(rarity)}
            </div>
            <div className="hero-collection-grid">
              {heroes.map((h) => {
                const unlocked = isHeroUnlocked(prog, h.id);
                const frags = fragmentsOf(prog, h.id);
                return (
                  <div key={h.id} className={`hero-cell ${unlocked ? '' : 'hero-cell--locked'}`}>
                    <div style={{ position: 'relative' }}>
                      <HeroArt hero={h.id} size={40} emblem={h.emblem} />
                      {!unlocked && (
                        <span className="hero-cell-lock" aria-hidden="true">
                          🔒
                        </span>
                      )}
                    </div>
                    <div className="hero-cell-name">{h.name}</div>
                    <div className="hero-cell-state">
                      {unlocked
                        ? `✓ ${inv.sbloccato}`
                        : inv.frammenti(frags, FRAGMENTS_PER_HERO)}
                    </div>
                    {!unlocked && (
                      <div className="hero-cell-bar">
                        <span style={{ width: `${(frags / FRAGMENTS_PER_HERO) * 100}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

function SkinCard({
  opt,
  selected,
  tint,
  overrides,
  onPick,
}: {
  opt: SkinOption;
  selected: boolean;
  tint: string | null;
  overrides: ColorOverrides;
  onPick: () => void;
}) {
  const label = (it.skin as Record<string, string>)[opt.id] ?? opt.id;
  return (
    <button
      className={`skin-card ${selected ? 'skin-card--on' : ''}`}
      onClick={onPick}
      aria-pressed={selected}
    >
      <img src={spriteDataURL(`inv-${opt.id}`, opt.def, 4, tint, overrides)} alt="" />
      <span className="skin-name">{label}</span>
      {selected && <span className="skin-badge">✓ {it.invSelezionato}</span>}
    </button>
  );
}

/** Un accento personalizzabile: pastiglia colore + «Ripristina» quando è cambiato. */
function ColorField({
  label,
  value,
  isDefault,
  onChange,
  onReset,
}: {
  label: string;
  value: string;
  isDefault: boolean;
  onChange: (hex: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="inv-color">
      <span className="inv-color-label">{label}</span>
      <input
        type="color"
        className={`inv-swatch ${isDefault ? '' : 'inv-swatch--on'}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
      <button
        className="inv-color-reset"
        data-visible={!isDefault}
        onClick={onReset}
        tabIndex={isDefault ? -1 : 0}
      >
        {it.invRipristina}
      </button>
    </div>
  );
}

export function InventoryScreen({ onBack }: { onBack: () => void }) {
  const [cosmetics, setCosmetics] = useState<PlayerCosmetics | null>(null);
  // Sessione online rilevata automaticamente (se assente o non più valida,
  // l'inventario resta comunque pienamente usabile in locale).
  const [session, setSession] = useState<OnlineSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // La sessione può cambiare dopo il mount: la leggiamo da un ref così il
  // salvataggio ritardato (debounce) usa sempre il valore aggiornato.
  const sessionRef = useRef<OnlineSession | null>(null);
  sessionRef.current = session;

  // --- Progressione (casse, frammenti, eroi) — indipendente dai cosmetici ---
  const [prog, setProg] = useState<PlayerProgression | null>(null);
  const [progSession, setProgSession] = useState<OnlineSession | null>(null);
  const progSessionRef = useRef<OnlineSession | null>(null);
  progSessionRef.current = progSession;
  const [now, setNow] = useState(() => Date.now());
  const [openResult, setOpenResult] = useState<ChestOpenResult | null>(null);
  const [opening, setOpening] = useState(false);

  // Carica la progressione: dall'account se raggiungibile, altrimenti locale.
  useEffect(() => {
    const existing = loadSession();
    if (!existing) {
      setProg(getLocalProgression());
      return;
    }
    void apiGetProgression(existing)
      .then((fromServer) => {
        setProgSession(existing);
        setProg(fromServer);
      })
      .catch(() => setProg(getLocalProgression()));
  }, []);

  // Orologio per il conto alla rovescia delle casse (aggiorna ogni secondo).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /** Apre una cassa pronta, persiste e mostra il popup con l'esito. */
  const handleOpenChest = async (chestId: string) => {
    if (!prog || opening) return;
    setOpening(true);
    try {
      const result = await openChestAndSave(progSessionRef.current, prog, chestId);
      if (result) {
        setProg(result.progression);
        setOpenResult(result);
        if (result.unlockedNow) notifyUnlock(heroDef(result.heroId)?.name ?? '');
      }
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    const existing = loadSession();
    if (!existing) {
      setCosmetics(getLocalCosmetics());
      return;
    }
    void apiGetCosmetics(existing)
      .then((fromServer) => {
        setSession(existing);
        setCosmetics(fromServer);
      })
      .catch(() => {
        // Sessione scaduta o server irraggiungibile: si prosegue in locale,
        // senza mostrare un errore (qui non si è chiesto nulla di «online»).
        setCosmetics(getLocalCosmetics());
      });
  }, []);

  useEffect(
    () => () => {
      if (savedTimer.current !== null) clearTimeout(savedTimer.current);
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    },
    []
  );

  const flashSaved = () => {
    setSaved(true);
    if (savedTimer.current !== null) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1600);
  };

  /** Persiste l'intero set di cosmetici (account se disponibile, altrimenti dispositivo). */
  const persist = (full: PlayerCosmetics) => {
    const sess = sessionRef.current;
    if (!sess) {
      setCosmetics(setLocalCosmetics(full));
      flashSaved();
      return;
    }
    void apiSetCosmetics(sess, full)
      .then((fromServer) => {
        setCosmetics(fromServer);
        flashSaved();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Errore di rete'));
  };

  /**
   * Applica un cambiamento in modo OTTIMISTA (anteprima immediata) e ne rinvia
   * il salvataggio. Il debounce serve al selettore di colore, che emette molti
   * eventi mentre lo si trascina: senza, ogni micro-movimento sarebbe una POST.
   */
  const pick = (patch: PlayerCosmetics, debounce = false) => {
    if (!cosmetics) return;
    const next = { ...cosmetics, ...patch };
    setCosmetics(next);
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    if (debounce) {
      saveTimer.current = setTimeout(() => persist(next), 350);
    } else {
      persist(next);
    }
  };

  // Colori correnti degli accenti (o i default del tema classico se non ritoccati).
  const dragonColors = cosmetics?.dragonColors ?? {};
  const strongholdColors = cosmetics?.strongholdColors ?? {};
  const dragonOv = dragonOverrides(dragonColors);
  const strongholdOv = strongholdOverrides(strongholdColors);

  /** Cambia/azzera un accento del Drago, tenendo l'altro invariato. */
  const setDragonColor = (field: 'eyes' | 'fire', hex?: string) => {
    const next = { ...dragonColors };
    if (hex) next[field] = hex;
    else delete next[field];
    pick({ dragonColors: next }, hex !== undefined);
  };

  /** Cambia/azzera il colore della pietra della roccaforte. */
  const setStoneColor = (hex?: string) => {
    pick({ strongholdColors: hex ? { stone: hex } : {} }, hex !== undefined);
  };

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>{it.inventario}</h2>
      <div className="menu-sub" style={{ fontSize: 9 }}>
        {it.invSottotitolo}
      </div>
      {cosmetics && (
        <div className="inv-mode">{session ? it.invModoAccount : it.invModoLocale}</div>
      )}

      {/* Casse ed eroi: si guadagna una cassa a fine partita; i frammenti
          sbloccano gli eroi non comuni. */}
      {prog && (
        <div className="setup-grid pixel-frame" style={{ maxWidth: 460 }}>
          <div className="inv-section">📦 {inv.casseTitolo}</div>
          <div className="inv-info">{inv.casseInfo}</div>
          <div className="inv-info">{inv.casseComeSi}</div>
          {CHEST_DISCOUNT_ACTIVE && <div className="inv-discount">{inv.scontoAttivo}</div>}
          <div className="chest-grid">
            {(prog.chests ?? []).map((c) => (
              <ChestSlotCard
                key={c.id}
                chest={c}
                now={now}
                busy={opening}
                onOpen={() => void handleOpenChest(c.id)}
              />
            ))}
            {Array.from({ length: Math.max(0, MAX_CHESTS - (prog.chests?.length ?? 0)) }).map(
              (_, i) => (
                <div key={`empty-${i}`} className="chest-card chest-card--empty" aria-hidden="true">
                  📭
                </div>
              )
            )}
          </div>
          {(prog.chests?.length ?? 0) === 0 && <div className="inv-info">{inv.casseVuote}</div>}
          {(prog.chests?.length ?? 0) >= MAX_CHESTS && (
            <div className="inv-warn">{inv.casseMax}</div>
          )}

          <div className="inv-section">🦸 {inv.eroiTitolo}</div>
          <div className="inv-info">{inv.eroiInfo}</div>
          <HeroCollection prog={prog} />
        </div>
      )}

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
                  overrides={dragonOv}
                  selected={(cosmetics.dragon ?? 'drago') === opt.id}
                  onPick={() => pick({ dragon: opt.id })}
                />
              ))}
            </div>
            <div className="inv-colors">
              <ColorField
                label={it.invColoreOcchi}
                value={dragonColors.eyes ?? DEFAULT_DRAGON_COLORS.eyes}
                isDefault={!dragonColors.eyes}
                onChange={(hex) => setDragonColor('eyes', hex)}
                onReset={() => setDragonColor('eyes')}
              />
              <ColorField
                label={it.invColoreFiamme}
                value={dragonColors.fire ?? DEFAULT_DRAGON_COLORS.fire}
                isDefault={!dragonColors.fire}
                onChange={(hex) => setDragonColor('fire', hex)}
                onReset={() => setDragonColor('fire')}
              />
            </div>
            <div className="inv-section">{it.invRocca}</div>
            <div className="inv-info">{it.invRoccaInfo}</div>
            <div className="skin-grid">
              {STRONGHOLD_SKINS.map((opt) => (
                <SkinCard
                  key={opt.id}
                  opt={opt}
                  tint={PREVIEW_COLOR}
                  overrides={strongholdOv}
                  selected={(cosmetics.stronghold ?? 'roccaforte') === opt.id}
                  onPick={() => pick({ stronghold: opt.id })}
                />
              ))}
            </div>
            <div className="inv-colors">
              <ColorField
                label={it.invColorePietra}
                value={strongholdColors.stone ?? DEFAULT_STRONGHOLD_COLORS.stone}
                isDefault={!strongholdColors.stone}
                onChange={(hex) => setStoneColor(hex)}
                onReset={() => setStoneColor()}
              />
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

      {/* Esito dell'apertura di una cassa: sblocco, frammento o frammento sprecato. */}
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
