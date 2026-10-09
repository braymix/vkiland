/** Interfaccia dei bot di «Vikings Around the World»: vista filtrata + mosse legali → azione. */
import type { PlayerId, WorldAction, WorldPlayerView } from '@vikiland/engine-world';

export interface WorldBotInput {
  view: WorldPlayerView;
  /** Mosse legali già enumerate dal motore (`getLegalActions`). */
  legalActions: WorldAction[];
  player: PlayerId;
  /** Seed per l'eventuale casualità interna: rende il bot riproducibile. */
  rngSeed: string;
}

export interface WorldBot {
  readonly name: string;
  decide(input: WorldBotInput): WorldAction;
}
