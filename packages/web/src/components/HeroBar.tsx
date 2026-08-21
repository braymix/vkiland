/**
 * Striscia degli EROI in partita (modalità Eroi): le pixel-art di ogni clan coi
 * nomi degli eroi. Ogni clan può avere PIÙ eroi (il «numero di eroi» delle
 * regole). Sotto i propri, gli usi rimasti delle abilità a consumo. Toccando il
 * proprio gruppo si apre il dialogo delle abilità (se ce n'è una attivabile ora).
 */
import { heroDef, type HeroId, type PlayerView } from '@vikiland/engine';
import { shadesFor } from '../render/sprites/palettes';
import { HeroArt } from './HeroArt';

interface Props {
  view: PlayerView;
  /** Aperta il dialogo abilità: presente solo se il proprietario ha un'abilità attivabile ora. */
  onOpenHero?: (() => void) | undefined;
}

export function HeroBar({ view, onOpenHero }: Props) {
  const me = view.me?.id ?? -1;
  return (
    <div
      className="pixel-frame"
      style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        padding: '6px 8px',
        alignItems: 'flex-start',
      }}
    >
      {view.players.map((p) => {
        const heroes = p.heroes ?? [];
        if (heroes.length === 0) return null;
        const isMe = p.id === me;
        const clickable = isMe && !!onOpenHero;
        return (
          <button
            key={p.id}
            onClick={clickable ? onOpenHero : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              background: 'transparent',
              border: 'none',
              cursor: clickable ? 'pointer' : 'default',
              padding: 0,
            }}
            title={`${p.name} — ${heroes.map((h) => heroDef(h)?.name).filter(Boolean).join(', ')}`}
          >
            <div
              style={{
                display: 'flex',
                gap: 3,
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: 180,
                borderBottom: `3px solid ${shadesFor(p.color).main}`,
                borderRadius: 2,
                paddingBottom: 2,
                boxShadow: clickable ? '0 0 0 2px var(--accent)' : 'none',
              }}
            >
              {heroes.map((h) => {
                const def = heroDef(h);
                if (!def) return null;
                const uses =
                  isMe && def.useKey ? view.me?.heroUses?.[def.useKey] : undefined;
                return (
                  <span
                    key={h}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 0 }}
                    title={`${def.name}: ${def.ability}`}
                  >
                    <HeroArt hero={h as HeroId} size={30} emblem={def.emblem} />
                    {uses !== undefined && (
                      <span style={{ fontSize: 7, color: 'var(--ink-dim)', lineHeight: 1 }}>×{uses}</span>
                    )}
                  </span>
                );
              })}
            </div>
            <span style={{ fontSize: 8, color: 'var(--accent)' }}>{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
