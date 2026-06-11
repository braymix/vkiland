/** Traduzione degli eventi del motore in righe del diario di bordo. */
import type { GameEvent, ResourceCount } from '@vikiland/engine';
import { RESOURCES, totalResources } from '@vikiland/engine';
import { it, t } from '../i18n/it';

/** Basta il nome dei giocatori: lo soddisfano sia GameState sia PlayerView. */
export interface NamedPlayers {
  players: readonly { name: string }[];
}

function nameOf(state: NamedPlayers, pid: number): string {
  return state.players[pid]?.name ?? `Giocatore ${pid}`;
}

function listResources(rc: ResourceCount): string {
  const parts: string[] = [];
  for (const r of RESOURCES) {
    if (rc[r] > 0) parts.push(`${rc[r]}× ${it.risorsa[r]}`);
  }
  return parts.join(', ');
}

export function describeEvent(e: GameEvent, state: NamedPlayers): string | null {
  switch (e.type) {
    case 'turnoIniziato':
      return t(it.log.turnoIniziato, { n: e.turnNumber, nome: nameOf(state, e.player) });
    case 'dadiTirati':
      return t(it.log.dadiTirati, {
        nome: nameOf(state, e.player),
        d1: e.dice[0],
        d2: e.dice[1],
        tot: e.total,
      });
    case 'risorseProdotte':
      return e.gains
        .map((g) =>
          t(it.log.risorseProdotte, {
            nome: nameOf(state, g.player),
            risorse: listResources(g.resources),
          })
        )
        .join(' · ');
    case 'penuriaBanca':
      return t(it.log.penuriaBanca, { risorse: e.resources.map((r) => it.risorsa[r]).join(', ') });
    case 'risorseScartate':
      return t(it.log.risorseScartate, {
        nome: nameOf(state, e.player),
        n: e.resources ? totalResources(e.resources) : e.total,
      });
    case 'dragoMosso':
      return t(it.log.dragoMosso, { nome: nameOf(state, e.player) });
    case 'risorsaRubata':
      return e.resource
        ? t(it.log.risorsaRubataNota, {
            ladro: nameOf(state, e.thief),
            vittima: nameOf(state, e.victim),
            risorsa: it.risorsa[e.resource],
          })
        : t(it.log.risorsaRubata, {
            ladro: nameOf(state, e.thief),
            vittima: nameOf(state, e.victim),
          });
    case 'costruito':
      return t(it.log.costruito, { nome: nameOf(state, e.player), cosa: it[e.kind] });
    case 'cartaSagaComprata':
      return e.card
        ? t(it.log.cartaComprataNota, { nome: nameOf(state, e.player), carta: it.cartaSaga[e.card] })
        : t(it.log.cartaComprata, { nome: nameOf(state, e.player) });
    case 'cartaSagaGiocata':
      return t(it.log.cartaGiocata, { nome: nameOf(state, e.player), carta: it.cartaSaga[e.card] });
    case 'banchettoRiscosso':
      return t(it.log.banchetto, {
        nome: nameOf(state, e.player),
        r1: it.risorsa[e.resources[0]],
        r2: it.risorsa[e.resources[1]],
      });
    case 'tributoRiscosso':
      return t(it.log.tributo, {
        nome: nameOf(state, e.player),
        n: e.total,
        risorsa: it.risorsa[e.resource],
      });
    case 'scambioProposto':
      return t(it.log.scambioProposto, { nome: nameOf(state, e.offer.from) });
    case 'rispostaScambio':
      return t(it.log.rispostaScambio, {
        nome: nameOf(state, e.player),
        risposta: e.accepted ? it.log.accettaVerbo : it.log.rifiutaVerbo,
      });
    case 'scambioEseguito':
      if (e.kind === 'banca') {
        return t(it.log.scambioEseguitoBanca, {
          nome: nameOf(state, e.from),
          dai: listResources(e.give),
          ricevi: listResources(e.receive),
        });
      }
      return t(it.log.scambioEseguito, {
        a: nameOf(state, e.from),
        b: e.to !== null ? nameOf(state, e.to) : '?',
      });
    case 'scambioAnnullato':
      return it.log.scambioAnnullato;
    case 'grandeViaCambiata':
      return e.holder === null
        ? it.log.grandeViaNessuno
        : t(it.log.grandeVia, { nome: nameOf(state, e.holder), n: e.length });
    case 'furiaBerserkerCambiata':
      return e.holder === null
        ? null
        : t(it.log.furia, { nome: nameOf(state, e.holder), n: e.count });
    case 'vittoria': {
      const b = e.breakdown.find((x) => x.player === e.winner);
      return t(it.log.vittoria, { nome: nameOf(state, e.winner), n: b?.totale ?? 0 });
    }
    default:
      return null;
  }
}
