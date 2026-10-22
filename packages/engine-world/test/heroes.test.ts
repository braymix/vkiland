import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  defaultConfig,
  getDefaultAction,
  piecesLeft,
  totalResources,
  type WorldEvent,
  type WorldGameState,
  type WorldHeroId,
} from '../src';
import { COLORS, blank, finishSetup } from './helpers';

function gameWithHeroes(heroes: (WorldHeroId | undefined)[], seed = 'hero'): WorldGameState {
  return createGame(
    defaultConfig({
      seed,
      players: heroes.map((hero, i) => ({ name: `P${i}`, color: COLORS[i]!, ...(hero ? { hero } : {}) })),
    })
  );
}

/** Esegue le mosse di default finché non ricomincia il turno di `pid`, raccogliendo gli eventi. */
function playToTurnStart(state: WorldGameState, pid: number): { state: WorldGameState; events: WorldEvent[] } {
  let s = state;
  const events: WorldEvent[] = [];
  let guard = 0;
  while (++guard < 500) {
    const a = getDefaultAction(s);
    if (!a) break;
    const r = applyAction(s, a);
    if (!r.ok) throw new Error(r.error.code);
    s = r.state;
    events.push(...r.events);
    if (r.events.some((e) => e.type === 'turnoIniziato' && e.player === pid)) break;
  }
  return { state: s, events };
}

describe('eroi di Vikings Around the World', () => {
  it('Dono: a inizio turno il clan guadagna 1 del suo materiale', () => {
    const s0 = finishSetup(gameWithHeroes(['donoLegname', undefined]));
    // Durante il setup il turno di P0 è già cominciato una volta (Dono già applicato).
    const legnamePrima = s0.players[0]!.hand.legname;
    const { state, events } = playToTurnStart(s0, 0);
    const guadagni = events.filter((e) => e.type === 'eroeGuadagno' && e.player === 0);
    expect(guadagni.length).toBeGreaterThanOrEqual(1);
    expect((guadagni[0] as Extract<WorldEvent, { type: 'eroeGuadagno' }>).resource).toBe('legname');
    // Il legname è cresciuto almeno del Dono (eventuale produzione a parte).
    expect(state.players[0]!.hand.legname).toBeGreaterThan(legnamePrima);
  });

  it('Mercante: 4 scambi 2-a-1, poi l’abilità è esaurita', () => {
    const s = blank(2, 'italia');
    s.players[0]!.hero = 'mercante';
    s.players[0]!.heroUses = { mercante: 4 };
    s.players[0]!.hand = { legname: 8, pietra: 0, lana: 0, orzo: 0, ferro: 0, argento: 0 };
    let cur = s;
    for (let i = 0; i < 4; i++) {
      const r = applyAction(cur, { type: 'scambioBanca', player: 0, give: 'legname', receive: 'ferro', mercante: true });
      expect(r.ok).toBe(true);
      if (r.ok) cur = r.state;
    }
    expect(cur.players[0]!.heroUses!.mercante).toBe(0);
    expect(cur.players[0]!.hand.ferro).toBe(4);
    expect(cur.players[0]!.hand.legname).toBe(0);
    // Quinto scambio: niente usi rimasti.
    const no = applyAction(cur, { type: 'scambioBanca', player: 0, give: 'ferro', receive: 'lana', mercante: true });
    expect(no.ok).toBe(false);
    // Il Mercante non vale sull'argento.
    const silver = applyAction(
      { ...blankMerc(), players: blankMerc().players },
      { type: 'scambioBanca', player: 0, give: 'legname', receive: 'argento', mercante: true }
    );
    expect(silver.ok).toBe(false);
  });

  it('Apripista: nel setup piazza 2 strade per ogni villaggio iniziale', () => {
    const s = finishSetup(gameWithHeroes(['apripista', undefined], 'apri'));
    expect(Object.values(s.roads).filter((o) => o === 0)).toHaveLength(4);
    expect(Object.values(s.roads).filter((o) => o === 1)).toHaveLength(2);
  });

  it('Maestro: +1 al limite di strade, villaggi e città (Sala invariata)', () => {
    const s = blank(2, 'italia');
    s.players[0]!.hero = 'maestro';
    expect(piecesLeft(s, 0, 'strada')).toBe(16);
    expect(piecesLeft(s, 0, 'villaggio')).toBe(7);
    expect(piecesLeft(s, 0, 'citta')).toBe(5);
    expect(piecesLeft(s, 0, 'sala')).toBe(1);
    // Senza eroe, i limiti base.
    expect(piecesLeft(s, 1, 'strada')).toBe(15);
    expect(piecesLeft(s, 1, 'villaggio')).toBe(6);
  });

  it('Njord: un Porto gratis per partita, poi niente', () => {
    const s = blank(2, 'italia');
    s.players[0]!.hero = 'mutaporto';
    s.players[0]!.heroUses = { portoGratis: 1 };
    s.territories['italia']!.settlements = [{ owner: 0, building: 'villaggio', porto: false, mercato: false }];
    s.players[0]!.hand = { legname: 0, pietra: 0, lana: 0, orzo: 0, ferro: 0, argento: 0 };
    const r = applyAction(s, { type: 'costruisci', player: 0, what: 'porto', territory: 'italia', free: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(totalResources(r.state.players[0]!.hand)).toBe(0); // niente speso
    expect(r.state.territories['italia']!.settlements[0]!.porto).toBe(true);
    expect(r.state.players[0]!.heroUses!.portoGratis).toBe(0);
    // Un secondo porto gratis non è concesso (e qui è già presente comunque).
    const again = applyAction(r.state, { type: 'costruisci', player: 0, what: 'porto', territory: 'italia', free: true });
    expect(again.ok).toBe(false);
  });

  it('Ulfar (Comandante): il Jarl ha 5 punti movimento', () => {
    const s = finishSetup(gameWithHeroes(['comandante', undefined], 'ulfar'));
    expect(s.currentPlayer).toBe(0);
    expect(s.players[0]!.movePointsLeft).toBe(5);
  });

  it('senza eroi la partita resta identica (determinismo)', () => {
    const a = finishSetup(gameWithHeroes([undefined, undefined], 'det'));
    const b = finishSetup(gameWithHeroes([undefined, undefined], 'det'));
    expect(a).toEqual(b);
    expect(a.players[0]!.movePointsLeft).toBe(4);
  });
});

function blankMerc(): WorldGameState {
  const s = blank(2, 'italia');
  s.players[0]!.hero = 'mercante';
  s.players[0]!.heroUses = { mercante: 4 };
  s.players[0]!.hand = { legname: 8, pietra: 0, lana: 0, orzo: 0, ferro: 0, argento: 0 };
  return s;
}
