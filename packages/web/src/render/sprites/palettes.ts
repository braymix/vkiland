/**
 * Palette semantiche: gli sprite usano CHIAVI ("tetto", "pino", …), qui si
 * decide il colore concreto.
 *
 * PUNTO DI ESTENSIONE (Fase 4 — cosmetici): questo registro è il sistema
 * delle skin. Una nuova skin = una nuova ThemePalette qui (o caricata dal
 * profilo utente/server), senza toccare gli sprite né il renderer. Gli
 * `entitlements` dell'utente decideranno quali id sono selezionabili.
 */
import type { PlayerColor } from '@vikiland/engine';

export interface ThemePalette {
  id: string;
  name: string;
  colors: Record<string, string>;
}

/** Tema base "Vikiland classico". */
export const CLASSIC_THEME: ThemePalette = {
  id: 'classico',
  name: 'Vikiland classico',
  colors: {
    // mare e cornice
    mare: '#2a5d8f',
    mareChiaro: '#3c74a8',
    // terreni: base + bordo
    foresta: '#3f7a3a',
    forestaBordo: '#2c5429',
    cava: '#b8542e',
    cavaBordo: '#7a3318',
    pascolo: '#8fbf5a',
    pascoloBordo: '#65893c',
    campo: '#d9b84a',
    campoBordo: '#a78a32',
    miniera: '#7d7f8a',
    minieraBordo: '#56575f',
    tundra: '#dfe8ee',
    tundraBordo: '#a9bcc9',
    // decorazioni
    pino: '#27502a',
    pinoChiaro: '#3c7a40',
    tronco: '#5d4327',
    roccia: '#b8ad99',
    rocciaScura: '#7c7363',
    mattone: '#d9794a', // faccia del mattone (cava di Pietra, ora arancione/rossa)
    mattoneScuro: '#6b2a12', // malta/ombra tra i mattoni
    pecora: '#f3f1e7',
    pecoraTesta: '#4a4138',
    spiga: '#a4751f',
    spigaChiara: '#e7cf6e',
    ferroScuro: '#43444c',
    ferroLuce: '#aab3c6',
    neve: '#ffffff',
    ghiaccio: '#b8d8e8',
    // segnalini numerici
    segnalino: '#f1e6c8',
    segnalinoBordo: '#8a7a52',
    cifra: '#3a3128',
    cifraCalda: '#b03a2e', // 6 e 8
    // drago
    dragoCorpo: '#7a3fa0',
    dragoScuro: '#542b70',
    dragoAla: '#9c64c4',
    dragoOcchio: '#ffd23e',
    dragoFuoco: '#ff7a3c',
    // approdi
    scafo: '#6d4a2a',
    scafoScuro: '#4a3018',
    vela: '#e8e0c8',
    mirinoPorto: '#c473e8', // bersaglio sui vertici degli approdi (viola)
    // generiche
    nero: '#1a1612',
    bianco: '#f5f1e6',
  },
};

/** Colore di ripiego (rosso classico) se un valore non è un esadecimale valido. */
export const DEFAULT_PLAYER_COLOR = '#c0392b';

/**
 * «Palette libera»: una griglia ricca di colori vividi e leggibili sul mare,
 * mostrata dai selettori (setup e lobby). I primi cinque sono i classici
 * (rosso/blu/verde/giallo/viola), così le partite di default restano identiche;
 * oltre a questi si può comunque scegliere QUALSIASI colore col selettore
 * personalizzato. Il colore di un giocatore è ormai un semplice esadecimale.
 */
export const FREE_PALETTE: string[] = [
  '#c0392b', '#2e6fb7', '#3e8f4e', '#d9a525', '#8e44ad', '#e67e22',
  '#16a085', '#e84393', '#34495e', '#1abc9c', '#e74c3c', '#2980b9',
  '#27ae60', '#f39c12', '#9b59b6', '#d35400', '#3498db', '#6c5ce7',
  '#00cec9', '#be2edd', '#a0522d', '#7f8c8d', '#2c3e50', '#fd79a8',
];

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex2(n: number): string {
  return clampByte(n).toString(16).padStart(2, '0');
}

/** Normalizza un colore in `#rrggbb` minuscolo; ripiego sul rosso se non valido. */
export function normalizeHex(hex: string): string {
  const v = (hex ?? '').trim();
  const six = /^#?([0-9a-fA-F]{6})$/.exec(v);
  if (six) return '#' + six[1]!.toLowerCase();
  const three = /^#?([0-9a-fA-F]{3})$/.exec(v);
  if (three) {
    return (
      '#' +
      three[1]!
        .toLowerCase()
        .split('')
        .map((c) => c + c)
        .join('')
    );
  }
  return DEFAULT_PLAYER_COLOR;
}

function parseRgb(hex: string): [number, number, number] {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixTo([r, g, b]: [number, number, number], to: [number, number, number], amt: number): string {
  return '#' + toHex2(r + (to[0] - r) * amt) + toHex2(g + (to[1] - g) * amt) + toHex2(b + (to[2] - b) * amt);
}

/**
 * Da un colore qualunque (esadecimale) ricava le tre tonalità usate da pezzi e
 * UI: piena, scura (bordi/ombre) e chiara (luce). Sostituisce la vecchia mappa
 * fissa dei 5 colori, così ora il colore del clan può essere uno qualsiasi.
 */
export function shadesFor(color: PlayerColor): { main: string; dark: string; light: string } {
  const rgb = parseRgb(color);
  return {
    main: normalizeHex(color),
    dark: mixTo(rgb, [0, 0, 0], 0.4),
    light: mixTo(rgb, [255, 255, 255], 0.42),
  };
}

/** Palette attiva (Fase 1: fissa). PUNTO DI ESTENSIONE: selezione da profilo. */
export function getActiveTheme(): ThemePalette {
  return CLASSIC_THEME;
}
