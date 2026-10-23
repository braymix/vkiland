/** Scelta della modalità di «Vikings Around the World»: Assalto al castello oppure In viaggio. */
import { wt } from '../../i18n/world';

export type WorldMode = 'castello' | 'viaggio';

/** Id della mappa che «In viaggio» propone di default (poi si sceglie fra le mappe reali). */
export const DEFAULT_JOURNEY_MAP = 'mondo';
export const CASTLE_MAP_ID = 'castello';

export function modeOfMap(mapId: string): WorldMode {
  return mapId === CASTLE_MAP_ID ? 'castello' : 'viaggio';
}

interface Props {
  value: WorldMode;
  onChange: (mode: WorldMode) => void;
}

export function WorldModeSwitch({ value, onChange }: Props) {
  return (
    <div className="w-mode" role="radiogroup" aria-label={wt.modalitaMondo}>
      <button
        className={`pxbtn w-mode-btn${value === 'castello' ? ' pxbtn--active' : ' pxbtn--ghost'}`}
        role="radio"
        aria-checked={value === 'castello'}
        onClick={() => onChange('castello')}
      >
        <span className="w-mode-ico">🏰</span>
        <span className="w-mode-name">{wt.assaltoCastello}</span>
        <small>{wt.assaltoCastelloSub}</small>
      </button>
      <button
        className={`pxbtn w-mode-btn${value === 'viaggio' ? ' pxbtn--active' : ' pxbtn--ghost'}`}
        role="radio"
        aria-checked={value === 'viaggio'}
        onClick={() => onChange('viaggio')}
      >
        <span className="w-mode-ico">🧭</span>
        <span className="w-mode-name">{wt.inViaggio}</span>
        <small>{wt.inViaggioSub}</small>
      </button>
    </div>
  );
}
