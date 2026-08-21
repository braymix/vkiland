/**
 * PROGRESSIONE del giocatore: casse, frammenti ed eroi sbloccati. È la SOLA
 * fonte di verità condivisa da server (persistenza account) e client
 * (localStorage + UI), esattamente come `cosmetics.ts`: qui vivono i tipi, le
 * costanti di bilanciamento, la logica PURA (aprire una cassa, contare i
 * frammenti, capire cosa è sbloccato) e il validatore `sanitizeProgression`,
 * così client e server applicano ESATTAMENTE le stesse regole.
 *
 * Regole di gioco (Fase «casse»):
 *   - gli eroi COMUNI (i «Dono») sono sbloccati da subito, per tutti;
 *   - gli eroi NON COMUNI si farmano: ogni cassa dà un FRAMMENTO di un eroe non
 *     comune casuale e dopo FRAGMENTS_PER_HERO frammenti l'eroe si sblocca;
 *   - un frammento di un eroe GIÀ sbloccato è sprecato (non si accumula oltre);
 *   - una cassa si guadagna a fine partita (100%) e resta «in caricamento» per
 *     un po' di tempo prima di poter essere aperta; se ne tengono al massimo
 *     MAX_CHESTS in lavorazione;
 *   - un account con flag `tester` ha ogni eroe già disponibile.
 */
import { HERO_REGISTRY, type HeroId } from './heroes';

/** Per ora esistono solo casse «non comuni». */
export type ChestRarity = 'nonComune';

/** Una cassa in caricamento (o pronta, se il tempo è scaduto). */
export interface ChestSlot {
  /** Identificatore univoco (per aprirla/rimuoverla dalla UI). */
  id: string;
  rarity: ChestRarity;
  /** Epoch ms in cui la cassa è entrata in caricamento. */
  startedAt: number;
  /**
   * Durata del caricamento FISSATA all'ingresso: così un'eventuale variazione
   * dello sconto non allunga/accorcia le casse già in corso.
   */
  durationMs: number;
}

export interface PlayerProgression {
  /** Account «tester»: ogni eroe è già disponibile (ringraziamento speciale). */
  tester?: boolean;
  /** Casse in lavorazione (al massimo MAX_CHESTS). */
  chests?: ChestSlot[];
  /** Frammenti raccolti per ciascun eroe NON comune (0..FRAGMENTS_PER_HERO). */
  fragments?: Partial<Record<HeroId, number>>;
  /** Eroi NON comuni sbloccati (i comuni sono sempre sbloccati). */
  unlocked?: HeroId[];
  /**
   * Giorno (chiave locale «AAAA-M-G») in cui è stata riscossa l'ultima cassa
   * gratuita del Negozio. Vuoto/assente → la cassa di oggi è ancora disponibile.
   */
  freeChestDay?: string;
}

/** Esito dell'apertura di una cassa. */
export interface ChestOpenResult {
  progression: PlayerProgression;
  /** Eroe non comune di cui è uscito il frammento. */
  heroId: HeroId;
  /** Frammenti posseduti DOPO l'apertura (cap a FRAGMENTS_PER_HERO). */
  fragments: number;
  /** L'eroe si è appena sbloccato con questa apertura. */
  unlockedNow: boolean;
  /** Il frammento è stato sprecato (eroe già sbloccato). */
  wasted: boolean;
}

// --- Costanti di bilanciamento ---------------------------------------------

/** Casse tenute in lavorazione contemporaneamente. */
export const MAX_CHESTS = 3;

/** Frammenti necessari per sbloccare un eroe non comune. */
export const FRAGMENTS_PER_HERO = 5;

const HOUR_MS = 60 * 60 * 1000;

/** Durata «normale» del caricamento di una cassa (9 ore). */
export const CHEST_DURATION_BASE_MS = 9 * HOUR_MS;

/** Durata durante lo SCONTO attualmente attivo: più breve (3 ore). */
export const CHEST_DURATION_DISCOUNT_MS = 3 * HOUR_MS;

/** Sconto attivo: finché è `true` le nuove casse durano CHEST_DURATION_DISCOUNT_MS. */
export const CHEST_DISCOUNT_ACTIVE = true;

/** Durata da assegnare a una cassa che entra ORA in caricamento. */
export function currentChestDurationMs(): number {
  return CHEST_DISCOUNT_ACTIVE ? CHEST_DURATION_DISCOUNT_MS : CHEST_DURATION_BASE_MS;
}

// --- Rarità: split dal registro (unica fonte) ------------------------------

/** Id degli eroi COMUNI (sbloccati da subito). */
export const COMMON_HERO_IDS: readonly HeroId[] = Object.values(HERO_REGISTRY)
  .filter((h) => h.rarity === 'comune')
  .map((h) => h.id);

/** Id degli eroi NON COMUNI (da farmare con le casse). */
export const UNCOMMON_HERO_IDS: readonly HeroId[] = Object.values(HERO_REGISTRY)
  .filter((h) => h.rarity === 'nonComune')
  .map((h) => h.id);

const COMMON_SET = new Set<HeroId>(COMMON_HERO_IDS);
const UNCOMMON_SET = new Set<HeroId>(UNCOMMON_HERO_IDS);

// --- Query pure -------------------------------------------------------------

export function emptyProgression(): PlayerProgression {
  return {};
}

/** Frammenti posseduti per un eroe (0 se assente). */
export function fragmentsOf(prog: PlayerProgression, id: HeroId): number {
  return prog.fragments?.[id] ?? 0;
}

/** L'eroe è disponibile al giocatore? (tester → tutto; comuni → sempre). */
export function isHeroUnlocked(prog: PlayerProgression, id: HeroId): boolean {
  if (prog.tester) return true;
  if (COMMON_SET.has(id)) return true;
  return prog.unlocked?.includes(id) ?? false;
}

/** L'insieme degli eroi disponibili al giocatore. */
export function unlockedHeroIds(prog: PlayerProgression): HeroId[] {
  return (Object.keys(HERO_REGISTRY) as HeroId[]).filter((id) => isHeroUnlocked(prog, id));
}

/** La cassa ha finito il caricamento e può essere aperta? */
export function chestReady(chest: ChestSlot, now: number): boolean {
  return now - chest.startedAt >= chest.durationMs;
}

/** Millisecondi mancanti alla fine del caricamento (0 se pronta). */
export function chestRemainingMs(chest: ChestSlot, now: number): number {
  return Math.max(0, chest.startedAt + chest.durationMs - now);
}

/** C'è spazio per un'altra cassa in lavorazione? */
export function canEarnChest(prog: PlayerProgression): boolean {
  return (prog.chests?.length ?? 0) < MAX_CHESTS;
}

/**
 * Aggiunge una cassa in caricamento se c'è spazio (max MAX_CHESTS). Ritorna la
 * nuova progressione; se era già piena la ritorna invariata.
 */
export function addChest(
  prog: PlayerProgression,
  now: number,
  makeId: () => string,
  durationMs: number = currentChestDurationMs()
): PlayerProgression {
  if (!canEarnChest(prog)) return prog;
  const chest: ChestSlot = { id: makeId(), rarity: 'nonComune', startedAt: now, durationMs };
  return { ...prog, chests: [...(prog.chests ?? []), chest] };
}

/** Sceglie l'eroe non comune del frammento (uniforme tra i non comuni). */
export function pickChestReward(rand: () => number = Math.random): HeroId {
  const pool = UNCOMMON_HERO_IDS;
  const idx = Math.min(pool.length - 1, Math.floor(rand() * pool.length));
  return pool[idx]!;
}

/**
 * Applica un frammento dell'eroe `heroId` alla progressione (senza toccare le
 * casse). Se l'eroe è già sbloccato il frammento è sprecato.
 */
export function applyFragment(prog: PlayerProgression, heroId: HeroId): ChestOpenResult {
  const already = isHeroUnlocked(prog, heroId);
  if (already) {
    return {
      progression: prog,
      heroId,
      fragments: FRAGMENTS_PER_HERO,
      unlockedNow: false,
      wasted: true,
    };
  }
  const count = Math.min(FRAGMENTS_PER_HERO, fragmentsOf(prog, heroId) + 1);
  const fragments = { ...(prog.fragments ?? {}), [heroId]: count };
  const unlockedNow = count >= FRAGMENTS_PER_HERO;
  const unlocked = unlockedNow
    ? Array.from(new Set([...(prog.unlocked ?? []), heroId]))
    : prog.unlocked;
  const next: PlayerProgression = { ...prog, fragments };
  if (unlocked) next.unlocked = unlocked;
  return { progression: next, heroId, fragments: count, unlockedNow, wasted: false };
}

/**
 * Apre la cassa `chestId` (se esiste ed è pronta): la rimuove dalle casse in
 * lavorazione e assegna un frammento di un eroe non comune casuale. Ritorna
 * `null` se la cassa non c'è o non è ancora pronta.
 */
export function openChest(
  prog: PlayerProgression,
  chestId: string,
  now: number,
  rand: () => number = Math.random
): ChestOpenResult | null {
  const chest = prog.chests?.find((c) => c.id === chestId);
  if (!chest || !chestReady(chest, now)) return null;
  const withoutChest: PlayerProgression = {
    ...prog,
    chests: (prog.chests ?? []).filter((c) => c.id !== chestId),
  };
  const heroId = pickChestReward(rand);
  return applyFragment(withoutChest, heroId);
}

// --- Negozio: cassa gratuita giornaliera ------------------------------------
//
// Il Negozio offre UNA cassa gratuita al giorno che si apre ISTANTANEAMENTE
// (nessun caricamento): non entra nella coda delle casse in lavorazione, ma
// assegna subito un frammento — esattamente come una cassa aperta. Il «giorno»
// è una chiave passata dal chiamante (data locale del dispositivo), così la
// logica resta pura e testabile e client/server applicano la stessa regola.

/** La cassa gratuita di `dayKey` è ancora da riscuotere? */
export function canClaimFreeChest(prog: PlayerProgression, dayKey: string): boolean {
  return prog.freeChestDay !== dayKey;
}

/**
 * Riscuote la cassa gratuita del giorno `dayKey`: segna il giorno come riscosso
 * e apre istantaneamente la cassa (frammento di un eroe non comune casuale).
 * Ritorna `null` se la cassa di oggi è già stata riscossa.
 */
export function claimFreeChest(
  prog: PlayerProgression,
  dayKey: string,
  rand: () => number = Math.random
): ChestOpenResult | null {
  if (!canClaimFreeChest(prog, dayKey)) return null;
  const withDay: PlayerProgression = { ...prog, freeChestDay: dayKey };
  const heroId = pickChestReward(rand);
  return applyFragment(withDay, heroId);
}

// --- Validazione (fonte di verità condivisa) --------------------------------

function cleanChest(raw: unknown): ChestSlot | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as { id?: unknown; rarity?: unknown; startedAt?: unknown; durationMs?: unknown };
  const id = typeof body.id === 'string' && body.id.length > 0 ? body.id : null;
  const startedAt = typeof body.startedAt === 'number' && Number.isFinite(body.startedAt) ? body.startedAt : null;
  const durationMs =
    typeof body.durationMs === 'number' && Number.isFinite(body.durationMs) && body.durationMs > 0
      ? body.durationMs
      : null;
  if (id === null || startedAt === null || durationMs === null) return null;
  return { id, rarity: 'nonComune', startedAt, durationMs };
}

/**
 * Ripulisce una progressione qualunque tenendo solo valori validi e coerenti:
 * casse ben formate (max MAX_CHESTS), frammenti interi 0..FRAGMENTS_PER_HERO
 * solo per eroi NON comuni, eroi sbloccati solo tra i non comuni. Gli eroi con
 * frammenti pieni vengono considerati sbloccati (coerenza).
 */
export function sanitizeProgression(raw: unknown): PlayerProgression {
  const body = (raw ?? {}) as {
    tester?: unknown;
    chests?: unknown;
    fragments?: unknown;
    unlocked?: unknown;
    freeChestDay?: unknown;
  };
  const out: PlayerProgression = {};

  if (body.tester === true) out.tester = true;

  if (typeof body.freeChestDay === 'string' && body.freeChestDay.length > 0)
    out.freeChestDay = body.freeChestDay;

  if (Array.isArray(body.chests)) {
    const chests = body.chests
      .map(cleanChest)
      .filter((c): c is ChestSlot => c !== null)
      .slice(0, MAX_CHESTS);
    if (chests.length) out.chests = chests;
  }

  const unlocked = new Set<HeroId>();
  if (Array.isArray(body.unlocked)) {
    for (const id of body.unlocked) {
      if (typeof id === 'string' && UNCOMMON_SET.has(id as HeroId)) unlocked.add(id as HeroId);
    }
  }

  const fragments: Partial<Record<HeroId, number>> = {};
  if (typeof body.fragments === 'object' && body.fragments !== null) {
    for (const [id, value] of Object.entries(body.fragments as Record<string, unknown>)) {
      if (!UNCOMMON_SET.has(id as HeroId)) continue;
      const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
      const clamped = Math.max(0, Math.min(FRAGMENTS_PER_HERO, n));
      if (clamped > 0) fragments[id as HeroId] = clamped;
      if (clamped >= FRAGMENTS_PER_HERO) unlocked.add(id as HeroId);
    }
  }
  if (Object.keys(fragments).length) out.fragments = fragments;
  if (unlocked.size) out.unlocked = Array.from(unlocked);

  return out;
}
