/** Nome e descrizione localizzati di una carta Calamità (banner e diario). */
import type { CalamityCard } from '@vikiland/engine';
import { it, t } from '../i18n';

export function calamityName(card: CalamityCard): string {
  const base = it.calamita.nome[card.kind];
  return 'resource' in card ? t(base, { mat: it.risorsa[card.resource] }) : base;
}

export function calamityDesc(card: CalamityCard): string {
  const base = it.calamita.desc[card.kind];
  return 'resource' in card ? t(base, { mat: it.risorsa[card.resource] }) : base;
}
