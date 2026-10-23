/** Scelta della mappa «a zoom»: raggruppata per scala (Mondo → Continente → Nazione → Città). */
import { MAPS, SCALE_ORDER, type MapDefinition } from '@vikiland/engine-world';
import { wt } from '../../i18n/world';

const SCALE_LABEL: Record<MapDefinition['scale'], () => string> = {
  mondo: () => '🌍 ' + wt.scalaMondo,
  continente: () => '🗺️ ' + wt.scalaContinente,
  nazione: () => '🏳️ ' + wt.scalaNazione,
  regione: () => '🏞️ ' + wt.scalaRegione,
  citta: () => '🏙️ ' + wt.scalaCitta,
};

export function mapTitle(def: MapDefinition): string {
  return def.id === 'mondo' ? wt.mappaMondo : def.name;
}

interface Props {
  value: string;
  onChange: (id: string) => void;
  /** Solo queste mappe (default: tutte). */
  only?: readonly string[];
}

export function MapSelect({ value, onChange, only }: Props) {
  const defs = Object.values(MAPS).filter((m) => !only || only.includes(m.id));
  return (
    <select className="w-input" value={value} onChange={(e) => onChange(e.target.value)}>
      {SCALE_ORDER.map((scale) => {
        const group = defs.filter((m) => m.scale === scale);
        if (group.length === 0) return null;
        return (
          <optgroup key={scale} label={SCALE_LABEL[scale]()}>
            {group.map((m) => (
              <option key={m.id} value={m.id}>
                {mapTitle(m)} · {m.territories.length} {wt.territori}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
