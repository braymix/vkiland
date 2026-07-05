/** Cosmetici: passthrough opaco config → vista pubblica (nessuna logica di gioco). */
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/game';
import { getPlayerView } from '../src/view';
import { sanitizeCosmetics } from '../src/cosmetics';
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

describe('sanitizeCosmetics', () => {
  it('tiene solo id di skin noti e scarta i colori mal formati', () => {
    expect(
      sanitizeCosmetics({
        dragon: 'trex',
        stronghold: 'inventata',
        dragonColors: { eyes: '#00FF00', fire: 'rosso' },
        strongholdColors: { stone: '#abc' },
      })
    ).toEqual({ dragon: 'trex', dragonColors: { eyes: '#00ff00' } });
  });

  it('conserva i colori validi e li normalizza in minuscolo', () => {
    expect(
      sanitizeCosmetics({
        stronghold: 'torre',
        dragonColors: { eyes: '#FFD23E', fire: '#FF7A3C' },
        strongholdColors: { stone: '#B8AD99' },
      })
    ).toEqual({
      stronghold: 'torre',
      dragonColors: { eyes: '#ffd23e', fire: '#ff7a3c' },
      strongholdColors: { stone: '#b8ad99' },
    });
  });

  it('lascia fuori i contenitori di colore vuoti (nessun accento valido)', () => {
    expect(sanitizeCosmetics({ dragon: 'drago', dragonColors: {}, strongholdColors: { stone: 42 } })).toEqual({
      dragon: 'drago',
    });
  });

  it('un input non-oggetto degrada a cosmetici vuoti', () => {
    expect(sanitizeCosmetics(null)).toEqual({});
    expect(sanitizeCosmetics('nope')).toEqual({});
  });
});
