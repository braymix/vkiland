/**
 * Nome/descrizione di una carta Calamità con l'ICONA del materiale mostrata
 * inline, proprio dove il testo nomina la risorsa. Le carte per-risorsa hanno
 * un segnaposto `{mat}` nel template i18n: lo sostituiamo con "icona + nome".
 * Per il diario testuale restano le funzioni stringa in game/calamityText.ts.
 */
import type { ReactNode } from 'react';
import type { CalamityCard } from '@vikiland/engine';
import { it } from '../i18n';
import { ResIcon } from './icons';

function withMaterialIcon(card: CalamityCard, template: string): ReactNode {
  // Nessun materiale nella carta: solo testo, nessuna icona.
  if (!('resource' in card)) return template;
  const matName = it.risorsa[card.resource];
  const [before, after = ''] = template.split('{mat}');
  return (
    <>
      {before}
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}
      >
        <ResIcon r={card.resource} scale={2} />
        {matName}
      </span>
      {after}
    </>
  );
}

export function CalamityName({ card }: { card: CalamityCard }) {
  return <>{withMaterialIcon(card, it.calamita.nome[card.kind])}</>;
}

export function CalamityDesc({ card }: { card: CalamityCard }) {
  return <>{withMaterialIcon(card, it.calamita.desc[card.kind])}</>;
}
