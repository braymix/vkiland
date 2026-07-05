/**
 * Registro delle SKIN dell'inventario (cosmetici legati all'account).
 * Gli id validi sono dichiarati nell'engine (vocabolario condiviso col server);
 * qui ogni id è associato al suo sprite. Id sconosciuto o assente ⇒ classico:
 * i client vecchi/nuovi restano sempre compatibili tra loro.
 */
import { BRIGANTI, CASTELLO, DRAGO, NAVICELLA, ROCCAFORTE, TORRE, TREX, type SpriteDef } from './defs';

export interface SkinOption {
  id: string;
  def: SpriteDef;
}

export const DRAGON_SKINS: readonly SkinOption[] = [
  { id: 'drago', def: DRAGO },
  { id: 'navicella', def: NAVICELLA },
  { id: 'trex', def: TREX },
  { id: 'briganti', def: BRIGANTI },
];

export const STRONGHOLD_SKINS: readonly SkinOption[] = [
  { id: 'roccaforte', def: ROCCAFORTE },
  { id: 'torre', def: TORRE },
  { id: 'castello', def: CASTELLO },
];

/** Skin del Drago per id (fallback: Drago classico). */
export function dragonSkin(id: string | undefined): SkinOption {
  return DRAGON_SKINS.find((s) => s.id === id) ?? DRAGON_SKINS[0]!;
}

/** Skin della roccaforte per id (fallback: Roccaforte classica). */
export function strongholdSkin(id: string | undefined): SkinOption {
  return STRONGHOLD_SKINS.find((s) => s.id === id) ?? STRONGHOLD_SKINS[0]!;
}
