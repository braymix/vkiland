/**
 * Azioni (le "intenzioni" dei giocatori), eventi (cosa è successo, per log e
 * animazioni) ed errori di validazione.
 */
import type {
  EdgeId,
  HexId,
  PlayerId,
  Resource,
  ResourceCount,
  SagaCard,
  TradeOffer,
  VertexId,
} from './types';

export type Action =
  // --- Setup a serpentina ---
  | { type: 'piazzaVillaggioIniziale'; player: PlayerId; vertex: VertexId }
  | { type: 'piazzaSentieroIniziale'; player: PlayerId; edge: EdgeId }
  // --- Turno ---
  | { type: 'tiraDadi'; player: PlayerId }
  | { type: 'scarta'; player: PlayerId; resources: ResourceCount }
  | { type: 'muoviDrago'; player: PlayerId; hex: HexId }
  | { type: 'ruba'; player: PlayerId; target: PlayerId }
  // --- Costruzioni ---
  | { type: 'costruisciSentiero'; player: PlayerId; edge: EdgeId }
  | { type: 'costruisciVillaggio'; player: PlayerId; vertex: VertexId }
  | { type: 'costruisciRoccaforte'; player: PlayerId; vertex: VertexId }
  | { type: 'compraCartaSaga'; player: PlayerId }
  // --- Scambi ---
  | { type: 'scambioBanca'; player: PlayerId; give: Resource; receive: Resource }
  | {
      type: 'proponiScambio';
      player: PlayerId;
      give: ResourceCount;
      receive: ResourceCount;
      to: PlayerId | null;
    }
  | { type: 'rispondiScambio'; player: PlayerId; offerId: number; accept: boolean }
  | { type: 'confermaScambio'; player: PlayerId; offerId: number; with: PlayerId }
  | { type: 'annullaScambio'; player: PlayerId; offerId: number }
  // --- Carte Saga (la Saga degli Eroi non si gioca: conta da sola) ---
  | { type: 'giocaBerserker'; player: PlayerId }
  | { type: 'giocaCostruttori'; player: PlayerId }
  | { type: 'piazzaSentieroGratis'; player: PlayerId; edge: EdgeId }
  | { type: 'giocaBanchetto'; player: PlayerId; resources: [Resource, Resource] }
  | { type: 'giocaTributo'; player: PlayerId; resource: Resource }
  // --- Fine turno ---
  | { type: 'fineTurno'; player: PlayerId };

/**
 * Mosse legali: azioni concrete dove enumerabili, descrittori parametrici per
 * gli spazi combinatori (lo scarto e la proposta di scambio hanno troppe
 * combinazioni: UI e bot costruiscono il payload).
 */
export type LegalMove =
  | Action
  | { type: 'scartaDescr'; player: PlayerId; amount: number }
  | { type: 'proponiScambioDescr'; player: PlayerId };

export interface ValidationError {
  code: string;
  /** Messaggio in italiano, riusabile direttamente nella UI. */
  message: string;
}

export interface ScoreBreakdown {
  player: PlayerId;
  villaggi: number;
  roccaforti: number;
  grandeVia: number;
  furia: number;
  eroiNascosti: number;
  totale: number;
}

export type GameEvent =
  | { type: 'turnoIniziato'; player: PlayerId; turnNumber: number }
  | { type: 'dadiTirati'; player: PlayerId; dice: [number, number]; total: number }
  | { type: 'risorseProdotte'; gains: { player: PlayerId; resources: ResourceCount }[] }
  | { type: 'penuriaBanca'; resources: Resource[] }
  | { type: 'risorseScartate'; player: PlayerId; resources: ResourceCount | null; total: number }
  | { type: 'dragoMosso'; player: PlayerId; hex: HexId; cause: 'sette' | 'berserker' }
  | { type: 'risorsaRubata'; thief: PlayerId; victim: PlayerId; resource: Resource | null }
  | {
      type: 'costruito';
      player: PlayerId;
      kind: 'sentiero' | 'villaggio' | 'roccaforte';
      position: string;
      gratis: boolean;
    }
  | { type: 'cartaSagaComprata'; player: PlayerId; card: SagaCard | null }
  | { type: 'cartaSagaGiocata'; player: PlayerId; card: SagaCard }
  | { type: 'banchettoRiscosso'; player: PlayerId; resources: [Resource, Resource] }
  | { type: 'tributoRiscosso'; player: PlayerId; resource: Resource; total: number }
  | { type: 'scambioProposto'; offer: TradeOffer }
  | { type: 'rispostaScambio'; player: PlayerId; offerId: number; accepted: boolean }
  | {
      type: 'scambioEseguito';
      kind: 'banca' | 'giocatori';
      from: PlayerId;
      to: PlayerId | null;
      give: ResourceCount;
      receive: ResourceCount;
    }
  | { type: 'scambioAnnullato'; offerId: number }
  | { type: 'grandeViaCambiata'; holder: PlayerId | null; length: number }
  | { type: 'furiaBerserkerCambiata'; holder: PlayerId | null; count: number }
  | { type: 'vittoria'; winner: PlayerId; breakdown: ScoreBreakdown[] };

export type ApplyResult =
  | { ok: true; state: import('./types').GameState; events: GameEvent[] }
  | { ok: false; error: ValidationError };
