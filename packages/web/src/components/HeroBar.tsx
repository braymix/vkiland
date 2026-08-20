/**
 * Striscia degli EROI in partita (modalità Eroi): l'avatar pixel-art di ogni
 * clan col nome dell'eroe. Sotto il proprio, gli usi rimasti delle abilità a
 * consumo. Toccando il proprio avatar si apre il dialogo delle abilità (se ce
 * n'è una attivabile in questo momento).
 */
import { heroDef, type PlayerView } from '@vikiland/engine';
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
        gap: 8,
        overflowX: 'auto',
        padding: '6px 8px',
        alignItems: 'flex-start',
      }}
    >
      {view.players.map((p) => {
        const def = heroDef(p.hero);
        if (!def) return null;
        const isMe = p.id === me;
        const clickable = isMe && !!onOpenHero;
        const uses = isMe && view.me?.heroUses ? Object.values(view.me.heroUses)[0] : undefined;
        return (
          <button
            key={p.id}
            onClick={clickable ? onOpenHero : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              minWidth: 52,
              background: 'transparent',
              border: 'none',
              cursor: clickable ? 'pointer' : 'default',
              padding: 0,
            }}
            title={`${p.name} — ${def.name}: ${def.ability}`}
          >
            <div
              style={{
                borderBottom: `3px solid ${shadesFor(p.color).main}`,
                borderRadius: 2,
                lineHeight: 0,
                boxShadow: clickable ? '0 0 0 2px var(--accent)' : 'none',
              }}
            >
              <HeroArt hero={def.id} size={38} emblem={def.emblem} />
            </div>
            <span style={{ fontSize: 8, color: 'var(--accent)' }}>{def.name}</span>
            {uses !== undefined && (
              <span style={{ fontSize: 7, color: 'var(--ink-dim)' }}>×{uses}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
