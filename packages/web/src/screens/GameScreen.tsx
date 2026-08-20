/** Schermata di partita: orchestrazione di tavola, pannelli e dialoghi. */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Action, EdgeId, HexId, PlayerId, VertexId } from '@vikiland/engine';
import { it, t } from '../i18n';
import type { GameController } from '../game/controller';
import { useGame } from '../game/useGame';
import { ActionBar, type BuildMode } from '../components/ActionBar';
import { SpectatorBar } from '../components/SpectatorBar';
import { Dialog } from '../components/dialogs/Dialog';
import { BoardCanvas, type BoardTargets } from '../components/BoardCanvas';
import { CalamityBanner } from '../components/CalamityBanner';
import { CalamityRevealedModal } from '../components/CalamityRevealedModal';
import { GameLog } from '../components/GameLog';
import { HandPanel } from '../components/HandPanel';
import { HeroBar } from '../components/HeroBar';
import { HeroDialog } from '../components/dialogs/HeroDialog';
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
  /**
   * Chiamata UNA volta quando la partita finisce al 100% (si raggiunge un
   * vincitore) e chi guarda NON è uno spettatore: serve ad assegnare la cassa.
   */
  onGameComplete?: () => void;
}

export function GameScreen({
  makeController,
  onExit,
  onRematch,
  manage = null,
  onGameComplete,
}: Props) {
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
  const [heroOpen, setHeroOpen] = useState(false);
  const [costsOpen, setCostsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [openCalamityId, setOpenCalamityId] = useState<string | null>(null);
  const seenCalamityIds = useRef<Set<string>>(new Set());

  const isMyTurn = view.currentPlayer === viewpoint;
  const isSpectator = snap.spectator ?? false;
  const handRequest = snap.handRequest ?? null;

  // Cassa di fine partita: quando si raggiunge un vincitore (partita al 100%) e
  // non stiamo solo guardando da spettatori, avvisa UNA volta il chiamante.
  const gameCompleteFired = useRef(false);
  useEffect(() => {
    if (gameCompleteFired.current || isSpectator) return;
    if (snap.finalState !== null) {
      gameCompleteFired.current = true;
      onGameComplete?.();
    }
  }, [snap.finalState, isSpectator, onGameComplete]);

  // Spettatore: posti a cui ho chiesto la mano, in attesa di risposta. Quando la
  // mano compare (permesso concesso) il posto esce dallo stato "in attesa".
  const [handPending, setHandPending] = useState<Set<PlayerId>>(() => new Set());
  useEffect(() => {
    setHandPending((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      for (const p of view.players) if (p.hand) next.delete(p.id);
      return next.size === prev.size ? prev : next;
    });
  }, [view.players]);
  const requestHand = (seat: PlayerId) => {
    controller.requestHand?.(seat);
    setHandPending((prev) => new Set(prev).add(seat));
  };

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
      setHeroOpen(false);
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
      setHeroOpen(false);
    }
  };

  // Bersagli evidenziati sulla tavola, derivati dalle mosse legali dell'umano.
  const targets = useMemo((): BoardTargets => {
    const vertices: VertexId[] = [];
    const attackVertices: VertexId[] = [];
    const edges: EdgeId[] = [];
    const attackEdges: EdgeId[] = [];
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
        case 'costruisciCapitale':
          if (mode === 'capitale') vertices.push(m.vertex);
          break;
        case 'attaccaEdificio':
          if (mode === 'attacca') attackVertices.push(m.vertex);
          break;
        case 'spezzaSentiero':
          if (mode === 'spezza') attackEdges.push(m.edge);
          break;
        case 'giocaAssalto':
          if (mode === 'assalto') attackVertices.push(m.vertex);
          break;
        case 'giocaAssaltoLeggero':
          if (mode === 'assaltoLeggero') attackEdges.push(m.edge);
          break;
        case 'giocaRazzia':
          if (mode === 'razzia') hexes.push(m.hex);
          break;
        case 'franaSentiero':
          // Frana: le proprie strade marginali che possono crollare (mirino rosso).
          attackEdges.push(m.edge);
          break;
      }
    }
    return { vertices, attackVertices, edges, attackEdges, hexes };
  }, [legalActions, mode]);

  const pickVertex = (v: VertexId) => {
    const m = legalActions.find(
      (a) =>
        ((a.type === 'piazzaVillaggioIniziale' ||
          (a.type === 'costruisciVillaggio' && mode === 'villaggio') ||
          (a.type === 'costruisciRoccaforte' && mode === 'roccaforte') ||
          (a.type === 'costruisciCapitale' && mode === 'capitale') ||
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
          a.type === 'franaSentiero' ||
          (a.type === 'costruisciSentiero' && mode === 'sentiero') ||
          (a.type === 'spezzaSentiero' && mode === 'spezza') ||
          (a.type === 'giocaAssaltoLeggero' && mode === 'assaltoLeggero')) &&
        a.edge === e
    );
    if (m) dispatch(m as Action);
  };
  const pickHex = (h: HexId) => {
    const m = legalActions.find(
      (a) =>
        (a.type === 'muoviDrago' || (a.type === 'giocaRazzia' && mode === 'razzia')) &&
        'hex' in a &&
        a.hex === h
    );
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
  // Calamità "Frana": tocca a me scegliere quale strada marginale far crollare?
  const choosingFrana = view.phase.type === 'calamityFrana' && view.phase.player === viewpoint;
  const stealing = view.phase.type === 'steal' && isMyTurn;
  const offer = view.pendingTrade;
  const offerToMe =
    offer !== null &&
    offer.from !== viewpoint &&
    (offer.to === viewpoint ||
      // Offerta «a tutta la squadra»: la vedono solo i compagni (in modalità squadra).
      (offer.to === null &&
        (!view.teams || view.teams[offer.from] === view.teams[viewpoint]))) &&
    offer.responses[viewpoint] === undefined;
  const offerMine = offer !== null && offer.from === viewpoint && offer.to === null;
  const canAcceptOffer = legalActions.some((m) => m.type === 'rispondiScambio' && m.accept);

  const gameOver = snap.finalState !== null;

  // Modalità Eroi: c'è un'abilità eroe attivabile ORA dal giocatore di turno?
  const hasHeroAbility =
    isMyTurn &&
    view.pendingTrade === null &&
    legalActions.some((m) => m.type === 'eroeMercante' || m.type === 'eroeMutaporto');

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
            {choosingFrana && (
              <div style={{ fontSize: 9, color: 'var(--danger)', textAlign: 'center' }}>
                {it.calamita.franaScegli}
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
        {isSpectator ? (
          <SpectatorBar view={view} pending={handPending} onRequestHand={requestHand} />
        ) : (
          <>
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
            {view.heroes && (
              <HeroBar view={view} onOpenHero={hasHeroAbility ? () => setHeroOpen(true) : undefined} />
            )}
            <HandPanel
              view={view}
              onOpenCards={() => setCardsOpen(true)}
              onOpenBuildings={() => setBuildingsOpen(true)}
            />
          </>
        )}
        <GameLog entries={snap.log} open={logOpen} onToggle={() => setLogOpen(!logOpen)} />
      </div>

      {openCalamityId !== null && view.calamity && view.calamitiesLeft !== null && (
        <CalamityRevealedModal
          card={view.calamity}
          remaining={view.calamitiesLeft}
          onClose={() => setOpenCalamityId(null)}
        />
      )}

      {/* Nessun dialogo interattivo per gli spettatori: guardano soltanto. */}
      {!isSpectator && mustDiscard !== undefined && (
        <DiscardDialog view={view} amount={mustDiscard} onSubmit={dispatch} />
      )}
      {!isSpectator && gainAmount !== undefined && (
        <CalamityGainDialog view={view} amount={gainAmount} onSubmit={dispatch} />
      )}
      {!isSpectator && stealing && view.phase.type === 'steal' && (
        <StealDialog view={view} candidates={view.phase.candidates} onSubmit={dispatch} />
      )}
      {!isSpectator && offerToMe && (
        <RespondTradeDialog view={view} canAccept={canAcceptOffer} onSubmit={dispatch} />
      )}
      {!isSpectator && offerMine && <ManageTradeDialog view={view} onSubmit={dispatch} />}

      {/* Popup di permesso: uno spettatore chiede di vedere la mia mano. */}
      {handRequest && (
        <Dialog title={it.spettatore.richiestaTitolo}>
          <p style={{ fontSize: 9, lineHeight: 1.9 }}>
            {t(it.spettatore.richiestaTesto, { nome: handRequest.spectatorName })}
          </p>
          <div className="dialog-buttons">
            <button
              className="pxbtn pxbtn--ghost"
              onClick={() => controller.respondHand?.(handRequest.spectatorId, false)}
            >
              {it.spettatore.nega}
            </button>
            <button
              className="pxbtn"
              onClick={() => controller.respondHand?.(handRequest.spectatorId, true)}
            >
              {it.spettatore.permetti}
            </button>
          </div>
        </Dialog>
      )}
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
          onEnterAssaltoLeggero={() => {
            setCardsOpen(false);
            setMode('assaltoLeggero');
          }}
          onEnterRazzia={() => {
            setCardsOpen(false);
            setMode('razzia');
          }}
        />
      )}
      {buildingsOpen && <BuildingsDialog view={view} onClose={() => setBuildingsOpen(false)} />}
      {heroOpen && (
        <HeroDialog
          view={view}
          legalActions={legalActions}
          onSubmit={dispatch}
          onClose={() => setHeroOpen(false)}
        />
      )}
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

