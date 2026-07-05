/**
 * Forma comune di TUTTI i dizionari di lingua, derivata dall'italiano (`it`)
 * che è la fonte di verità. `Widen` allarga i tipi letterali (`'Nuova partita'`)
 * a `string`, così ogni lingua deve fornire ESATTAMENTE le stesse chiavi ma con
 * testi propri. Se una lingua dimentica o sbaglia una chiave, TypeScript fallisce
 * la compilazione: è la garanzia che la traduzione sia «al 100%».
 */
import type { it } from './it';

type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: Widen<T[K]> }
      : T;

export type Strings = Widen<typeof it>;
