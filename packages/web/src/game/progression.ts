/**
 * Progressione lato CLIENT (casse, frammenti, eroi sbloccati, missioni),
 * orchestrata PER MODALITÀ: Classico e Around the World hanno ciascuno il
 * proprio mazzo (`PlayerProgression.classico` / `.aroundTheWorld`), separato
 * fin dalle casse. Stessa doppia anima dei cosmetici: SENZA account tutto
 * vive sul DISPOSITIVO (localStorage); CON una sessione online valida è
 * invece legato all'account e segue il giocatore su ogni dispositivo. La
 * validazione è la stessa dell'engine (`sanitizeProgression`), così client e
 * server applicano regole identiche (e la stessa funzione MIGRA in automatico
 * un vecchio blob pre-separazione dentro `classico`).
 */
import {
  sanitizeProgression,
  addChest,
  rollChestRarity,
  canEarnChest,
  openChest as engineOpenChest,
  claimFreeChest as engineClaimFreeChest,
  redeemUncommon as engineRedeemUncommon,
  ensureMissions as engineEnsureMissions,
  completeMission as engineCompleteMission,
  ensureWorldMissions as engineEnsureWorldMissions,
  completeWorldMission as engineCompleteWorldMission,
  type GameMode,
  type HeroId,
  type PlayerProgression,
  type ClassicoProgression,
  type WorldProgression,
  type MissionCompleteResult,
  type WorldMissionCompleteResult,
} from '@vikiland/engine';
import { apiGetProgression, apiSetProgression, type OnlineSession } from '../online/connection';

const STORAGE_KEY = 'vikiland-progression-v1';

/** Le 4 mappe standard tra cui sorteggiare le missioni del Mondo (niente «castello»). */
export const WORLD_MISSION_MAP_IDS = ['mondo', 'europa', 'italia', 'milano'];

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

/** Il mazzo di UNA modalità ({} se assente). */
export function modeProgression(prog: PlayerProgression, mode: 'classico'): ClassicoProgression;
export function modeProgression(prog: PlayerProgression, mode: 'aroundTheWorld'): WorldProgression;
export function modeProgression(prog: PlayerProgression, mode: GameMode): ClassicoProgression | WorldProgression;
export function modeProgression(prog: PlayerProgression, mode: GameMode): ClassicoProgression | WorldProgression {
  return (mode === 'classico' ? prog.classico : prog.aroundTheWorld) ?? {};
}

/** Sostituisce il mazzo di UNA modalità, lasciando intatto il resto dell'account. */
function withModeProgression(
  prog: PlayerProgression,
  mode: GameMode,
  next: ClassicoProgression | WorldProgression
): PlayerProgression {
  return mode === 'classico'
    ? { ...prog, classico: next as ClassicoProgression }
    : { ...prog, aroundTheWorld: next as WorldProgression };
}

/** Esito di un'apertura di cassa (o assegnazione frammento) mostrabile in UI. */
export interface ChestOpenOutcome {
  heroId: HeroId;
  fragments: number;
  unlockedNow: boolean;
  wasted: boolean;
  progression: PlayerProgression;
}

/**
 * Assegna una cassa a fine partita (100%) NELLA modalità `mode` (default
 * Classico, l'unica che oggi assegna casse a fine partita). Rilegge lo stato
 * più aggiornato (così non si perdono casse aperte altrove né il flag
 * tester), aggiunge la cassa se c'è spazio (max 3) e persiste. La Classica dà
 * sempre un eroe non comune; il Mondo (se/quando chiamato) sorteggia la
 * rarità con `rollChestRarity` (può dare anche rari/leggendari).
 */
export async function awardChestForFinishedGame(
  session: OnlineSession | null,
  mode: GameMode = 'classico'
): Promise<PlayerProgression> {
  const current = await loadProgression(session);
  const bucket = modeProgression(current, mode);
  if (!canEarnChest(bucket)) return current; // già 3 casse in lavorazione
  const rarity = mode === 'classico' ? 'nonComune' : rollChestRarity();
  const next = addChest(bucket, Date.now(), makeChestId, undefined, rarity);
  return saveProgression(session, withModeProgression(current, mode, next));
}

/**
 * Apre una cassa pronta (nella modalità `mode`) e persiste il risultato.
 * Ritorna `null` se la cassa non era pronta/assente.
 */
export async function openChestAndSave(
  session: OnlineSession | null,
  mode: GameMode,
  prog: PlayerProgression,
  chestId: string
): Promise<ChestOpenOutcome | null> {
  const bucket = modeProgression(prog, mode);
  const result = engineOpenChest(bucket, chestId, Date.now(), Math.random, prog.tester === true);
  if (!result) return null;
  const saved = await saveProgression(session, withModeProgression(prog, mode, result.progression));
  return { heroId: result.heroId, fragments: result.fragments, unlockedNow: result.unlockedNow, wasted: result.wasted, progression: saved };
}

/**
 * Riscuote la cassa gratuita del Negozio di QUESTA modalità (una al giorno,
 * apre all'istante). Rilegge lo stato più aggiornato, la apre se disponibile
 * OGGI e persiste. Ritorna `null` se oggi è già stata riscossa (in questa
 * modalità). La Classica dà sempre un eroe non comune; il Mondo sorteggia la
 * rarità (può dare anche rari/leggendari).
 */
export async function claimFreeChestAndSave(
  session: OnlineSession | null,
  mode: GameMode
): Promise<ChestOpenOutcome | null> {
  const current = await loadProgression(session);
  const bucket = modeProgression(current, mode);
  const rarity = mode === 'classico' ? 'nonComune' : rollChestRarity();
  const result = engineClaimFreeChest(bucket, localDayKey(), Math.random, rarity, current.tester === true);
  if (!result) return null;
  const saved = await saveProgression(session, withModeProgression(current, mode, result.progression));
  return { heroId: result.heroId, fragments: result.fragments, unlockedNow: result.unlockedNow, wasted: result.wasted, progression: saved };
}

/** Esito del riscatto una-tantum (di UNA modalità), con la progressione salvata. */
export interface RedeemOutcome {
  heroId: HeroId;
  progression: PlayerProgression;
}

/**
 * Riscatta (una volta per MODALITÀ) l'eroe NON comune `heroId` a scelta e
 * persiste. Ritorna `null` se il riscatto di questa modalità è già stato
 * usato o l'eroe non è valido.
 */
export async function redeemUncommonAndSave(
  session: OnlineSession | null,
  mode: GameMode,
  heroId: HeroId
): Promise<RedeemOutcome | null> {
  const current = await loadProgression(session);
  const bucket = modeProgression(current, mode);
  const result = engineRedeemUncommon(bucket, heroId);
  if (!result) return null;
  const saved = await saveProgression(session, withModeProgression(current, mode, result.progression));
  return { heroId: result.heroId, progression: saved };
}

/**
 * Carica la progressione e assicura una bacheca di missioni CLASSICHE valida:
 * se assente o scaduta la (ri)genera e la persiste. Ritorna il mazzo
 * CLASSICO (non l'intero account), pronto per la schermata Missioni.
 */
export async function loadMissionsAndSave(session: OnlineSession | null): Promise<ClassicoProgression> {
  const current = await loadProgression(session);
  const bucket = current.classico ?? {};
  const { progression, changed } = engineEnsureMissions(bucket, Date.now(), makeChestId);
  if (!changed) return bucket;
  await saveProgression(session, withModeProgression(current, 'classico', progression));
  return progression;
}

/**
 * Completa una missione CLASSICA vinta: segna completata e apre subito le
 * casse-ricompensa (eroi sempre non comuni), poi persiste. `progression` nel
 * risultato è il mazzo CLASSICO aggiornato (non l'intero account).
 */
export async function completeMissionAndSave(
  session: OnlineSession | null,
  missionId: string
): Promise<MissionCompleteResult | null> {
  const current = await loadProgression(session);
  const bucket = current.classico ?? {};
  const result = engineCompleteMission(bucket, missionId);
  if (!result) return null;
  await saveProgression(session, withModeProgression(current, 'classico', result.progression));
  return result;
}

/**
 * Carica la progressione e assicura una bacheca di missioni del MONDO valida:
 * se assente o scaduta la (ri)genera (tra le 4 mappe standard) e la persiste.
 * Ritorna il mazzo del MONDO (non l'intero account).
 */
export async function loadWorldMissionsAndSave(session: OnlineSession | null): Promise<WorldProgression> {
  const current = await loadProgression(session);
  const bucket = current.aroundTheWorld ?? {};
  const { progression, changed } = engineEnsureWorldMissions(bucket, Date.now(), makeChestId, WORLD_MISSION_MAP_IDS);
  if (!changed) return bucket;
  await saveProgression(session, withModeProgression(current, 'aroundTheWorld', progression));
  return progression;
}

/**
 * Completa una missione del MONDO vinta: segna completata e apre subito le
 * casse-ricompensa (possono dare anche eroi rari/leggendari), poi persiste.
 * `progression` nel risultato è il mazzo del MONDO aggiornato.
 */
export async function completeWorldMissionAndSave(
  session: OnlineSession | null,
  missionId: string
): Promise<WorldMissionCompleteResult | null> {
  const current = await loadProgression(session);
  const bucket = current.aroundTheWorld ?? {};
  const result = engineCompleteWorldMission(bucket, missionId);
  if (!result) return null;
  await saveProgression(session, withModeProgression(current, 'aroundTheWorld', result.progression));
  return result;
}
