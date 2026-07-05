/** Banner della calamità attiva nel giro (nome, effetto, quante ne restano). */
import type { PlayerView } from '@vikiland/engine';
import { it, t } from '../i18n';
import { CalamityDesc, CalamityName } from './CalamityText';

export function CalamityBanner({ view }: { view: PlayerView }) {
  if (!view.calamity) return null;
  return (
    <div
      className="pixel-frame"
      style={{
        padding: '5px 9px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        borderColor: 'var(--accent)',
      }}
    >
      <div style={{ fontSize: 9, color: 'var(--accent)' }}>
        ⚡ <CalamityName card={view.calamity} />
        {view.calamitiesLeft !== null && (
          <span style={{ color: 'var(--ink-dim)', fontSize: 7 }}>
            {' '}
            · {t(it.calamita.rimaste, { n: view.calamitiesLeft })}
          </span>
        )}
      </div>
      <div style={{ fontSize: 8, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
        <CalamityDesc card={view.calamity} />
      </div>
    </div>
  );
}
