/**
 * MISSIONI: una «bacheca» di partite casuali da vincere contro i bot. Ogni
 * missione ha una RARITÀ — facile (comune, frequente) o normale (non comune,
 * più rara e con bot più forti) — che determina la difficoltà e la ricompensa:
 * vincendo una facile si apre SUBITO 1 cassa, vincendo una normale se ne aprono
 * 2 (frammenti istantanei, come la cassa gratuita del Negozio). La bacheca si
 * rigenera dopo un tempo casuale (più breve durante lo sconto). Come tutto il
 * resto funziona SEMPRE, anche senza account: la progressione vive sul
 * dispositivo e, con una sessione online, segue l'account ovunque.
 */
import { useEffect, useRef, useState } from 'react';
import {
  CHEST_DISCOUNT_ACTIVE,
  FRAGMENTS_PER_HERO,
  MISSION_REWARD_CHESTS,
  heroDef,
  missionsRefreshRemainingMs,
  type BotLevel,
  type HeroId,
  type Mission,
  type PlayerProgression,
} from '@vikiland/engine';
import { it } from '../i18n';
import { inv } from '../i18n/inventory';
import { loadSession } from '../online/connection';
import { loadMissionsAndSave, completeMissionAndSave } from '../game/progression';
import { HeroArt } from '../components/HeroArt';
import { Dialog } from '../components/dialogs/Dialog';

/**
 * Missione appena giocata, da risolvere al rientro sulla bacheca: se vinta, qui
 * si completa (apre le casse-ricompensa e le persiste) e si mostra l'esito.
 */
export interface PendingMission {
  missionId: string;
  won: boolean;
}

/** Esito mostrato dopo una missione: vittoria (con ricompense) o sconfitta. */
interface MissionOutcome {
  won: boolean;
  rewards: {
    heroId: HeroId;
    fragments: number;
    unlockedNow: boolean;
    wasted: boolean;
  }[];
}

/** Etichetta del livello bot nella lingua attiva. */
const botLevelLabel = (l: BotLevel): string =>
  l === 'facile' ? it.facile : l === 'normale' ? it.normale : l === 'difficile' ? it.difficile : it.esperto;

/** Millisecondi → «H:MM:SS» per il conto alla rovescia del refresh. */
function fmtRemaining(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Etichetta breve della modalità extra attiva (se c'è). */
function missionModeLabel(mission: Mission): string | null {
  if (mission.calamities) return inv.modoCalamita;
  if (mission.battle) return inv.modoBattaglia;
  if (mission.capitale) return inv.modoCapitale;
  return null;
}

/** Una missione sulla bacheca: rarità, difficoltà, ricompensa e «Gioca». */
function MissionCard({ mission, onPlay }: { mission: Mission; onPlay: () => void }) {
  const facile = mission.rarity === 'facile';
  const reward = MISSION_REWARD_CHESTS[mission.rarity];
  const modeLabel = missionModeLabel(mission);
  return (
    <div className={`mission-card ${mission.completed ? 'mission-card--done' : ''}`}>
      <div className="mission-card-head">
        <span
          className="mission-rarity"
          style={{ color: facile ? '#9aa0a6' : '#3fa34d' }}
        >
          {facile ? inv.missioneFacile : inv.missioneNormale}
        </span>
        <span className="mission-reward" title={inv.missioneRicompensa(reward)}>
          {'📦'.repeat(reward)}
        </span>
      </div>
      <div className="mission-card-meta">
        <span>{inv.missioneDifficolta(botLevelLabel(mission.botLevel))}</span>
        <span>{inv.missioneRicompensa(reward)}</span>
        {modeLabel && <span>{inv.missioneModo(modeLabel)}</span>}
      </div>
      {mission.completed ? (
        <div className="mission-done">{inv.missioneCompletata}</div>
      ) : (
        <button className="pxbtn pxbtn--small" onClick={onPlay}>
          ▶ {inv.missioneGioca}
        </button>
      )}
    </div>
  );
}

export function MissionsScreen({
  onBack,
  onStartMission,
  pending,
}: {
  onBack: () => void;
  onStartMission: (mission: Mission) => void;
  /** Missione appena giocata da risolvere all'apertura (vinta → apre le casse). */
  pending?: PendingMission | null;
}) {
  const [prog, setProg] = useState<PlayerProgression | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [outcome, setOutcome] = useState<MissionOutcome | null>(null);
  // Evita di rigenerare la bacheca più volte allo stesso scadere del timer.
  const reloadingRef = useRef(false);

  const refresh = () => {
    void loadMissionsAndSave(loadSession())
      .then(setProg)
      .catch(() => setProg({}));
  };

  // All'apertura: risolve la missione appena giocata (se c'è), poi carica/rigenera
  // la bacheca. Vinta → completa e apre subito le casse; persa → solo l'avviso.
  useEffect(() => {
    const existing = loadSession();
    const run = async () => {
      if (pending?.won) {
        const res = await completeMissionAndSave(existing, pending.missionId);
        if (res) {
          setOutcome({
            won: true,
            rewards: res.rewards.map((r) => ({
              heroId: r.heroId,
              fragments: r.fragments,
              unlockedNow: r.unlockedNow,
              wasted: r.wasted,
            })),
          });
          setProg(res.progression);
          return;
        }
        // Già completata altrove: nessuna doppia ricompensa, carica normalmente.
      } else if (pending && !pending.won) {
        setOutcome({ won: false, rewards: [] });
      }
      const p = await loadMissionsAndSave(existing);
      setProg(p);
    };
    void run().catch(() => setProg({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Orologio per il conto alla rovescia (aggiorna ogni secondo).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Alla scadenza della bacheca: rigenera (una volta sola per scadenza).
  const board = prog?.missions ?? null;
  const remaining = board ? missionsRefreshRemainingMs(board, now) : 0;
  useEffect(() => {
    if (board && remaining <= 0 && !reloadingRef.current) {
      reloadingRef.current = true;
      refresh();
    }
    if (remaining > 0) reloadingRef.current = false;
  }, [remaining, board]);

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>🗺️ {inv.missioniTitolo}</h2>
      <div className="menu-sub" style={{ fontSize: 9 }}>
        {inv.missioniSottotitolo}
      </div>

      {!prog && <div style={{ fontSize: 9, color: 'var(--ink-dim)' }}>{it.connessioneInCorso}</div>}

      {prog && board && (
        <div className="setup-grid pixel-frame" style={{ maxWidth: 460 }}>
          <div className="inv-info">{inv.missioniInfo}</div>
          <div className="inv-info">{inv.missioniComeSi}</div>
          {CHEST_DISCOUNT_ACTIVE && <div className="inv-discount">{inv.missioniScontoRefresh}</div>}
          <div className="mission-grid">
            {board.missions.map((m) => (
              <MissionCard key={m.id} mission={m} onPlay={() => onStartMission(m)} />
            ))}
          </div>
          <div className="mission-refresh">{inv.missioniRefresh(fmtRemaining(remaining))}</div>
        </div>
      )}

      <button className="pxbtn pxbtn--ghost" onClick={onBack}>
        {it.indietro}
      </button>

      {/* Esito della missione appena giocata: vittoria (con ricompense) o sconfitta. */}
      {outcome && (
        <Dialog title={outcome.won ? inv.missioneVittoriaTitolo : inv.missioneSconfittaTitolo}>
          {outcome.won ? (
            <>
              <div className="chest-open-body" style={{ textAlign: 'center', marginBottom: 8 }}>
                {inv.missioneVittoriaCorpo(outcome.rewards.length)}
              </div>
              <div className="mission-rewards">
                {outcome.rewards.map((r, i) => (
                  <div key={i} className="chest-open">
                    <HeroArt hero={r.heroId} size={48} emblem={heroDef(r.heroId)?.emblem} />
                    <div className="chest-open-name">{heroDef(r.heroId)?.name}</div>
                    <div className="chest-open-body">
                      {r.wasted
                        ? inv.notSprecato
                        : r.unlockedNow
                          ? inv.notSblocco(heroDef(r.heroId)?.name ?? '')
                          : inv.notProgresso(r.fragments, FRAGMENTS_PER_HERO)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="chest-open-body" style={{ textAlign: 'center' }}>
              {inv.missioneSconfittaCorpo}
            </div>
          )}
          <div className="dialog-buttons">
            <button className="pxbtn" onClick={() => setOutcome(null)}>
              {inv.chiudi}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
