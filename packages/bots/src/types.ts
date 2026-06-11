/**
 * Interfaccia dei bot: riceve SOLO la vista filtrata (niente mani altrui,
 * niente mazzo, niente RNG di partita) più le mosse legali già enumerate
 * dal motore, e restituisce un'azione concreta.
 *
 * La stessa interfaccia gira identica nel client (Fase 1-2) e nel server
 * (Fase 3): il chiamante decide tempi e scheduling, il bot è una funzione pura.
 * Il motore rivalida comunque ogni azione: un bot difettoso non può barare.
 */
import type { Action, LegalMove, PlayerId, PlayerView } from '@vikiland/engine';

export interface BotInput {
  view: PlayerView;
  legalActions: LegalMove[];
  player: PlayerId;
  /** Seed per l'eventuale casualità interna: rende il bot riproducibile. */
  rngSeed: string;
}

export interface Bot {
  readonly name: string;
  decide(input: BotInput): Action;
}
