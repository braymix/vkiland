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

/** Villaggio: casa lunga vichinga col tetto nel colore del clan. */
export const VILLAGGIO: SpriteDef = {
  map: { R: 'giocatoreMain', r: 'giocatoreDark', W: 'bianco', d: 'giocatoreDark', q: 'nero' },
  rows: [
    '.....RRR.....',
    '....RRRRR....',
    '...RRRRRRR...',
    '..RRRRRRRRR..',
    '.RRRRRRRRRRR.',
    'rRRRRRRRRRRRr',
    '.WWWWWWWWWWW.',
    '.WWddWWWqqWW.',
    '.WWddWWWqqWW.',
    '.WWWWWWWqqWW.',
    '.WWWWWWWqqWW.',
    '.qqqqqqqqqqq.',
  ],
};

/** Roccaforte: fortezza in pietra con due torri e lo stendardo del clan. */
export const ROCCAFORTE: SpriteDef = {
  map: {
    S: 'roccia',
    s: 'rocciaScura',
    P: 'giocatoreMain',
    q: 'nero',
    t: 'tronco',
  },
  rows: [
    '.S.S....t....S.S.',
    '.SSS....tPP..SSS.',
    '.SsS....tPPP.SsS.',
    '.SSS....tPP..SSS.',
    '.SSS....t....SSS.',
    '.SSSS.S.S.S.SSSS.',
    '.SSSSSSSSSSSSSSS.',
    '.SSqSSSSSSSSSqSS.',
    '.SSSSSSSSSSSSSSS.',
    '.SSSSSSqqqSSSSSS.',
    '.SsSSSSqqqSSSSsS.',
    '.SSSSSSqqqSSSSSS.',
    '.sssssssssssssss.',
  ],
};

/** Il Drago: piazzato sull'esagono che blocca. */
export const DRAGO: SpriteDef = {
  map: {
    C: 'dragoCorpo',
    c: 'dragoScuro',
    A: 'dragoAla',
    a: 'dragoScuro',
    O: 'dragoOcchio',
    F: 'dragoFuoco',
    n: 'nero',
  },
  rows: [
    '..........aAAA..........',
    '.........aAAAAA.........',
    '........aAAAAAAA..aAA...',
    '........aAAAAAAA.aAAAA..',
    '.ccc....aAAAAAAAaAAAAA..',
    'cCCCc....aAAAAAaAAAAA...',
    'cCOCCc...caAAAcaAAAc....',
    'cCCCCCc.ccCCCCcCCCcc....',
    'cnCCCCCcCCCCCCCCCCCc....',
    '.cCCCCCCCCCCCCCCCCCCc...',
    'F.cCCCCCCCCCCCCCCCCCCc..',
    'FF.cCCCCCCCCCCCCCCCCCc..',
    'FFF.ccCCCCCCCCCCCCcc.c..',
    '.F....cCCc....cCCc......',
    '......cCCc....cCCc......',
    '.....nnnn....nnnn.......',
  ],
};

/**
 * SKIN del Drago (inventario). Usano le STESSE chiavi semantiche del Drago
 * (dragoCorpo/dragoScuro/dragoAla…): così la logica dei colori resta ESATTA —
 * il pezzo si tinge del colore di chi lo ha spostato, qualunque sia l'aspetto.
 */

/** Navicella spaziale: disco volante con cupola, luci e raggi di atterraggio. */
export const NAVICELLA: SpriteDef = {
  map: {
    A: 'dragoAla',
    C: 'dragoCorpo',
    c: 'dragoScuro',
    O: 'dragoOcchio',
    F: 'dragoFuoco',
  },
  rows: [
    '........ccAAAAcc........',
    '.......cAAAAAAAAc.......',
    '.......cAAAOOAAAc.......',
    '....ccccCCCCCCCCcccc....',
    '..ccCCCCCCCCCCCCCCCCcc..',
    '.cCCCCCCCCCCCCCCCCCCCCc.',
    'cCCOCCCOCCCOCCCOCCCOCCCc',
    '.cCCCCCCCCCCCCCCCCCCCCc.',
    '...cccCCCCCCCCCCCCccc...',
    '.....cc....cc....cc.....',
    '......F.....F.....F.....',
    '.....FF....FFF....FF....',
    '......F.....F.....F.....',
  ],
};

/** T-Rex: il tiranno dell'isola, con pancino chiaro e braccine minuscole. */
export const TREX: SpriteDef = {
  map: {
    C: 'dragoCorpo',
    c: 'dragoScuro',
    A: 'dragoAla',
    O: 'dragoOcchio',
    W: 'bianco',
    n: 'nero',
  },
  rows: [
    '.....ccCCCCc............',
    '....cCCCCCCCc...........',
    '....cCOnCCCCc...........',
    '....cCCCCCCCc...........',
    '....cWcWcCCc............',
    '......cCCCc.............',
    '......cCCCCcc......cc...',
    '.....cCCCCCCCCCCCCCCc...',
    '....cCCCCCCCCCCCCCCc....',
    '....cCAAACCnCCCCCc......',
    '....cCAAAACCCCCCc.......',
    '.....cCCCCCCCCCc........',
    '......cCCc..cCCc........',
    '......cCCc..cCCc........',
    '.....nnnn...nnnn........',
  ],
};

/** Briganti: due incappucciati accampati (con pugnale e falò). */
export const BRIGANTI: SpriteDef = {
  map: {
    C: 'dragoCorpo',
    c: 'dragoScuro',
    O: 'dragoOcchio',
    F: 'dragoFuoco',
    W: 'bianco',
    n: 'nero',
    q: 'nero',
    t: 'tronco',
  },
  rows: [
    '...ccc.........ccc......',
    '..cCCCc.......cCCCc.....',
    '..cOCOc.......cOCOc.....',
    '..cCCCc.......cCCCc.....',
    '.cCCCCCc..W..cCCCCCc....',
    '.cCCCCCc..W..cCCCCCc....',
    '.cCCCCCcnW...cCCCCCc....',
    '.cCCCCCc.....cCCCCCc....',
    '..cCCCc..FF...cCCCc.....',
    '..cCCCc.FFFF..cCCCc.....',
    '..qqqqq.FFFF..qqqqq.....',
    '........tttt............',
  ],
};

/**
 * SKIN delle roccaforti (inventario): come la Roccaforte classica mostrano il
 * colore del clan tramite le chiavi `giocatore*` — la logica dei colori non cambia.
 */

/** Torre di guardia: torrione alto con stendardo del clan in cima. */
export const TORRE: SpriteDef = {
  map: {
    S: 'roccia',
    s: 'rocciaScura',
    P: 'giocatoreMain',
    q: 'nero',
  },
  rows: [
    '......PP.....',
    '......PPPP...',
    '......PP.....',
    '......s......',
    '...S.SsS.S...',
    '...SSSSSSS...',
    '...SqSSSqS...',
    '...SSSSSSS...',
    '...SsSSSsS...',
    '...SSSSSSS...',
    '...SSqqqSS...',
    '...SSqqqSS...',
    '...sssssss...',
  ],
};

/** Castello: due torri laterali coi tetti a cono nel colore del clan. */
export const CASTELLO: SpriteDef = {
  map: {
    S: 'roccia',
    s: 'rocciaScura',
    P: 'giocatoreMain',
    p: 'giocatoreDark',
    q: 'nero',
  },
  rows: [
    '.PP...........PP.',
    'PPPP.........PPPP',
    'pPPp....P....pPPp',
    '.SS.....P.....SS.',
    '.SS....sPP....SS.',
    '.SSSS.S.S.S.SSSS.',
    '.SSSSSSSSSSSSSSS.',
    '.SqSSqSSSSSqSSqS.',
    '.SSSSSSSSSSSSSSS.',
    '.SSSSSqqqqqSSSSS.',
    '.SsSSSqqqqqSSSsS.',
    '.SSSSSqqqqqSSSSS.',
    '.sssssssssssssss.',
  ],
};

/** Drakkar degli approdi: vela a strisce e scudi sullo scafo. */
export const DRAKKAR: SpriteDef = {
  map: {
    m: 'scafoScuro',
    v: 'vela',
    r: 'cifraCalda',
    h: 'scafo',
    H: 'scafoScuro',
    S: 'ferroLuce',
  },
  rows: [
    '........m........',
    '..vrrvvrrvvrrv...',
    '.vvrrvvrrvvrrvv..',
    '.vvrrvvrrvvrrvv..',
    '..vrrvvrrvvrrv...',
    '...vrrvvrrvvr....',
    '........m........',
    'h.......m.......h',
    'hh......m......hh',
    '.hhhhhhhhhhhhhhh.',
    '..ShShShShShShS..',
    '...HHHHHHHHHHH...',
  ],
};

/** Decorazioni dei terreni. */
export const PINO: SpriteDef = {
  map: { P: 'pinoChiaro', p: 'pino', t: 'tronco' },
  rows: [
    '....pP....',
    '...pPPp...',
    '..pPPPPp..',
    '...pPPp...',
    '..pPPPPp..',
    '.pPPpPPPp.',
    '..pPPPPp..',
    '.pPpPPPPp.',
    'ppPPPpPPpp',
    '....tt....',
    '....tt....',
  ],
};

/** Decorazione della cava di Pietra: una catasta di mattoni a corsi sfalsati. */
export const MATTONE_DECO: SpriteDef = {
  map: { B: 'mattone', m: 'mattoneScuro' },
  rows: [
    'mmmmmmmm.',
    'mBBmBBBm.',
    'mBBmBBBm.',
    'mmmmmmmm.',
    'BBmBBBmm.',
    'BBmBBBmm.',
  ],
};

export const PECORA: SpriteDef = {
  map: { W: 'pecora', H: 'pecoraTesta', l: 'pecoraTesta' },
  rows: [
    '..WWWWWW...',
    '.WWWWWWWW..',
    'WWWWWWWWWH.',
    'WWWWWWWWHH.',
    'WWWWWWWWWH.',
    '.WWWWWWWW..',
    '..l...l....',
    '..l...l....',
  ],
};

export const SPIGA: SpriteDef = {
  map: { G: 'spigaChiara', g: 'spiga' },
  rows: [
    '..G..',
    '.GgG.',
    '..G..',
    '.GgG.',
    '..G..',
    '.GgG.',
    '..g..',
    '..g..',
    '..g..',
    '..g..',
  ],
};

export const MINERALE: SpriteDef = {
  map: { F: 'ferroScuro', f: 'ferroLuce' },
  rows: [
    '...FF....',
    '..FFfF...',
    '.FFfFFF..',
    'FFfFFFfF.',
    '.FFFfFFF.',
    '..FFFFF..',
  ],
};

export const CRISTALLO_GHIACCIO: SpriteDef = {
  map: { n: 'neve', i: 'ghiaccio' },
  rows: [
    '....n....',
    '.n..n..n.',
    '..n.n.n..',
    '...nin...',
    'nnnniinnn',
    '...nin...',
    '..n.n.n..',
    '.n..n..n.',
    '....n....',
  ],
};

/** Icone risorsa 7×7 (usate anche nella UI DOM via dataURL). */
export const ICONA_RISORSA: Record<string, SpriteDef> = {
  legname: {
    map: { P: 'pinoChiaro', p: 'pino', t: 'tronco' },
    rows: ['...P...', '..PPp..', '.pPPPp.', 'pPPPPPp', '.ppppp.', '...t...', '...t...'],
  },
  pietra: {
    map: { B: 'mattone', m: 'mattoneScuro' },
    rows: ['.......', 'mmmmmm.', 'mBBmBB.', 'mmmmmm.', 'BBmBBm.', 'mmmmmm.', '.......'],
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
  assalto: {
    // spada (carta Assalto, modalità Battaglia)
    map: { L: 'ferroLuce', F: 'ferroScuro', t: 'tronco' },
    rows: ['...L...', '...L...', '...L...', '.FFtFF.', '...t...', '...t...', '...t...'],
  },
  assaltoLeggero: {
    // martello (carta Assalto Leggero: spezza strada)
    map: { L: 'ferroLuce', F: 'ferroScuro', t: 'tronco' },
    rows: ['.FFFF..', '.FLLF..', '.FFFF..', '..tt...', '..tt...', '..tt...', '..tt...'],
  },
  cambiaCalamita: {
    // fulmine deviato (carta Cambia Sorte: cambia la calamità)
    map: { L: 'ferroLuce', F: 'ferroScuro' },
    rows: ['...LL..', '..LL...', '.LLF...', 'FFLLFF.', '...FLL.', '...LL..', '..LL...'],
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
