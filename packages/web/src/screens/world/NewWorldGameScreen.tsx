/** Impostazione di una partita locale a «Vikings Around the World» (bot e hot-seat). */
import { useState } from 'react';
import { MAPS, MAX_TARGET_POINTS, MIN_TARGET_POINTS, DEFAULT_TARGET_POINTS, type BotLevel } from '@vikiland/engine-world';
import { wt } from '../../i18n/world';
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
}

type SeatKind = 'umano' | BotLevel;
interface Seat {
  name: string;
  kind: SeatKind;
}

const BOT_NAMES = ['Ragnar', 'Freydis', 'Leif', 'Astrid', 'Ivar', 'Sigrid'];
const KINDS: SeatKind[] = ['umano', 'facile', 'normale', 'difficile', 'esperto'];

export function NewWorldGameScreen({ onBack, onStart, onOnline, onTutorial, session, defaultName }: Props) {
  const [seats, setSeats] = useState<Seat[]>([
    { name: defaultName || 'Bjorn', kind: 'umano' },
    { name: BOT_NAMES[0]!, kind: 'normale' },
    { name: BOT_NAMES[1]!, kind: 'normale' },
  ]);
  const [target, setTarget] = useState(DEFAULT_TARGET_POINTS);
  const [random, setRandom] = useState(false);
  const [mapId, setMapId] = useState('mondo');

  const update = (i: number, patch: Partial<Seat>) =>
    setSeats((s) => s.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const map = MAPS[mapId]!;
  const canAdd = seats.length < map.maxPlayers;

  const start = async () => {
    // Con un server raggiungibile si applicano rinomine/rimozioni dell'admin.
    const override = await apiGetMapOverride(session?.serverUrl ?? defaultServerUrl(), mapId);
    const players: WorldSeatSetup[] = seats.map((s, i) => ({
      name: s.name.trim() || `P${i + 1}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length]!,
      bot: s.kind === 'umano' ? null : s.kind,
    }));
    onStart({
      seed: `world-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      players,
      targetPoints: target,
      materialiCasuali: random,
      mapId,
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
          </div>
        ))}
        {canAdd && (
          <button
            className="pxbtn pxbtn--ghost pxbtn--small"
            onClick={() => setSeats((x) => [...x, { name: BOT_NAMES[x.length % BOT_NAMES.length]!, kind: 'normale' }])}
          >
            {wt.aggiungi}
          </button>
        )}

        <div className="w-lab">{wt.mappa}</div>
        <select className="w-input" value={mapId} onChange={(e) => setMapId(e.target.value)}>
          {Object.values(MAPS).map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === 'mondo' ? wt.mappaMondo : m.name}
            </option>
          ))}
        </select>

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
    </div>
  );
}
