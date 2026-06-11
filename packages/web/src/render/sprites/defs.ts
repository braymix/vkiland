/**
 * Sprite pixel-art ORIGINALI definiti come matrici di testo.
 * Ogni carattere è una chiave semantica risolta dalla palette attiva
 * ('.' = trasparente). Versionabili, diffabili, e pronti per le skin.
 */

export interface SpriteDef {
  /** Righe della matrice; ogni carattere = un pixel. */
  rows: string[];
  /** carattere → chiave semantica di palette. */
  map: Record<string, string>;
}

/** Villaggio: casetta col tetto nel colore del clan. */
export const VILLAGGIO: SpriteDef = {
  map: { R: 'giocatoreMain', r: 'giocatoreDark', W: 'bianco', D: 'giocatoreDark', o: 'nero' },
  rows: [
    '...R...',
    '..RRR..',
    '.RRRRR.',
    'rRRRRRr',
    '.WWWWW.',
    '.WWDWW.',
    '.WWDWW.',
    '.ooooo.',
  ],
};

/** Roccaforte: fortezza in pietra con lo stendardo del clan. */
export const ROCCAFORTE: SpriteDef = {
  map: {
    S: 'roccia',
    s: 'rocciaScura',
    P: 'giocatoreMain',
    q: 'nero',
    d: 'giocatoreDark',
  },
  rows: [
    's...P...s',
    'ss..P..ss',
    'sSs.PP.Ss',
    '.SsssssS.',
    '.SSSSSSS.',
    'SSqSSSqSS',
    'SSSSSSSSS',
    'SSSSdSSSS',
    'sssssssss',
  ],
};

/** Il Drago: piazzato sull'esagono che blocca. */
export const DRAGO: SpriteDef = {
  map: {
    C: 'dragoCorpo',
    c: 'dragoScuro',
    A: 'dragoAla',
    O: 'dragoOcchio',
    F: 'dragoFuoco',
    n: 'nero',
  },
  rows: [
    '......AA.....',
    '.....AAAA....',
    '.cc..AAAA....',
    'cCCc.cAAc.c..',
    'cCOCcCCCCcc..',
    'cCCCCCCCCCc..',
    'F.cCCCCCCCCc.',
    'FF.cCCCCCCc..',
    '....cC..Cc...',
    '....cc..cc...',
    '...nn...nn...',
  ],
};

/** Drakkar degli approdi. */
export const DRAKKAR: SpriteDef = {
  map: { m: 'scafoScuro', v: 'vela', h: 'scafo', H: 'scafoScuro' },
  rows: [
    '....m....',
    '..vvvv...',
    '.vvvvv...',
    '..vvv....',
    '....m....',
    'h...m...h',
    'hhhhhhhhh',
    '.HHHHHHH.',
  ],
};

/** Decorazioni dei terreni. */
export const PINO: SpriteDef = {
  map: { P: 'pinoChiaro', p: 'pino', t: 'tronco' },
  rows: ['..P..', '.PPp.', '.pPP.', 'PPPpP', '.ppp.', '..t..'],
};

export const ROCCIA_DECO: SpriteDef = {
  map: { R: 'roccia', r: 'rocciaScura' },
  rows: ['.RR..', 'RRRr.', 'Rrrr.', '.rr..'],
};

export const PECORA: SpriteDef = {
  map: { W: 'pecora', H: 'pecoraTesta', l: 'pecoraTesta' },
  rows: ['.WWWW.', 'WWWWWH', 'WWWWWH', '.l..l.'],
};

export const SPIGA: SpriteDef = {
  map: { G: 'spigaChiara', g: 'spiga' },
  rows: ['.G.', 'GgG', '.G.', 'GgG', '.g.', '.g.'],
};

export const MINERALE: SpriteDef = {
  map: { F: 'ferroScuro', f: 'ferroLuce' },
  rows: ['.FF..', 'FFfF.', 'FfFFF', '.FFF.'],
};

export const CRISTALLO_GHIACCIO: SpriteDef = {
  map: { n: 'neve', i: 'ghiaccio' },
  rows: ['..n..', '.ini.', '..n..'],
};

/** Icone risorsa 7×7 (usate anche nella UI DOM via dataURL). */
export const ICONA_RISORSA: Record<string, SpriteDef> = {
  legname: {
    map: { P: 'pinoChiaro', p: 'pino', t: 'tronco' },
    rows: ['...P...', '..PPp..', '.pPPPp.', 'pPPPPPp', '.ppppp.', '...t...', '...t...'],
  },
  pietra: {
    map: { R: 'roccia', r: 'rocciaScura' },
    rows: ['.......', '..RRR..', '.RRRRr.', 'RRRrrr.', 'Rrrrrr.', '.rrrr..', '.......'],
  },
  lana: {
    map: { W: 'pecora', H: 'pecoraTesta' },
    rows: ['.......', '.WWWW..', 'WWWWWH.', 'WWWWWH.', 'WWWWW..', '.H..H..', '.......'],
  },
  orzo: {
    map: { G: 'spigaChiara', g: 'spiga' },
    rows: ['...G...', '..GgG..', '...G...', '..GgG..', '...g...', '...g...', '...g...'],
  },
  ferro: {
    map: { F: 'ferroScuro', f: 'ferroLuce' },
    rows: ['.......', '..FFF..', '.FFfFF.', 'FFfFFFF', '.FFFFf.', '..FFF..', '.......'],
  },
};

/** Icone Carte Saga 7×7. */
export const ICONA_SAGA: Record<string, SpriteDef> = {
  berserker: {
    // ascia
    map: { L: 'ferroLuce', F: 'ferroScuro', t: 'tronco' },
    rows: ['.LL....', 'LLLF...', 'LLFt...', '.Ft....', '..t....', '...t...', '....t..'],
  },
  sagaDegliEroi: {
    // stella
    map: { S: 'dragoOcchio', s: 'spiga' },
    rows: ['...S...', '...S...', 'SSSsSSS', '.SSSSS.', '..SSS..', '.SS.SS.', 'S.....S'],
  },
  costruttoriDiSentieri: {
    // sentiero
    map: { S: 'roccia', s: 'rocciaScura' },
    rows: ['.....S.', '....Ss.', '...Ss..', '..Ss...', '.Ss....', 'Ss.....', 's......'],
  },
  banchetto: {
    // corno potorio
    map: { C: 'spigaChiara', c: 'spiga', i: 'ferroLuce' },
    rows: ['.......', 'CCC....', 'iCCC...', '.cCCC..', '..cCC..', '...cC..', '....c..'],
  },
  tributo: {
    // corona
    map: { O: 'dragoOcchio', o: 'spiga' },
    rows: ['.......', 'O..O..O', 'OO.O.OO', 'OOOOOOO', 'oooooo.'.padEnd(7, 'o'), '.......', '.......'],
  },
};

/** Icone della UI (HUD): stella dei Punti Gloria, carte risorsa, pergamene. */
export const ICONA_UI: Record<string, SpriteDef> = {
  stella: {
    map: { S: 'dragoOcchio', s: 'spiga' },
    rows: ['...S...', '..SSS..', 'SSSSSSS', '.SSSSS.', '..SSS..', '.SS.SS.', '.......'],
  },
  cartaRetro: {
    map: { B: 'bianco', b: 'segnalinoBordo', r: 'cifraCalda' },
    rows: ['.bbbb..', '.bBBb..', '.bBrBb.', '..bBBb.', '..bBBb.', '..bbbb.', '.......'],
  },
  pergamena: {
    map: { P: 'segnalino', p: 'segnalinoBordo', r: 'cifra' },
    rows: ['ppppp..', 'pPPPpp.', 'pPrPPp.', 'pPPrPp.', 'pPrPPp.', 'pPPPPp.', 'pppppp.'],
  },
  dado: {
    map: { B: 'bianco', b: 'segnalinoBordo', n: 'nero' },
    rows: ['bbbbbbb', 'bBBBBBb', 'bBnBnBb', 'bBBBBBb', 'bBnBnBb', 'bBBBBBb', 'bbbbbbb'],
  },
};

/** Cifre 3×5 per i segnalini e le etichette degli approdi. */
export const DIGIT_FONT: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '011', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  ':': ['000', '010', '000', '010', '000'],
};
