/**
 * Query PURE sulla calamità attiva nel giro (modalità Calamità opzionale).
 * Modulo "foglia": dipende SOLO dai tipi, così può essere consultato da
 * production/rules/validate/legal senza creare cicli con `calamities.ts`
 * (che invece muta lo stato e dipende da rules/scoring).
 */
import type { CalamityCard, GameState, Phase, Resource } from './types';

/** Calamità attiva nel giro corrente (null in modalità standard o prima del 1° giro). */
export function activeCalamity(state: GameState): CalamityCard | null {
  return state.calamities?.current ?? null;
}

/** Una fase di risoluzione interattiva di una calamità istantanea? */
export function isCalamityResolutionPhase(phase: Phase): boolean {
  return (
    phase.type === 'calamityDiscard' ||
    phase.type === 'calamityGain' ||
    phase.type === 'calamityRoads'
  );
}

/** Moltiplicatore di produzione per una risorsa: 0 = bloccata, 2 = doppia, 1 = normale. */
export function materialMultiplier(state: GameState, r: Resource): number {
  const c = activeCalamity(state);
  if (!c) return 1;
  if (c.kind === 'materialeBloccato' && c.resource === r) return 0;
  if (c.kind === 'materialeDoppio' && c.resource === r) return 2;
  if (c.kind === 'abbondanza') return 2;
  return 1;
}

/**
 * "Tetto" al rapporto di scambio con la banca imposto da una specifica carta
 * (Infinity se nessuno). Pura sulla carta: la usano sia l'engine (via
 * `calamityBankFloor`) sia la UI, che ha la calamità nella vista ma non lo stato.
 */
export function calamityBankFloorForCard(card: CalamityCard | null, give: Resource): number {
  if (!card) return Infinity;
  if (card.kind === 'scambiTre') return 3;
  if (card.kind === 'mercatoOro') return 2;
  if (card.kind === 'scambioDue' && card.resource === give) return 2;
  return Infinity;
}

/**
 * "Tetto" al rapporto di scambio con la banca imposto dalla calamità del giro
 * (Infinity se nessuno): il rapporto finale è il minimo tra questo e gli approdi.
 */
export function calamityBankFloor(state: GameState, give: Resource): number {
  return calamityBankFloorForCard(activeCalamity(state), give);
}

export function calamityBlocksBankTrade(state: GameState): boolean {
  return activeCalamity(state)?.kind === 'mareInTempesta';
}
export function calamityBlocksRoad(state: GameState): boolean {
  return activeCalamity(state)?.kind === 'bufera';
}
export function calamityBlocksStronghold(state: GameState): boolean {
  return activeCalamity(state)?.kind === 'assedio';
}
export function calamityBlocksSaga(state: GameState): boolean {
  return activeCalamity(state)?.kind === 'nienteSaga';
}
/** Il Drago non si può muovere (né col 7 né col Berserker). */
export function calamityDragonFrozen(state: GameState): boolean {
  return activeCalamity(state)?.kind === 'dragoFermo';
}

/** Fase da assumere al momento del tiro: col Drago "prima del tiro" si sposta prima. */
export function rollTimePhase(state: GameState): Phase {
  const c = activeCalamity(state);
  if (c && c.kind === 'dragoPrimaDelTiro') return { type: 'moveDragon', cause: 'calamita' };
  return { type: 'preRoll' };
}

/** Dopo un 7: col Drago "fermo" si salta lo spostamento e il furto. */
export function dragonPhaseAfterSeven(state: GameState): Phase {
  if (calamityDragonFrozen(state)) return { type: 'main' };
  return { type: 'moveDragon', cause: 'sette' };
}
