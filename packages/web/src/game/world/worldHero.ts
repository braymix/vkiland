/**
 * Ponte fra gli eroi del motore «Vikings Around the World» (`WorldHeroId`) e la
 * presentazione riusata dalla Classica: nome nordico e pixel art vengono dal
 * registro della Classica (`@vikiland/engine`), mentre le DESCRIZIONI sono
 * quelle adattate alle regole del Mondo (in `i18n/world.ts`).
 */
import { HERO_REGISTRY, type HeroDef, type HeroId } from '@vikiland/engine';
import type { WorldHeroId } from '@vikiland/engine-world';
import { wt } from '../../i18n/world';

/** Descrizione dell'eroe nel contesto del Mondo (ripiego: descrizione classica). */
export function worldHeroDescription(id: WorldHeroId | HeroId): string {
  return wt.heroDesc[id] ?? HERO_REGISTRY[id as HeroId]?.description ?? '';
}

/** Per `HeroPicker.describe`: descrizione adattata al Mondo. */
export function worldHeroDescribe(h: HeroDef): string {
  return worldHeroDescription(h.id);
}

/** Nome nordico del personaggio (dal registro della Classica). */
export function worldHeroName(id: WorldHeroId | HeroId | undefined): string {
  return id ? HERO_REGISTRY[id as HeroId]?.name ?? '' : '';
}

/** Emoji-simbolo di ripiego per la card (la pixel art vive in `HeroArt`). */
export function worldHeroEmblem(id: WorldHeroId | HeroId | undefined): string {
  return id ? HERO_REGISTRY[id as HeroId]?.emblem ?? '🛡️' : '🛡️';
}
