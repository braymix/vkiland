/**
 * Schermata d'ingresso: la PRIMA cosa che si vede all'avvio. Accedi o
 * registrati per giocare online (le skin e le partite ti seguono ovunque),
 * oppure «Continua senza account» per giocare subito in locale (bot/hot-seat).
 * Il form è lo stesso del vecchio login online, ma qui vive all'entrata:
 * l'online resta comunque facoltativo, il gioco è pienamente usabile senza.
 */
import { useEffect, useState } from 'react';
import { it } from '../i18n';
import {
  apiLogin,
  apiRegister,
  checkServerHealth,
  defaultServerUrl,
  type OnlineSession,
} from '../online/connection';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function EntryScreen({
  onLoggedIn,
  onSkip,
  onOpenTutorial,
}: {
  onLoggedIn: (session: OnlineSession) => void;
  onSkip: () => void;
  onOpenTutorial: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [serverUrl, setServerUrl] = useState(defaultServerUrl());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');
  /** L'URL del server confonde i più: resta dietro un expander (default chiuso). */
  const [serverOpen, setServerOpen] = useState(false);

  // Ping del server (debounce mentre si digita). Se l'online è spento va bene:
  // «Continua senza account» resta sempre disponibile e il gioco è locale.
  useEffect(() => {
    setHealth('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      void checkServerHealth(serverUrl.trim()).then((ok) => {
        if (!cancelled) setHealth(ok ? 'ok' : 'down');
      });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [serverUrl]);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const url = serverUrl.trim().replace(/\/+$/, '');
      const session =
        mode === 'login'
          ? await apiLogin(url, username, password)
          : await apiRegister(url, username, password);
      onLoggedIn(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore di rete');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h1 className="menu-title">{it.titolo}</h1>
      <div className="menu-sub">{it.sottotitolo}</div>
      <p
        style={{
          fontSize: 9,
          lineHeight: 1.7,
          maxWidth: 340,
          textAlign: 'center',
          color: 'var(--ink-dim)',
        }}
      >
        {it.entrataInvito}
      </p>

      <div className="setup-grid pixel-frame" style={{ maxWidth: 360 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`pxbtn pxbtn--small ${mode === 'login' ? '' : 'pxbtn--ghost'}`}
            onClick={() => setMode('login')}
          >
            {it.accedi}
          </button>
          <button
            className={`pxbtn pxbtn--small ${mode === 'register' ? '' : 'pxbtn--ghost'}`}
            onClick={() => setMode('register')}
          >
            {it.registrati}
          </button>
        </div>
        <input
          type="text"
          placeholder={it.nomeUtente}
          maxLength={12}
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder={it.password}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'register' && (
          <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>{it.nomeUtenteHint}</div>
        )}
        <button
          className="pxbtn pxbtn--ghost pxbtn--small"
          onClick={() => setServerOpen(!serverOpen)}
          aria-expanded={serverOpen}
        >
          {serverOpen ? '▾' : '▸'} {it.serverExpander}
        </button>
        {serverOpen && (
          <div className="config-section">
            <input
              type="text"
              placeholder={it.serverUrl}
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
          </div>
        )}
        {health === 'checking' && (
          <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>{it.serverVerifica}</div>
        )}
        {health === 'ok' && <div style={{ fontSize: 8, color: 'var(--ok)' }}>✓ {it.serverOk}</div>}
        {health === 'down' && (
          <div style={{ fontSize: 8, color: 'var(--danger)', lineHeight: 1.6 }}>{it.serverGiu}</div>
        )}
        {error && <div style={{ fontSize: 9, color: 'var(--danger)' }}>{error}</div>}
        <button className="pxbtn" onClick={() => void submit()} disabled={sending}>
          {mode === 'login' ? it.accedi : it.registrati}
        </button>
      </div>

      {/* Sempre disponibile: si gioca subito in locale, senza registrarsi. */}
      <button className="pxbtn pxbtn--ghost" onClick={onSkip}>
        {it.continuaSenzaAccount}
      </button>
      <button className="pxbtn pxbtn--ghost pxbtn--small" onClick={onOpenTutorial}>
        {it.comeFunzionaOnline}
      </button>

      <LanguageSwitcher />
    </div>
  );
}
