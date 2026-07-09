/** Schermata di partita: orchestrazione di tavola, pannelli e dialoghi. */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Action, EdgeId, HexId, VertexId } from '@vikiland/engine';
import { it, t } from '../i18n';
import type { GameController } from '../game/controller';
import { useGame } from '../game/useGame';
import { ActionBar, type BuildMode } from '../components/ActionBar';
import { BoardCanvas, type BoardTargets } from '../components/BoardCanvas';
import { CalamityBanner } from '../components/CalamityBanner';
import { CalamityRevealedModal } from '../components/CalamityRevealedModal';
import { GameLog } from '../components/GameLog';
import { HandPanel } from '../components/HandPanel';
import { HudTop } from '../components/HudTop';
import { BankTradeDialog } from '../components/dialogs/BankTradeDialog';
import { CalamityGainDialog } from '../components/dialogs/CalamityGainDialog';
import { CostsDialog } from '../components/dialogs/CostsDialog';
import { DiscardDialog } from '../components/dialogs/DiscardDialog';
import { SagaCardsDialog } from '../components/dialogs/SagaCardsDialog';
import { BuildingsDialog } from '../components/dialogs/BuildingsDialog';
import { StealDialog } from '../components/dialogs/StealDialog';
import {
  ManageTradeDialog,
  ProposeTradeDialog,
  RespondTradeDialog,
} from '../components/dialogs/TradeDialogs';
import { PassDeviceScreen } from './PassDeviceScreen';
import { DiceRollOverlay } from '../components/DiceRollOverlay';
import { FullscreenMap } from '../components/FullscreenMap';
import { ManageSheet, type ManageInfo } from '../components/ManageSheet';
import { TutorialScreen } from './TutorialScreen';
import { VictoryScreen } from './VictoryScreen';

interface Props {
  /** Factory del controller (locale od online): chiamata una sola volta. */
  makeController: () => GameController;
  onExit: () => void;
  /** null = rivincita non disponibile (partite online). */
  onRematch: (() => void) | null;
  /**
   * Contesto per il pannello «Gestione partita» (☰). Assente = pulsante e
   * pannello nascosti (nessuna gestione in-partita, es. demo).
   */
  manage?: ManageInfo | null;
}

export function GameScreen({ makeController, onExit, onRematch, manage = null }: Props) {
  const controllerRef = useRef<GameController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = makeController();
  }
  const controller = controllerRef.current;
  useEffect(() => () => controller.dispose(), [controller]);

  const snap = useGame(controller);
  const { view, legalActions, viewpoint, handoff } = snap;

  const [mode, setMode] = useState<BuildMode>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [buildingsOpen, setBuildingsOpen] = useState(false);
  const [costsOpen, setCostsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [openCalamityId, setOpenCalamityId] = useState<string | null>(null);
  const seenCalamityIds = useRef<Set<string>>(new Set());

  const isMyTurn = view.currentPlayer === viewpoint;

  // Al passaggio di mano si chiude ogni dialogo locale: il prossimo giocatore
  // riparte da uno schermo pulito.
  useEffect(() => {
    if (handoff !== null) {
      setMode(null);
      setBankOpen(false);
      setProposeOpen(false);
      setCardsOpen(false);
      setBuildingsOpen(false);
      setCostsOpen(false);
    }
  }, [handoff]);

  // Rileva quando una nuova calamità viene rivelata: mostra il modal full-screen UNA
  // SOLA VOLTA per carta. Il Set (non lo stato) traccia i "già visti": onClose non deve
  // ritriggerare questo effect, altrimenti riaprirebbe subito lo stesso popup appena chiuso.
  useEffect(() => {
    if (view.calamity) {
      const id = `${view.calamity.kind}-${view.calamitiesLeft}`;
      if (!seenCalamityIds.current.has(id)) {
        seenCalamityIds.current.add(id);
        setOpenCalamityId(id);
      }
    }
  }, [view.calamity, view.calamitiesLeft]);

  // Errori asincroni dal server (online): mostrati come quelli sincroni.
  const remoteError = snap.remoteError;
  useEffect(() => {
    if (!remoteError) return;
    setError(t(it.erroreMossa, { motivo: remoteError.message }));
    const timer = setTimeout(() => setError(null), 2500);
    return () => clearTimeout(timer);
  }, [remoteError]);

  const dispatch = (action: Action) => {
    const err = controller.dispatch(action);
    if (err) {
      setError(t(it.erroreMossa, { motivo: err.message }));
      setTimeout(() => setError(null), 2500);
    } else {
      setError(null);
      setMode(null);
      setBankOpen(false);
      setProposeOpen(false);
      setCardsOpen(false);
    }
  };

  // Bersagli evidenziati sulla tavola, derivati dalle mosse legali dell'umano.
  const targets = useMemo((): BoardTargets => {
    const vertices: VertexId[] = [];
    const attackVertices: VertexId[] = [];
    const edges: EdgeId[] = [];
    const hexes: HexId[] = [];
    for (const m of legalActions) {
      switch (m.type) {
        case 'piazzaVillaggioIniziale':
          vertices.push(m.vertex);
          break;
        case 'piazzaSentieroIniziale':
        case 'piazzaSentieroGratis':
          edges.push(m.edge);
          break;
        case 'muoviDrago':
          hexes.push(m.hex);
          break;
        case 'costruisciSentiero':
          if (mode === 'sentiero') edges.push(m.edge);
          break;
        case 'costruisciVillaggio':
          if (mode === 'villaggio') vertices.push(m.vertex);
          break;
        case 'costruisciRoccaforte':
          if (mode === 'roccaforte') vertices.push(m.vertex);
          break;
        case 'attaccaEdificio':
          if (mode === 'attacca') attackVertices.push(m.vertex);
          break;
        case 'giocaAssalto':
          if (mode === 'assalto') attackVertices.push(m.vertex);
          break;
      }
    }
    return { vertices, attackVertices, edges, hexes };
  }, [legalActions, mode]);

  const pickVertex = (v: VertexId) => {
    const m = legalActions.find(
      (a) =>
        ((a.type === 'piazzaVillaggioIniziale' ||
          (a.type === 'costruisciVillaggio' && mode === 'villaggio') ||
          (a.type === 'costruisciRoccaforte' && mode === 'roccaforte') ||
          (a.type === 'attaccaEdificio' && mode === 'attacca') ||
          (a.type === 'giocaAssalto' && mode === 'assalto')) &&
          'vertex' in a &&
          a.vertex === v)
    );
    if (m) dispatch(m as Action);
  };
  const pickEdge = (e: EdgeId) => {
    const m = legalActions.find(
      (a) =>
        (a.type === 'piazzaSentieroIniziale' ||
          a.type === 'piazzaSentieroGratis' ||
          (a.type === 'costruisciSentiero' && mode === 'sentiero')) &&
        a.edge === e
    );
    if (m) dispatch(m as Action);
  };
  const pickHex = (h: HexId) => {
    const m = legalActions.find((a) => a.type === 'muoviDrago' && a.hex === h);
    if (m) dispatch(m as Action);
  };

  // Dialoghi guidati dalla fase.
  // Lo scarto vale sia sul 7 sia quando lo impone una calamità (stessa azione).
  const mustDiscard =
    view.phase.type === 'discard' || view.phase.type === 'calamityDiscard'
      ? view.phase.mustDiscard[viewpoint]
      : undefined;
  // Guadagno "a scelta" di una calamità: la quota (già limitata alla banca) viene
  // dal descrittore di mossa legale del giocatore.
  const gainMove = legalActions.find((m) => m.type === 'guadagnaDescr');
  const gainAmount = gainMove && gainMove.type === 'guadagnaDescr' ? gainMove.amount : undefined;
  // Calamità "strade gratis": tocca a me piazzarle sulla mappa?
  const placingCalamityRoads =
    view.phase.type === 'calamityRoads' && view.phase.queue[0] === viewpoint;
  const stealing = view.phase.type === 'steal' && isMyTurn;
  const offer = view.pendingTrade;
  const offerToMe =
    offer !== null &&
    offer.from !== viewpoint &&
    (offer.to === null || offer.to === viewpoint) &&
    offer.responses[viewpoint] === undefined;
  const offerMine = offer !== null && offer.from === viewpoint && offer.to === null;
  const canAcceptOffer = legalActions.some((m) => m.type === 'rispondiScambio' && m.accept);

  const gameOver = snap.finalState !== null;

  return (
    <div className="screen">
      <div
        className={`game-layout${view.calamity ? ' game-layout--calamity' : ''}${
          manageOpen ? ' game-layout--dimmed' : ''
        }`}
      >
        <HudTop
          view={view}
          onOpenCosts={() => setCostsOpen(true)}
          onOpenMap={() => setMapFullscreen(true)}
          onOpenManage={manage ? () => setManageOpen(true) : undefined}
          turnDeadline={gameOver ? null : snap.turnDeadline}
        />
        {view.calamity && (
          <div className="area-banner" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <CalamityBanner view={view} />
            {placingCalamityRoads && (
              <div style={{ fontSize: 9, color: 'var(--accent)', textAlign: 'center' }}>
                {it.calamita.strade}
              </div>
            )}
          </div>
        )}
        <BoardCanvas
          view={view}
          targets={targets}
          onPickVertex={pickVertex}
          onPickEdge={pickEdge}
          onPickHex={pickHex}
        />
        <ActionBar
          view={view}
          legalActions={legalActions}
          isMyTurn={isMyTurn}
          mode={mode}
          setMode={setMode}
          onRoll={() => dispatch({ type: 'tiraDadi', player: viewpoint })}
          onEndTurn={() => dispatch({ type: 'fineTurno', player: viewpoint })}
          onBuyCard={() => dispatch({ type: 'compraCartaSaga', player: viewpoint })}
          onOpenBank={() => setBankOpen(true)}
          onOpenPropose={() => setProposeOpen(true)}
          onOpenCards={() => setCardsOpen(true)}
          canUndo={snap.canUndo}
          onUndo={() => {
            setMode(null);
            setError(null);
            controller.undo();
          }}
          errorText={error}
        />
        <HandPanel
          view={view}
          onOpenCards={() => setCardsOpen(true)}
          onOpenBuildings={() => setBuildingsOpen(true)}
        />
        <GameLog entries={snap.log} open={logOpen} onToggle={() => setLogOpen(!logOpen)} />
      </div>

      {openCalamityId !== null && view.calamity && view.calamitiesLeft !== null && (
        <CalamityRevealedModal
          card={view.calamity}
          remaining={view.calamitiesLeft}
          onClose={() => setOpenCalamityId(null)}
        />
      )}

      {mustDiscard !== undefined && (
        <DiscardDialog view={view} amount={mustDiscard} onSubmit={dispatch} />
      )}
      {gainAmount !== undefined && (
        <CalamityGainDialog view={view} amount={gainAmount} onSubmit={dispatch} />
      )}
      {stealing && view.phase.type === 'steal' && (
        <StealDialog view={view} candidates={view.phase.candidates} onSubmit={dispatch} />
      )}
      {offerToMe && (
        <RespondTradeDialog view={view} canAccept={canAcceptOffer} onSubmit={dispatch} />
      )}
      {offerMine && <ManageTradeDialog view={view} onSubmit={dispatch} />}
      {bankOpen && (
        <BankTradeDialog view={view} onSubmit={dispatch} onClose={() => setBankOpen(false)} />
      )}
      {proposeOpen && (
        <ProposeTradeDialog view={view} onSubmit={dispatch} onClose={() => setProposeOpen(false)} />
      )}
      {cardsOpen && (
        <SagaCardsDialog
          view={view}
          legalActions={legalActions}
          onSubmit={dispatch}
          onClose={() => setCardsOpen(false)}
          onEnterAssalto={() => {
            setCardsOpen(false);
            setMode('assalto');
          }}
        />
      )}
      {buildingsOpen && <BuildingsDialog view={view} onClose={() => setBuildingsOpen(false)} />}
      {costsOpen && (
        <CostsDialog
          view={view}
          targetGloryPoints={view.targetGloryPoints}
          onClose={() => setCostsOpen(false)}
          onOpenTutorial={() => {
            setCostsOpen(false);
            setTutorialOpen(true);
          }}
        />
      )}
      {tutorialOpen && <TutorialScreen onClose={() => setTutorialOpen(false)} />}
      {snap.finalState !== null && (
        <VictoryScreen
          state={snap.finalState}
          stats={snap.stats}
          onExit={onExit}
          onRematch={onRematch}
        />
      )}
      {handoff !== null && (
        <PassDeviceScreen view={view} to={handoff} onConfirm={() => controller.confirmHandoff()} />
      )}
      {mapFullscreen && (
        <FullscreenMap
          view={view}
          targets={targets}
          onPickVertex={pickVertex}
          onPickEdge={pickEdge}
          onPickHex={pickHex}
          onClose={() => setMapFullscreen(false)}
        />
      )}
      {manage && manageOpen && (
        <ManageSheet manage={manage} onClose={() => setManageOpen(false)} />
      )}
      {/* Sopra mappa e dialoghi, ma sotto tutorial e passaggio di mano. */}
      <DiceRollOverlay roll={snap.lastRoll} />
    </div>
  );
}

