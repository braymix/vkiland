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
    cava: '#9a8f7d',
    cavaBordo: '#6e6557',
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

/** Colori dei giocatori (pezzi e UI). */
export const PLAYER_COLORS: Record<PlayerColor, { main: string; dark: string; light: string }> = {
  rosso: { main: '#c0392b', dark: '#7e241a', light: '#e7705f' },
  blu: { main: '#2e6fb7', dark: '#1d4775', light: '#6aa3dd' },
  verde: { main: '#3e8f4e', dark: '#276031', light: '#74bd82' },
  giallo: { main: '#d9a525', dark: '#8f6c12', light: '#eccb6a' },
  viola: { main: '#8e44ad', dark: '#5e2c7e', light: '#b07cc9' },
};

/** Palette attiva (Fase 1: fissa). PUNTO DI ESTENSIONE: selezione da profilo. */
export function getActiveTheme(): ThemePalette {
  return CLASSIC_THEME;
}
