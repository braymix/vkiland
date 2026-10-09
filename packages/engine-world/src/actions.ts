/** Azioni, eventi ed errori di Vikings Around the World. */
import type {
  BuildingKind,
  PlayerId,
  ResourceMap,
  TradeOffer,
  WorldGameState,
  WorldResource,
} from './types';

export type WorldAction =
  // --- Setup a serpentina ---
  | { type: 'piazzaVillaggioIniziale'; player: PlayerId; territory: string }
  | { type: 'piazzaStradaIniziale'; player: PlayerId; link: string }
  // --- Turno ---
  | { type: 'tiraDadi'; player: PlayerId }
  | { type: 'scarta'; player: PlayerId; resources: ResourceMap }
  | { type: 'ruba'; player: PlayerId; target: PlayerId }
  /** Un passo del Jarl verso un territorio confinante. `pay` = parte in materiali del pedaggio. */
  | { type: 'muovi'; player: PlayerId; to: string; pay?: ResourceMap }
  // --- Costruzioni ---
  | { type: 'costruisciStrada'; player: PlayerId; link: string }
  | { type: 'costruisci'; player: PlayerId; what: BuildingKind | 'porto' | 'mercato'; territory: string }
  // --- Scambi ---
  | { type: 'scambioBanca'; player: PlayerId; give: WorldResource; receive: WorldResource }
  | { type: 'proponiScambio'; player: PlayerId; give: ResourceMap; receive: ResourceMap; to: PlayerId | null }
  | { type: 'rispondiScambio'; player: PlayerId; offerId: number; accept: boolean }
  | { type: 'confermaScambio'; player: PlayerId; offerId: number; with: PlayerId }
  | { type: 'annullaScambio'; player: PlayerId; offerId: number }
  | { type: 'fineTurno'; player: PlayerId };

export type WorldEvent =
  | { type: 'turnoIniziato'; player: PlayerId; turnNumber: number }
  | { type: 'costruito'; player: PlayerId; what: 'strada' | BuildingKind | 'porto' | 'mercato'; at: string; setup?: boolean }
  | { type: 'setupFinito' }
  | { type: 'dadi'; player: PlayerId; dice: [number, number]; total: number }
  | {
      type: 'produzione';
      gains: { player: PlayerId; territory: string; resource: WorldResource; amount: number }[];
    }
  | { type: 'tassaDelRe' }
  | { type: 'scartato'; player: PlayerId; count: number }
  | { type: 'rubato'; player: PlayerId; target: PlayerId; resource: WorldResource | null }
  | { type: 'mosso'; player: PlayerId; from: string; to: string; cost: number }
  | { type: 'pedaggio'; payer: PlayerId; payee: PlayerId; territory: string; paid: ResourceMap }
  | { type: 'scambioBanca'; player: PlayerId; give: WorldResource; giveCount: number; receive: WorldResource; receiveCount: number }
  | { type: 'scambioProposto'; offer: TradeOffer }
  | { type: 'scambioRisposto'; player: PlayerId; offerId: number; accept: boolean }
  | { type: 'scambioRifiutato'; offerId: number }
  | { type: 'scambioConcluso'; offer: TradeOffer; with: PlayerId }
  | { type: 'scambioAnnullato'; offerId: number }
  | { type: 'grandeVia'; holder: PlayerId | null; length: number }
  | { type: 'grandeViaggiatore'; holder: PlayerId | null; continents: number }
  | { type: 'vittoria'; player: PlayerId };

export interface ValidationError {
  code: string;
  message: string;
}

export type ApplyResult =
  | { ok: true; state: WorldGameState; events: WorldEvent[] }
  | { ok: false; error: ValidationError };
