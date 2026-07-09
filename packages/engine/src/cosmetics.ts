/**
 * Validazione dei cosmetici: unico punto di verità condiviso da server
 * (persistenza account) e client (localStorage). Tiene solo id di skin noti e
 * colori esadecimali `#rrggbb` ben formati; tutto il resto viene scartato, così
 * un id/colore fuori vocabolario non raggiunge mai il renderer. Il motore resta
 * un semplice trasportatore: qui non si interpreta nulla, si ripulisce soltanto.
 */
import { DRAGON_SKIN_IDS, STRONGHOLD_SKIN_IDS } from './constants';
import type { DragonColors, PlayerCosmetics, StrongholdColors } from './types';

const HEX6 = /^#[0-9a-f]{6}$/;

/** Un colore valido normalizzato in `#rrggbb` minuscolo, oppure undefined. */
function cleanColor(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim().toLowerCase();
  return HEX6.test(v) ? v : undefined;
}

function cleanDragonColors(raw: unknown): DragonColors | undefined {
  const body = (raw ?? {}) as { eyes?: unknown; fire?: unknown };
  const out: DragonColors = {};
  const eyes = cleanColor(body.eyes);
  const fire = cleanColor(body.fire);
  if (eyes) out.eyes = eyes;
  if (fire) out.fire = fire;
  return Object.keys(out).length ? out : undefined;
}

function cleanStrongholdColors(raw: unknown): StrongholdColors | undefined {
  const body = (raw ?? {}) as { stone?: unknown };
  const out: StrongholdColors = {};
  const stone = cleanColor(body.stone);
  if (stone) out.stone = stone;
  return Object.keys(out).length ? out : undefined;
}

/** Ripulisce un oggetto cosmetici qualunque, tenendo solo valori validi. */
export function sanitizeCosmetics(raw: unknown): PlayerCosmetics {
  const body = (raw ?? {}) as {
    dragon?: unknown;
    stronghold?: unknown;
    dragonColors?: unknown;
    strongholdColors?: unknown;
  };
  const out: PlayerCosmetics = {};
  if (typeof body.dragon === 'string' && (DRAGON_SKIN_IDS as readonly string[]).includes(body.dragon)) {
    out.dragon = body.dragon;
  }
  if (
    typeof body.stronghold === 'string' &&
    (STRONGHOLD_SKIN_IDS as readonly string[]).includes(body.stronghold)
  ) {
    out.stronghold = body.stronghold;
  }
  const dragonColors = cleanDragonColors(body.dragonColors);
  if (dragonColors) out.dragonColors = dragonColors;
  const strongholdColors = cleanStrongholdColors(body.strongholdColors);
  if (strongholdColors) out.strongholdColors = strongholdColors;
  return out;
}
