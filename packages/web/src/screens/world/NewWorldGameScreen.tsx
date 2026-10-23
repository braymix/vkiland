/** Impostazione di una partita locale a «Vikings Around the World» (bot e hot-seat). */
import { useState } from 'react';
import { MAPS, MAX_TARGET_POINTS, MIN_TARGET_POINTS, DEFAULT_TARGET_POINTS, ALL_WORLD_HERO_IDS, WORLD_HERO_EFFECTS, type BotLevel, type WorldHeroId } from '@vikiland/engine-world';
import { ALL_RARITY_ORDER, unlockedHeroIds, type HeroId, type PlayerProgression } from '@vikiland/engine';
import { MapSelect } from '../../components/world/MapSelect';
import { HeroPicker } from '../../components/HeroPicker';
import { HeroArt } from '../../components/HeroArt';
import { wt, fmt } from '../../i18n/world';
import { worldHeroDescribe, worldHeroName } from '../../game/world/worldHero';
import { PLAYER_COLORS } from '../../render/world/worldRenderer';
import type { WorldSetup, WorldSeatSetup } from '../../game/world/LocalWorldController';
import { defaultServerUrl, type OnlineSession } from '../../online/connection';
import { apiGetMapOverride } from '../../online/worldApi';

interface Props {
  onBack: () => void;
  onStart: (setup: WorldSetup) => void;
  /** Passa alla modalità online (richiede un account). */
  onOnline: () => void;
  /** Apre il mini-tutorial. */
  onTutorial: () => void;
  /** Sessione online (se c'è): da lì si scaricano gli override admin della mappa. */
  session?: OnlineSession | null;
  /** Nome dell'account (se c'è) per il primo posto. */
  defaultName?: string | undefined;
  /** Progressione dell'account: gli eroi non sbloccati restano bloccati nel picker. */
  progression?: PlayerProgression;
}

type SeatKind = 'umano' | BotLevel;
interface Seat {
  name: string;
  kind: SeatKind;
  hero: WorldHeroId;
}

const BOT_NAMES = ['Ragnar', 'Freydis', 'Leif', 'Astrid', 'Ivar', 'Sigrid'];
const KINDS: SeatKind[] = ['umano', 'facile', 'normale', 'difficile', 'esperto'];
/** Eroi comuni (i «Dono»): sempre sbloccati. */
const COMMON_HEROES = ALL_WORLD_HERO_IDS.filter((id) => WORLD_HERO_EFFECTS[id].donoResource);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

export function NewWorldGameScreen({ onBack, onStart, onOnline, onTutorial, session, defaultName, progression }: Props) {
  // Eroe di default: un comune (sempre sbloccato) per gli umani, uno qualsiasi per i bot.
  const unlocked = progression ? unlockedHeroIds(progression) : null;
  const humanPool = (): WorldHeroId[] => {
    const u = (unlocked ?? []).filter((id) => (ALL_WORLD_HERO_IDS as string[]).includes(id)) as WorldHeroId[];
    return u.length ? u : [...COMMON_HEROES];
  };
  const defaultHero = (isBot: boolean): WorldHeroId => (isBot ? pick(ALL_WORLD_HERO_IDS) : pick(humanPool()));

  const [seats, setSeats] = useState<Seat[]>([
    { name: defaultName || 'Bjorn', kind: 'umano', hero: defaultHero(false) },
    { name: BOT_NAMES[0]!, kind: 'normale', hero: defaultHero(true) },
    { name: BOT_NAMES[1]!, kind: 'normale', hero: defaultHero(true) },
  ]);
  const [target, setTarget] = useState(DEFAULT_TARGET_POINTS);
  const [random, setRandom] = useState(false);
  const [mapId, setMapId] = useState('mondo');
  const [castleRings, setCastleRings] = useState(3);
  const [heroSeat, setHeroSeat] = useState<number | null>(null);

  const update = (i: number, patch: Partial<Seat>) =>
    setSeats((s) => s.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const isCastle = mapId === 'castello';
  // La mappa Castello è generata (2..6 giocatori), non è in MAPS.
  const map = MAPS[mapId] ?? { maxPlayers: 6, minPlayers: 2, credits: undefined };
  const canAdd = seats.length < map.maxPlayers;

  const start = async () => {
    // La mappa Castello è generata: niente override dell'admin. Per le altre si
    // applicano rinomine/rimozioni dell'admin dal server, se raggiungibile.
    const override = isCastle
      ? null
      : await apiGetMapOverride(session?.serverUrl ?? defaultServerUrl(), mapId);
    const players: WorldSeatSetup[] = seats.map((s, i) => ({
      name: s.name.trim() || `P${i + 1}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length]!,
      bot: s.kind === 'umano' ? null : s.kind,
      hero: s.hero,
    }));
    onStart({
      seed: `world-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      players,
      targetPoints: target,
      materialiCasuali: random,
      mapId,
      ...(isCastle ? { castleRings } : {}),
      override,
    });
  };

  const label = (k: SeatKind): string => (k === 'umano' ? wt.umano : `🤖 ${wt[k]}`);

  return (
    <div className="screen w-new">
      <h1 className="menu-title" style={{ fontSize: 16 }}>
        🌍 {wt.nuovaMondo}
      </h1>
      <div className="w-tabs">
        <button className="pxbtn pxbtn--small">{wt.locale}</button>
        <button className="pxbtn pxbtn--small pxbtn--ghost" onClick={onOnline}>
          🌐 {wt.online}
        </button>
        <button className="pxbtn pxbtn--small pxbtn--ghost" onClick={onTutorial}>
          📖 {wt.leggiRegole}
        </button>
      </div>
      <div className="w-form">
        <div className="w-lab">{wt.giocatori}</div>
        {seats.map((s, i) => (
          <div key={i} className="w-seat">
            <span className="w-dot" style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
            <input
              className="w-input"
              value={s.name}
              maxLength={14}
              onChange={(e) => update(i, { name: e.target.value })}
              aria-label={wt.nome}
            />
            <select
              className="w-input"
              value={s.kind}
              onChange={(e) => update(i, { kind: e.target.value as SeatKind })}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {label(k)}
                </option>
              ))}
            </select>
            {seats.length > map.minPlayers && (
              <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => setSeats((x) => x.filter((_, k) => k !== i))}>
                ✕
              </button>
            )}
            <button
              className="pxbtn pxbtn--ghost pxbtn--small w-hero-btn"
              onClick={() => setHeroSeat(i)}
              title={wt.scegliEroe}
            >
              <HeroArt hero={s.hero as HeroId} size={20} /> {worldHeroName(s.hero)}
            </button>
          </div>
        ))}
        {canAdd && (
          <button
            className="pxbtn pxbtn--ghost pxbtn--small"
            onClick={() => setSeats((x) => [...x, { name: BOT_NAMES[x.length % BOT_NAMES.length]!, kind: 'normale', hero: defaultHero(true) }])}
          >
            {wt.aggiungi}
          </button>
        )}

        <div className="w-lab">{wt.mappa}</div>
        <MapSelect
          value={mapId}
          onChange={(id) => {
            setMapId(id);
            const max = id === 'castello' ? 6 : MAPS[id]!.maxPlayers;
            setSeats((x) => x.slice(0, max));
          }}
        />
        {map.credits && <div className="w-dim">{map.credits}</div>}
        {isCastle && (
          <>
            <div className="w-lab">
              {wt.castelloAnelli}: {castleRings}
            </div>
            <input
              type="range"
              min={2}
              max={4}
              value={castleRings}
              onChange={(e) => setCastleRings(Number(e.target.value))}
            />
            <div className="w-dim">{wt.castelloSpiega}</div>
          </>
        )}

        <div className="w-lab">
          {wt.puntiVittoria}: {target}
        </div>
        <input
          type="range"
          min={MIN_TARGET_POINTS}
          max={MAX_TARGET_POINTS}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
        />
        <label className="w-check">
          <input type="checkbox" checked={random} onChange={(e) => setRandom(e.target.checked)} /> {wt.materialiCasuali}
        </label>
        <p className="w-rules">{wt.regoleTesto}</p>
      </div>
      <div className="dialog-buttons">
        <button className="pxbtn pxbtn--ghost" onClick={onBack}>
          {wt.indietro}
        </button>
        <button className="pxbtn" disabled={seats.length < 2} onClick={() => void start()}>
          ⛵ {wt.inizia}
        </button>
      </div>
      {heroSeat !== null && (
        <HeroPicker
          title={fmt(wt.eroeDi, { nome: seats[heroSeat]!.name || `P${heroSeat + 1}` })}
          selected={[seats[heroSeat]!.hero as HeroId]}
          maxCount={1}
          rarityOrder={ALL_RARITY_ORDER}
          describe={worldHeroDescribe}
          // I bot possono usare anche eroi non ancora sbloccati dall'account.
          {...(seats[heroSeat]!.kind === 'umano' && progression ? { progression } : {})}
          onChange={(next) => {
            const h = (next[next.length - 1] as WorldHeroId) ?? seats[heroSeat]!.hero;
            update(heroSeat, { hero: h });
          }}
          onClose={() => setHeroSeat(null)}
        />
      )}
    </div>
  );
}
