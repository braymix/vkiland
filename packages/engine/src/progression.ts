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
import type { BotLevel } from './types';

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
  /**
   * Negozio: eroe NON comune riscattato con l'unico riscatto GRATUITO a scelta
   * concesso UNA VOLTA per account. Assente → il riscatto è ancora disponibile.
   * L'eroe indicato è anche sbloccato (presente in `unlocked`).
   */
  redeemedUncommon?: HeroId;
  /**
   * Missioni: la «bacheca» corrente di partite casuali da vincere. Si rigenera
   * dopo un tempo casuale (vedi `MissionBoard`). Assente → va generata.
   */
  missions?: MissionBoard;
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

// --- Negozio: riscatto una-tantum di un eroe non comune a scelta -------------
//
// Ogni account (o dispositivo, senza account) ha UN SOLO riscatto gratuito: può
// scegliere un eroe NON comune qualunque e sbloccarlo all'istante. Una volta
// usato non si ripete. La logica è pura (come le casse): client e server la
// applicano identica.

/** Il riscatto una-tantum dell'eroe non comune a scelta è ancora disponibile? */
export function canRedeemUncommon(prog: PlayerProgression): boolean {
  return prog.redeemedUncommon === undefined;
}

/** Esito del riscatto una-tantum. */
export interface RedeemResult {
  progression: PlayerProgression;
  heroId: HeroId;
}

/**
 * Riscatta (una volta per account) l'eroe non comune `heroId` a scelta: lo
 * sblocca e segna il riscatto come usato. Ritorna `null` se il riscatto è già
 * stato usato o se `heroId` non è un eroe non comune valido.
 */
export function redeemUncommon(prog: PlayerProgression, heroId: HeroId): RedeemResult | null {
  if (!canRedeemUncommon(prog)) return null;
  if (!UNCOMMON_SET.has(heroId)) return null;
  const unlocked = Array.from(new Set([...(prog.unlocked ?? []), heroId]));
  return { progression: { ...prog, redeemedUncommon: heroId, unlocked }, heroId };
}

// --- MISSIONI ---------------------------------------------------------------
//
// Le missioni sono PARTITE casuali contro i bot da VINCERE. Ogni missione ha una
// RARITÀ: 'facile' (comune, più probabile) o 'normale' (non comune, più rara).
// La rarità determina la DIFFICOLTÀ dei bot (livello e numero) e la RICOMPENSA:
// vincere una missione FACILE dà 1 cassa che si apre SUBITO (un frammento
// istantaneo, come la cassa gratuita del Negozio); vincere una NORMALE ne dà 2.
// Le missioni vivono su una «bacheca» che si RIGENERA dopo un tempo CASUALE (più
// breve durante lo SCONTO). Come tutto il resto della progressione la logica è
// PURA: client e server la applicano identica.

/** Rarità di una missione: facile (comune) o normale (non comune). */
export type MissionRarity = 'facile' | 'normale';

/** Una singola missione: una partita casuale da vincere. */
export interface Mission {
  /** Identificatore univoco (per avviarla/segnarla completata). */
  id: string;
  rarity: MissionRarity;
  /** Difficoltà dei bot (deriva dalla rarità, con un po' di varietà). */
  botLevel: BotLevel;
  /** Numero di bot avversari: la partita è 1 umano + `botCount` bot. */
  botCount: number;
  /** Seme dell'isola: la partita della missione è deterministica. */
  seed: string;
  /** Modalità extra (al massimo UNA, randomizzata): Calamità. */
  calamities?: boolean;
  /** Modalità extra: Battaglia (attacchi agli edifici). */
  battle?: boolean;
  /** Modalità extra: Capitale (evoluzione della Roccaforte). */
  capitale?: boolean;
  /** Missione già VINTA: resta segnata finché la bacheca non si rigenera. */
  completed?: boolean;
}

/** La bacheca delle missioni correnti (con la sua finestra di rigenerazione). */
export interface MissionBoard {
  missions: Mission[];
  /** Epoch ms in cui la bacheca è stata generata. */
  generatedAt: number;
  /**
   * Durata prima della rigenerazione, FISSATA alla generazione (casuale, più
   * breve con lo sconto): così una variazione dello sconto non altera la
   * bacheca già in corso.
   */
  refreshMs: number;
}

/** Numero di missioni sulla bacheca. */
export const MISSIONS_COUNT = 3;

/** Probabilità che una missione sia FACILE (comune): più probabile della normale. */
export const MISSION_FACILE_PROB = 0.7;

/** Casse (istantanee) date in ricompensa per rarità: facile → 1, normale → 2. */
export const MISSION_REWARD_CHESTS: Record<MissionRarity, number> = { facile: 1, normale: 2 };

/**
 * Probabilità che una missione abbia UNA modalità extra (calamità/battaglia/
 * capitale). «Senza esagerare»: al massimo una variante, e non sempre.
 */
export const MISSION_MODE_PROB = 0.5;

/** Livelli bot possibili per rarità: la difficoltà cresce con la rarità. */
const MISSION_BOT_LEVELS: Record<MissionRarity, readonly BotLevel[]> = {
  facile: ['facile', 'normale'],
  normale: ['difficile', 'esperto'],
};

/** Le modalità extra che una missione può attivare (al massimo UNA). */
const MISSION_MODES = ['calamities', 'battle', 'capitale'] as const;
type MissionMode = (typeof MISSION_MODES)[number];

/** Un elemento casuale (uniforme) dell'array. */
function pickFrom<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.min(arr.length - 1, Math.floor(rand() * arr.length))]!;
}

/**
 * Durata prima della rigenerazione della bacheca: come le casse, 3 ore con lo
 * SCONTO attivo (9 senza). Fissa (non casuale), così la missione «dura 3 ore».
 */
export function currentMissionRefreshMs(discount: boolean = CHEST_DISCOUNT_ACTIVE): number {
  return discount ? CHEST_DURATION_DISCOUNT_MS : CHEST_DURATION_BASE_MS;
}

/** Genera una singola missione casuale (rarità, difficoltà, isola e modalità). */
export function generateMission(makeId: () => string, rand: () => number = Math.random): Mission {
  const rarity: MissionRarity = rand() < MISSION_FACILE_PROB ? 'facile' : 'normale';
  const botLevel = pickFrom(rand, MISSION_BOT_LEVELS[rarity]);
  // Anche il NUMERO di avversari varia la difficoltà: facile 2, normale 3.
  const botCount = rarity === 'facile' ? 2 : 3;
  const mission: Mission = { id: makeId(), rarity, botLevel, botCount, seed: `mission-${makeId()}` };
  // Modalità extra: al massimo UNA, e non sempre (senza esagerare).
  if (rand() < MISSION_MODE_PROB) {
    const mode: MissionMode = pickFrom(rand, MISSION_MODES);
    mission[mode] = true;
  }
  return mission;
}

/** Genera una nuova bacheca di missioni con la finestra di refresh corrente. */
export function generateMissionBoard(
  now: number,
  makeId: () => string,
  rand: () => number = Math.random,
  discount: boolean = CHEST_DISCOUNT_ACTIVE
): MissionBoard {
  const missions = Array.from({ length: MISSIONS_COUNT }, () => generateMission(makeId, rand));
  return { missions, generatedAt: now, refreshMs: currentMissionRefreshMs(discount) };
}

/** La bacheca è scaduta (va rigenerata)? */
export function missionsExpired(board: MissionBoard, now: number): boolean {
  return now - board.generatedAt >= board.refreshMs;
}

/** Millisecondi mancanti alla rigenerazione della bacheca (0 se scaduta). */
export function missionsRefreshRemainingMs(board: MissionBoard, now: number): number {
  return Math.max(0, board.generatedAt + board.refreshMs - now);
}

/**
 * Assicura una bacheca di missioni valida: la (ri)genera se assente o scaduta,
 * altrimenti lascia invariata la progressione. Ritorna la progressione e se è
 * cambiata (per sapere se persistere).
 */
export function ensureMissions(
  prog: PlayerProgression,
  now: number,
  makeId: () => string,
  rand: () => number = Math.random,
  discount: boolean = CHEST_DISCOUNT_ACTIVE
): { progression: PlayerProgression; changed: boolean } {
  const board = prog.missions;
  if (board && !missionsExpired(board, now)) return { progression: prog, changed: false };
  return {
    progression: { ...prog, missions: generateMissionBoard(now, makeId, rand, discount) },
    changed: true,
  };
}

/** Esito del completamento di una missione. */
export interface MissionCompleteResult {
  progression: PlayerProgression;
  mission: Mission;
  /** Le casse (istantanee) aperte come ricompensa (1 per facile, 2 per normale). */
  rewards: ChestOpenResult[];
}

/**
 * Completa la missione `missionId` (partita VINTA): la segna come completata e
 * apre SUBITO le casse-ricompensa (1 facile / 2 normale), assegnando un
 * frammento per ciascuna. Ritorna `null` se la missione non esiste o è già
 * stata completata.
 */
export function completeMission(
  prog: PlayerProgression,
  missionId: string,
  rand: () => number = Math.random
): MissionCompleteResult | null {
  const board = prog.missions;
  if (!board) return null;
  const mission = board.missions.find((m) => m.id === missionId);
  if (!mission || mission.completed) return null;
  const missions = board.missions.map((m) => (m.id === missionId ? { ...m, completed: true } : m));
  let cur: PlayerProgression = { ...prog, missions: { ...board, missions } };
  const rewards: ChestOpenResult[] = [];
  for (let i = 0; i < MISSION_REWARD_CHESTS[mission.rarity]; i++) {
    const res = applyFragment(cur, pickChestReward(rand));
    rewards.push(res);
    cur = res.progression;
  }
  return { progression: cur, mission: { ...mission, completed: true }, rewards };
}

// --- Azioni in sospeso (badge «da fare» sui pulsanti del menu) --------------
//
// Quante «azioni» il giocatore può compiere SUBITO in ciascun menu, per il
// pallino rosso col numero mostrato accanto ai relativi pulsanti. Logica PURA
// (nessuna dipendenza dall'orologio o dal fuso se non i parametri passati), così
// resta testabile e coerente ovunque.

/** Conteggio delle azioni in sospeso, suddiviso per menu. */
export interface PendingActions {
  /** Missioni ancora da vincere sulla bacheca corrente. */
  missions: number;
  /** Casse pronte da aprire (caricamento finito) nell'inventario. */
  chests: number;
  /** Riscatti gratuiti disponibili nel Negozio (cassa del giorno + eroe una-tantum). */
  shop: number;
  /** Somma di tutte le azioni in sospeso. */
  total: number;
}

/** Casse pronte da aprire ADESSO (caricamento terminato). */
export function readyChestCount(prog: PlayerProgression, now: number): number {
  return (prog.chests ?? []).filter((c) => chestReady(c, now)).length;
}

/**
 * Missioni ancora «da fare». Se la bacheca è assente o scaduta, all'apertura
 * delle Missioni ne verrebbe generata una nuova tutta da giocare: contano quindi
 * come MISSIONS_COUNT azioni. Altrimenti conta solo quelle non ancora completate.
 */
export function pendingMissionCount(prog: PlayerProgression, now: number): number {
  const board = prog.missions;
  if (!board || missionsExpired(board, now)) return MISSIONS_COUNT;
  return board.missions.filter((m) => !m.completed).length;
}

/** Riscatti gratuiti disponibili oggi nel Negozio (cassa giornaliera + eroe una-tantum). */
export function pendingShopCount(prog: PlayerProgression, dayKey: string): number {
  let n = 0;
  if (canClaimFreeChest(prog, dayKey)) n += 1;
  if (canRedeemUncommon(prog)) n += 1;
  return n;
}

/**
 * Tutte le azioni in sospeso in un colpo solo (per i badge del menu). `now` è
 * l'orologio corrente (casse pronte / bacheca scaduta), `dayKey` la chiave del
 * giorno locale usata dalla cassa gratuita del Negozio.
 */
export function pendingActions(
  prog: PlayerProgression,
  now: number,
  dayKey: string
): PendingActions {
  const missions = pendingMissionCount(prog, now);
  const chests = readyChestCount(prog, now);
  const shop = pendingShopCount(prog, dayKey);
  return { missions, chests, shop, total: missions + chests + shop };
}

// --- Validazione (fonte di verità condivisa) --------------------------------

const MISSION_RARITY_SET = new Set<MissionRarity>(['facile', 'normale']);
const BOT_LEVEL_SET = new Set<BotLevel>(['facile', 'normale', 'difficile', 'esperto']);

function cleanMission(raw: unknown): Mission | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const b = raw as {
    id?: unknown;
    rarity?: unknown;
    botLevel?: unknown;
    botCount?: unknown;
    seed?: unknown;
    calamities?: unknown;
    battle?: unknown;
    capitale?: unknown;
    completed?: unknown;
  };
  const id = typeof b.id === 'string' && b.id.length > 0 ? b.id : null;
  const rarity = MISSION_RARITY_SET.has(b.rarity as MissionRarity) ? (b.rarity as MissionRarity) : null;
  const botLevel = BOT_LEVEL_SET.has(b.botLevel as BotLevel) ? (b.botLevel as BotLevel) : null;
  const seed = typeof b.seed === 'string' && b.seed.length > 0 ? b.seed : null;
  const botCount =
    typeof b.botCount === 'number' && Number.isFinite(b.botCount)
      ? Math.max(1, Math.min(3, Math.floor(b.botCount)))
      : null;
  if (id === null || rarity === null || botLevel === null || seed === null || botCount === null)
    return null;
  const mission: Mission = { id, rarity, botLevel, botCount, seed };
  if (b.calamities === true) mission.calamities = true;
  if (b.battle === true) mission.battle = true;
  if (b.capitale === true) mission.capitale = true;
  if (b.completed === true) mission.completed = true;
  return mission;
}

function cleanMissionBoard(raw: unknown): MissionBoard | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const b = raw as { missions?: unknown; generatedAt?: unknown; refreshMs?: unknown };
  const generatedAt =
    typeof b.generatedAt === 'number' && Number.isFinite(b.generatedAt) ? b.generatedAt : null;
  const refreshMs =
    typeof b.refreshMs === 'number' && Number.isFinite(b.refreshMs) && b.refreshMs > 0
      ? b.refreshMs
      : null;
  if (generatedAt === null || refreshMs === null || !Array.isArray(b.missions)) return null;
  const missions = b.missions
    .map(cleanMission)
    .filter((m): m is Mission => m !== null)
    .slice(0, MISSIONS_COUNT);
  if (missions.length === 0) return null;
  return { missions, generatedAt, refreshMs };
}

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
    redeemedUncommon?: unknown;
    missions?: unknown;
  };
  const out: PlayerProgression = {};

  if (body.tester === true) out.tester = true;

  const missions = cleanMissionBoard(body.missions);
  if (missions) out.missions = missions;

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

  // Riscatto una-tantum: solo un eroe NON comune valido; l'eroe riscattato è
  // per coerenza anche sbloccato.
  if (typeof body.redeemedUncommon === 'string' && UNCOMMON_SET.has(body.redeemedUncommon as HeroId)) {
    out.redeemedUncommon = body.redeemedUncommon as HeroId;
    unlocked.add(body.redeemedUncommon as HeroId);
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
