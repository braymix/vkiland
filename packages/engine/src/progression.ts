/**
 * PROGRESSIONE del giocatore: casse, frammenti ed eroi sbloccati. È la SOLA
 * fonte di verità condivisa da server (persistenza account) e client
 * (localStorage + UI), esattamente come `cosmetics.ts`: qui vivono i tipi, le
 * costanti di bilanciamento, la logica PURA (aprire una cassa, contare i
 * frammenti, capire cosa è sbloccato) e il validatore `sanitizeProgression`,
 * così client e server applicano ESATTAMENTE le stesse regole.
 *
 * Due modalità, due progressioni INDIPENDENTI: la Classica (esagoni) e Around
 * the World hanno ciascuna le proprie casse/frammenti/eroi sbloccati/missioni
 * (`ClassicoProgression`/`WorldProgression`, entrambe basate sulla stessa
 * `HeroProgression`). Il flag `tester` resta a livello di ACCOUNT (vale per
 * entrambe): un account tester ha ogni eroe disponibile in ogni modalità.
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
 *   - le casse/missioni della Classica danno SEMPRE un eroe non comune; quelle
 *     del Mondo possono dare anche un eroe RARO o LEGGENDARIO (`worldOnly`,
 *     farmabili solo lì): è il percorso pensato per sbloccarli.
 */
import { HERO_REGISTRY, type HeroId, type HeroRarity } from './heroes';
import type { BotLevel } from './types';

/**
 * Rarità di una cassa. La maggior parte sono «non comuni»; le casse «rara» e
 * «leggendaria» sono molto più rare (vedi `rollChestRarity`) e danno frammenti
 * degli eroi `worldOnly` corrispondenti, che richiedono MOLTI più frammenti.
 */
export type ChestRarity = 'nonComune' | 'rara' | 'leggendaria';

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

/** Le due modalità di gioco: ciascuna ha la propria progressione. */
export type GameMode = 'classico' | 'aroundTheWorld';

/**
 * Progressione «casse ed eroi» condivisa dalla struttura di entrambe le
 * modalità (le missioni, che hanno contenuto diverso, si aggiungono sopra).
 */
export interface HeroProgression {
  /** Casse in lavorazione (al massimo MAX_CHESTS). */
  chests?: ChestSlot[];
  /** Frammenti raccolti per ciascun eroe NON comune (0..fragmentsNeeded(id)). */
  fragments?: Partial<Record<HeroId, number>>;
  /** Eroi NON comuni sbloccati (i comuni sono sempre sbloccati). */
  unlocked?: HeroId[];
  /**
   * Giorno (chiave locale «AAAA-M-G») in cui è stata riscossa l'ultima cassa
   * gratuita del Negozio DI QUESTA MODALITÀ. Vuoto/assente → la cassa di oggi
   * è ancora disponibile.
   */
  freeChestDay?: string;
  /**
   * Negozio: eroe NON comune riscattato con l'unico riscatto GRATUITO a scelta
   * concesso UNA VOLTA per modalità. Assente → il riscatto è ancora disponibile.
   * L'eroe indicato è anche sbloccato (presente in `unlocked`).
   */
  redeemedUncommon?: HeroId;
}

/** Esito dell'apertura di una cassa (o di un frammento assegnato comunque). */
export interface ChestOpenResult<T extends HeroProgression = HeroProgression> {
  progression: T;
  /** Eroe di cui è uscito il frammento. */
  heroId: HeroId;
  /** Frammenti posseduti DOPO l'apertura (cap a fragmentsNeeded(heroId)). */
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

/**
 * Frammenti necessari per rarità. Gli eroi rari e leggendari richiedono MOLTI
 * più frammenti: sono più forti e si farmano «molto di più». I comuni sono
 * sempre sbloccati (0 frammenti).
 */
export const FRAGMENTS_BY_RARITY: Readonly<Record<HeroRarity, number>> = {
  comune: 0,
  nonComune: FRAGMENTS_PER_HERO,
  rara: 15,
  leggendaria: 30,
};

/** Frammenti necessari per sbloccare l'eroe `id` (dalla sua rarità). */
export function fragmentsNeeded(id: HeroId): number {
  return FRAGMENTS_BY_RARITY[HERO_REGISTRY[id].rarity];
}

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

/** Id degli eroi RARI (worldOnly, da farmare con le casse rare del Mondo). */
export const RARE_HERO_IDS: readonly HeroId[] = Object.values(HERO_REGISTRY)
  .filter((h) => h.rarity === 'rara')
  .map((h) => h.id);

/** Id degli eroi LEGGENDARI (worldOnly, da farmare con le casse leggendarie del Mondo). */
export const LEGENDARY_HERO_IDS: readonly HeroId[] = Object.values(HERO_REGISTRY)
  .filter((h) => h.rarity === 'leggendaria')
  .map((h) => h.id);

const COMMON_SET = new Set<HeroId>(COMMON_HERO_IDS);
const UNCOMMON_SET = new Set<HeroId>(UNCOMMON_HERO_IDS);

/** Tutti gli eroi FARMABILI (non comuni + rari + leggendari): tutti tranne i comuni. */
export const FARMABLE_HERO_IDS: readonly HeroId[] = [
  ...UNCOMMON_HERO_IDS,
  ...RARE_HERO_IDS,
  ...LEGENDARY_HERO_IDS,
];
const FARMABLE_SET = new Set<HeroId>(FARMABLE_HERO_IDS);

/** Il pool di eroi farmabili di una data rarità di cassa. */
function heroPoolForChest(rarity: ChestRarity): readonly HeroId[] {
  return rarity === 'leggendaria' ? LEGENDARY_HERO_IDS : rarity === 'rara' ? RARE_HERO_IDS : UNCOMMON_HERO_IDS;
}

// --- Query pure sulla progressione «eroi» (comune a entrambe le modalità) --

/** Frammenti posseduti per un eroe (0 se assente). */
export function fragmentsOf(prog: HeroProgression, id: HeroId): number {
  return prog.fragments?.[id] ?? 0;
}

/**
 * L'eroe è disponibile al giocatore IN QUESTA modalità? `tester` è un flag di
 * ACCOUNT (vale per entrambe le modalità), passato esplicitamente perché vive
 * fuori da `HeroProgression`.
 */
export function isHeroUnlocked(prog: HeroProgression, id: HeroId, tester = false): boolean {
  if (tester) return true;
  if (COMMON_SET.has(id)) return true;
  return prog.unlocked?.includes(id) ?? false;
}

/** L'insieme degli eroi disponibili al giocatore in questa modalità. */
export function unlockedHeroIds(prog: HeroProgression, tester = false): HeroId[] {
  return (Object.keys(HERO_REGISTRY) as HeroId[]).filter((id) => isHeroUnlocked(prog, id, tester));
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
export function canEarnChest(prog: HeroProgression): boolean {
  return (prog.chests?.length ?? 0) < MAX_CHESTS;
}

/**
 * Aggiunge una cassa in caricamento se c'è spazio (max MAX_CHESTS). Ritorna la
 * nuova progressione (stesso tipo concreto in ingresso); se era già piena la
 * ritorna invariata.
 */
export function addChest<T extends HeroProgression>(
  prog: T,
  now: number,
  makeId: () => string,
  durationMs: number = currentChestDurationMs(),
  rarity: ChestRarity = 'nonComune'
): T {
  if (!canEarnChest(prog)) return prog;
  const chest: ChestSlot = { id: makeId(), rarity, startedAt: now, durationMs };
  return { ...prog, chests: [...(prog.chests ?? []), chest] } as T;
}

/**
 * Probabilità delle rarità di cassa a fine partita: quasi sempre «non comune»,
 * di rado «rara», molto di rado «leggendaria». Usata SOLO per le casse del
 * Mondo (missioni/negozio): le casse della Classica restano sempre «non
 * comune» (vedi i call-site, che non chiamano questa funzione).
 */
export const CHEST_RARITY_WEIGHTS: Readonly<Record<ChestRarity, number>> = {
  nonComune: 0.8,
  rara: 0.17,
  leggendaria: 0.03,
};

/** Sorteggia la rarità di una cassa guadagnata (pesi `CHEST_RARITY_WEIGHTS`). */
export function rollChestRarity(rand: () => number = Math.random): ChestRarity {
  const r = rand();
  if (r < CHEST_RARITY_WEIGHTS.leggendaria) return 'leggendaria';
  if (r < CHEST_RARITY_WEIGHTS.leggendaria + CHEST_RARITY_WEIGHTS.rara) return 'rara';
  return 'nonComune';
}

/** Sceglie un eroe (uniforme) nel pool farmabile della rarità `rarity`. */
export function pickChestRewardOf(rarity: ChestRarity, rand: () => number = Math.random): HeroId {
  const pool = heroPoolForChest(rarity);
  const idx = Math.min(pool.length - 1, Math.floor(rand() * pool.length));
  return pool[idx]!;
}

/** Sceglie l'eroe non comune del frammento (uniforme tra i non comuni). */
export function pickChestReward(rand: () => number = Math.random): HeroId {
  return pickChestRewardOf('nonComune', rand);
}

/**
 * Applica un frammento dell'eroe `heroId` alla progressione (senza toccare le
 * casse). Se l'eroe è già sbloccato il frammento è sprecato. `tester` è il
 * flag di account: un tester ha tutto sbloccato, quindi ogni frammento è
 * sprecato per definizione.
 */
export function applyFragment<T extends HeroProgression>(
  prog: T,
  heroId: HeroId,
  tester = false
): ChestOpenResult<T> {
  const need = fragmentsNeeded(heroId);
  const already = isHeroUnlocked(prog, heroId, tester);
  if (already) {
    return {
      progression: prog,
      heroId,
      fragments: need,
      unlockedNow: false,
      wasted: true,
    };
  }
  const count = Math.min(need, fragmentsOf(prog, heroId) + 1);
  const fragments = { ...(prog.fragments ?? {}), [heroId]: count };
  const unlockedNow = count >= need;
  const unlocked = unlockedNow
    ? Array.from(new Set([...(prog.unlocked ?? []), heroId]))
    : prog.unlocked;
  const next = { ...prog, fragments } as T;
  if (unlocked) next.unlocked = unlocked;
  return { progression: next, heroId, fragments: count, unlockedNow, wasted: false };
}

/**
 * Apre la cassa `chestId` (se esiste ed è pronta): la rimuove dalle casse in
 * lavorazione e assegna un frammento di un eroe casuale (nel pool della
 * rarità della cassa). Ritorna `null` se la cassa non c'è o non è ancora
 * pronta.
 */
export function openChest<T extends HeroProgression>(
  prog: T,
  chestId: string,
  now: number,
  rand: () => number = Math.random,
  tester = false
): ChestOpenResult<T> | null {
  const chest = prog.chests?.find((c) => c.id === chestId);
  if (!chest || !chestReady(chest, now)) return null;
  const withoutChest = {
    ...prog,
    chests: (prog.chests ?? []).filter((c) => c.id !== chestId),
  } as T;
  const heroId = pickChestRewardOf(chest.rarity, rand);
  return applyFragment(withoutChest, heroId, tester);
}

// --- Negozio: cassa gratuita giornaliera (una per modalità) ----------------
//
// Il Negozio offre UNA cassa gratuita al giorno PER MODALITÀ che si apre
// ISTANTANEAMENTE (nessun caricamento): non entra nella coda delle casse in
// lavorazione, ma assegna subito un frammento — esattamente come una cassa
// aperta. Il «giorno» è una chiave passata dal chiamante (data locale del
// dispositivo), così la logica resta pura e testabile e client/server
// applicano la stessa regola.

/** La cassa gratuita di `dayKey` è ancora da riscuotere in questa modalità? */
export function canClaimFreeChest(prog: HeroProgression, dayKey: string): boolean {
  return prog.freeChestDay !== dayKey;
}

/**
 * Riscuote la cassa gratuita del giorno `dayKey`: segna il giorno come riscosso
 * e apre istantaneamente la cassa (frammento di un eroe casuale nel pool
 * `rarity`, di default non comune — il Mondo passa un `rarity` sorteggiato con
 * `rollChestRarity`). Ritorna `null` se la cassa di oggi è già stata riscossa.
 */
export function claimFreeChest<T extends HeroProgression>(
  prog: T,
  dayKey: string,
  rand: () => number = Math.random,
  rarity: ChestRarity = 'nonComune',
  tester = false
): ChestOpenResult<T> | null {
  if (!canClaimFreeChest(prog, dayKey)) return null;
  const withDay = { ...prog, freeChestDay: dayKey } as T;
  const heroId = pickChestRewardOf(rarity, rand);
  return applyFragment(withDay, heroId, tester);
}

// --- Negozio: riscatto una-tantum di un eroe non comune a scelta -----------
//
// Ogni modalità ha UN SOLO riscatto gratuito: può scegliere un eroe NON comune
// qualunque (di quella modalità) e sbloccarlo all'istante. Una volta usato non
// si ripete. La logica è pura (come le casse): client e server la applicano
// identica.

/** Il riscatto una-tantum dell'eroe non comune a scelta è ancora disponibile? */
export function canRedeemUncommon(prog: HeroProgression): boolean {
  return prog.redeemedUncommon === undefined;
}

/** Esito del riscatto una-tantum. */
export interface RedeemResult<T extends HeroProgression = HeroProgression> {
  progression: T;
  heroId: HeroId;
}

/**
 * Riscatta (una volta per modalità) l'eroe non comune `heroId` a scelta: lo
 * sblocca e segna il riscatto come usato. Ritorna `null` se il riscatto è già
 * stato usato o se `heroId` non è un eroe non comune valido.
 */
export function redeemUncommon<T extends HeroProgression>(prog: T, heroId: HeroId): RedeemResult<T> | null {
  if (!canRedeemUncommon(prog)) return null;
  if (!UNCOMMON_SET.has(heroId)) return null;
  const unlocked = Array.from(new Set([...(prog.unlocked ?? []), heroId]));
  return { progression: { ...prog, redeemedUncommon: heroId, unlocked } as T, heroId };
}

// --- MISSIONI (Classica) ----------------------------------------------------
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

/** Una singola missione Classica: una partita casuale da vincere. */
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

/** Una bacheca di missioni (con la sua finestra di rigenerazione). */
export interface MissionBoardOf<M> {
  missions: M[];
  /** Epoch ms in cui la bacheca è stata generata. */
  generatedAt: number;
  /**
   * Durata prima della rigenerazione, FISSATA alla generazione (casuale, più
   * breve con lo sconto): così una variazione dello sconto non altera la
   * bacheca già in corso.
   */
  refreshMs: number;
}

/** La bacheca delle missioni correnti della Classica. */
export type MissionBoard = MissionBoardOf<Mission>;

/** Una singola missione del Mondo: una partita casuale da vincere su una mappa. */
export interface WorldMission {
  id: string;
  rarity: MissionRarity;
  botLevel: BotLevel;
  botCount: number;
  seed: string;
  /** Mappa su cui si gioca (id del registro mappe di `@vikiland/engine-world`). */
  mapId: string;
  /** Punti Gloria bersaglio della partita. */
  targetPoints: number;
  completed?: boolean;
}

/** La bacheca delle missioni correnti del Mondo. */
export type WorldMissionBoard = MissionBoardOf<WorldMission>;

/** Progressione Classica: eroi/casse + la bacheca missioni Classica. */
export interface ClassicoProgression extends HeroProgression {
  missions?: MissionBoard;
}

/** Progressione del Mondo: eroi/casse + la bacheca missioni del Mondo. */
export interface WorldProgression extends HeroProgression {
  missions?: WorldMissionBoard;
}

/**
 * Progressione completa dell'account: `tester` vale per ENTRAMBE le modalità;
 * `classico`/`aroundTheWorld` sono due mazzi indipendenti (casse, frammenti,
 * eroi sbloccati, missioni, cassa gratuita del giorno, riscatto una-tantum).
 */
export interface PlayerProgression {
  /** Account «tester»: ogni eroe è già disponibile, in ogni modalità. */
  tester?: boolean;
  classico?: ClassicoProgression;
  aroundTheWorld?: WorldProgression;
}

/** Numero di missioni sulla bacheca (Classica e Mondo). */
export const MISSIONS_COUNT = 3;

/** Probabilità che una missione sia FACILE (comune): più probabile della normale. */
export const MISSION_FACILE_PROB = 0.7;

/** Casse (istantanee) date in ricompensa per rarità: facile → 1, normale → 2. */
export const MISSION_REWARD_CHESTS: Record<MissionRarity, number> = { facile: 1, normale: 2 };

/**
 * Probabilità che una missione CLASSICA abbia UNA modalità extra (calamità/
 * battaglia/capitale). «Senza esagerare»: al massimo una variante, e non sempre.
 */
export const MISSION_MODE_PROB = 0.5;

/** Punti Gloria bersaglio delle missioni del Mondo (fisso, come il default di Around the World). */
export const WORLD_MISSION_TARGET_POINTS = 10;

/** Livelli bot possibili per rarità: la difficoltà cresce con la rarità. */
const MISSION_BOT_LEVELS: Record<MissionRarity, readonly BotLevel[]> = {
  facile: ['facile', 'normale'],
  normale: ['difficile', 'esperto'],
};

/** Numero di bot avversari per rarità: facile → 2, normale → 3 (entrambe le modalità). */
const MISSION_BOT_COUNT: Record<MissionRarity, number> = { facile: 2, normale: 3 };

/** Le modalità extra che una missione CLASSICA può attivare (al massimo UNA). */
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

/** Genera una singola missione Classica casuale (rarità, difficoltà, isola e modalità). */
export function generateMission(makeId: () => string, rand: () => number = Math.random): Mission {
  const rarity: MissionRarity = rand() < MISSION_FACILE_PROB ? 'facile' : 'normale';
  const botLevel = pickFrom(rand, MISSION_BOT_LEVELS[rarity]);
  const botCount = MISSION_BOT_COUNT[rarity];
  const mission: Mission = { id: makeId(), rarity, botLevel, botCount, seed: `mission-${makeId()}` };
  // Modalità extra: al massimo UNA, e non sempre (senza esagerare).
  if (rand() < MISSION_MODE_PROB) {
    const mode: MissionMode = pickFrom(rand, MISSION_MODES);
    mission[mode] = true;
  }
  return mission;
}

/** Genera una nuova bacheca di missioni Classiche con la finestra di refresh corrente. */
export function generateMissionBoard(
  now: number,
  makeId: () => string,
  rand: () => number = Math.random,
  discount: boolean = CHEST_DISCOUNT_ACTIVE
): MissionBoard {
  const missions = Array.from({ length: MISSIONS_COUNT }, () => generateMission(makeId, rand));
  return { missions, generatedAt: now, refreshMs: currentMissionRefreshMs(discount) };
}

/** Genera una singola missione del Mondo casuale (rarità, difficoltà, mappa). */
export function generateWorldMission(
  makeId: () => string,
  mapIds: readonly string[],
  rand: () => number = Math.random
): WorldMission {
  const rarity: MissionRarity = rand() < MISSION_FACILE_PROB ? 'facile' : 'normale';
  const botLevel = pickFrom(rand, MISSION_BOT_LEVELS[rarity]);
  const botCount = MISSION_BOT_COUNT[rarity];
  const mapId = pickFrom(rand, mapIds);
  return {
    id: makeId(),
    rarity,
    botLevel,
    botCount,
    mapId,
    targetPoints: WORLD_MISSION_TARGET_POINTS,
    seed: `world-mission-${makeId()}`,
  };
}

/** Genera una nuova bacheca di missioni del Mondo con la finestra di refresh corrente. */
export function generateWorldMissionBoard(
  now: number,
  makeId: () => string,
  mapIds: readonly string[],
  rand: () => number = Math.random,
  discount: boolean = CHEST_DISCOUNT_ACTIVE
): WorldMissionBoard {
  const missions = Array.from({ length: MISSIONS_COUNT }, () => generateWorldMission(makeId, mapIds, rand));
  return { missions, generatedAt: now, refreshMs: currentMissionRefreshMs(discount) };
}

/** La bacheca (Classica o Mondo: stesso shape di timing) è scaduta (va rigenerata)? */
export function missionsExpired(board: { generatedAt: number; refreshMs: number }, now: number): boolean {
  return now - board.generatedAt >= board.refreshMs;
}

/** Millisecondi mancanti alla rigenerazione della bacheca (0 se scaduta). */
export function missionsRefreshRemainingMs(
  board: { generatedAt: number; refreshMs: number },
  now: number
): number {
  return Math.max(0, board.generatedAt + board.refreshMs - now);
}

/**
 * Assicura una bacheca di missioni Classiche valida: la (ri)genera se assente
 * o scaduta, altrimenti lascia invariata la progressione. Ritorna la
 * progressione e se è cambiata (per sapere se persistere).
 */
export function ensureMissions(
  prog: ClassicoProgression,
  now: number,
  makeId: () => string,
  rand: () => number = Math.random,
  discount: boolean = CHEST_DISCOUNT_ACTIVE
): { progression: ClassicoProgression; changed: boolean } {
  const board = prog.missions;
  if (board && !missionsExpired(board, now)) return { progression: prog, changed: false };
  return {
    progression: { ...prog, missions: generateMissionBoard(now, makeId, rand, discount) },
    changed: true,
  };
}

/**
 * Assicura una bacheca di missioni del Mondo valida: la (ri)genera se assente
 * o scaduta, altrimenti lascia invariata la progressione.
 */
export function ensureWorldMissions(
  prog: WorldProgression,
  now: number,
  makeId: () => string,
  mapIds: readonly string[],
  rand: () => number = Math.random,
  discount: boolean = CHEST_DISCOUNT_ACTIVE
): { progression: WorldProgression; changed: boolean } {
  const board = prog.missions;
  if (board && !missionsExpired(board, now)) return { progression: prog, changed: false };
  return {
    progression: { ...prog, missions: generateWorldMissionBoard(now, makeId, mapIds, rand, discount) },
    changed: true,
  };
}

/** Esito del completamento di una missione Classica. */
export interface MissionCompleteResult {
  progression: ClassicoProgression;
  mission: Mission;
  /** Le casse (istantanee) aperte come ricompensa (1 per facile, 2 per normale). */
  rewards: ChestOpenResult<ClassicoProgression>[];
}

/**
 * Completa la missione Classica `missionId` (partita VINTA): la segna come
 * completata e apre SUBITO le casse-ricompensa (1 facile / 2 normale),
 * assegnando un frammento NON COMUNE per ciascuna. Ritorna `null` se la
 * missione non esiste o è già stata completata.
 */
export function completeMission(
  prog: ClassicoProgression,
  missionId: string,
  rand: () => number = Math.random
): MissionCompleteResult | null {
  const board = prog.missions;
  if (!board) return null;
  const mission = board.missions.find((m) => m.id === missionId);
  if (!mission || mission.completed) return null;
  const missions = board.missions.map((m) => (m.id === missionId ? { ...m, completed: true } : m));
  let cur: ClassicoProgression = { ...prog, missions: { ...board, missions } };
  const rewards: ChestOpenResult<ClassicoProgression>[] = [];
  for (let i = 0; i < MISSION_REWARD_CHESTS[mission.rarity]; i++) {
    const res = applyFragment(cur, pickChestReward(rand));
    rewards.push(res);
    cur = res.progression;
  }
  return { progression: cur, mission: { ...mission, completed: true }, rewards };
}

/** Esito del completamento di una missione del Mondo. */
export interface WorldMissionCompleteResult {
  progression: WorldProgression;
  mission: WorldMission;
  /** Le casse (istantanee) aperte come ricompensa: possono dare anche eroi rari/leggendari. */
  rewards: ChestOpenResult<WorldProgression>[];
}

/**
 * Completa la missione del Mondo `missionId` (partita VINTA): a differenza
 * della Classica, OGNI cassa-ricompensa sorteggia la propria rarità con
 * `rollChestRarity` (quindi può dare un eroe raro/leggendario): è il percorso
 * pensato per farmarli.
 */
export function completeWorldMission(
  prog: WorldProgression,
  missionId: string,
  rand: () => number = Math.random
): WorldMissionCompleteResult | null {
  const board = prog.missions;
  if (!board) return null;
  const mission = board.missions.find((m) => m.id === missionId);
  if (!mission || mission.completed) return null;
  const missions = board.missions.map((m) => (m.id === missionId ? { ...m, completed: true } : m));
  let cur: WorldProgression = { ...prog, missions: { ...board, missions } };
  const rewards: ChestOpenResult<WorldProgression>[] = [];
  for (let i = 0; i < MISSION_REWARD_CHESTS[mission.rarity]; i++) {
    const res = applyFragment(cur, pickChestRewardOf(rollChestRarity(rand), rand));
    rewards.push(res);
    cur = res.progression;
  }
  return { progression: cur, mission: { ...mission, completed: true }, rewards };
}

// --- Azioni in sospeso (badge «da fare» sui pulsanti del menu) --------------
//
// Quante «azioni» il giocatore può compiere SUBITO in una modalità, per il
// pallino rosso col numero mostrato accanto ai relativi pulsanti. Logica PURA
// (nessuna dipendenza dall'orologio o dal fuso se non i parametri passati),
// generica così si applica identica a Classico e Mondo.

/** Conteggio delle azioni in sospeso, suddiviso per menu (di UNA modalità). */
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
export function readyChestCount(prog: HeroProgression, now: number): number {
  return (prog.chests ?? []).filter((c) => chestReady(c, now)).length;
}

/**
 * Missioni ancora «da fare» sulla bacheca di `prog` (Classica o Mondo: stesso
 * shape). Se la bacheca è assente o scaduta, all'apertura delle Missioni ne
 * verrebbe generata una nuova tutta da giocare: contano quindi come
 * MISSIONS_COUNT azioni. Altrimenti conta solo quelle non ancora completate.
 */
export function pendingMissionCount(
  prog: { missions?: { missions: { completed?: boolean }[]; generatedAt: number; refreshMs: number } },
  now: number
): number {
  const board = prog.missions;
  if (!board || missionsExpired(board, now)) return MISSIONS_COUNT;
  return board.missions.filter((m) => !m.completed).length;
}

/** Riscatti gratuiti disponibili oggi nel Negozio (cassa giornaliera + eroe una-tantum) di UNA modalità. */
export function pendingShopCount(prog: HeroProgression, dayKey: string): number {
  let n = 0;
  if (canClaimFreeChest(prog, dayKey)) n += 1;
  if (canRedeemUncommon(prog)) n += 1;
  return n;
}

/**
 * Tutte le azioni in sospeso di UNA modalità in un colpo solo (per i badge del
 * menu). `now` è l'orologio corrente (casse pronte / bacheca scaduta),
 * `dayKey` la chiave del giorno locale usata dalla cassa gratuita del Negozio.
 */
export function pendingActions<
  T extends HeroProgression & {
    missions?: { missions: { completed?: boolean }[]; generatedAt: number; refreshMs: number };
  },
>(prog: T, now: number, dayKey: string): PendingActions {
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

function cleanWorldMission(raw: unknown): WorldMission | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const b = raw as {
    id?: unknown;
    rarity?: unknown;
    botLevel?: unknown;
    botCount?: unknown;
    seed?: unknown;
    mapId?: unknown;
    targetPoints?: unknown;
    completed?: unknown;
  };
  const id = typeof b.id === 'string' && b.id.length > 0 ? b.id : null;
  const rarity = MISSION_RARITY_SET.has(b.rarity as MissionRarity) ? (b.rarity as MissionRarity) : null;
  const botLevel = BOT_LEVEL_SET.has(b.botLevel as BotLevel) ? (b.botLevel as BotLevel) : null;
  const seed = typeof b.seed === 'string' && b.seed.length > 0 ? b.seed : null;
  const mapId = typeof b.mapId === 'string' && b.mapId.length > 0 ? b.mapId : null;
  const botCount =
    typeof b.botCount === 'number' && Number.isFinite(b.botCount)
      ? Math.max(1, Math.min(3, Math.floor(b.botCount)))
      : null;
  const targetPoints =
    typeof b.targetPoints === 'number' && Number.isFinite(b.targetPoints)
      ? Math.max(6, Math.min(20, Math.floor(b.targetPoints)))
      : null;
  if (
    id === null ||
    rarity === null ||
    botLevel === null ||
    seed === null ||
    mapId === null ||
    botCount === null ||
    targetPoints === null
  )
    return null;
  const mission: WorldMission = { id, rarity, botLevel, botCount, seed, mapId, targetPoints };
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

function cleanWorldMissionBoard(raw: unknown): WorldMissionBoard | null {
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
    .map(cleanWorldMission)
    .filter((m): m is WorldMission => m !== null)
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
  const rarity: ChestRarity =
    body.rarity === 'rara' || body.rarity === 'leggendaria' ? body.rarity : 'nonComune';
  return { id, rarity, startedAt, durationMs };
}

/**
 * Ripulisce i campi comuni (`HeroProgression`) di una progressione qualunque:
 * casse ben formate (max MAX_CHESTS), frammenti interi 0..fragmentsNeeded(id)
 * solo per eroi farmabili, eroi sbloccati solo tra i farmabili. Gli eroi con
 * frammenti pieni vengono considerati sbloccati (coerenza). Condiviso da
 * Classico e Mondo: la differenza fra le due sta solo nelle missioni.
 */
function sanitizeHeroProgression(raw: unknown): HeroProgression {
  const body = (raw ?? {}) as {
    chests?: unknown;
    fragments?: unknown;
    unlocked?: unknown;
    freeChestDay?: unknown;
    redeemedUncommon?: unknown;
  };
  const out: HeroProgression = {};

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
      if (typeof id === 'string' && FARMABLE_SET.has(id as HeroId)) unlocked.add(id as HeroId);
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
      if (!FARMABLE_SET.has(id as HeroId)) continue;
      const need = fragmentsNeeded(id as HeroId);
      const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
      const clamped = Math.max(0, Math.min(need, n));
      if (clamped > 0) fragments[id as HeroId] = clamped;
      if (clamped >= need) unlocked.add(id as HeroId);
    }
  }
  if (Object.keys(fragments).length) out.fragments = fragments;
  if (unlocked.size) out.unlocked = Array.from(unlocked);

  return out;
}

function sanitizeClassicoProgression(raw: unknown): ClassicoProgression {
  const base = sanitizeHeroProgression(raw);
  const missionsRaw = typeof raw === 'object' && raw !== null ? (raw as { missions?: unknown }).missions : undefined;
  const missions = cleanMissionBoard(missionsRaw);
  const out: ClassicoProgression = { ...base };
  if (missions) out.missions = missions;
  return out;
}

function sanitizeWorldProgression(raw: unknown): WorldProgression {
  const base = sanitizeHeroProgression(raw);
  const missionsRaw = typeof raw === 'object' && raw !== null ? (raw as { missions?: unknown }).missions : undefined;
  const missions = cleanWorldMissionBoard(missionsRaw);
  const out: WorldProgression = { ...base };
  if (missions) out.missions = missions;
  return out;
}

/**
 * Ripulisce una progressione qualunque arrivata da fuori (localStorage o
 * server) tenendo solo valori validi e coerenti. **Migrazione**: un blob
 * «vecchio» (precedente alla separazione Classico/Mondo, senza le chiavi
 * `classico`/`aroundTheWorld`) viene trattato per intero come il Classico di
 * quell'account — il Mondo parte da un mazzo vuoto. Un blob già nel nuovo
 * shape viene letto normalmente dalle sue due chiavi.
 */
export function sanitizeProgression(raw: unknown): PlayerProgression {
  const body = (raw ?? {}) as {
    tester?: unknown;
    classico?: unknown;
    aroundTheWorld?: unknown;
  };
  const out: PlayerProgression = {};

  if (body.tester === true) out.tester = true;

  const hasNestedShape = body.classico !== undefined || body.aroundTheWorld !== undefined;
  const classicoRaw = hasNestedShape ? body.classico : raw;
  const worldRaw = hasNestedShape ? body.aroundTheWorld : undefined;

  out.classico = sanitizeClassicoProgression(classicoRaw);
  out.aroundTheWorld = sanitizeWorldProgression(worldRaw);

  return out;
}
