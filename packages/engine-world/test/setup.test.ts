import { describe, expect, it } from 'vitest';
import { applyAction, getLegalActions, linkId, totalResources } from '../src';
import { act, finishSetup, newGame } from './helpers';

describe('setup a serpentina', () => {
  it('ordine 0,1,…,N-1,N-1,…,0 e poi inizia il turno del primo', () => {
    let s = newGame(3, 'setup');
    expect(s.setupOrder).toEqual([0, 1, 2, 2, 1, 0]);
    const order: number[] = [];
    while (s.phase.type === 'setup') {
      if (s.phase.expect === 'villaggio') order.push(s.currentPlayer);
      const a = getLegalActions(s, s.currentPlayer)[0]!;
      s = act(s, a);
    }
    expect(order).toEqual([0, 1, 2, 2, 1, 0]);
    expect(s.phase).toEqual({ type: 'tiro' });
    expect(s.currentPlayer).toBe(0);
    expect(s.players[0]!.movePointsLeft).toBe(4);
  });

  it('ognuno ha 2 villaggi e 2 strade; il Jarl è sul SECONDO villaggio', () => {
    let s = newGame(2, 'setup2');
    const placed: Record<number, string[]> = { 0: [], 1: [] };
    while (s.phase.type === 'setup') {
      const a = getLegalActions(s, s.currentPlayer)[0]!;
      if (a.type === 'piazzaVillaggioIniziale') placed[a.player]!.push(a.territory);
      s = act(s, a);
    }
    for (const pid of [0, 1]) {
      expect(placed[pid]).toHaveLength(2);
      expect(s.players[pid]!.jarl).toBe(placed[pid]![1]);
      expect(Object.values(s.roads).filter((o) => o === pid)).toHaveLength(2);
    }
  });

  it('il secondo villaggio dà 1 materiale del suo territorio, il primo niente', () => {
    const s = finishSetup(newGame(2, 'setup3'));
    for (const p of s.players) {
      expect(totalResources(p.hand)).toBe(1);
      const t = s.territories[p.jarl]!;
      const kind = s.map.territories.find((x) => x.id === t.id)!.kind;
      expect(kind).not.toBe('deserto');
      expect(p.hand[kind as 'legname']).toBe(1);
    }
  });

  it('non si può partire da un deserto; un territorio ospita al massimo 2 clan diversi', () => {
    let s = newGame(3, 'setup4');
    expect(applyAction(s, { type: 'piazzaVillaggioIniziale', player: 0, territory: 'sahara' }).ok).toBe(false);
    s = act(s, { type: 'piazzaVillaggioIniziale', player: 0, territory: 'italia' });
    s = act(s, { type: 'piazzaStradaIniziale', player: 0, link: 'balcani|italia' });
    s = act(s, { type: 'piazzaVillaggioIniziale', player: 1, territory: 'italia' }); // secondo clan: ok
    s = act(s, { type: 'piazzaStradaIniziale', player: 1, link: 'europa_occ|italia' });
    const r = applyAction(s, { type: 'piazzaVillaggioIniziale', player: 2, territory: 'italia' }); // terzo: no
    expect(r.ok).toBe(false);
  });

  it('le isole raggiungibili solo via mare non sono scelte valide', () => {
    const s = newGame(2, 'setup5');
    for (const id of ['islanda', 'britannia', 'groenlandia', 'australia']) {
      const r = applyAction(s, { type: 'piazzaVillaggioIniziale', player: 0, territory: id });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(['SENZA_STRADE', 'DESERTO']).toContain(r.error.code);
    }
  });

  it('la strada iniziale deve toccare il villaggio appena piazzato e solo via terra', () => {
    const s = act(newGame(2, 'setup6'), { type: 'piazzaVillaggioIniziale', player: 0, territory: 'italia' });
    expect(applyAction(s, { type: 'piazzaStradaIniziale', player: 0, link: linkId('iberia', 'europa_occ') }).ok).toBe(false);
    expect(applyAction(s, { type: 'piazzaStradaIniziale', player: 0, link: linkId('italia', 'nord_africa') }).ok).toBe(false);
    expect(applyAction(s, { type: 'piazzaStradaIniziale', player: 0, link: linkId('italia', 'balcani') }).ok).toBe(true);
  });

  it('fuori turno è respinto', () => {
    const s = newGame(2, 'setup7');
    expect(applyAction(s, { type: 'piazzaVillaggioIniziale', player: 1, territory: 'italia' }).ok).toBe(false);
  });
});
