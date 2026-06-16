/** Easter egg: lamentele dei bot quando il Drago li blocca. */
import { describe, expect, it } from 'vitest';
import { getTopology } from '@vikiland/engine';
import { it as itStr } from '../src/i18n/it';
import { setLang } from '../src/i18n';
import { dragonComplaints, type PiecesForComplaints } from '../src/game/logFormat';

// Il diario usa la lingua attiva: fissiamo l'italiano per confrontare col repertorio.
setLang('it');

const topo = getTopology();
const HEX = topo.hexKeys[9]!;
const HEX_VERTICES = topo.hexVertices[HEX]!;

function makeState(overrides?: Partial<PiecesForComplaints>): PiecesForComplaints {
  return {
    turnNumber: 12,
    players: [
      { name: 'Bjorn', villages: [], strongholds: [] }, // umano
      { name: 'Astrid', villages: [HEX_VERTICES[0]!], strongholds: [] }, // bot bloccato
      { name: 'Leif', villages: [], strongholds: [HEX_VERTICES[3]!] }, // bot bloccato
      { name: 'Sigrid', villages: [topo.vertices[50]!], strongholds: [] }, // bot lontano
    ],
    ...overrides,
  };
}

const event = { type: 'dragoMosso', player: 0, hex: HEX, cause: 'sette' } as const;
const BOTS = new Set([1, 2, 3]);

describe('lamentele del Drago', () => {
  it('si lamentano SOLO i bot con un edificio sull’esagono colpito', () => {
    const lines = dragonComplaints(event, makeState(), BOTS);
    expect(lines).toHaveLength(2);
    expect(lines.some((l) => l.startsWith('Astrid:'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Leif:'))).toBe(true);
    expect(lines.some((l) => l.includes('Sigrid'))).toBe(false);
    expect(lines.some((l) => l.includes('Bjorn'))).toBe(false);
  });

  it('le frasi vengono dal repertorio e la scelta è deterministica', () => {
    const a = dragonComplaints(event, makeState(), BOTS);
    const b = dragonComplaints(event, makeState(), BOTS);
    expect(a).toEqual(b); // online: tutti i client mostrano la stessa battuta
    for (const line of a) {
      expect(itStr.lamentiDrago.some((frase) => line.endsWith(`«${frase}»`))).toBe(true);
    }
  });

  it('su turni o esagoni diversi la battuta può cambiare (repertorio variato)', () => {
    const battute = new Set<string>();
    for (let turn = 1; turn <= 12; turn++) {
      const [line] = dragonComplaints(event, makeState({ turnNumber: turn }), new Set([1]));
      if (line) battute.add(line);
    }
    expect(battute.size).toBeGreaterThan(2);
  });

  it('un umano bloccato non parla; un bot che si auto-blocca nemmeno', () => {
    // Umano (0) sull'esagono: nessuna riga sua.
    const humanState = makeState({
      players: [
        { name: 'Bjorn', villages: [HEX_VERTICES[1]!], strongholds: [] },
        { name: 'Astrid', villages: [], strongholds: [] },
        { name: 'Leif', villages: [], strongholds: [] },
        { name: 'Sigrid', villages: [], strongholds: [] },
      ],
    });
    expect(dragonComplaints(event, humanState, BOTS)).toHaveLength(0);

    // Il bot 1 ha mosso il Drago su sé stesso: niente auto-lamentela.
    const selfEvent = { ...event, player: 1 };
    const lines = dragonComplaints(selfEvent, makeState(), BOTS);
    expect(lines.some((l) => l.startsWith('Astrid:'))).toBe(false);
    expect(lines.some((l) => l.startsWith('Leif:'))).toBe(true);
  });
});
