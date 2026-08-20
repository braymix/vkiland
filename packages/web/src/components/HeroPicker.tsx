/**
 * Schermata di scelta dell'EROE (modalità Eroi). Mostra la raccolta di eroi
 * raggruppati per rarità, ciascuno con la sua pixel art, nome nordico, nome
 * dell'abilità e descrizione. Selezionando una card si conferma l'eroe del posto.
 */
import { ALL_HEROES, RARITY_ORDER, type HeroDef, type HeroId, type HeroRarity } from '@vikiland/engine';
import { it } from '../i18n';
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
}

export function HeroPicker({ title, current, onPick, onClose }: Props) {
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
                return (
                  <button
                    key={h.id}
                    onClick={() => {
                      onPick(h.id);
                      onClose();
                    }}
                    className="pixel-frame"
                    style={{
                      textAlign: 'left',
                      padding: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                      borderColor: active ? RARITY_COLOR[rarity] : undefined,
                      outline: active ? `2px solid ${RARITY_COLOR[rarity]}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <HeroArt hero={h.id} size={48} emblem={h.emblem} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--accent)' }}>{h.name}</div>
                        <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>{h.ability}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 8, lineHeight: 1.5, color: 'var(--ink)' }}>{h.description}</div>
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
