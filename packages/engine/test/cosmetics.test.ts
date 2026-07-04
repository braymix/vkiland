/** Cosmetici: passthrough opaco config → vista pubblica (nessuna logica di gioco). */
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/game';
import { getPlayerView } from '../src/view';
import type { PlayerConfig } from '../src/types';

const players: PlayerConfig[] = [
  {
    name: 'A',
    color: '#c0392b',
    isBot: false,
    cosmetics: { dragon: 'trex', stronghold: 'castello' },
  },
  { name: 'B', color: '#2e6fb7', isBot: true, botLevel: 'normale' },
];

describe('cosmetics passthrough', () => {
  it('le skin del config arrivano nella vista pubblica (visibili a TUTTI)', () => {
    const state = createGame({ seed: 'cosmetics-1', players });
    // Nella vista dell'avversario: le skin di A sono pubbliche.
    const viewOfB = getPlayerView(state, 1);
    expect(viewOfB.players[0]!.cosmetics).toEqual({ dragon: 'trex', stronghold: 'castello' });
    // Chi non ha skin non ha il campo (ripiego classico nel renderer).
    expect(viewOfB.players[1]!.cosmetics).toBeUndefined();
    // Anche lo spettatore le vede (il tabellone è pubblico).
    const spec = getPlayerView(state, 'spettatore');
    expect(spec.players[0]!.cosmetics?.dragon).toBe('trex');
  });

  it('il motore non interpreta gli id: anche id ignoti passano intatti', () => {
    const state = createGame({
      seed: 'cosmetics-2',
      players: [
        { name: 'A', color: '#c0392b', isBot: false, cosmetics: { dragon: 'skin-futura' } },
        { name: 'B', color: '#2e6fb7', isBot: true, botLevel: 'normale' },
      ],
    });
    expect(getPlayerView(state, 0).players[0]!.cosmetics?.dragon).toBe('skin-futura');
  });
});
