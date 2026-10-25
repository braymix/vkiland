/**
 * Barra del TAVOLO: sostituisce la SpectatorBar quando lo schermo è il tablet
 * in mezzo al tavolo. Niente mani né azioni: di chi è il turno, l'ultimo tiro
 * in grande, gli ultimi numeri usciti e quante volte è uscito ciascun numero.
 */
import type { PlayerView } from '@vikiland/engine';
import { tav } from '../i18n/table';
import { shadesFor } from '../render/sprites/palettes';

/** Quanti tiri recenti mostrare nella striscia. */
const RECENT = 12;
const TOTALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface Props {
  view: PlayerView;
  /** Totali di tutti i tiri della partita, in ordine (dal server). */
  rollHistory: number[];
}

export function TableBar({ view, rollHistory }: Props) {
  const current = view.players[view.currentPlayer];
  const inSetup = view.phase.type === 'setup';
  const last = rollHistory.at(-1) ?? null;
  // I due dadi sono noti solo per il tiro del turno in corso.
  const dice = view.rolledThisTurn ? view.dice : null;
  const recent = rollHistory.slice(-RECENT).reverse();
  const counts = TOTALS.map((n) => rollHistory.filter((r) => r === n).length);
  const max = Math.max(1, ...counts);

  return (
    <div className="area-hand pixel-frame table-bar">
      {current && (
        <div className="table-turn">
          <span className="player-chip" style={{ background: shadesFor(current.color).main }} />
          <span>{inSetup ? tav.setup : tav.turnoDi(current.name)}</span>
        </div>
      )}

      <div className="table-last">
        <div className="table-label">{tav.ultimoTiro}</div>
        {last === null ? (
          <div className="table-empty">{tav.nessunTiro}</div>
        ) : (
          <>
            <div className={`table-last-total${last === 7 ? ' table-last-total--seven' : ''}`}>{last}</div>
            {dice && (
              <div className="table-last-dice">
                {dice[0]} + {dice[1]}
              </div>
            )}
          </>
        )}
      </div>

      {recent.length > 0 && (
        <div className="table-recent" aria-label={tav.numeriUsciti}>
          {recent.map((n, i) => (
            <span
              key={rollHistory.length - i}
              className={`table-chip${n === 7 ? ' table-chip--seven' : ''}${i === 0 ? ' table-chip--latest' : ''}`}
            >
              {n}
            </span>
          ))}
        </div>
      )}

      <div className="table-label">
        {tav.numeriUsciti} · {tav.tiriN(rollHistory.length)}
      </div>
      <div className="table-histo">
        {TOTALS.map((n, i) => (
          <div key={n} className="table-histo-col">
            <span className="table-histo-count">{counts[i]}</span>
            <div
              className={`table-histo-bar${n === 7 ? ' table-histo-bar--seven' : ''}${n === last ? ' table-histo-bar--last' : ''}`}
              style={{ height: `${(counts[i]! / max) * 100}%` }}
            />
            <span className="table-histo-n">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
