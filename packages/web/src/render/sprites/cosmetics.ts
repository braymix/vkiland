/**
 * Registro delle SKIN dell'inventario (cosmetici legati all'account).
 * Gli id validi sono dichiarati nell'engine (vocabolario condiviso col server);
 * qui ogni id è associato al suo sprite. Id sconosciuto o assente ⇒ classico:
 * i client vecchi/nuovi restano sempre compatibili tra loro.
 */
import type { DragonColors, StrongholdColors } from '@vikiland/engine';
import { BRIGANTI, CASTELLO, DRAGO, NAVICELLA, ROCCAFORTE, TORRE, TREX, type SpriteDef } from './defs';
import type { ColorOverrides } from './bake';
import { CLASSIC_THEME, darken } from './palettes';

export interface SkinOption {
  id: string;
  def: SpriteDef;
}

/**
 * Accenti PERSONALIZZABILI: chiave semantica dello sprite ↔ id UI. Sono le
 * uniche parti ritoccabili — tutto il resto (bandiere, corpo del Drago) prende
 * il colore del clan ed è escluso apposta. I default vengono dal tema classico.
 */
export const DRAGON_ACCENTS = {
  eyes: 'dragoOcchio',
  fire: 'dragoFuoco',
} as const;
export const STRONGHOLD_ACCENTS = {
  stone: 'roccia',
} as const;

/** Colori classici (default) degli accenti, mostrati quando non c'è un ritocco. */
export const DEFAULT_DRAGON_COLORS: Required<DragonColors> = {
  eyes: CLASSIC_THEME.colors[DRAGON_ACCENTS.eyes]!,
  fire: CLASSIC_THEME.colors[DRAGON_ACCENTS.fire]!,
};
export const DEFAULT_STRONGHOLD_COLORS: Required<StrongholdColors> = {
  stone: CLASSIC_THEME.colors[STRONGHOLD_ACCENTS.stone]!,
};

/** Ritocchi del Drago → mappa chiave-sprite→colore (null se nessun ritocco). */
export function dragonOverrides(colors: DragonColors | undefined): ColorOverrides {
  if (!colors) return null;
  const out: Record<string, string> = {};
  if (colors.eyes) out[DRAGON_ACCENTS.eyes] = colors.eyes;
  if (colors.fire) out[DRAGON_ACCENTS.fire] = colors.fire;
  return Object.keys(out).length ? out : null;
}

/**
 * Ritocchi della roccaforte → mappa chiave-sprite→colore. La pietra scelta tinge
 * sia la faccia (`roccia`) sia l'ombra (`rocciaScura`, derivata più scura), così
 * i due toni restano coerenti come nel disegno classico.
 */
export function strongholdOverrides(colors: StrongholdColors | undefined): ColorOverrides {
  if (!colors?.stone) return null;
  return { roccia: colors.stone, rocciaScura: darken(colors.stone, 0.32) };
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
