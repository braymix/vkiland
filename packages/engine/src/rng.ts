/**
 * PRNG deterministico e puro-funzionale (xoshiro128**).
 *
 * Lo stato è una tupla di 4 interi a 32 bit serializzabile in JSON e salvata
 * dentro `GameState`: ogni estrazione restituisce il valore E il nuovo stato,
 * senza mai mutare quello precedente. Questo rende l'intera partita
 * riproducibile dato il seed (replay, validazione server-side, test).
 */
export type RngState = readonly [number, number, number, number];

/**
 * cyrb128: trasforma una stringa-seed in 4 interi a 32 bit ben distribuiti.
 * (Hash non crittografico, sufficiente per inizializzare il PRNG.)
 */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

export function seedRng(seed: string): RngState {
  const s = cyrb128(seed);
  // Lo stato tutto-zero è l'unico punto fisso degenere di xoshiro: lo evitiamo.
  if (s[0] === 0 && s[1] === 0 && s[2] === 0 && s[3] === 0) {
    return [0x9e3779b9, 0x243f6a88, 0xb7e15162, 0x13198a2e];
  }
  return s;
}

/** Un passo di xoshiro128**: restituisce un u32 e il nuovo stato. */
export function nextU32(state: RngState): [number, RngState] {
  let [s0, s1, s2, s3] = state;
  const result = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
  const t = (s1 << 9) >>> 0;
  s2 = (s2 ^ s0) >>> 0;
  s3 = (s3 ^ s1) >>> 0;
  s1 = (s1 ^ s2) >>> 0;
  s0 = (s0 ^ s3) >>> 0;
  s2 = (s2 ^ t) >>> 0;
  s3 = rotl(s3, 11);
  return [result, [s0, s1, s2, s3]];
}

/** Intero uniforme in [0, maxExclusive), senza bias (campionamento con rigetto). */
export function nextInt(state: RngState, maxExclusive: number): [number, RngState] {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('nextInt: maxExclusive deve essere un intero positivo');
  }
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  let s = state;
  for (;;) {
    const [v, next] = nextU32(s);
    s = next;
    if (v < limit) return [v % maxExclusive, s];
  }
}

/** Tiro di un singolo dado a 6 facce (1..6). */
export function rollDie(state: RngState): [number, RngState] {
  const [v, s] = nextInt(state, 6);
  return [v + 1, s];
}

/** Mescolata Fisher-Yates: restituisce una NUOVA lista e il nuovo stato RNG. */
export function shuffle<T>(state: RngState, items: readonly T[]): [T[], RngState] {
  const arr = items.slice();
  let s = state;
  for (let i = arr.length - 1; i > 0; i--) {
    const [j, next] = nextInt(s, i + 1);
    s = next;
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return [arr, s];
}
