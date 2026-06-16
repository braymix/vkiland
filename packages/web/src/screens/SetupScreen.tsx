/** Configurazione della partita: 2–4 giocatori, ognuno umano o bot (hot-seat). */
import { useState } from 'react';
import { DEFAULT_TARGET_GLORY, type BotLevel, type PlayerColor } from '@vikiland/engine';
import { it, t } from '../i18n';
import type { GameSetup } from '../game/LocalGameController';
import { PLAYER_COLORS } from '../render/sprites/palettes';

const COLORS: PlayerColor[] = ['rosso', 'blu', 'verde', 'giallo', 'viola'];
const BOT_NAMES = ['Astrid', 'Leif', 'Sigrid'];

interface PlayerRow {
  name: string;
  isBot: boolean;
  botLevel: BotLevel;
  color: PlayerColor;
}

interface Props {
  onStart: (setup: GameSetup) => void;
  onBack: () => void;
}

export function SetupScreen({ onStart, onBack }: Props) {
  const [players, setPlayers] = useState<PlayerRow[]>([
    { name: 'Bjorn', isBot: false, botLevel: 'normale', color: 'rosso' },
    { name: 'Astrid', isBot: true, botLevel: 'normale', color: 'blu' },
    { name: 'Leif', isBot: true, botLevel: 'facile', color: 'verde' },
  ]);
  const [seed, setSeed] = useState('');
  const [avoid68, setAvoid68] = useState(true);
  /** Sezione «Configurazione» espandibile (per ora: obiettivo di vittoria). */
  const [configOpen, setConfigOpen] = useState(false);
  const [targetPG, setTargetPG] = useState(DEFAULT_TARGET_GLORY);
  const bumpTarget = (delta: number) =>
    setTargetPG((n) => Math.max(5, Math.min(20, n + delta)));

  const update = (i: number, patch: Partial<PlayerRow>) => {
    setPlayers(players.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const addBot = () => {
    if (players.length >= 4) return;
    const name = BOT_NAMES.find((n) => !players.some((p) => p.name === n)) ?? 'Ragnhild';
    const color = COLORS.find((c) => !players.some((p) => p.color === c)) ?? 'giallo';
    setPlayers([...players, { name, isBot: true, botLevel: 'normale', color }]);
  };

  /** Riga col picker dei colori aperto (null = nessuno). */
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);

  /**
   * Scelta dal picker: se il colore è di un'altra riga, i due colori si
   * SCAMBIANO (mai duplicati; l'engine lo valida comunque).
   */
  const pickColor = (i: number, color: PlayerColor) => {
    const mine = players[i]!.color;
    setPlayers(
      players.map((p, idx) => {
        if (idx === i) return { ...p, color };
        if (p.color === color) return { ...p, color: mine };
        return p;
      })
    );
    setPickerOpen(null);
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
        color: p.color,
        isBot: p.isBot,
        botLevel: p.botLevel,
      })),
      avoidAdjacent68: avoid68,
      targetGloryPoints: targetPG,
    });
  };

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>{it.configuraPartita}</h2>
      <div className="setup-grid pixel-frame">
        {players.map((p, i) => (
          <div key={i}>
          <div className="setup-player">
            <button
              className="player-chip"
              style={{ background: PLAYER_COLORS[p.color].main, cursor: 'pointer' }}
              onClick={() => setPickerOpen(pickerOpen === i ? null : i)}
              title={it.cambiaColore}
              aria-label={it.cambiaColore}
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
                <option value="difficile">{it.difficile}</option>
                <option value="esperto">{it.esperto}</option>
              </select>
            )}
            {players.length > 2 && (
              <button className="pxbtn pxbtn--danger pxbtn--small" onClick={() => removeAt(i)}>
                X
              </button>
            )}
          </div>
          {pickerOpen === i && (
            <div className="color-picker">
              {COLORS.map((c) => {
                const owner = players.findIndex((q, qi) => qi !== i && q.color === c);
                return (
                  <button
                    key={c}
                    className={`color-swatch ${p.color === c ? 'color-swatch--active' : ''}`}
                    style={{ background: PLAYER_COLORS[c].main }}
                    title={
                      owner >= 0
                        ? t(it.scambiaColoreCon, { nome: players[owner]!.name })
                        : it.nomeColore[c]
                    }
                    onClick={() => pickColor(i, c)}
                  >
                    {owner >= 0 ? players[owner]!.name.charAt(0).toUpperCase() : ''}
                  </button>
                );
              })}
            </div>
          )}
          </div>
        ))}
        {players.length < 4 && (
          <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={addBot}>
            {it.aggiungiGiocatore}
          </button>
        )}
        <button
          className="pxbtn pxbtn--ghost pxbtn--small"
          onClick={() => setConfigOpen(!configOpen)}
          aria-expanded={configOpen}
        >
          {configOpen ? '▾' : '▸'} {it.configurazione}
        </button>
        {configOpen && (
          <div className="config-section">
            <div className="stepper-row">
              <span style={{ fontSize: 9 }}>
                {it.puntiVittoria}{' '}
                <span style={{ color: 'var(--ink-dim)', fontSize: 8 }}>
                  {t(it.standardN, { n: DEFAULT_TARGET_GLORY })}
                </span>
              </span>
              <span className="stepper">
                <button
                  className="pxbtn pxbtn--ghost pxbtn--small"
                  onClick={() => bumpTarget(-1)}
                  disabled={targetPG <= 5}
                >
                  -
                </button>
                <span
                  style={{
                    minWidth: 26,
                    textAlign: 'center',
                    color: targetPG === DEFAULT_TARGET_GLORY ? 'inherit' : 'var(--accent)',
                  }}
                >
                  {targetPG}
                </span>
                <button
                  className="pxbtn pxbtn--ghost pxbtn--small"
                  onClick={() => bumpTarget(+1)}
                  disabled={targetPG >= 20}
                >
                  +
                </button>
              </span>
            </div>
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
        )}
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
