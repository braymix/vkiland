import { describe, expect, it } from 'vitest';
import { applyAction, continentsOwned, gloryPoints, longestRoadLength, scoreBreakdown } from '../src';
import { ALL_FIVE, act, blank, give, own, road } from './helpers';

const chain = ['scandinavia', 'russia_eur', 'balcani', 'italia', 'europa_occ', 'iberia'];

function roadChain(s: ReturnType<typeof blank>, pid: number, ids: string[]): void {
  for (let i = 0; i + 1 < ids.length; i++) road(s, pid, ids[i]!, ids[i + 1]!);
}

describe('punti gloria', () => {
  it('villaggio 1, città 2, Sala 4', () => {
    const s = blank(2);
    own(s, 0, 'italia', 'villaggio');
    own(s, 0, 'iberia', 'citta');
    own(s, 0, 'balcani', 'sala');
    expect(scoreBreakdown(s, 0)).toMatchObject({ villaggi: 1, citta: 2, sale: 4, total: 7 });
    expect(gloryPoints(s, 1)).toBe(0);
  });
});

describe('La Grande Via', () => {
  it('serve una strada continua di almeno 5 collegamenti', () => {
    const s = blank(2);
    roadChain(s, 0, chain.slice(0, 5)); // 4 collegamenti
    expect(longestRoadLength(s, 0)).toBe(4);
    give(s, 0, { legname: 1, pietra: 1 });
    s.players[0]!.jarl = 'iberia';
    const t = act(s, { type: 'costruisciStrada', player: 0, link: 'europa_occ|iberia' });
    expect(longestRoadLength(t, 0)).toBe(5);
    expect(t.grandeVia).toEqual({ holder: 0, length: 5 });
    expect(gloryPoints(t, 0)).toBe(2);
  });

  it('a parità resta al detentore; chi supera strettamente lo prende', () => {
    const s = blank(2);
    roadChain(s, 0, chain); // 5 collegamenti
    s.grandeVia = { holder: 0, length: 5 };
    // il giocatore 1 ne ha altrettanti altrove
    roadChain(s, 1, ['canada', 'usa_est', 'messico', 'ande', 'brasile', 'argentina']);
    s.players[1]!.jarl = 'argentina';
    give(s, 1, { ...ALL_FIVE });
    s.currentPlayer = 1;
    s.players[1]!.jarl = 'argentina';
    const t = act(s, { type: 'costruisci', player: 1, what: 'villaggio', territory: 'argentina' });
    expect(t.grandeVia.holder).toBe(0); // 5 contro 5: resta al detentore
    const u = act(t, { type: 'costruisciStrada', player: 1, link: 'ande|argentina' });
    expect(u.grandeVia).toEqual({ holder: 1, length: 6 }); // 6 > 5: lo prende
  });

  it('un edificio avversario su un territorio interrompe la strada', () => {
    const s = blank(2);
    roadChain(s, 0, chain); // 5
    expect(longestRoadLength(s, 0)).toBe(5);
    own(s, 1, 'italia'); // al centro: la strada si spezza in 2+... fino a italia compresa
    expect(longestRoadLength(s, 0)).toBeLessThan(5);
  });

  it('una strada ad anello conta una volta sola per collegamento', () => {
    const s = blank(2);
    roadChain(s, 0, ['europa_occ', 'italia', 'europa_centrale', 'europa_occ']);
    expect(longestRoadLength(s, 0)).toBe(3);
  });
});

describe('Il Grande Viaggiatore', () => {
  it('serve avere territori in almeno 3 continenti', () => {
    const s = blank(2, 'italia');
    give(s, 0, { ...ALL_FIVE });
    own(s, 0, 'iberia'); // Europa
    own(s, 0, 'india'); // Asia
    expect(continentsOwned(s, 0)).toBe(2);
    s.players[0]!.jarl = 'canada';
    const t = act(s, { type: 'costruisci', player: 0, what: 'villaggio', territory: 'canada' });
    expect(continentsOwned(t, 0)).toBe(3);
    expect(t.grandeViaggiatore).toEqual({ holder: 0, continents: 3 });
    expect(gloryPoints(t, 0)).toBe(1 + 1 + 1 + 2);
  });

  it('chi ne ha di più lo ruba, a parità resta al detentore', () => {
    const s = blank(2, 'italia');
    for (const id of ['iberia', 'india', 'canada']) own(s, 0, id);
    for (const id of ['brasile', 'australia', 'nord_africa']) own(s, 1, id);
    s.grandeViaggiatore = { holder: 0, continents: 3 };
    give(s, 1, { ...ALL_FIVE });
    s.currentPlayer = 1;
    s.players[1]!.jarl = 'italia';
    let t = act(s, { type: 'costruisci', player: 1, what: 'villaggio', territory: 'italia' }); // 4 continenti? Europa+SA+Oceania+Africa
    expect(continentsOwned(t, 1)).toBe(4);
    expect(t.grandeViaggiatore.holder).toBe(1);
    t = JSON.parse(JSON.stringify({ ...t, map: undefined })) as typeof t;
    expect(t.grandeViaggiatore.continents).toBe(4);
  });
});

describe('vittoria', () => {
  it('chi arriva al bersaglio a fine della propria azione vince', () => {
    const s = blank(2, 'italia');
    s.config.targetPoints = 8;
    for (const id of ['iberia', 'europa_occ', 'balcani']) own(s, 0, id, 'citta'); // 6 punti
    own(s, 0, 'russia_eur', 'villaggio'); // 7
    give(s, 0, { ...ALL_FIVE });
    const t = act(s, { type: 'costruisci', player: 0, what: 'villaggio', territory: 'italia' });
    expect(t.phase).toEqual({ type: 'fine', winner: 0 });
    expect(applyAction(t, { type: 'fineTurno', player: 0 }).ok).toBe(false);
  });

  it('il bersaglio è limitato fra 8 e 15', async () => {
    const { createGame, defaultConfig } = await import('../src');
    const mk = (target: number) =>
      createGame(defaultConfig({ targetPoints: target, players: [{ name: 'a', color: 'x' }, { name: 'b', color: 'y' }] })).config.targetPoints;
    expect(mk(3)).toBe(8);
    expect(mk(99)).toBe(15);
    expect(mk(12)).toBe(12);
  });
});
