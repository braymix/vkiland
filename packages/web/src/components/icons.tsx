/** Icone pixel riusate nella UI DOM (generate dagli sprite, niente asset). */
import type { Resource, SagaCard } from '@vikiland/engine';
import { spriteDataURL } from '../render/sprites/bake';
import { ICONA_RISORSA, ICONA_SAGA, ICONA_UI } from '../render/sprites/defs';

export function UiIcon({
  kind,
  scale = 2,
}: {
  kind: 'stella' | 'cartaRetro' | 'pergamena' | 'dado';
  scale?: number;
}) {
  return (
    <img
      src={spriteDataURL(`ui-${kind}`, ICONA_UI[kind]!, scale)}
      width={7 * scale}
      height={7 * scale}
      alt={kind}
      draggable={false}
      style={{ verticalAlign: 'middle' }}
    />
  );
}

export function ResIcon({ r, scale = 3 }: { r: Resource; scale?: number }) {
  return (
    <img
      src={spriteDataURL(`icona-${r}`, ICONA_RISORSA[r]!, scale)}
      width={7 * scale}
      height={7 * scale}
      alt={r}
      draggable={false}
    />
  );
}

export function SagaIcon({ card, scale = 3 }: { card: SagaCard; scale?: number }) {
  return (
    <img
      src={spriteDataURL(`saga-${card}`, ICONA_SAGA[card]!, scale)}
      width={7 * scale}
      height={7 * scale}
      alt={card}
      draggable={false}
    />
  );
}
