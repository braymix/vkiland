/** Creazione della partita. Deterministica: stesso config (+ override) = stessa partita. */
import {
  DEFAULT_TARGET_POINTS,
  MAX_TARGET_POINTS,
  MIN_TARGET_POINTS,
} from './constants';
import { applyMapOverride, assignNumbers, freezeMap, getMapDefinition, isProductive, validateMap } from './map';
import { seedRng, shuffle } from './rng';
import { zeroResources } from './resources';
import type {
  MapDefinition,
  MapOverride,
  TerritoryDef,
  TerritoryState,
  WorldGameConfig,
  WorldGameState,
  WorldPlayerState,
} from './types';

export interface NewWorldGameOptions {
  /** Mappa esplicita (test, mappe generate); altrimenti si usa `config.mapId`. */
  map?: MapDefinition;
  /** Rinomine/rimozioni dell'admin. */
  override?: MapOverride | null;
}

export function defaultConfig(partial: Partial<WorldGameConfig> & Pick<WorldGameConfig, 'players'>): WorldGameConfig {
  return {
    seed: partial.seed ?? 'seed',
    players: partial.players,
    targetPoints: partial.targetPoints ?? DEFAULT_TARGET_POINTS,
    mapId: partial.mapId ?? 'mondo',
    materialiCasuali: partial.materialiCasuali ?? false,
    avoidAdjacent68: partial.avoidAdjacent68 ?? true,
  };
}

export function createGame(config: WorldGameConfig, opts: NewWorldGameOptions = {}): WorldGameState {
  const base = opts.map ?? getMapDefinition(config.mapId);
  if (!base) throw new Error(`Mappa sconosciuta: ${config.mapId}`);
  const baseErrors = validateMap(base);
  if (baseErrors.length > 0) throw new Error(`Mappa non valida: ${baseErrors[0]}`);
  const n = config.players.length;
  if (n < base.minPlayers || n > base.maxPlayers) {
    throw new Error(`Questa mappa si gioca da ${base.minPlayers} a ${base.maxPlayers} giocatori.`);
  }
  const ov = applyMapOverride(base, opts.override ?? null);
  if (!ov.ok) throw new Error(ov.error);
  let def = ov.def;
  let rng = seedRng(`${config.seed}|world`);

  if (config.materialiCasuali) {
    const prod = def.territories.filter(isProductive);
    const [kinds, next] = shuffle(rng, prod.map((t) => t.kind));
    rng = next;
    let i = 0;
    const territories: TerritoryDef[] = def.territories.map((t) => (isProductive(t) ? { ...t, kind: kinds[i++]! } : t));
    def = { ...def, territories };
  }

  const [numbers, rng2] = assignNumbers(def, rng, config.avoidAdjacent68);
  rng = rng2;

  const territories: Record<string, TerritoryState> = {};
  for (const t of def.territories) {
    territories[t.id] = {
      id: t.id,
      number: numbers[t.id] ?? null,
      settlements: [],
    };
  }

  const first = def.territories[0]!.id;
  const players: WorldPlayerState[] = config.players.map((pc, i) => ({
    id: i,
    name: pc.name,
    color: pc.color,
    ...(pc.bot ? { bot: pc.bot } : {}),
    hand: zeroResources(),
    jarl: first,
    movePointsLeft: 0,
    tollsPaidThisTurn: [],
  }));

  const order = Array.from({ length: n }, (_, i) => i);
  const setupOrder = [...order, ...[...order].reverse()];
  const target = Math.max(MIN_TARGET_POINTS, Math.min(MAX_TARGET_POINTS, Math.round(config.targetPoints)));

  return {
    kind: 'world',
    config: { ...config, targetPoints: target },
    map: freezeMap(def),
    territories,
    roads: {},
    players,
    currentPlayer: setupOrder[0]!,
    turnNumber: 0,
    phase: { type: 'setup', expect: 'villaggio' },
    dice: null,
    setupOrder,
    setupIndex: 0,
    setupLastTerritory: null,
    pendingTrade: null,
    tradeCounter: 0,
    grandeVia: { holder: null, length: 0 },
    grandeViaggiatore: { holder: null, continents: 0 },
    rng,
  };
}

export function cloneState(state: WorldGameState): WorldGameState {
  // La mappa congelata è immutabile: si condivide (e con lei l'indice di adiacenza in cache).
  const { map, ...rest } = state;
  return { ...(JSON.parse(JSON.stringify(rest)) as Omit<WorldGameState, 'map'>), map };
}
