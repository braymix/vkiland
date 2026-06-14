/**
 * Cruscotto delle statistiche di fine partita: istogramma dei numeri usciti
 * (atteso vs reale), confronto tra i clan su più metriche e «albo dei primati».
 * Tutto disegnato con DOM in stile pixel: nessuna libreria di grafici.
 */
import { useEffect } from 'react';
import type { GameState, PlayerState } from '@vikiland/engine';
import { it, t } from '../i18n/it';
import { PLAYER_COLORS } from '../render/sprites/palettes';
import type { GameStats } from '../game/stats';

interface Props {
  state: GameState;
  stats: GameStats;
  onClose: () => void;
}

/** Combinazioni su 36 per ciascun totale di due dadi (indice = totale 2..12). */
const DICE_WAYS = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];

export function StatsScreen({ state, stats, onClose }: Props) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const players = state.players;
  const st = (id: number) => stats.perPlayer[id]!;

  // --- Istogramma dei dadi: scala condivisa tra barre reali e ticche attese ---
  const counts = stats.diceCounts;
  const expected = DICE_WAYS.map((w) => (stats.totalRolls * w) / 36);
  const scaleMax = Math.max(1, ...counts.slice(2, 13), ...expected.slice(2, 13));
  const luckyTotal = bestIndex(counts);

  // --- Valori per i confronti (indice = id giocatore) ---
  const vTrades = players.map((p) => st(p.id).bankTrades + st(p.id).playerTrades);
  const vBuilds = players.map((p) => st(p.id).roads + st(p.id).villages + st(p.id).strongholds);
  const vProduced = players.map((p) => st(p.id).resourcesProduced);
  const vSaga = players.map((p) => st(p.id).sagaBought);
  const vRob = players.map((p) => st(p.id).robberiesMade);

  return (
    <div className="stats-screen">
      <div className="stats-head">
        <h2>{it.statisticheTitolo}</h2>
        <button className="fullscreen-map-close" onClick={onClose} aria-label="Chiudi">
          ✕
        </button>
      </div>

      <div className="stats-body">
        {/* Cartoline riassuntive */}
        <div className="stats-cards">
          <Card big={luckyTotal === null ? '—' : String(luckyTotal)} label={it.statNumeroFortunato} />
          <Card big={String(stats.sevens)} label={it.statSetteUsciti} accent="danger" />
          <Card big={String(stats.dragonMoves)} label={it.statDragoMosso} />
          <Card big={String(stats.totalRolls)} label={it.statTiriDado} />
        </div>

        {/* Istogramma dei numeri usciti */}
        <section className="stats-section">
          <div className="stats-section-title">{it.statTiriDado}</div>
          <div className="stats-section-sub">
            {t(it.statTiriSub, { tiri: stats.totalRolls, turni: stats.turns })}
          </div>
          {stats.totalRolls === 0 ? (
            <div className="stats-empty">{it.statNessunTiro}</div>
          ) : (
            <>
              <div className="dice-chart">
                {range(2, 12).map((n) => {
                  const h = (counts[n]! / scaleMax) * 100;
                  const eh = (expected[n]! / scaleMax) * 100;
                  const hot = n === 6 || n === 8;
                  const cls =
                    'dice-bar' +
                    (n === 7 ? ' dice-bar--seven' : hot ? ' dice-bar--hot' : '') +
                    (n === luckyTotal ? ' dice-bar--lucky' : '');
                  return (
                    <div className="dice-col" key={n}>
                      <span className="dice-count">{counts[n]}</span>
                      <span className="dice-track">
                        <span className={cls} style={{ height: `${Math.max(h, counts[n]! > 0 ? 3 : 0)}%` }} />
                        <span className="dice-exp" style={{ bottom: `${eh}%` }} title={it.statLegendaAtteso} />
                      </span>
                      <span className="dice-num">{n}</span>
                    </div>
                  );
                })}
              </div>
              <div className="dice-legend">
                <span className="dice-legend-exp" /> {it.statLegendaAtteso}
              </div>
            </>
          )}
        </section>

        {/* Confronto tra clan */}
        <section className="stats-section">
          <div className="stats-section-title">{it.statConfronto}</div>
          <Compare label={it.statScambi} players={players} values={vTrades} />
          <Compare label={it.statCostruzioni} players={players} values={vBuilds} />
          <Compare label={it.statRisorseProdotte} players={players} values={vProduced} />
          <Compare label={it.statCarteSaga} players={players} values={vSaga} />
          <Compare label={it.statFurti} players={players} values={vRob} />
        </section>

        {/* Albo dei primati */}
        <section className="stats-section">
          <div className="stats-section-title">{it.statPrimati}</div>
          <div className="primati">
            <Primato title={it.statManiDoro} sub={it.statManiDoroSub} players={players} values={vProduced} />
            <Primato title={it.statMercante} sub={it.statMercanteSub} players={players} values={vTrades} />
            <Primato title={it.statCostruttore} sub={it.statCostruttoreSub} players={players} values={vBuilds} />
            <Primato title={it.statPredone} sub={it.statPredoneSub} players={players} values={vRob} />
            <Primato
              title={it.statSfortunato}
              sub={it.statSfortunatoSub}
              players={players}
              values={players.map((p) => st(p.id).discarded)}
            />
            <Primato
              title={it.statStratega}
              sub={it.statStrategaSub}
              players={players}
              values={players.map((p) => st(p.id).sagaPlayed)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({ big, label, accent }: { big: string; label: string; accent?: 'danger' }) {
  return (
    <div className="stat-card">
      <div className={'stat-card-big' + (accent === 'danger' ? ' stat-card-big--danger' : '')}>{big}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

function Compare({
  label,
  players,
  values,
}: {
  label: string;
  players: readonly PlayerState[];
  values: number[];
}) {
  const max = Math.max(1, ...values);
  return (
    <div className="cmp-group">
      <div className="cmp-label">{label}</div>
      {players.map((p) => (
        <div className="cmp-row" key={p.id}>
          <span className="cmp-name" style={{ color: PLAYER_COLORS[p.color].light }}>
            {p.name}
          </span>
          <span className="cmp-track">
            <span
              className="cmp-bar"
              style={{
                width: `${(values[p.id]! / max) * 100}%`,
                background: PLAYER_COLORS[p.color].main,
              }}
            />
          </span>
          <span className="cmp-val">{values[p.id]}</span>
        </div>
      ))}
    </div>
  );
}

function Primato({
  title,
  sub,
  players,
  values,
}: {
  title: string;
  sub: string;
  players: readonly PlayerState[];
  values: number[];
}) {
  const idx = bestPlayerIndex(values);
  const winner = idx === null ? null : players[idx]!;
  return (
    <div className="primato">
      <div className="primato-title">{title}</div>
      {winner ? (
        <div className="primato-name" style={{ color: PLAYER_COLORS[winner.color].light }}>
          <span className="player-chip" style={{ background: PLAYER_COLORS[winner.color].main }} />
          {winner.name} <b>({values[idx!]})</b>
        </div>
      ) : (
        <div className="primato-name primato-name--empty">{it.statNessuno}</div>
      )}
      <div className="primato-sub">{sub}</div>
    </div>
  );
}

// --- utilità ---

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

/** Indice (2..12) col conteggio più alto, o null se nessun tiro. */
function bestIndex(counts: number[]): number | null {
  let best = -1;
  let bestN: number | null = null;
  for (let n = 2; n <= 12; n++) {
    if (counts[n]! > best) {
      best = counts[n]!;
      bestN = n;
    }
  }
  return best > 0 ? bestN : null;
}

/** Indice del giocatore col valore massimo (>0), o null se tutti a zero/pari merito vuoto. */
function bestPlayerIndex(values: number[]): number | null {
  let best = 0;
  let idx: number | null = null;
  values.forEach((v, i) => {
    if (v > best) {
      best = v;
      idx = i;
    }
  });
  return idx;
}
