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
  claimFreeChest as engineClaimFreeChest,
  redeemUncommon as engineRedeemUncommon,
  ensureMissions as engineEnsureMissions,
  completeMission as engineCompleteMission,
  type HeroId,
  type PlayerProgression,
  type ChestOpenResult,
  type RedeemResult,
  type MissionCompleteResult,
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

/**
 * Chiave del «giorno» locale (data del dispositivo, «AAAA-M-G») usata dalla
 * cassa gratuita giornaliera del Negozio: cambia a mezzanotte ora locale.
 */
export function localDayKey(now: number = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
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

/**
 * Riscuote la cassa gratuita del Negozio (una al giorno, apre all'istante).
 * Rilegge lo stato più aggiornato (per non perdere sblocchi fatti altrove né il
 * flag tester), la apre se disponibile OGGI e persiste. Ritorna l'esito con la
 * progressione salvata, oppure `null` se oggi è già stata riscossa.
 */
export async function claimFreeChestAndSave(
  session: OnlineSession | null
): Promise<ChestOpenResult | null> {
  const current = await loadProgression(session);
  const result = engineClaimFreeChest(current, localDayKey());
  if (!result) return null;
  const saved = await saveProgression(session, result.progression);
  return { ...result, progression: saved };
}

/**
 * Riscatta (una volta per account) l'eroe NON comune `heroId` a scelta e
 * persiste. Rilegge lo stato più aggiornato (per non perdere sblocchi fatti
 * altrove né consumare il riscatto due volte), lo sblocca se disponibile e
 * salva. Ritorna l'esito con la progressione salvata, oppure `null` se il
 * riscatto è già stato usato o l'eroe non è valido.
 */
export async function redeemUncommonAndSave(
  session: OnlineSession | null,
  heroId: HeroId
): Promise<RedeemResult | null> {
  const current = await loadProgression(session);
  const result = engineRedeemUncommon(current, heroId);
  if (!result) return null;
  const saved = await saveProgression(session, result.progression);
  return { ...result, progression: saved };
}

/**
 * Carica la progressione e assicura una bacheca di missioni valida: se assente
 * o scaduta la (ri)genera e la persiste. Ritorna la progressione risultante
 * (con la bacheca aggiornata), pronta per essere mostrata dalla schermata.
 */
export async function loadMissionsAndSave(
  session: OnlineSession | null
): Promise<PlayerProgression> {
  const current = await loadProgression(session);
  const { progression, changed } = engineEnsureMissions(current, Date.now(), makeChestId);
  if (!changed) return progression;
  return saveProgression(session, progression);
}

/**
 * Completa una missione VINTA: rilegge lo stato più aggiornato (per non perdere
 * progressi fatti altrove), la segna completata, apre subito le casse-ricompensa
 * (1 facile / 2 normale) e persiste. Ritorna l'esito con la progressione
 * salvata, oppure `null` se la missione non c'è più o era già completata.
 */
export async function completeMissionAndSave(
  session: OnlineSession | null,
  missionId: string
): Promise<MissionCompleteResult | null> {
  const current = await loadProgression(session);
  const result = engineCompleteMission(current, missionId);
  if (!result) return null;
  const saved = await saveProgression(session, result.progression);
  return { ...result, progression: saved };
}
