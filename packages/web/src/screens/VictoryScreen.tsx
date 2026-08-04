/** Schermata di vittoria: coriandoli, vincitore in GRANDE e classifica. */
import { useMemo, useState } from 'react';
import {
  getPlayerView,
  scoreBreakdown,
  isTeamMode,
  distinctTeams,
  type GameState,
} from '@vikiland/engine';
import { it, t } from '../i18n';
import { shadesFor } from '../render/sprites/palettes';
import { ConfettiCanvas } from '../components/ConfettiCanvas';
import { UiIcon } from '../components/icons';
import { FullscreenMap } from '../components/FullscreenMap';
import { StatsScreen } from './StatsScreen';
import type { GameStats } from '../game/stats';

interface Props {
  state: GameState;
  stats: GameStats;
  onExit: () => void;
  /** null = rivincita non disponibile (partite online). */
  onRematch: (() => void) | null;
}

export function VictoryScreen({ state, stats, onExit, onRematch }: Props) {
  const [panel, setPanel] = useState<'map' | 'stats' | null>(null);
  // Vista da spettatore: a partita finita mostra TUTTO (villaggi, strade, Drago).
  const spectatorView = useMemo(() => getPlayerView(state, 'spettatore'), [state]);
  if (state.phase.type !== 'gameOver') return null;

  const teams = state.config.teams;
  const teamMode = isTeamMode(teams);
  const teamColors = state.config.teamColors ?? [];
  const teamLabel = (idx: number): string =>
    t(it.squadra.squadraN, { n: String.fromCharCode(65 + idx) });

  // Modalità squadra: a VINCERE è la SQUADRA, non la persona che ha piazzato
  // l'ultimo pezzo. Aggreghiamo i punteggi dei compagni così «La Grande Via» e
  // «La Furia» compaiono a livello di squadra (le tiene un solo rappresentante,
  // quindi la somma dei bonus dei membri = il bonus della squadra).
  const winnerTeamIdx = teamMode ? teams![state.phase.winner]! : 0;
  const winnerName = teamMode ? teamLabel(winnerTeamIdx) : state.players[state.phase.winner]!.name;
  const winnerColors = shadesFor(
    teamMode ? teamColors[winnerTeamIdx] ?? '#888' : state.players[state.phase.winner]!.color
  );

  const playerRows = state.players
    .map((p) => scoreBreakdown(state, p.id))
    .sort((a, b) => b.totale - a.totale);

  // Righe di squadra: una per squadra, con i totali COMBINATI dei membri.
  const teamRows = teamMode
    ? distinctTeams(teams!)
        .map((teamIdx) => {
          const members = state.players.filter((p) => teams![p.id] === teamIdx);
          const parts = members.map((p) => scoreBreakdown(state, p.id));
          const sum = (pick: (b: (typeof parts)[number]) => number) =>
            parts.reduce((acc, b) => acc + pick(b), 0);
          return {
            teamIdx,
            names: members.map((p) => p.name).join(', '),
            villaggi: sum((b) => b.villaggi),
            roccaforti: sum((b) => b.roccaforti),
            grandeVia: sum((b) => b.grandeVia),
            furia: sum((b) => b.furia),
            eroiNascosti: sum((b) => b.eroiNascosti),
            totale: sum((b) => b.totale),
          };
        })
        .sort((a, b) => b.totale - a.totale)
    : [];

  // Coriandoli nei colori dei clan in partita + oro e bianco.
  const confettiColors = [
    ...state.players.map((p) => shadesFor(p.color).main),
    '#e7b94c',
    '#f0e9d6',
  ];

  return (
    <>
    <div className="dialog-backdrop victory-backdrop">
      <ConfettiCanvas colors={confettiColors} />
      <div className="victory-stage">
        <div className="victory-hero">
          <div className="victory-stars">
            <UiIcon kind="stella" scale={4} />
            <UiIcon kind="stella" scale={6} />
            <UiIcon kind="stella" scale={4} />
          </div>
          <div className="victory-name" style={{ color: winnerColors.light }}>
            {winnerName}
          </div>
          <div className="victory-sub">{it.vittoriaSub}</div>
        </div>

        <div className="dialog pixel-frame victory-card" style={{ maxWidth: 600 }}>
          <div style={{ fontSize: 9, color: 'var(--ink-dim)', textAlign: 'center' }}>
            {it.dettaglioPunti}
          </div>
          <div className="victory-table-wrap">
          <table className="victory-table">
            <thead>
              <tr>
                <th></th>
                <th>{it.villaggi}</th>
                <th>{it.roccaforti}</th>
                <th>{it.bonusGrandeVia}</th>
                <th>{it.bonusFuria}</th>
                <th>{it.eroiNascosti}</th>
                <th>{it.totale}</th>
              </tr>
            </thead>
            <tbody>
              {teamMode
                ? teamRows.map((b) => (
                    <tr key={`team-${b.teamIdx}`}>
                      <td style={{ textAlign: 'left' }}>
                        <span
                          className="player-chip"
                          style={{
                            background: shadesFor(teamColors[b.teamIdx] ?? '#888').main,
                            display: 'inline-block',
                            marginRight: 6,
                          }}
                        />
                        <b>{teamLabel(b.teamIdx)}</b>
                        <span style={{ color: 'var(--ink-dim)' }}> — {b.names}</span>
                      </td>
                      <td>{b.villaggi}</td>
                      <td>{b.roccaforti}</td>
                      <td>{b.grandeVia || '–'}</td>
                      <td>{b.furia || '–'}</td>
                      <td>{b.eroiNascosti || '–'}</td>
                      <td>
                        <b>{b.totale}</b>
                      </td>
                    </tr>
                  ))
                : playerRows.map((b) => {
                    const p = state.players[b.player]!;
                    return (
                      <tr key={b.player}>
                        <td style={{ textAlign: 'left' }}>
                          <span
                            className="player-chip"
                            style={{
                              background: shadesFor(p.color).main,
                              display: 'inline-block',
                              marginRight: 6,
                            }}
                          />
                          {p.name}
                        </td>
                        <td>{b.villaggi}</td>
                        <td>{b.roccaforti}</td>
                        <td>{b.grandeVia || '–'}</td>
                        <td>{b.furia || '–'}</td>
                        <td>{b.eroiNascosti || '–'}</td>
                        <td>
                          <b>{b.totale}</b>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          </div>
          <div className="dialog-buttons victory-extra-buttons">
            <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => setPanel('map')}>
              {it.vediMappaFinale}
            </button>
            <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={() => setPanel('stats')}>
              {it.vediStatistiche}
            </button>
          </div>
          <div className="dialog-buttons" style={{ justifyContent: 'center' }}>
            <button className="pxbtn pxbtn--ghost" onClick={onExit}>
              {it.tornaAlMenu}
            </button>
            {onRematch && (
              <button className="pxbtn" onClick={onRematch}>
                {it.rivincita}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    {panel === 'map' && (
      <FullscreenMap view={spectatorView} targets={{}} onClose={() => setPanel(null)} />
    )}
    {panel === 'stats' && (
      <StatsScreen state={state} stats={stats} onClose={() => setPanel(null)} />
    )}
    </>
  );
}
