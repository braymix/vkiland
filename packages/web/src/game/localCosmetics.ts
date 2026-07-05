/**
 * Skin dell'inventario SENZA account: salvate sul DISPOSITIVO (localStorage).
 * Stesso vocabolario di id del server (`DRAGON_SKIN_IDS`/`STRONGHOLD_SKIN_IDS`):
 * un id sconosciuto (rimosso in una versione futura, o scritto a mano) viene
 * scartato in lettura, non arriva mai al motore. Se localStorage non è
 * disponibile (privacy mode, SSR…) le funzioni degradano a no-op silenziosi:
 * l'inventario resta usabile, semplicemente non ricorda la scelta.
 */
import { DRAGON_SKIN_IDS, STRONGHOLD_SKIN_IDS, type PlayerCosmetics } from '@vikiland/engine';

const STORAGE_KEY = 'vikiland-cosmetics-v1';

function sanitize(raw: unknown): PlayerCosmetics {
  const body = (raw ?? {}) as { dragon?: unknown; stronghold?: unknown };
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
  return out;
}

/** Le skin salvate su QUESTO dispositivo ({} se non c'è nulla o non è disponibile). */
export function getLocalCosmetics(): PlayerCosmetics {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** Aggiorna (merge) le skin locali e le persiste; ritorna il risultato finale. */
export function setLocalCosmetics(patch: PlayerCosmetics): PlayerCosmetics {
  const merged = sanitize({ ...getLocalCosmetics(), ...patch });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* localStorage non disponibile: la scelta vale solo per questa sessione */
  }
  return merged;
}
