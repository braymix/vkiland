/** Bugiardino: costi di costruzione, Punti Gloria, bonus e regole rapide. */
import {
  BONUS_GLORY,
  BUILD_COSTS,
  FURIA_MIN,
  GRANDE_VIA_MIN,
  HAND_LIMIT,
  PIECE_LIMITS,
  flattenResources,
  type Buildable,
} from '@vikiland/engine';
import { it, t } from '../../i18n/it';
import { ResIcon, UiIcon } from '../icons';
import { Dialog } from './Dialog';

interface RowDef {
  kind: Buildable;
  label: string;
  glory: number;
  max: number | null;
}

const ROWS: RowDef[] = [
  { kind: 'sentiero', label: it.sentiero, glory: 0, max: PIECE_LIMITS.sentiero },
  { kind: 'villaggio', label: it.villaggio, glory: 1, max: PIECE_LIMITS.villaggio },
  { kind: 'roccaforte', label: it.roccaforte, glory: 2, max: PIECE_LIMITS.roccaforte },
  { kind: 'cartaSaga', label: it.compraCarta, glory: 0, max: null },
];

function CostIcons({ kind }: { kind: Buildable }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {flattenResources(BUILD_COSTS[kind]).map((r, i) => (
        <ResIcon key={i} r={r} scale={2} />
      ))}
    </span>
  );
}

function GloryChip({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <UiIcon kind="stella" /> <b>{n}</b> {it.puntiGloriaAbbr}
    </span>
  );
}

export function CostsDialog({
  targetGloryPoints,
  onClose,
}: {
  targetGloryPoints: number;
  onClose: () => void;
}) {
  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto',
    gap: 8,
    alignItems: 'center',
    fontSize: 9,
  };
  const dimStyle: React.CSSProperties = { fontSize: 8, color: 'var(--ink-dim)' };
  return (
    <Dialog title={it.bugiardinoTitolo}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ROWS.map((row) => (
          <div key={row.kind} style={rowStyle}>
            <span>
              {row.label}
              {row.max !== null && (
                <span style={dimStyle}> · {t(it.pezziMax, { n: row.max })}</span>
              )}
            </span>
            <CostIcons kind={row.kind} />
            <GloryChip n={row.glory} />
          </div>
        ))}

        <hr style={{ border: 'none', borderTop: '2px solid var(--ink-dim)', opacity: 0.4 }} />

        <div style={rowStyle}>
          <span>
            {it.bonusGrandeVia}
            <span style={dimStyle}> · {t(it.bonusRequisitoVia, { n: GRANDE_VIA_MIN })}</span>
          </span>
          <span />
          <GloryChip n={BONUS_GLORY} />
        </div>
        <div style={rowStyle}>
          <span>
            {it.bonusFuria}
            <span style={dimStyle}> · {t(it.bonusRequisitoFuria, { n: FURIA_MIN })}</span>
          </span>
          <span />
          <GloryChip n={BONUS_GLORY} />
        </div>
        <div style={rowStyle}>
          <span>
            {it.cartaSaga.sagaDegliEroi}
            <span style={dimStyle}> · {it.eroeSegretoRiga}</span>
          </span>
          <span />
          <GloryChip n={1} />
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid var(--ink-dim)', opacity: 0.4 }} />

        <div style={dimStyle}>{it.scambiRiga}</div>
        <div style={dimStyle}>{t(it.setteRiga, { n: HAND_LIMIT })}</div>
        <div style={dimStyle}>{t(it.obiettivoRiga, { n: targetGloryPoints })}</div>
      </div>
      <div className="dialog-buttons">
        <button className="pxbtn" onClick={onClose}>
          {it.chiudi}
        </button>
      </div>
    </Dialog>
  );
}
