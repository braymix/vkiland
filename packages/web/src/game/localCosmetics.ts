/**
 * Skin dell'inventario SENZA account: salvate sul DISPOSITIVO (localStorage).
 * Stesso vocabolario del server (`sanitizeCosmetics` dell'engine): un id o un
 * colore fuori vocabolario (rimosso in una versione futura, o scritto a mano)
 * viene scartato in lettura, non arriva mai al motore. Se localStorage non è
 * disponibile (privacy mode, SSR…) le funzioni degradano a no-op silenziosi:
 * l'inventario resta usabile, semplicemente non ricorda la scelta.
 */
import { sanitizeCosmetics, type PlayerCosmetics } from '@vikiland/engine';

const STORAGE_KEY = 'vikiland-cosmetics-v1';

/** Le skin salvate su QUESTO dispositivo ({} se non c'è nulla o non è disponibile). */
export function getLocalCosmetics(): PlayerCosmetics {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeCosmetics(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** Aggiorna (merge) le skin locali e le persiste; ritorna il risultato finale. */
export function setLocalCosmetics(patch: PlayerCosmetics): PlayerCosmetics {
  const merged = sanitizeCosmetics({ ...getLocalCosmetics(), ...patch });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* localStorage non disponibile: la scelta vale solo per questa sessione */
  }
  return merged;
}
