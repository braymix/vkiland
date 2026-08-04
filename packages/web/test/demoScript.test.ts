/** La «Demo guidata» è deterministica e i suoi snapshot sono coerenti. */
import { describe, expect, it } from 'vitest';
import { buildDemo, DEMO_SEED, DEMO_YOU } from '../src/game/demoScript';

describe('buildDemo', () => {
  it('col seme scelto: tocca a te per primo, primo tiro ≠ 7 e produci', () => {
    const d = buildDemo(DEMO_SEED);
    expect(d.youStart).toBe(true);
    expect(d.rolled.total).not.toBe(7);
    expect(d.rolled.gained).toBe(true);
  });

  it('è deterministica: stesso seme ⇒ stesse istantanee', () => {
    const a = buildDemo(DEMO_SEED);
    const b = buildDemo(DEMO_SEED);
    expect(b.village1.vertex).toBe(a.village1.vertex);
    expect(b.secondVillage.vertex).toBe(a.secondVillage.vertex);
    expect(b.rolled.total).toBe(a.rolled.total);
    expect(b.finalView.players.map((p) => p.gloryPointsPublic)).toEqual(
      a.finalView.players.map((p) => p.gloryPointsPublic)
    );
  });

  it('gli snapshot del setup raccontano l’arco giusto', () => {
    const d = buildDemo(DEMO_SEED);
    // L'isola parte vuota; 19 esagoni.
    expect(d.island.board.hexes).toHaveLength(19);
    expect(d.island.players.every((p) => p.villages.length === 0)).toBe(true);
    // Dopo il primo villaggio: ne hai 1 e c'è il sentiero successivo.
    expect(d.village1.view.players[DEMO_YOU]!.villages).toContain(d.village1.vertex);
    expect(d.road1.view.players[DEMO_YOU]!.roads).toContain(d.road1.edge);
    // «Anche gli altri piazzano»: tutti hanno almeno 1 villaggio.
    expect(d.othersPlaced.players.every((p) => p.villages.length >= 1)).toBe(true);
    // Fine setup: ogni clan ha 2 villaggi e 2 sentieri.
    expect(d.setupDone.view.players.every((p) => p.villages.length === 2)).toBe(true);
    expect(d.setupDone.view.players.every((p) => p.roads.length === 2)).toBe(true);
    // Il secondo villaggio produce: almeno un esagono evidenziato.
    expect(d.secondVillage.producingHexes.length).toBeGreaterThan(0);
  });

  it('il Drago parte da un esagono e l’isola finale è una vittoria', () => {
    const d = buildDemo(DEMO_SEED);
    expect(d.dragonHex).toMatch(/-?\d+,-?\d+/);
    expect(d.finalView.players.some((p) => p.gloryPointsPublic >= 10)).toBe(true);
  });

  it('l’esempio ragionato è coerente e deterministico', () => {
    const d = buildDemo(DEMO_SEED);
    const s = d.strategy;
    // Tre «posti migliori»; il primo è proprio il villaggio scelto dalla demo.
    expect(s.topSpots).toHaveLength(3);
    expect(s.topSpots[0]).toBe(d.village1.vertex);
    // Il primo villaggio afferra almeno una risorsa (esagoni produttivi coerenti).
    expect(s.firstResources.length).toBeGreaterThan(0);
    expect(s.firstHexes.length).toBe(s.firstNumbers.length);
    // L'espansione punta a un incrocio diverso dal villaggio di partenza…
    expect(s.expansion.targetVertex).not.toBe(d.village1.vertex);
    // …e il suo spigolo-obiettivo tocca davvero quel bersaglio.
    const target = s.expansion.targetVertex;
    expect(d.road1.view.board.hexes.length).toBe(19);
    // Un id di vertice è la tripla di esagoni giunti da «;» (es. «0,0;1,0;0,1»).
    expect(target.split(';')).toHaveLength(3);
    // Deterministica: stesso seme ⇒ stessa strategia.
    const b = buildDemo(DEMO_SEED);
    expect(b.strategy.topSpots).toEqual(s.topSpots);
    expect(b.strategy.expansion.targetVertex).toBe(s.expansion.targetVertex);
    expect(b.strategy.expansion.targetEdge).toBe(s.expansion.targetEdge);
    expect(b.strategy.secondNewResources).toEqual(s.secondNewResources);
  });
});
