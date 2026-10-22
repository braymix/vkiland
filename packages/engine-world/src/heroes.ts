/**
 * EROI di «Vikings Around the World». A differenza della Modalità Classica (dove
 * sono una modalità opzionale), qui gli eroi sono SEMPRE attivi: ogni clan gioca
 * con ESATTAMENTE un eroe. Sono gli STESSI personaggi della Classica, con lo
 * STESSO modo di sbloccarli (la progressione dell'account vive in
 * `@vikiland/engine` e viene consultata dal client/server, non qui): questo
 * motore resta puro e indipendente, perciò qui vivono solo gli id e gli EFFETTI
 * nel contesto del Mondo. Nomi nordici, descrizioni e pixel art restano nel
 * registro della Classica e nei testi i18n.
 *
 * Alcuni effetti sono stati adattati alle regole del Mondo (niente approdi
 * specifici né Drago/Berserker):
 *   - Njord «Signore dei Mari»  → una volta per partita costruisci un Porto GRATIS;
 *   - Ulfar «Comandante»        → il tuo Jarl ha +1 punto movimento (passivo).
 */
import { MOVE_POINTS, PIECE_LIMITS } from './constants';
import type { WorldBuildable } from './constants';
import type { PlayerId, ProducedResource, WorldGameState } from './types';

/** Gli id coincidono con quelli della Classica (`@vikiland/engine` HeroId). */
export type WorldHeroId =
  // Comuni: uno per materiale (a inizio turno +1 di quel materiale).
  | 'donoLegname'
  | 'donoPietra'
  | 'donoLana'
  | 'donoOrzo'
  | 'donoFerro'
  // Non comuni.
  | 'mutaporto'
  | 'mercante'
  | 'apripista'
  | 'maestro'
  | 'comandante';

export interface WorldHeroEffect {
  id: WorldHeroId;
  /** Solo «Dono»: il materiale guadagnato (+1) a inizio turno. */
  donoResource?: ProducedResource;
  /** Usi limitati per partita (mercante=4, mutaporto=1). Assente = passivo/illimitato. */
  usesPerGame?: number;
  /** Chiave dell'uso limitato dentro `WorldPlayerState.heroUses`. */
  useKey?: string;
}

/** Registro degli EFFETTI (non dei nomi). Fonte di verità del motore. */
export const WORLD_HERO_EFFECTS: Readonly<Record<WorldHeroId, WorldHeroEffect>> = {
  donoLegname: { id: 'donoLegname', donoResource: 'legname' },
  donoPietra: { id: 'donoPietra', donoResource: 'pietra' },
  donoLana: { id: 'donoLana', donoResource: 'lana' },
  donoOrzo: { id: 'donoOrzo', donoResource: 'orzo' },
  donoFerro: { id: 'donoFerro', donoResource: 'ferro' },
  mutaporto: { id: 'mutaporto', usesPerGame: 1, useKey: 'portoGratis' },
  mercante: { id: 'mercante', usesPerGame: 4, useKey: 'mercante' },
  apripista: { id: 'apripista' },
  maestro: { id: 'maestro' },
  comandante: { id: 'comandante' },
};

export const ALL_WORLD_HERO_IDS: readonly WorldHeroId[] = Object.keys(WORLD_HERO_EFFECTS) as WorldHeroId[];

export function worldHeroEffect(id: WorldHeroId | undefined | null): WorldHeroEffect | undefined {
  return id ? WORLD_HERO_EFFECTS[id] : undefined;
}

/** L'eroe del clan `pid` (undefined se nessuno/giocatore inesistente). */
export function heroOf(state: WorldGameState, pid: PlayerId): WorldHeroId | undefined {
  return state.players[pid]?.hero;
}

/** Il clan `pid` gioca con l'eroe `id`? */
export function hasHero(state: WorldGameState, pid: PlayerId, id: WorldHeroId): boolean {
  return heroOf(state, pid) === id;
}

/** Usi rimasti di un'abilità a consumo (0 se assente). */
export function heroUsesLeft(state: WorldGameState, pid: PlayerId, key: string): number {
  return state.players[pid]?.heroUses?.[key] ?? 0;
}

/** Punti movimento del Jarl per questo clan: il Comandante (Ulfar) ne ha +1. */
export function movePointsFor(state: WorldGameState, pid: PlayerId): number {
  return MOVE_POINTS + (hasHero(state, pid, 'comandante') ? 1 : 0);
}

/** Strade iniziali che il clan piazza per ciascun villaggio nel setup: l'Apripista (Vegard) ne piazza 2. */
export function setupRoadsFor(state: WorldGameState, pid: PlayerId): number {
  return hasHero(state, pid, 'apripista') ? 2 : 1;
}

/**
 * Limite di pezzi EFFETTIVO: il Maestro Costruttore (Sindri) alza di 1 il massimo
 * di strade, villaggi e città. Sala/Porto/Mercato restano invariati.
 */
export function effectivePieceLimit(state: WorldGameState, pid: PlayerId, kind: WorldBuildable): number {
  const base = PIECE_LIMITS[kind];
  if (!hasHero(state, pid, 'maestro')) return base;
  return kind === 'strada' || kind === 'villaggio' || kind === 'citta' ? base + 1 : base;
}

/** Inizializza il contatore `heroUses` per l'eroe dato (vuoto se passivo). */
export function initialHeroUses(id: WorldHeroId | undefined): Record<string, number> | undefined {
  const eff = worldHeroEffect(id);
  if (!eff?.useKey || eff.usesPerGame === undefined) return undefined;
  return { [eff.useKey]: eff.usesPerGame };
}

/** Ripulisce un id eroe ricevuto da fuori: valido o undefined. */
export function sanitizeWorldHero(raw: unknown): WorldHeroId | undefined {
  return typeof raw === 'string' && raw in WORLD_HERO_EFFECTS ? (raw as WorldHeroId) : undefined;
}
