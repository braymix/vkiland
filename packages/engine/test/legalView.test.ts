import { describe, expect, it } from 'vitest';
import {
  applyAction,
  filterEventsForPlayer,
  getLegalActions,
  getPlayerView,
  isLegal,
  nextInt,
  seedRng,
  type Action,
  type GameEvent,
} from '../src';
import { apply, autoSetup, clearHands, give, greedyDiscard, mut, newGame } from './helpers';

describe('contratto getLegalActions ↔ isLegal (fuzz)', () => {
  it('ogni azione concreta enumerata è accettata dal validatore', () => {
    for (let seedN = 0; seedN < 10; seedN++) {
      let rng = seedRng(`fuzz-${seedN}`);
      let s = newGame(2 + (seedN % 3), `fuzz-${seedN}`);
      for (let step = 0; step < 250 && s.phase.type !== 'gameOver'; step++) {
        const concrete: Action[] = [];
        for (const p of s.players) {
          for (const m of getLegalActions(s, p.id)) {
            if (m.type === 'scartaDescr') {
              concrete.push({
                type: 'scarta',
                player: m.player,
                resources: greedyDiscard(s, m.player, m.amount),
              });
            } else if (m.type !== 'proponiScambioDescr' && m.type !== 'guadagnaDescr') {
              concrete.push(m);
            }
          }
        }
        expect(concrete.length).toBeGreaterThan(0);
        for (const a of concrete) {
          const v = isLegal(s, a);
          expect(v, `mossa enumerata ma rifiutata: ${JSON.stringify(a)} → ${v?.code}`).toBeNull();
        }
        const [idx, r] = nextInt(rng, concrete.length);
        rng = r;
        s = apply(s, concrete[idx]!);
      }
    }
  });

  it('le azioni di un giocatore inesistente o fuori turno vengono rifiutate', () => {
    const s = autoSetup(newGame(3, 'fuori-turno'));
    expect(isLegal(s, { type: 'tiraDadi', player: 1 })?.code).toBe('NON_IL_TUO_TURNO');
    expect(isLegal(s, { type: 'tiraDadi', player: 99 })?.code).toBe('GIOCATORE_INESISTENTE');
    expect(getLegalActions(s, 1)).toHaveLength(0);
  });
});

describe('viste filtrate', () => {
  it('nasconde mani, mazzo, RNG e Punti Gloria segreti degli altri', () => {
    const s = mut(give(clearHands(autoSetup(newGame(3, 'vista'))), 1, { ferro: 3, lana: 2 }), (d) => {
      d.players[1]!.sagaCards.push('sagaDegliEroi', 'berserker');
      d.players[0]!.sagaCards.push('banchetto');
    });
    const vista = getPlayerView(s, 0);

    // Sé stessi: tutto visibile.
    expect(vista.me!.id).toBe(0);
    expect(vista.me!.sagaCards).toEqual(['banchetto']);

    // Gli altri: solo conteggi.
    const p1 = vista.players[1]!;
    expect(p1.resourceCardCount).toBe(5);
    expect(p1.sagaCardCount).toBe(2);
    expect((p1 as unknown as Record<string, unknown>).resources).toBeUndefined();
    expect((p1 as unknown as Record<string, unknown>).sagaCards).toBeUndefined();

    // I Punti Gloria pubblici di p1 non contano l'Eroe nascosto.
    expect(p1.gloryPointsPublic).toBe(2); // 2 villaggi del setup

    // Niente segreti di partita.
    const raw = vista as unknown as Record<string, unknown>;
    expect(raw.rngState).toBeUndefined();
    expect(raw.sagaDeck).toBeUndefined();
    expect(vista.sagaDeckCount).toBe(s.sagaDeck.length);

    // La vista del giocatore 1 invece include il SUO totale segreto.
    const vista1 = getPlayerView(s, 1);
    expect(vista1.me!.gloryPointsTotal).toBe(3); // 2 villaggi + 1 Eroe
    expect(vista1.players[1]!.gloryPointsPublic).toBe(2);

    // Lo spettatore non ha alcuna mano.
    expect(getPlayerView(s, 'spettatore').me).toBeNull();
  });

  it('filtra gli eventi sensibili per i terzi', () => {
    const events: GameEvent[] = [
      { type: 'risorsaRubata', thief: 0, victim: 1, resource: 'ferro' },
      { type: 'cartaSagaComprata', player: 0, card: 'berserker' },
      {
        type: 'risorseScartate',
        player: 1,
        resources: { legname: 2, pietra: 0, lana: 0, orzo: 2, ferro: 0 },
        total: 4,
      },
    ];
    const perLadro = filterEventsForPlayer(events, 0);
    const perVittima = filterEventsForPlayer(events, 1);
    const perTerzi = filterEventsForPlayer(events, 2);

    expect((perLadro[0] as { resource: unknown }).resource).toBe('ferro');
    expect((perVittima[0] as { resource: unknown }).resource).toBe('ferro');
    expect((perTerzi[0] as { resource: unknown }).resource).toBeNull();

    expect((perLadro[1] as { card: unknown }).card).toBe('berserker');
    expect((perTerzi[1] as { card: unknown }).card).toBeNull();

    expect((perVittima[2] as { resources: unknown }).resources).not.toBeNull();
    expect((perTerzi[2] as { resources: unknown }).resources).toBeNull();
    expect((perTerzi[2] as { total: unknown }).total).toBe(4); // il QUANTO è pubblico
  });

  it('applyAction non muta mai lo stato in ingresso', () => {
    const s = autoSetup(newGame(2, 'immutabile'));
    const fotografia = JSON.stringify(s);
    applyAction(s, { type: 'tiraDadi', player: 0 });
    applyAction(s, { type: 'tiraDadi', player: 1 }); // anche le azioni rifiutate
    expect(JSON.stringify(s)).toBe(fotografia);
  });
});
