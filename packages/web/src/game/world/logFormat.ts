/** Eventi di «Vikings Around the World» → righe di diario nella lingua attiva. */
import type { FrozenMap, WorldEvent, WorldResource } from '@vikiland/engine-world';
import { fmt, wt } from '../../i18n/world';

export interface LogContext {
  playerName: (id: number) => string;
  map: FrozenMap;
}

export const resName = (r: WorldResource): string => wt[r];

function terr(ctx: LogContext, id: string): string {
  return ctx.map.territories.find((t) => t.id === id)?.name ?? id;
}

function linkName(ctx: LogContext, id: string): string {
  const l = ctx.map.links.find((x) => x.id === id);
  return l ? `${terr(ctx, l.a)}–${terr(ctx, l.b)}` : id;
}

const buildingName = (what: string): string => (wt as unknown as Record<string, string>)[what] ?? what;

export function formatWorldEvent(e: WorldEvent, ctx: LogContext): string | null {
  const P = ctx.playerName;
  switch (e.type) {
    case 'turnoIniziato':
      return fmt(wt.logTurno, { n: e.turnNumber, nome: P(e.player) });
    case 'dadi':
      return fmt(wt.logDadi, { nome: P(e.player), n: e.total });
    case 'costruito':
      return fmt(wt.logCostruisce, {
        nome: P(e.player),
        cosa: buildingName(e.what),
        dove: e.what === 'strada' ? linkName(ctx, e.at) : terr(ctx, e.at),
      });
    case 'produzione': {
      // Una riga per giocatore/materiale (il bottino del tiro).
      const parts = e.gains.map((g) =>
        fmt(wt.logProduzione, { nome: P(g.player), n: g.amount, cosa: resName(g.resource), dove: terr(ctx, g.territory) })
      );
      return parts.join(' · ');
    }
    case 'tassaDelRe':
      return wt.logTassa;
    case 'scartato':
      return fmt(wt.logScarto, { nome: P(e.player), n: e.count });
    case 'rubato':
      return fmt(wt.logRazzia, { nome: P(e.player), altro: P(e.target) });
    case 'mosso':
      return fmt(wt.logMuove, { nome: P(e.player), dove: terr(ctx, e.to) });
    case 'pedaggio':
      return fmt(wt.logPedaggio, { nome: P(e.payer), altro: P(e.payee), dove: terr(ctx, e.territory) });
    case 'scambioBanca':
      return fmt(wt.logBanca, {
        nome: P(e.player),
        a: e.giveCount,
        x: resName(e.give),
        b: e.receiveCount,
        y: resName(e.receive),
      });
    case 'scambioConcluso':
      return fmt(wt.logScambio, { nome: P(e.offer.from), altro: P(e.with) });
    case 'grandeVia':
      return e.holder === null ? null : fmt(wt.logGrandeVia, { nome: P(e.holder), n: e.length });
    case 'grandeViaggiatore':
      return e.holder === null ? null : fmt(wt.logViaggiatore, { nome: P(e.holder), n: e.continents });
    case 'vittoria':
      return fmt(wt.logVittoria, { nome: P(e.player) });
    case 'setupFinito':
      return wt.logSetupFinito;
    default:
      return null;
  }
}
