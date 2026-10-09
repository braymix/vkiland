import { createGame, defaultConfig, getMapDefinition } from '@vikiland/engine-world';

export { getMapDefinition };

/** Mappa congelata di una partita qualsiasi (per i test dei testi). */
export function freezeMapForTest() {
  return createGame(
    defaultConfig({ seed: 't', players: [{ name: 'a', color: 'x' }, { name: 'b', color: 'y' }] })
  ).map;
}
