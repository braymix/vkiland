/**
 * MODALITÀ EROI (opzionale). Ogni clan sceglie un EROE da una raccolta (per ora
 * aperta e gratuita): un personaggio nordico con un'ABILITÀ passiva o attivabile.
 * Salvo diversa indicazione, un'abilità attivabile vale una volta per turno; i
 * limiti «per partita» sono contati in `PlayerState.heroUses`.
 *
 * Questo file è la SOLA fonte di verità sugli eroi: il motore consulta il
 * registro per applicare gli effetti (produzione di inizio turno, limiti pezzi,
 * setup, Drago, scambi), la UI lo usa per la schermata di scelta e la pixel art.
 */
import { PIECE_LIMITS } from './constants';
import type { Buildable } from './constants';
import type { GameState, PlayerId, Resource } from './types';

export type HeroRarity = 'comune' | 'nonComune' | 'rara' | 'leggendaria';

export type HeroId =
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

export interface HeroDef {
  id: HeroId;
  /** Nome nordico del personaggio. */
  name: string;
  /** Nome dell'abilità. */
  ability: string;
  rarity: HeroRarity;
  /** Descrizione (italiano) mostrata nella schermata di scelta. */
  description: string;
  /** Emoji-simbolo di ripiego per la card (la pixel art vive nel client). */
  emblem: string;
  /** Solo eroi «Dono»: il materiale guadagnato (+1) a inizio turno. */
  donoResource?: Resource;
  /** Usi limitati PER PARTITA (mutaporto=1, mercante=4). Assente = illimitato/passivo. */
  usesPerGame?: number;
  /** Chiave dell'uso limitato dentro `PlayerState.heroUses`. */
  useKey?: string;
}

/** Registro completo degli eroi disponibili. */
export const HERO_REGISTRY: Readonly<Record<HeroId, HeroDef>> = {
  // --- Comuni: il «Dono» di un materiale ---
  donoLegname: {
    id: 'donoLegname',
    name: 'Bjornar',
    ability: 'Dono della Foresta',
    rarity: 'comune',
    emblem: '🪵',
    donoResource: 'legname',
    description: 'All’inizio di ogni tuo turno guadagni 1 legname.',
  },
  donoPietra: {
    id: 'donoPietra',
    name: 'Steinar',
    ability: 'Dono della Cava',
    rarity: 'comune',
    emblem: '🪨',
    donoResource: 'pietra',
    description: 'All’inizio di ogni tuo turno guadagni 1 pietra.',
  },
  donoLana: {
    id: 'donoLana',
    name: 'Ullr',
    ability: 'Dono del Gregge',
    rarity: 'comune',
    emblem: '🐑',
    donoResource: 'lana',
    description: 'All’inizio di ogni tuo turno guadagni 1 lana.',
  },
  donoOrzo: {
    id: 'donoOrzo',
    name: 'Freyr',
    ability: 'Dono dei Campi',
    rarity: 'comune',
    emblem: '🌾',
    donoResource: 'orzo',
    description: 'All’inizio di ogni tuo turno guadagni 1 orzo.',
  },
  donoFerro: {
    id: 'donoFerro',
    name: 'Eldgrim',
    ability: 'Dono della Miniera',
    rarity: 'comune',
    emblem: '⛏️',
    donoResource: 'ferro',
    description: 'All’inizio di ogni tuo turno guadagni 1 ferro.',
  },

  // --- Non comuni ---
  mutaporto: {
    id: 'mutaporto',
    name: 'Njord',
    ability: 'Signore dei Mari',
    rarity: 'nonComune',
    emblem: '⚓',
    usesPerGame: 1,
    useKey: 'mutaporto',
    description:
      'Una volta per partita, quando possiedi un approdo qualunque puoi trasformarlo in un altro approdo a tua scelta.',
  },
  mercante: {
    id: 'mercante',
    name: 'Gest',
    ability: 'Mercante Errante',
    rarity: 'nonComune',
    emblem: '💰',
    usesPerGame: 4,
    useKey: 'mercante',
    description: 'Quattro volte per partita puoi fare uno scambio 2-a-1 con la banca, a tua scelta.',
  },
  apripista: {
    id: 'apripista',
    name: 'Vegard',
    ability: 'Apripista',
    rarity: 'nonComune',
    emblem: '🛤️',
    description:
      'Nel setup, con ogni casa iniziale piazzi 2 sentieri invece di uno (in tutto due sentieri in più).',
  },
  maestro: {
    id: 'maestro',
    name: 'Sindri',
    ability: 'Maestro Costruttore',
    rarity: 'nonComune',
    emblem: '🔨',
    description: 'Hai una costruzione in più per ogni tipo: sentiero, casa e roccaforte.',
  },
  comandante: {
    id: 'comandante',
    name: 'Ulfar',
    ability: 'Comandante dei Berserker',
    rarity: 'nonComune',
    emblem: '🐺',
    description: 'Quando giochi un Berserker sposti il Drago due volte (due spostamenti e due furti).',
  },
};

/**
 * Rarità con eroi disponibili, in ordine (per la schermata di scelta). Per ora
 * ci si ferma a «non comune»: niente eroi troppo forti.
 */
export const RARITY_ORDER: readonly HeroRarity[] = ['comune', 'nonComune'];

export const ALL_HEROES: readonly HeroDef[] = Object.values(HERO_REGISTRY);

export function heroDef(id: HeroId | undefined | null): HeroDef | undefined {
  return id ? HERO_REGISTRY[id] : undefined;
}

/** L'eroe scelto dal giocatore (undefined fuori dalla modalità o se non scelto). */
export function heroOf(state: GameState, player: PlayerId): HeroId | undefined {
  return state.players[player]?.hero;
}

/** Il giocatore ha esattamente l'eroe `id`? */
export function hasHero(state: GameState, player: PlayerId, id: HeroId): boolean {
  return state.players[player]?.hero === id;
}

/** Usi rimasti di un'abilità a consumo (0 se assente). */
export function heroUsesLeft(state: GameState, player: PlayerId, key: string): number {
  return state.players[player]?.heroUses?.[key] ?? 0;
}

/**
 * Limite di pezzi EFFETTIVO per il giocatore: il Maestro Costruttore (Sindri)
 * alza di 1 il massimo di sentieri, case e roccaforti. La Capitale resta 1.
 */
export function effectivePieceLimit(
  state: GameState,
  player: PlayerId,
  kind: Extract<Buildable, 'sentiero' | 'villaggio' | 'roccaforte'>
): number {
  const base = PIECE_LIMITS[kind];
  return hasHero(state, player, 'maestro') ? base + 1 : base;
}

/** Numero di sentieri iniziali che il giocatore piazza per ciascuna casa nel setup. */
export function setupRoadsPerVillage(hero: HeroId | undefined): number {
  return hero === 'apripista' ? 2 : 1;
}
