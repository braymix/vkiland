/**
 * MISSIONI del Mondo: speculare a `MissionsScreen` (Classica), ma le partite
 * si giocano su una mappa del Mondo con un punteggio bersaglio, invece delle
 * modalità extra (calamità/battaglia/capitale) che non esistono qui. Le
 * ricompense (casse istantanee) possono dare anche eroi rari/leggendari,
 * farmabili SOLO nel Mondo.
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
  type WorldMission,
  type WorldProgression,
} from '@vikiland/engine';
import { MAPS } from '@vikiland/engine-world';
import { it } from '../../i18n';
import { inv } from '../../i18n/inventory';
import { wt } from '../../i18n/world';
import { mapTitle } from '../../components/world/MapSelect';
import { loadSession } from '../../online/connection';
import { loadWorldMissionsAndSave, completeWorldMissionAndSave } from '../../game/progression';
import { HeroArt } from '../../components/HeroArt';
import { Dialog } from '../../components/dialogs/Dialog';

/** Missione del Mondo appena giocata, da risolvere al rientro sulla bacheca. */
export interface WorldPendingMission {
  missionId: string;
  won: boolean;
}

/** Esito mostrato dopo una missione: vittoria (con ricompense) o sconfitta. */
interface WorldMissionOutcome {
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

/** Una missione del Mondo sulla bacheca: rarità, mappa, obiettivo e «Gioca». */
function WorldMissionCard({ mission, onPlay }: { mission: WorldMission; onPlay: () => void }) {
  const facile = mission.rarity === 'facile';
  const reward = MISSION_REWARD_CHESTS[mission.rarity];
  const map = MAPS[mission.mapId];
  return (
    <div className="mission-card">
      <div className="mission-card-head">
        <span className="mission-rarity" style={{ color: facile ? '#9aa0a6' : '#3fa34d' }}>
          {facile ? inv.missioneFacile : inv.missioneNormale}
        </span>
        <span className="mission-reward" title={inv.missioneRicompensa(reward)}>
          {'📦'.repeat(reward)}
        </span>
      </div>
      <div className="mission-card-meta">
        <span>{inv.missioneDifficolta(botLevelLabel(mission.botLevel))}</span>
        <span>{inv.missioneRicompensa(reward)}</span>
        {map && <span>{wt.mappa}: {mapTitle(map)}</span>}
        <span>🏁 {mission.targetPoints} {wt.punti}</span>
      </div>
      <button className="pxbtn pxbtn--small" onClick={onPlay}>
        ▶ {inv.missioneGioca}
      </button>
    </div>
  );
}

export function WorldMissionsScreen({
  onBack,
  onStartMission,
  pending,
}: {
  onBack: () => void;
  onStartMission: (mission: WorldMission) => void;
  /** Missione appena giocata da risolvere all'apertura (vinta → apre le casse). */
  pending?: WorldPendingMission | null;
}) {
  const [prog, setProg] = useState<WorldProgression | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [outcome, setOutcome] = useState<WorldMissionOutcome | null>(null);
  const reloadingRef = useRef(false);

  const refresh = () => {
    void loadWorldMissionsAndSave(loadSession())
      .then(setProg)
      .catch(() => setProg({}));
  };

  useEffect(() => {
    const existing = loadSession();
    const run = async () => {
      if (pending?.won) {
        const res = await completeWorldMissionAndSave(existing, pending.missionId);
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
      } else if (pending && !pending.won) {
        setOutcome({ won: false, rewards: [] });
      }
      const p = await loadWorldMissionsAndSave(existing);
      setProg(p);
    };
    void run().catch(() => setProg({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
              <WorldMissionCard key={m.id} mission={m} onPlay={() => onStartMission(m)} />
            ))}
          </div>
          <div className="mission-refresh">{inv.missioniRefresh(fmtRemaining(remaining))}</div>
        </div>
      )}

      <button className="pxbtn pxbtn--ghost" onClick={onBack}>
        {it.indietro}
      </button>

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
