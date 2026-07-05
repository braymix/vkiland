/** Registro delle skin: matrici valide, id allineati all'engine, ripieghi sicuri. */
import { describe, expect, it } from 'vitest';
import { DRAGON_SKIN_IDS, STRONGHOLD_SKIN_IDS } from '@vikiland/engine';
import { DRAGON_SKINS, STRONGHOLD_SKINS, dragonSkin, strongholdSkin } from '../src/render/sprites/cosmetics';
import { LocalGameController, type GameSetup } from '../src/game/LocalGameController';

describe('registro skin', () => {
  it('gli id del registro coincidono col vocabolario dell’engine (server compreso)', () => {
    expect(DRAGON_SKINS.map((s) => s.id)).toEqual([...DRAGON_SKIN_IDS]);
    expect(STRONGHOLD_SKINS.map((s) => s.id)).toEqual([...STRONGHOLD_SKIN_IDS]);
  });

  it('ripiego sul classico per id assente o sconosciuto', () => {
    expect(dragonSkin(undefined).id).toBe('drago');
    expect(dragonSkin('skin-inesistente').id).toBe('drago');
    expect(dragonSkin('trex').id).toBe('trex');
    expect(strongholdSkin(undefined).id).toBe('roccaforte');
    expect(strongholdSkin('castello').id).toBe('castello');
  });

  it('ogni sprite è una matrice rettangolare e usa solo chiavi mappate', () => {
    for (const { id, def } of [...DRAGON_SKINS, ...STRONGHOLD_SKINS]) {
      const width = def.rows[0]!.length;
      for (const row of def.rows) {
        expect(row.length, `riga di lunghezza diversa in «${id}»`).toBe(width);
        for (const ch of row) {
          if (ch === '.') continue;
          expect(def.map[ch], `carattere «${ch}» non mappato in «${id}»`).toBeDefined();
        }
      }
    }
  });

  it('le skin del Drago usano le chiavi drago*: la tinta di chi lo sposta resta ESATTA', () => {
    for (const { id, def } of DRAGON_SKINS) {
      const keys = new Set(Object.values(def.map));
      expect(keys.has('dragoCorpo'), `«${id}» senza corpo tingibile`).toBe(true);
    }
    // E quelle delle roccaforti mostrano il colore del clan (chiavi giocatore*).
    for (const { id, def } of STRONGHOLD_SKINS) {
      const keys = new Set(Object.values(def.map));
      expect(keys.has('giocatoreMain'), `«${id}» senza colore del clan`).toBe(true);
    }
  });
});

describe('skin in una partita LOCALE (single player, nessun account richiesto)', () => {
  const setup: GameSetup = {
    seed: 'cosmetics-local-1',
    players: [
      { name: 'Umano', color: '#c0392b', isBot: false, cosmetics: { dragon: 'trex', stronghold: 'castello' } },
      { name: 'Bot', color: '#2e6fb7', isBot: true, botLevel: 'normale' },
    ],
    avoidAdjacent68: true,
    targetGloryPoints: 10,
    calamities: false,
  };

  it('la skin del posto umano (letta dal dispositivo in SetupScreen) arriva nella vista', () => {
    const c = new LocalGameController(setup);
    const view = c.getSnapshot().view;
    expect(view.players[0]!.cosmetics).toEqual({ dragon: 'trex', stronghold: 'castello' });
    // Il bot non ha skin: resta con l'aspetto classico, come lato server.
    expect(view.players[1]!.cosmetics).toBeUndefined();
    c.dispose();
  });
});
