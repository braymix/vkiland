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
import {
  BUILD_COSTS,
  BUILDING_POINTS,
  JARL_GATHER,
  MARKET_SILVER,
  MOVE_POINTS,
  PIECE_LIMITS,
} from './constants';
import type { WorldBuildable } from './constants';
import type { BuildingKind, PlayerId, ProducedResource, ResourceMap, WorldGameState } from './types';

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
  | 'comandante'
  // Rari (solo Mondo): più forti dei non comuni.
  | 'navigatore'
  | 'salvacondotto'
  | 'fondatrice'
  | 'tesoriera'
  | 'razziatore'
  // Leggendari (solo Mondo): cambiano il modo di giocare.
  | 'allfather'
  | 'reginadelnord';

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
  // Rari.
  navigatore: { id: 'navigatore' },
  salvacondotto: { id: 'salvacondotto' },
  fondatrice: { id: 'fondatrice' },
  tesoriera: { id: 'tesoriera' },
  razziatore: { id: 'razziatore' },
  // Leggendari.
  allfather: { id: 'allfather' },
  reginadelnord: { id: 'reginadelnord' },
};

/**
 * Punti movimento in più del Jarl per effetto dell'eroe (sommati a MOVE_POINTS):
 * Comandante/Leif/Odino. Un clan ha UN solo eroe, quindi si applica al più uno.
 */
const MOVE_BONUS: Partial<Record<WorldHeroId, number>> = {
  comandante: 1,
  navigatore: 2,
  allfather: 2,
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

/** Punti movimento del Jarl: base + bonus dell'eroe (Comandante +1, Leif/Odino +2). */
export function movePointsFor(state: WorldGameState, pid: PlayerId): number {
  const hero = heroOf(state, pid);
  return MOVE_POINTS + (hero ? MOVE_BONUS[hero] ?? 0 : 0);
}

/**
 * Materiali raccolti dal Jarl quando esce il numero del suo territorio.
 * Freydis (salvacondotto) e Odino (allfather) raccolgono 2 invece di 1.
 */
export function jarlGatherFor(state: WorldGameState, pid: PlayerId): number {
  return hasHero(state, pid, 'salvacondotto') || hasHero(state, pid, 'allfather') ? 2 : JARL_GATHER;
}

/** Il clan `pid` paga i pedaggi? No per Freydis (salvacondotto). */
export function paysToll(state: WorldGameState, pid: PlayerId): boolean {
  return !hasHero(state, pid, 'salvacondotto');
}

/** Argento in più del Mercato per questo clan: Sigrid (tesoriera) ne dà 2 invece di 1. */
export function marketSilverFor(state: WorldGameState, pid: PlayerId): number {
  return hasHero(state, pid, 'tesoriera') ? 2 : MARKET_SILVER;
}

/** Argento guadagnato a inizio turno dall'eroe (Odino +1), 0 per gli altri. */
export function startTurnSilverFor(state: WorldGameState, pid: PlayerId): number {
  return hasHero(state, pid, 'allfather') ? 1 : 0;
}

/** Con la Tassa del Re (7) il clan ruba da OGNI candidato? Sì per Ragnar (razziatore). */
export function razziaAllFor(state: WorldGameState, pid: PlayerId): boolean {
  return hasHero(state, pid, 'razziatore');
}

/**
 * Costo di una costruzione per questo clan: Astrid (fondatrice) sconta 1 orzo
 * sul Villaggio. Ritorna una copia (mai il costo condiviso).
 */
export function buildCostFor(state: WorldGameState, pid: PlayerId, what: WorldBuildable): ResourceMap {
  const base = { ...BUILD_COSTS[what] };
  if (what === 'villaggio' && hasHero(state, pid, 'fondatrice') && base.orzo > 0) base.orzo -= 1;
  return base;
}

/** Punti Gloria di un edificio per questo clan: Thora (reginadelnord) li alza. */
export function buildingPointsFor(state: WorldGameState, pid: PlayerId, kind: BuildingKind): number {
  if (hasHero(state, pid, 'reginadelnord')) {
    return kind === 'villaggio' ? 2 : kind === 'citta' ? 3 : 6;
  }
  return BUILDING_POINTS[kind];
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
