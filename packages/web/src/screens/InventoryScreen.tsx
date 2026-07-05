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
import type { PlayerCosmetics } from '@vikiland/engine';
import { it } from '../i18n';
import { getLocalCosmetics, setLocalCosmetics } from '../game/localCosmetics';
import { apiGetCosmetics, apiSetCosmetics, loadSession, type OnlineSession } from '../online/connection';
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
    </div>
  );
}
