/**
 * «Demo guidata»: tour interattivo passo-passo, separato dal «Libro delle
 * Saghe». La prima metà mostra una PARTITA VERA che si svolge sulla tavola
 * (istantanee deterministiche da `demoScript`); la seconda spiega l'online —
 * compreso il fatto che il server gratuito va in letargo e al primo accesso ci
 * mette un po' a risvegliarsi. Tutti i testi sono tradotti (i18n).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  BUILD_COSTS,
  SAGA_DECK_COMPOSITION,
  flattenResources,
  RESOURCES,
  type Buildable,
  type SagaCard,
} from '@vikiland/engine';
import { it, t, useLang } from '../i18n';
import { BoardCanvas, type BoardTargets } from '../components/BoardCanvas';
import { ResIcon, SagaIcon } from '../components/icons';
import { WelcomeConfetti } from '../components/WelcomeConfetti';
import { PLAYER_COLORS } from '../render/sprites/palettes';
import { buildDemo, DEMO_SEED, DEMO_YOU_COLOR, type DemoData } from '../game/demoScript';

type StepId =
  | 'intro' | 'isola' | 'setupVillaggio' | 'setupSentiero' | 'altri' | 'secondoVillaggio'
  | 'tiraDadi' | 'produzione' | 'costruire' | 'drago' | 'carteSaga' | 'scambi' | 'bonus' | 'vittoria'
  | 'onlineIntro' | 'serverFreddo' | 'account' | 'creaEntra' | 'lobby' | 'onlinePartita' | 'fine';

const GAME_STEPS: StepId[] = [
  'intro', 'isola', 'setupVillaggio', 'setupSentiero', 'altri', 'secondoVillaggio',
  'tiraDadi', 'produzione', 'costruire', 'drago', 'carteSaga', 'scambi', 'bonus', 'vittoria',
];
const ONLINE_STEPS: StepId[] = [
  'onlineIntro', 'serverFreddo', 'account', 'creaEntra', 'lobby', 'onlinePartita', 'fine',
];
const ALL_STEPS: StepId[] = [...GAME_STEPS, ...ONLINE_STEPS];

const SAGA_KINDS: SagaCard[] = ['berserker', 'sagaDegliEroi', 'costruttoriDiSentieri', 'banchetto', 'tributo'];
const sagaCount = (card: SagaCard) => SAGA_DECK_COMPOSITION.filter((c) => c === card).length;
const COST_KINDS: Buildable[] = ['sentiero', 'villaggio', 'roccaforte', 'cartaSaga'];
const AUTOPLAY_MS = 5000;

/** Quale vista della tavola (e quali evidenziazioni) mostrare a ogni passo. */
function boardFor(id: StepId, d: DemoData): { view: DemoData['island']; targets: BoardTargets } | null {
  switch (id) {
    case 'intro':
    case 'isola':
      return { view: d.island, targets: {} };
    case 'setupVillaggio':
      return { view: d.village1.view, targets: { vertices: [d.village1.vertex] } };
    case 'setupSentiero':
      return { view: d.road1.view, targets: { edges: [d.road1.edge] } };
    case 'altri':
      return { view: d.othersPlaced, targets: {} };
    case 'secondoVillaggio':
      return {
        view: d.secondVillage.view,
        targets: { vertices: [d.secondVillage.vertex], hexes: d.secondVillage.producingHexes },
      };
    case 'tiraDadi':
      return { view: d.rolled.view, targets: {} };
    case 'produzione':
      return { view: d.rolled.view, targets: { hexes: d.setupDone.myProducingHexes } };
    case 'costruire':
    case 'carteSaga':
    case 'scambi':
      return { view: d.rolled.view, targets: {} };
    case 'drago':
      return { view: d.rolled.view, targets: { hexes: [d.dragonHex] } };
    case 'bonus':
    case 'vittoria':
      return { view: d.finalView, targets: {} };
    default:
      return null; // passi «online»: niente tavola
  }
}

/** Righe «quanto costa»: icone delle risorse del costo, come nel Libro delle Saghe. */
function CostRows() {
  const label: Record<Buildable, string> = {
    sentiero: it.sentiero,
    villaggio: it.villaggio,
    roccaforte: it.roccaforte,
    cartaSaga: it.compraCarta,
  };
  return (
    <div className="demo-costs">
      {COST_KINDS.map((kind) => (
        <div key={kind} className="demo-cost">
          <span className="demo-cost-label">{label[kind]}</span>
          <span className="demo-cost-icons">
            {flattenResources(BUILD_COSTS[kind]).map((r, i) => (
              <ResIcon key={i} r={r} scale={2} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Le 5 Carte Saga con il numero di copie e la descrizione (i18n già esistenti). */
function SagaList() {
  return (
    <div className="demo-sagalist">
      {SAGA_KINDS.map((card) => (
        <div key={card} className="demo-saga">
          <SagaIcon card={card} scale={2} />
          <div>
            <b>
              {it.cartaSaga[card]} ×{sagaCount(card)}
            </b>
            <div className="demo-cost-note">{it.descrizioneCarta[card]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Contenuto extra sotto il testo, dipendente dal passo (icone, dadi, costi…). */
function StepExtra({ id, d }: { id: StepId; d: DemoData }) {
  switch (id) {
    case 'intro': {
      const main = PLAYER_COLORS[DEMO_YOU_COLOR].main;
      return (
        <div className="demo-youclan">
          <span className="demo-swatch" style={{ background: main }} />
          <span>{t(it.demo.seiClan, { colore: it.nomeColore[DEMO_YOU_COLOR] })}</span>
        </div>
      );
    }
    case 'tiraDadi':
      return (
        <div className="demo-dice">
          🎲 {t(it.demo.haiTirato, { d1: d.rolled.dice[0], d2: d.rolled.dice[1], tot: d.rolled.total })}
        </div>
      );
    case 'produzione':
      return (
        <div className="demo-gain">
          <span>{it.demo.haiRicevuto}</span>
          {d.rolled.gained ? (
            <span className="demo-gain-icons">
              {RESOURCES.flatMap((r) =>
                Array.from({ length: d.rolled.myGain[r] }, (_, i) => <ResIcon key={`${r}${i}`} r={r} scale={2} />)
              )}
            </span>
          ) : (
            <span className="demo-cost-note">{it.demo.niente}</span>
          )}
        </div>
      );
    case 'costruire':
      return <CostRows />;
    case 'carteSaga':
      return <SagaList />;
    case 'scambi':
      return (
        <div className="demo-resrow">
          {RESOURCES.map((r) => (
            <span key={r} className="demo-resrow-item">
              <ResIcon r={r} scale={2} />
              <span>{it.risorsa[r]}</span>
            </span>
          ))}
        </div>
      );
    default:
      return null;
  }
}

/** Finte schermate dell'online (illustrative): non sono interattive. */
function OnlineMock({ id }: { id: StepId }) {
  switch (id) {
    case 'onlineIntro':
      return (
        <div className="demo-mock demo-mock-net">
          <div className="demo-net-row">
            <span className="demo-device">📱</span>
            <span className="demo-device">📱</span>
            <span className="demo-device">💻</span>
          </div>
          <div className="demo-net-link">↕</div>
          <div className="demo-server">🖥️ <span>server</span></div>
        </div>
      );
    case 'serverFreddo':
      return (
        <div className="demo-mock demo-mock-server">
          <div className="demo-hourglass">⏳</div>
          <div className="demo-status demo-status--wake">🟠 {it.serverVerifica}</div>
          <div className="demo-status-arrow">→ (30–60s) →</div>
          <div className="demo-status demo-status--ok">🟢 {it.serverOk}</div>
        </div>
      );
    case 'account':
      return (
        <div className="demo-mock demo-mock-form">
          <label>{it.nomeUtente}</label>
          <div className="demo-input">bjorn_il_rosso</div>
          <label>{it.password}</label>
          <div className="demo-input">••••••••</div>
          <div className="demo-noemail">✗ {it.demo.senzaEmail}</div>
          <div className="demo-fakebtn">{it.registrati}</div>
        </div>
      );
    case 'creaEntra':
      return (
        <div className="demo-mock demo-mock-code">
          <div className="demo-code-card">
            <div className="demo-cost-note">{it.creaPartita}</div>
            <div className="demo-code">VK7F2Q</div>
          </div>
          <div className="demo-code-or">/</div>
          <div className="demo-code-card">
            <div className="demo-cost-note">{it.unisciti}</div>
            <div className="demo-code demo-code--empty">_ _ _ _ _ _</div>
          </div>
        </div>
      );
    case 'lobby':
      return (
        <div className="demo-mock demo-mock-lobby">
          <div className="demo-lobby-slot">
            <span className="demo-swatch" style={{ background: PLAYER_COLORS.rosso.main }} />
            <span>Bjorn</span>
            <span className="demo-tag">{it.hostTag}</span>
          </div>
          <div className="demo-lobby-slot">
            <span className="demo-swatch" style={{ background: PLAYER_COLORS.blu.main }} />
            <span>Astrid</span>
            <span className="demo-tag">{it.bot}</span>
          </div>
          <div className="demo-lobby-slot demo-lobby-slot--add">+ {it.aggiungiBot}</div>
          <div className="demo-fakebtn">{it.avviaPartita}</div>
        </div>
      );
    case 'onlinePartita':
      return (
        <div className="demo-mock demo-mock-play">
          <div className="demo-play-line">⚔️ {it.diario}</div>
          <div className="demo-play-log">
            <span>• Astrid → 🎲 8</span>
            <span>• Bjorn → 🏠 +1</span>
            <span>• Leif → 🔁</span>
          </div>
          <div className="demo-timer">⏱ {it.timerTurno}</div>
        </div>
      );
    default:
      return null;
  }
}

export function DemoScreen({
  onClose,
  onPlay,
  onOnline,
}: {
  onClose: () => void;
  onPlay: () => void;
  onOnline: () => void;
}) {
  useLang();
  const demo = useMemo(() => buildDemo(DEMO_SEED), []);
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(false);
  // All'apertura: popup di benvenuto con coriandoli (la frase portafortuna).
  const [welcome, setWelcome] = useState(true);
  const last = ALL_STEPS.length - 1;
  const id = ALL_STEPS[idx]!;
  const step = it.demo.passi[id];
  const board = boardFor(id, demo);
  const online = !board;

  const go = (next: number) => {
    setAuto(false);
    setIdx(Math.min(last, Math.max(0, next)));
  };

  // Tastiera: Esc chiude, frecce navigano. Mentre c'è il popup di benvenuto
  // i tasti li gestisce lui (Invio/Esc per cominciare), non la navigazione.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (welcome) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(last, i + 1));
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, last, welcome]);

  // Riproduzione automatica: avanza da sola, si ferma all'ultimo passo.
  useEffect(() => {
    if (!auto) return;
    if (idx >= last) {
      setAuto(false);
      return;
    }
    const timer = setTimeout(() => setIdx((i) => Math.min(last, i + 1)), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [auto, idx, last]);

  const section: 'game' | 'online' = GAME_STEPS.includes(id) ? 'game' : 'online';
  const progress = ((idx + 1) / ALL_STEPS.length) * 100;

  return (
    <div className="demo-screen" data-step={id}>
      {welcome && <WelcomeConfetti onStart={() => setWelcome(false)} />}
      <div className="demo-head">
        <h2 className="demo-title">{it.demo.titolo}</h2>
        <div className="demo-tabs">
          <button
            className={`demo-tab ${section === 'game' ? 'demo-tab--on' : ''}`}
            onClick={() => go(0)}
          >
            {it.demo.sezioneGioco}
          </button>
          <button
            className={`demo-tab ${section === 'online' ? 'demo-tab--on' : ''}`}
            onClick={() => go(GAME_STEPS.length)}
          >
            {it.demo.sezioneOnline}
          </button>
        </div>
        <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={onClose} aria-label={it.chiudi}>
          ✕
        </button>
      </div>

      <div className="demo-stage">
        {board ? (
          <div className="demo-board">
            <BoardCanvas view={board.view} targets={board.targets} />
          </div>
        ) : id === 'fine' ? (
          <div className="demo-mock demo-mock-fine">
            <div className="demo-fine-flag">⛵</div>
          </div>
        ) : (
          <OnlineMock id={id} />
        )}
      </div>

      <div className="demo-card pixel-frame" data-testid="demo-card">
        <h3 className="demo-card-title">{step.titolo}</h3>
        <p className="demo-card-body">{step.testo}</p>
        {online ? null : <StepExtra id={id} d={demo} />}
        {id === 'fine' && (
          <div className="demo-fine-cta">
            <button className="pxbtn" onClick={onPlay}>
              {it.demo.giocaOffline}
            </button>
            <button className="pxbtn pxbtn--ghost" onClick={onOnline}>
              {it.demo.vaiOnline}
            </button>
          </div>
        )}
      </div>

      <div className="demo-progress">
        <div className="demo-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="demo-nav">
        <button className="pxbtn pxbtn--ghost" disabled={idx === 0} onClick={() => go(idx - 1)}>
          ← {it.indietro}
        </button>
        <div className="demo-nav-mid">
          <span className="demo-step-count">{t(it.demo.passoDi, { n: idx + 1, tot: ALL_STEPS.length })}</span>
          <button
            className={`pxbtn pxbtn--small ${auto ? '' : 'pxbtn--ghost'}`}
            onClick={() => setAuto((a) => !a)}
            aria-pressed={auto}
          >
            ▶ {it.demo.auto}
          </button>
        </div>
        {idx < last ? (
          <button className="pxbtn" onClick={() => go(idx + 1)}>
            {it.avanti} →
          </button>
        ) : (
          <button className="pxbtn" onClick={onClose}>
            {it.demo.fineChiudi}
          </button>
        )}
      </div>

      <button className="pxbtn pxbtn--ghost pxbtn--small demo-skip" onClick={onClose}>
        {it.demo.salta}
      </button>
    </div>
  );
}
