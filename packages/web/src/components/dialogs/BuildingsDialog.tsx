/**
 * Pannello «Costruzioni»: a colpo d'occhio quanti pezzi restano da costruire
 * (sentieri, villaggi, roccaforti). I conteggi vengono dalla vista pubblica del
 * giocatore: limite del pezzo meno quelli già piazzati. Il villaggio promosso a
 * roccaforte torna disponibile, quindi i numeri seguono sempre lo stato reale.
 */
import { PIECE_LIMITS, type PlayerView } from '@vikiland/engine';
import { it } from '../../i18n';
import { Dialog } from './Dialog';
import { spriteDataURL } from '../../render/sprites/bake';
import { VILLAGGIO } from '../../render/sprites/defs';
import { strongholdSkin } from '../../render/sprites/cosmetics';
import { shadesFor } from '../../render/sprites/palettes';

export function BuildingsDialog({ view, onClose }: { view: PlayerView; onClose: () => void }) {
  const me = view.me;
  if (!me) return null;
  const pub = view.players[me.id]!;
  const color = pub.color;
  const shades = shadesFor(color);

  const rows = [
    {
      key: 'sentiero',
      label: it.sentiero,
      used: pub.roads.length,
      total: PIECE_LIMITS.sentiero,
      icon: (
        <span className="build-road" style={{ background: shades.main, borderColor: shades.dark }} />
      ),
    },
    {
      key: 'villaggio',
      label: it.villaggio,
      used: pub.villages.length,
      total: PIECE_LIMITS.villaggio,
      icon: <img src={spriteDataURL('villaggio', VILLAGGIO, 3, color)} alt="" />,
    },
    {
      key: 'roccaforte',
      label: it.roccaforte,
      used: pub.strongholds.length,
      total: PIECE_LIMITS.roccaforte,
      // L'icona rispetta la skin dell'inventario del giocatore.
      icon: (
        <img
          src={spriteDataURL(
            `roccaforte-${strongholdSkin(pub.cosmetics?.stronghold).id}`,
            strongholdSkin(pub.cosmetics?.stronghold).def,
            3,
            color
          )}
          alt=""
        />
      ),
    },
  ];

  return (
    <Dialog title={it.costruzioni}>
      <div style={{ fontSize: 8, color: 'var(--ink-dim)', marginBottom: 6 }}>{it.costruzioniSub}</div>
      <div className="build-list">
        {rows.map((r) => {
          const left = Math.max(0, r.total - r.used);
          return (
            <div key={r.key} className="build-row">
              <span className="build-icon">{r.icon}</span>
              <span className="build-name">{r.label}</span>
              <span className="build-count">
                <b className={left === 0 ? 'build-zero' : ''}>{left}</b>
                <span className="build-sub">{it.disponibili}</span>
              </span>
              <span className="build-frac">
                {r.used}/{r.total}
              </span>
            </div>
          );
        })}
      </div>
      <div className="dialog-buttons">
        <button className="pxbtn pxbtn--ghost" onClick={onClose}>
          {it.chiudi}
        </button>
      </div>
    </Dialog>
  );
}
