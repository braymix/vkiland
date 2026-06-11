/** Configurazione della partita: 2–4 giocatori, ognuno umano o bot (hot-seat). */
import { useState } from 'react';
import type { BotLevel, PlayerColor } from '@vikiland/engine';
import { it } from '../i18n/it';
import type { GameSetup } from '../game/LocalGameController';
import { PLAYER_COLORS } from '../render/sprites/palettes';

const COLORS: PlayerColor[] = ['rosso', 'blu', 'verde', 'giallo'];
const BOT_NAMES = ['Astrid', 'Leif', 'Sigrid'];

interface PlayerRow {
  name: string;
  isBot: boolean;
  botLevel: BotLevel;
}

interface Props {
  onStart: (setup: GameSetup) => void;
  onBack: () => void;
}

export function SetupScreen({ onStart, onBack }: Props) {
  const [players, setPlayers] = useState<PlayerRow[]>([
    { name: 'Bjorn', isBot: false, botLevel: 'normale' },
    { name: 'Astrid', isBot: true, botLevel: 'normale' },
    { name: 'Leif', isBot: true, botLevel: 'facile' },
  ]);
  const [seed, setSeed] = useState('');
  const [avoid68, setAvoid68] = useState(true);

  const update = (i: number, patch: Partial<PlayerRow>) => {
    setPlayers(players.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const addBot = () => {
    if (players.length >= 4) return;
    const name = BOT_NAMES.find((n) => !players.some((p) => p.name === n)) ?? 'Ragnhild';
    setPlayers([...players, { name, isBot: true, botLevel: 'normale' }]);
  };

  const removeAt = (i: number) => {
    if (players.length <= 2) return;
    setPlayers(players.filter((_, idx) => idx !== i));
  };

  const humanCount = players.filter((p) => !p.isBot).length;

  const start = () => {
    onStart({
      seed: seed.trim() || `vikiland-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      players: players.map((p, i) => ({
        name: p.name.trim() || `Vichingo ${i + 1}`,
        color: COLORS[i]!,
        isBot: p.isBot,
        botLevel: p.botLevel,
      })),
      avoidAdjacent68: avoid68,
      targetGloryPoints: 10,
    });
  };

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>{it.configuraPartita}</h2>
      <div className="setup-grid pixel-frame">
        {players.map((p, i) => (
          <div key={i} className="setup-player">
            <span
              className="player-chip"
              style={{ background: PLAYER_COLORS[COLORS[i]!].main }}
            />
            <input
              type="text"
              value={p.name}
              maxLength={12}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <button
              className="pxbtn pxbtn--ghost pxbtn--small"
              onClick={() => update(i, { isBot: !p.isBot })}
            >
              {p.isBot ? it.bot : it.umano}
            </button>
            {p.isBot && (
              <select
                value={p.botLevel}
                onChange={(e) => update(i, { botLevel: e.target.value as BotLevel })}
              >
                <option value="facile">{it.facile}</option>
                <option value="normale">{it.normale}</option>
              </select>
            )}
            {players.length > 2 && (
              <button className="pxbtn pxbtn--danger pxbtn--small" onClick={() => removeAt(i)}>
                X
              </button>
            )}
          </div>
        ))}
        {players.length < 4 && (
          <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={addBot}>
            {it.aggiungiGiocatore}
          </button>
        )}
        <div className="setup-player">
          <input
            type="text"
            placeholder={it.seedOpzionale}
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            style={{ width: 240 }}
          />
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={avoid68}
            onChange={(e) => setAvoid68(e.target.checked)}
          />
          {it.evita68}
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="pxbtn pxbtn--ghost" onClick={onBack}>
          {it.indietro}
        </button>
        <button className="pxbtn" onClick={start} disabled={humanCount === 0}>
          {it.via}
        </button>
        {humanCount === 0 && (
          <span style={{ fontSize: 9, color: 'var(--danger)' }}>{it.serveUnUmano}</span>
        )}
      </div>
    </div>
  );
}
