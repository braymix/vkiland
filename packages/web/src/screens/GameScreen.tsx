/** Schermata di partita: orchestrazione di tavola, pannelli e dialoghi. */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Action, EdgeId, HexId, VertexId } from '@vikiland/engine';
import { it, t } from '../i18n/it';
import { LocalGameController, type GameSetup } from '../game/LocalGameController';
import { useGame } from '../game/useGame';
import { ActionBar, type BuildMode } from '../components/ActionBar';
import { BoardCanvas, type BoardTargets } from '../components/BoardCanvas';
import { GameLog } from '../components/GameLog';
import { HandPanel } from '../components/HandPanel';
import { HudTop } from '../components/HudTop';
import { BankTradeDialog } from '../components/dialogs/BankTradeDialog';
import { DiscardDialog } from '../components/dialogs/DiscardDialog';
import { SagaCardsDialog } from '../components/dialogs/SagaCardsDialog';
import { StealDialog } from '../components/dialogs/StealDialog';
import {
  ManageTradeDialog,
  ProposeTradeDialog,
  RespondTradeDialog,
} from '../components/dialogs/TradeDialogs';
import { VictoryScreen } from './VictoryScreen';

interface Props {
  setup: GameSetup;
  onExit: () => void;
  onRematch: () => void;
}

export function GameScreen({ setup, onExit, onRematch }: Props) {
  const controllerRef = useRef<LocalGameController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = new LocalGameController(setup);
  }
  const controller = controllerRef.current;
  useEffect(() => () => controller.dispose(), [controller]);

  const snap = useGame(controller);
  const { view, legalActions, humanPlayer } = snap;

  const [mode, setMode] = useState<BuildMode>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMyTurn = view.currentPlayer === humanPlayer;

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
      }
    }
    return { vertices, edges, hexes };
  }, [legalActions, mode]);

  const pickVertex = (v: VertexId) => {
    const m = legalActions.find(
      (a) =>
        ((a.type === 'piazzaVillaggioIniziale' ||
          (a.type === 'costruisciVillaggio' && mode === 'villaggio') ||
          (a.type === 'costruisciRoccaforte' && mode === 'roccaforte')) &&
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
  const mustDiscard =
    view.phase.type === 'discard' ? view.phase.mustDiscard[humanPlayer] : undefined;
  const stealing = view.phase.type === 'steal' && isMyTurn;
  const offer = view.pendingTrade;
  const offerToMe =
    offer !== null &&
    offer.from !== humanPlayer &&
    (offer.to === null || offer.to === humanPlayer) &&
    offer.responses[humanPlayer] === undefined;
  const offerMine = offer !== null && offer.from === humanPlayer && offer.to === null;
  const canAcceptOffer = legalActions.some((m) => m.type === 'rispondiScambio' && m.accept);

  const gameOver = snap.state.phase.type === 'gameOver';

  return (
    <div className="screen">
      <div className="game-layout">
        <HudTop view={view} />
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
          onRoll={() => dispatch({ type: 'tiraDadi', player: humanPlayer })}
          onEndTurn={() => dispatch({ type: 'fineTurno', player: humanPlayer })}
          onBuyCard={() => dispatch({ type: 'compraCartaSaga', player: humanPlayer })}
          onOpenBank={() => setBankOpen(true)}
          onOpenPropose={() => setProposeOpen(true)}
          onOpenCards={() => setCardsOpen(true)}
          errorText={error}
        />
        <HandPanel view={view} onOpenCards={() => setCardsOpen(true)} />
        <GameLog entries={snap.log} />
      </div>

      {mustDiscard !== undefined && (
        <DiscardDialog view={view} amount={mustDiscard} onSubmit={dispatch} />
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
        />
      )}
      {gameOver && (
        <VictoryScreen state={snap.state} onExit={onExit} onRematch={onRematch} />
      )}
    </div>
  );
}
