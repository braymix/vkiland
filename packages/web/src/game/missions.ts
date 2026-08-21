/**
 * Costruzione della PARTITA di una missione. Una missione è una partita casuale
 * contro i bot: un solo umano (il posto 0, sempre) contro `botCount` bot al
 * livello di difficoltà della missione, sull'isola col seme della missione. Il
 * resto sono le regole «classiche» (nessuna calamità/battaglia/eroi): la sfida
 * della missione sta nella difficoltà dei bot, non nelle varianti.
 */
import {
  DEFAULT_TARGET_GLORY,
  type Mission,
  type PlayerCosmetics,
  type PlayerConfig,
} from '@vikiland/engine';
import type { GameSetup } from './LocalGameController';
import { FREE_PALETTE } from '../render/sprites/palettes';

/** Nomi dei bot avversari nelle missioni (come nella Nuova partita). */
const MISSION_BOT_NAMES = ['Astrid', 'Leif', 'Sigrid', 'Ragnhild', 'Olaf', 'Freya'];

/**
 * Costruisce il `GameSetup` di una missione: posto 0 umano (con nome e cosmetici
 * dati) e `botCount` bot al livello della missione. Deterministico nel seme.
 */
export function buildMissionSetup(
  mission: Mission,
  humanName: string,
  cosmetics: PlayerCosmetics | null
): GameSetup {
  const hasCosmetics = cosmetics != null && Object.keys(cosmetics).length > 0;
  const players: PlayerConfig[] = [
    {
      name: humanName.trim() || 'Bjorn',
      color: FREE_PALETTE[0]!,
      isBot: false,
      ...(hasCosmetics ? { cosmetics } : {}),
    },
    ...Array.from({ length: mission.botCount }, (_, i) => ({
      name: MISSION_BOT_NAMES[i % MISSION_BOT_NAMES.length]!,
      color: FREE_PALETTE[(i + 1) % FREE_PALETTE.length]!,
      isBot: true,
      botLevel: mission.botLevel,
    })),
  ];
  return {
    seed: mission.seed,
    players,
    avoidAdjacent68: true,
    targetGloryPoints: DEFAULT_TARGET_GLORY,
    calamities: false,
    battle: false,
    capitale: false,
  };
}
