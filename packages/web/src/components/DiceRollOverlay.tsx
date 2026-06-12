/**
 * Popup a tutto schermo del tiro di dadi: il totale compare grande al centro
 * e svanisce da solo. Il 7 è «grave»: rosso, tremolante, con l'avviso del
 * Drago che si sveglia. L'overlay non cattura i click (pointer-events: none),
 * così il dialogo di scarto che il 7 apre sotto resta subito usabile.
 */
import { useEffect, useRef, useState } from 'react';
import { it } from '../i18n/it';
import type { GameSnapshot } from '../game/controller';

type Roll = NonNullable<GameSnapshot['lastRoll']>;

/** Durate accordate con le animazioni CSS (rollOverlayFade / rollOverlayFadeGrave). */
const SHOW_MS = 1300;
const SHOW_GRAVE_MS = 1900;

export function DiceRollOverlay({ roll }: { roll: GameSnapshot['lastRoll'] }) {
  const [shown, setShown] = useState<Roll | null>(null);
  // I tiri avvenuti PRIMA del mount (es. riconnessione online) non si rianimano.
  const lastShownId = useRef(roll?.id ?? 0);

  useEffect(() => {
    if (!roll || roll.id === lastShownId.current) return;
    lastShownId.current = roll.id;
    setShown(roll);
    const timer = setTimeout(
      () => setShown(null),
      roll.total === 7 ? SHOW_GRAVE_MS : SHOW_MS
    );
    return () => clearTimeout(timer);
  }, [roll]);

  if (!shown) return null;
  const grave = shown.total === 7;
  return (
    <div
      // key = id: un nuovo tiro con lo stesso totale fa comunque ripartire l'animazione.
      key={shown.id}
      className={'roll-overlay' + (grave ? ' roll-overlay--grave' : '')}
      aria-hidden="true"
      data-testid="roll-overlay"
      data-total={shown.total}
    >
      <div className="roll-pop">
        <div className="roll-dice">
          {shown.dice[0]} + {shown.dice[1]}
        </div>
        <div className="roll-total">{shown.total}</div>
        {grave && <div className="roll-grave-label">{it.setteGrave}</div>}
      </div>
    </div>
  );
}
