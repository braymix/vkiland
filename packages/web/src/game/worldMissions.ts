/**
 * Costruzione della PARTITA di una missione del Mondo. Speculare a
 * `game/missions.ts` (Classica): un solo umano (seat 0) contro `botCount` bot
 * al livello della missione, sulla mappa e col punteggio bersaglio della
 * missione. Deterministico nel seme.
 */
import type { WorldMission } from '@vikiland/engine';
import type { WorldHeroId } from '@vikiland/engine-world';
import type { WorldSetup, WorldSeatSetup } from './world/LocalWorldController';
import { FREE_PALETTE } from '../render/sprites/palettes';
import { MISSION_BOT_NAMES } from './missions';

/**
 * Costruisce il `WorldSetup` di una missione del Mondo: seat 0 umano (con
 * nome ed eroe del clan dati) e `mission.botCount` bot al livello della
 * missione.
 */
export function buildWorldMissionSetup(
  mission: WorldMission,
  humanName: string,
  hero?: WorldHeroId
): WorldSetup {
  const players: WorldSeatSetup[] = [
    {
      name: humanName.trim() || 'Bjorn',
      color: FREE_PALETTE[0]!,
      bot: null,
      ...(hero ? { hero } : {}),
    },
    ...Array.from({ length: mission.botCount }, (_, i) => ({
      name: MISSION_BOT_NAMES[i % MISSION_BOT_NAMES.length]!,
      color: FREE_PALETTE[(i + 1) % FREE_PALETTE.length]!,
      bot: mission.botLevel,
    })),
  ];
  return {
    seed: mission.seed,
    players,
    targetPoints: mission.targetPoints,
    materialiCasuali: false,
    mapId: mission.mapId,
  };
}
