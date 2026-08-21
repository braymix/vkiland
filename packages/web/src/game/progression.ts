/**
 * Progressione lato CLIENT (casse, frammenti, eroi sbloccati). Stessa doppia
 * anima dei cosmetici: SENZA account tutto vive sul DISPOSITIVO (localStorage);
 * CON una sessione online valida è invece legata all'account e segue il
 * giocatore su ogni dispositivo. La validazione è la stessa dell'engine
 * (`sanitizeProgression`), così client e server applicano regole identiche.
 */
import {
  sanitizeProgression,
  addChest,
  canEarnChest,
  openChest as engineOpenChest,
  type PlayerProgression,
  type ChestOpenResult,
} from '@vikiland/engine';
import { apiGetProgression, apiSetProgression, type OnlineSession } from '../online/connection';

const STORAGE_KEY = 'vikiland-progression-v1';

/** Identificatore univoco per una cassa (con ripiego se `crypto` è assente). */
export function makeChestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `chest-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

/** La progressione salvata su QUESTO dispositivo ({} se assente/indisponibile). */
export function getLocalProgression(): PlayerProgression {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeProgression(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** Sovrascrive (ripulita) la progressione locale; ritorna il risultato finale. */
export function setLocalProgression(prog: PlayerProgression): PlayerProgression {
  const clean = sanitizeProgression(prog);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* localStorage non disponibile: la scelta vale solo per questa sessione */
  }
  return clean;
}

/** Carica la progressione dall'account se c'è una sessione, altrimenti da locale. */
export async function loadProgression(session: OnlineSession | null): Promise<PlayerProgression> {
  if (!session) return getLocalProgression();
  try {
    return await apiGetProgression(session);
  } catch {
    // Server irraggiungibile/sessione scaduta: si ripiega sul dispositivo.
    return getLocalProgression();
  }
}

/** Salva la progressione (account se disponibile, altrimenti dispositivo). */
export async function saveProgression(
  session: OnlineSession | null,
  prog: PlayerProgression
): Promise<PlayerProgression> {
  if (session) {
    try {
      return await apiSetProgression(session, prog);
    } catch {
      // Rete assente: teniamo comunque il valore ottimista in memoria.
      return sanitizeProgression(prog);
    }
  }
  return setLocalProgression(prog);
}

/**
 * Assegna una cassa a fine partita (100%). Rilegge lo stato più aggiornato
 * (così non si perdono casse aperte altrove né il flag tester), aggiunge la
 * cassa se c'è spazio (max 3) e persiste. Ritorna la progressione risultante.
 */
export async function awardChestForFinishedGame(
  session: OnlineSession | null
): Promise<PlayerProgression> {
  const current = await loadProgression(session);
  if (!canEarnChest(current)) return current; // già 3 casse in lavorazione
  const next = addChest(current, Date.now(), makeChestId);
  return saveProgression(session, next);
}

/**
 * Apre una cassa pronta e persiste il risultato. Ritorna l'esito (con la
 * progressione aggiornata) oppure `null` se la cassa non era pronta/assente.
 */
export async function openChestAndSave(
  session: OnlineSession | null,
  prog: PlayerProgression,
  chestId: string
): Promise<ChestOpenResult | null> {
  const result = engineOpenChest(prog, chestId, Date.now());
  if (!result) return null;
  const saved = await saveProgression(session, result.progression);
  return { ...result, progression: saved };
}
