/**
 * Mappa «CASTELLO» (Vikings Around the World): esagono ad anelli concentrici con
 * mura (collegamenti mancanti), porte (`terra`), scale (`muro`, scavalcare),
 * brecce e passaggi segreti. Generata proceduralmente dal seed.
 */
import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  defaultConfig,
  generateCastleMap,
  getLegalActions,
  nextInt,
  validateMap,
  whoMustAct,
  type WorldAction,
  type WorldGameState,
} from '../src';
import { COLORS } from './helpers';

function castleState(seed: string, rings: number, n = 3): WorldGameState {
  return createGame(
    defaultConfig({
      seed,
      targetPoints: 8,
      mapId: 'castello',
      castleRings: rings,
      players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, color: COLORS[i]! })),
    })
  );
}

/** Numero di componenti connesse usando SOLO i link di un dato insieme di tipi. */
function components(
  terrIds: string[],
  links: { a: string; b: string; kind: string }[],
  kinds: string[]
): number {
  const parent = new Map(terrIds.map((t) => [t, t]));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  for (const l of links) {
    if (!kinds.includes(l.kind)) continue;
    parent.set(find(l.a), find(l.b));
  }
  return new Set(terrIds.map(find)).size;
}

describe('mappa castello (Mondo) — generazione', () => {
  it('è deterministica e valida', () => {
    const a = generateCastleMap('x', 3);
    const b = generateCastleMap('x', 3);
    expect(a).toEqual(b);
    expect(validateMap(a)).toEqual([]);
  });

  it('taglia per anelli: 2→19, 3→37, 4→61 territori', () => {
    expect(generateCastleMap('s', 2).territories).toHaveLength(19);
    expect(generateCastleMap('s', 3).territories).toHaveLength(37);
    expect(generateCastleMap('s', 4).territories).toHaveLength(61);
  });

  it('ha i metadati del castello e almeno una scala (link muro)', () => {
    const m = generateCastleMap('scala-seed', 3);
    expect(m.castle).toBeDefined();
    expect(m.castle!.rings).toBe(3);
    // Prova qualche seed finché trova una scala (statisticamente quasi sempre).
    let found = false;
    for (let i = 0; i < 20 && !found; i++) {
      const mm = generateCastleMap(`sc-${i}`, 3);
      if (mm.links.some((l) => l.kind === 'muro')) found = true;
    }
    expect(found).toBe(true);
  });

  it('le mura separano gli anelli: con i soli link entro-anello la mappa è spezzata', () => {
    const m = generateCastleMap('sep', 3);
    const ids = m.territories.map((t) => t.id);
    // Un link è "entro-anello" se unisce due territori con lo stesso `continent`
    // (Anello k / Mastio). I varchi uniscono anelli diversi.
    const byId = new Map(m.territories.map((t) => [t.id, t.continent]));
    const withinOnly = m.links.filter((l) => byId.get(l.a) === byId.get(l.b));
    // Senza varchi: più componenti (gli anelli sono separati).
    expect(components(ids, withinOnly, ['terra', 'muro'])).toBeGreaterThan(1);
    // Con tutti i link: una sola componente (castello interamente percorribile).
    expect(components(ids, m.links, ['terra', 'muro'])).toBe(1);
  });

  it('niente rotte di mare (solo terra e muro)', () => {
    const m = generateCastleMap('nm', 4);
    expect(m.links.some((l) => l.kind === 'mare')).toBe(false);
  });
});

describe('mappa castello (Mondo) — partita', () => {
  function playRandom(seed: string, rings: number, maxSteps = 30000): WorldGameState {
    let s = castleState(seed, rings, 3);
    let rng = s.rng;
    for (let step = 0; step < maxSteps && s.phase.type !== 'fine'; step++) {
      const actor = whoMustAct(s);
      let legal: WorldAction[] = getLegalActions(s, actor).filter(
        (a) => a.type !== 'confermaScambio' && a.type !== 'annullaScambio'
      );
      if (s.phase.type === 'azioni') {
        // Preferenza alle costruzioni (per far terminare la partita).
        const build = legal.filter((a) => a.type === 'costruisci' || a.type === 'costruisciStrada');
        if (build.length > 0) legal = build;
      }
      const [i, next] = nextInt(rng, legal.length);
      rng = next;
      const r = applyAction(s, legal[i]!);
      if (!r.ok) throw new Error(`mossa legale respinta: ${legal[i]!.type} ${r.error.message}`);
      s = r.state;
    }
    return s;
  }

  it('una partita casuale-legale termina (2 e 3 anelli)', () => {
    for (const rings of [2, 3]) {
      const s = playRandom(`run-${rings}`, rings);
      expect(s.phase.type).toBe('fine');
    }
  }, 60000);
});
