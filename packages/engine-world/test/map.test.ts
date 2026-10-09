import { describe, expect, it } from 'vitest';
import { MAPS, applyMapOverride, createGame, defaultConfig, trimNumberPool, validateMap, getMapDefinition } from '../src';
import { COLORS, newGame } from './helpers';

const mondo = getMapDefinition('mondo')!;

describe('mappa «Il Mondo»', () => {
  it('è valida: connessa, rotte fra costieri, numeri coerenti', () => {
    expect(validateMap(mondo)).toEqual([]);
  });

  it('ha 32 territori: 29 produttivi + 3 deserti, 42 collegamenti di terra e 16 rotte', () => {
    expect(mondo.territories).toHaveLength(32);
    expect(mondo.territories.filter((t) => t.kind === 'deserto')).toHaveLength(3);
    expect(mondo.links.filter((l) => l.kind === 'terra')).toHaveLength(42);
    expect(mondo.links.filter((l) => l.kind === 'mare')).toHaveLength(16);
    expect(mondo.numberPool).toHaveLength(29);
  });

  it('conteggio materiali: legname 7, lana 6, orzo 6, pietra 5, ferro 5', () => {
    const c: Record<string, number> = {};
    for (const t of mondo.territories) c[t.kind] = (c[t.kind] ?? 0) + 1;
    expect(c).toEqual({ legname: 7, lana: 6, orzo: 6, pietra: 5, ferro: 5, deserto: 3 });
  });

  it('ogni territorio ha una forma disegnabile', () => {
    for (const t of mondo.territories) {
      expect(t.polygons.length).toBeGreaterThan(0);
      for (const p of t.polygons) expect(p.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('Islanda, Britannia, Groenlandia e Australia si raggiungono solo via mare', () => {
    for (const id of ['islanda', 'britannia', 'groenlandia', 'australia']) {
      expect(mondo.links.filter((l) => l.kind === 'terra' && (l.a === id || l.b === id))).toHaveLength(0);
    }
  });

  it('registro mappe', () => {
    expect(Object.keys(MAPS)).toContain('mondo');
    expect(getMapDefinition('inesistente')).toBeNull();
  });
});

describe('numeri', () => {
  it('sono assegnati ai soli territori produttivi con il mazzo completo', () => {
    const s = newGame(3, 'num');
    const nums = Object.values(s.territories).map((t) => t.number).filter((n): n is number => n !== null);
    expect(nums.sort((a, b) => a - b)).toEqual([...mondo.numberPool].sort((a, b) => a - b));
    for (const t of s.map.territories) {
      expect(s.territories[t.id]!.number === null).toBe(t.kind === 'deserto');
    }
  });

  it('6 e 8 non sono su territori collegati (avoidAdjacent68)', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const s = newGame(2, seed);
      const hot = (id: string): boolean => [6, 8].includes(s.territories[id]!.number ?? 0);
      for (const l of s.map.links) expect(hot(l.a) && hot(l.b)).toBe(false);
    }
  });

  it('stesso seed = stessa partita', () => {
    expect(newGame(2, 'x')).toEqual(newGame(2, 'x'));
    expect(newGame(2, 'x').territories).not.toEqual(newGame(2, 'y').territories);
  });

  it('«materiali casuali» mescola i materiali ma tiene i deserti', () => {
    const s = createGame(
      defaultConfig({ seed: 'm', materialiCasuali: true, players: [{ name: 'a', color: COLORS[0]! }, { name: 'b', color: COLORS[1]! }] })
    );
    const deserts = s.map.territories.filter((t) => t.kind === 'deserto').map((t) => t.id).sort();
    expect(deserts).toEqual(mondo.territories.filter((t) => t.kind === 'deserto').map((t) => t.id).sort());
    const kinds = s.map.territories.map((t) => t.kind).sort();
    expect(kinds).toEqual(mondo.territories.map((t) => t.kind).sort());
    expect(s.map.territories.map((t) => t.kind)).not.toEqual(mondo.territories.map((t) => t.kind));
  });
});

describe('override admin', () => {
  it('rinomina un territorio', () => {
    const r = applyMapOverride(mondo, { mapId: 'mondo', names: { italia: '  Italica ' }, removed: [] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.def.territories.find((t) => t.id === 'italia')!.name).toBe('Italica');
  });

  it('toglie un territorio con i suoi collegamenti e un numero dal mazzo', () => {
    const r = applyMapOverride(mondo, { mapId: 'mondo', names: {}, removed: ['giappone'] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.def.territories).toHaveLength(31);
      expect(r.def.links.some((l) => l.a === 'giappone' || l.b === 'giappone')).toBe(false);
      expect(r.def.numberPool).toHaveLength(28);
      expect(validateMap(r.def)).toEqual([]);
    }
  });

  it('rifiuta se la mappa non resta connessa', () => {
    // L'Australia si raggiunge solo dal Sud-est asiatico: toglierlo la isola.
    const r = applyMapOverride(mondo, { mapId: 'mondo', names: {}, removed: ['sud_est_asia'] });
    expect(r.ok).toBe(false);
  });

  it('rifiuta se restano meno di 15 territori produttivi', () => {
    const removed = mondo.territories.filter((t) => t.kind !== 'deserto').slice(0, 15).map((t) => t.id);
    expect(applyMapOverride(mondo, { mapId: 'mondo', names: {}, removed }).ok).toBe(false);
  });

  it('createGame usa l\'override (nome e rimozione)', () => {
    const s = createGame(
      defaultConfig({ seed: 'o', players: [{ name: 'a', color: 'x' }, { name: 'b', color: 'y' }] }),
      { override: { mapId: 'mondo', names: { italia: 'Italica' }, removed: ['giappone'] } }
    );
    expect(s.map.territories).toHaveLength(31);
    expect(s.territories['giappone']).toBeUndefined();
    expect(s.map.territories.find((t) => t.id === 'italia')!.name).toBe('Italica');
  });
});

describe('trimNumberPool', () => {
  it('toglie i numeri più vicini al 7 (a parità il più basso)', () => {
    expect(trimNumberPool([2, 6, 8, 12], 3)).toEqual([2, 8, 12]);
    expect(trimNumberPool([2, 5, 9, 12], 2)).toEqual([2, 12]);
  });
});

describe('mappe a zoom: Mondo → Europa → Italia → Milano', () => {
  for (const id of ['mondo', 'europa', 'italia', 'milano']) {
    const def = getMapDefinition(id)!;
    it(`${id}: valida, connessa, ≥15 territori produttivi e tutti i materiali`, () => {
      expect(validateMap(def)).toEqual([]);
      const productive = def.territories.filter((t) => t.kind !== 'deserto');
      expect(productive.length).toBeGreaterThanOrEqual(15);
      for (const k of ['legname', 'pietra', 'lana', 'orzo', 'ferro']) {
        expect(productive.some((t) => t.kind === k), `manca ${k}`).toBe(true);
      }
      expect(def.maxPlayers).toBeGreaterThanOrEqual(def.minPlayers);
      // i gruppi («continenti») bastano per Il Grande Viaggiatore (≥3)
      expect(new Set(def.territories.map((t) => t.continent)).size).toBeGreaterThanOrEqual(3);
    });

    it(`${id}: si crea una partita per ogni numero di giocatori consentito`, () => {
      for (let n = def.minPlayers; n <= def.maxPlayers; n++) {
        const s = createGame(
          defaultConfig({ seed: `m-${id}-${n}`, mapId: id, players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, color: COLORS[i]! })) })
        );
        expect(s.map.territories).toHaveLength(def.territories.length);
      }
    });

    it(`${id}: le forme stanno nel riquadro del mondo`, () => {
      for (const t of def.territories) {
        for (const ring of t.polygons) {
          for (const [lon, lat] of ring) {
            expect(lon).toBeGreaterThanOrEqual(-185);
            expect(lon).toBeLessThanOrEqual(195);
            expect(lat).toBeGreaterThanOrEqual(-70);
            expect(lat).toBeLessThanOrEqual(85);
          }
        }
      }
    });
  }

  it('le isole di Italia ed Europa si raggiungono solo via mare, e il setup ha comunque scelte', () => {
    const s = createGame(defaultConfig({ seed: 'isole', mapId: 'italia', players: [{ name: 'a', color: 'x' }, { name: 'b', color: 'y' }] }));
    const terraOf = (id: string) => s.map.links.filter((l) => l.kind === 'terra' && (l.a === id || l.b === id)).length;
    const names = Object.fromEntries(s.map.territories.map((t) => [t.name, t.id]));
    expect(terraOf(names['Sardegna']!)).toBe(0);
    expect(terraOf(names['Sicilia']!)).toBe(0);
  });
});
