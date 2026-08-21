/**
 * Schermata di scelta dell'EROE (modalità Eroi). Mostra la raccolta di eroi
 * raggruppati per rarità, ciascuno con la sua pixel art, nome nordico, nome
 * dell'abilità e descrizione. Selezionando una card si conferma l'eroe del posto.
 */
import {
  ALL_HEROES,
  RARITY_ORDER,
  FRAGMENTS_PER_HERO,
  isHeroUnlocked,
  fragmentsOf,
  type HeroDef,
  type HeroId,
  type HeroRarity,
  type PlayerProgression,
} from '@vikiland/engine';
import { it } from '../i18n';
import { inv } from '../i18n/inventory';
import { HeroArt } from './HeroArt';

const rarityLabel = (r: HeroRarity): string =>
  r === 'comune'
    ? it.eroi.rarita.comune
    : r === 'nonComune'
      ? it.eroi.rarita.nonComune
      : r === 'rara'
        ? it.eroi.rarita.rara
        : it.eroi.rarita.leggendaria;

const RARITY_COLOR: Record<HeroRarity, string> = {
  comune: '#9aa0a6',
  nonComune: '#3fa34d',
  rara: '#3f7fd6',
  leggendaria: '#d4af37',
};

interface Props {
  title: string;
  current: HeroId | null;
  onPick: (hero: HeroId | null) => void;
  onClose: () => void;
  /**
   * Progressione del giocatore: gli eroi non ancora sbloccati appaiono bloccati
   * (non selezionabili) col progresso dei frammenti. Se assente, tutti gli eroi
   * sono selezionabili (contesti che non gestiscono lo sblocco).
   */
  progression?: PlayerProgression;
}

export function HeroPicker({ title, current, onPick, onClose, progression }: Props) {
  const byRarity: Record<HeroRarity, HeroDef[]> = {
    comune: [],
    nonComune: [],
    rara: [],
    leggendaria: [],
  };
  for (const h of ALL_HEROES) byRarity[h.rarity].push(h);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="pixel-frame"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 560,
          width: '92vw',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: 14,
          background: 'var(--panel, #1b1b22)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 13 }}>{title}</h2>
          <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={onClose} aria-label="×">
            ✕
          </button>
        </div>

        <button
          className={`pxbtn pxbtn--ghost pxbtn--small ${current === null ? 'pxbtn--active' : ''}`}
          style={{ marginBottom: 10 }}
          onClick={() => {
            onPick(null);
            onClose();
          }}
        >
          {it.eroi.nessuno}
        </button>

        {RARITY_ORDER.map((rarity) => (
          <div key={rarity} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: RARITY_COLOR[rarity],
                marginBottom: 6,
              }}
            >
              {rarityLabel(rarity)}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 8,
              }}
            >
              {byRarity[rarity].map((h) => {
                const active = current === h.id;
                // Senza progressione tutto è selezionabile; altrimenti gli eroi
                // non sbloccati restano bloccati col progresso dei frammenti.
                const locked = progression ? !isHeroUnlocked(progression, h.id) : false;
                const frags = progression ? fragmentsOf(progression, h.id) : 0;
                return (
                  <button
                    key={h.id}
                    disabled={locked}
                    aria-disabled={locked}
                    onClick={() => {
                      if (locked) return;
                      onPick(h.id);
                      onClose();
                    }}
                    className="pixel-frame"
                    style={{
                      textAlign: 'left',
                      padding: 8,
                      cursor: locked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      opacity: locked ? 0.55 : 1,
                      background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                      borderColor: active ? RARITY_COLOR[rarity] : undefined,
                      outline: active ? `2px solid ${RARITY_COLOR[rarity]}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ position: 'relative' }}>
                        <HeroArt hero={h.id} size={48} emblem={h.emblem} />
                        {locked && (
                          <span
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              background: 'rgba(0,0,0,0.45)',
                            }}
                          >
                            🔒
                          </span>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--accent)' }}>{h.name}</div>
                        <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>{h.ability}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 8, lineHeight: 1.5, color: 'var(--ink)' }}>{h.description}</div>
                    {locked && (
                      <div style={{ fontSize: 8, color: RARITY_COLOR[rarity] }}>
                        🔒 {inv.frammenti(frags, FRAGMENTS_PER_HERO)} · {inv.pickerSbloccaDaCasse}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
