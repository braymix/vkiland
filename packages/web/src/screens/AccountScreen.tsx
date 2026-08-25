/**
 * Gestione dell'account: mostra i (pochi) dati salvati e permette di
 * cambiare nome utente e password. La password non esiste in chiaro da
 * nessuna parte: sul server c'è solo l'hash.
 *
 * EASTER EGG: c'è anche un campo «email»… che non salva niente, perché
 * l'email non esiste proprio nel database (e va bene così).
 */
import { useEffect, useState } from 'react';
import { it } from '../i18n';
import { Dialog } from '../components/dialogs/Dialog';
import {
  apiChangeName,
  apiChangePassword,
  apiGetAccount,
  apiSetCensored,
  type AccountProfile,
  type OnlineSession,
} from '../online/connection';
import { useCensor } from '../game/censor';

/** L'unico amministratore dell'app: l'account «pana» (confronto senza maiuscole). */
const ADMIN_USERNAME = 'pana';
function isAdmin(username: string): boolean {
  return username.trim().toLowerCase() === ADMIN_USERNAME;
}

interface Props {
  session: OnlineSession;
  /** Sessione aggiornata (nuovo nome o nuovo token dopo cambio password). */
  onSessionUpdate: (s: OnlineSession) => void;
  /** Esci dall'account: dimentica la sessione e torna all'entrata. */
  onLogout: () => void;
  onBack: () => void;
}

type Panel = 'nome' | 'password' | 'email' | 'censura' | null;

export function AccountScreen({ session, onSessionUpdate, onLogout, onBack }: Props) {
  const admin = isAdmin(session.username);
  const { words: censoredWords, reload: reloadCensored } = useCensor();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  // Editor parole censurate (solo admin): una parola per riga.
  const [censoredDraft, setCensoredDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [eggOpen, setEggOpen] = useState(false);

  // Campi dei form.
  const [newName, setNewName] = useState('');
  const [eggEmail, setEggEmail] = useState('');
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');

  useEffect(() => {
    void apiGetAccount(session).then(setProfile).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Errore di rete');
    });
  }, [session]);

  const feedback = (ok: string | null, err: string | null) => {
    setMessage(ok);
    setError(err);
    setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 4000);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      feedback(null, e instanceof Error ? e.message : 'Errore di rete');
    } finally {
      setBusy(false);
    }
  };

  const saveName = () =>
    run(async () => {
      const updated = await apiChangeName(session, newName);
      setProfile(updated);
      onSessionUpdate({ ...session, username: updated.username });
      setPanel(null);
      setNewName('');
      feedback(it.nomeAggiornato, null);
    });

  const savePassword = () =>
    run(async () => {
      if (newPw !== newPw2) {
        feedback(null, it.passwordNonCoincidono);
        return;
      }
      const fresh = await apiChangePassword(session, curPw, newPw);
      onSessionUpdate(fresh);
      setPanel(null);
      setCurPw('');
      setNewPw('');
      setNewPw2('');
      feedback(it.passwordAggiornata, null);
    });

  const saveCensored = () =>
    run(async () => {
      // Una parola per riga (o separate da virgola); il server ripulisce e
      // deduplica comunque.
      const words = censoredDraft
        .split(/[\n,]+/)
        .map((w) => w.trim())
        .filter(Boolean);
      const saved = await apiSetCensored(session, words);
      setCensoredDraft(saved.join('\n'));
      reloadCensored();
      feedback('Parole censurate aggiornate', null);
    });

  // Apre l'editor censura precompilandolo con la lista attuale.
  const openCensored = () => {
    if (panel === 'censura') {
      setPanel(null);
      return;
    }
    setCensoredDraft(censoredWords.join('\n'));
    setPanel('censura');
  };

  const row = (label: string, value: string) => (
    <div className="account-row">
      <span style={{ color: 'var(--ink-dim)' }}>{label}</span>
      <span style={{ textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );

  const panelButton = (key: Exclude<Panel, null>, label: string) => (
    <button
      className={`pxbtn pxbtn--small ${panel === key ? '' : 'pxbtn--ghost'}`}
      onClick={() => setPanel(panel === key ? null : key)}
    >
      {label}
    </button>
  );

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h2 style={{ color: 'var(--accent)', fontSize: 14 }}>{it.ilTuoAccount}</h2>
      <div className="setup-grid pixel-frame" style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 8, color: 'var(--ink-dim)' }}>{it.datiSalvati}</div>
        {profile ? (
          <>
            {row(it.nomeUtente, profile.username)}
            {row(it.password, it.passwordImpostata)}
            {row(
              it.registratoIl,
              new Date(profile.createdAt).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })
            )}
            {row(it.idAccount, profile.userId.slice(0, 8))}
          </>
        ) : (
          <div style={{ fontSize: 9 }}>{it.connessioneInCorso}</div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {panelButton('nome', it.cambiaNome)}
          {panelButton('password', it.cambiaPassword)}
          {panelButton('email', it.aggiungiEmail)}
          {admin && (
            <button
              className={`pxbtn pxbtn--small ${panel === 'censura' ? '' : 'pxbtn--ghost'}`}
              onClick={openCensored}
            >
              🛡️ Parole censurate
            </button>
          )}
        </div>

        {panel === 'nome' && (
          <div className="config-section">
            <input
              type="text"
              placeholder={it.nuovoNome}
              maxLength={12}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="pxbtn" onClick={() => void saveName()} disabled={busy || !newName.trim()}>
              {it.salva}
            </button>
          </div>
        )}
        {panel === 'password' && (
          <div className="config-section">
            <input
              type="password"
              placeholder={it.passwordAttuale}
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
            />
            <input
              type="password"
              placeholder={it.nuovaPassword}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <input
              type="password"
              placeholder={it.ripetiPassword}
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
            />
            <button
              className="pxbtn"
              onClick={() => void savePassword()}
              disabled={busy || !curPw || newPw.length < 8 || !newPw2}
            >
              {it.salva}
            </button>
          </div>
        )}
        {panel === 'email' && (
          <div className="config-section">
            <input
              type="email"
              placeholder={it.email}
              value={eggEmail}
              onChange={(e) => setEggEmail(e.target.value)}
            />
            {/* Easter egg: il «Salva» non salva niente (l'email non esiste a DB). */}
            <button className="pxbtn" onClick={() => setEggOpen(true)} disabled={!eggEmail.trim()}>
              {it.salva}
            </button>
          </div>
        )}

        {admin && panel === 'censura' && (
          <div className="config-section">
            <div style={{ fontSize: 8, color: 'var(--ink-dim)', lineHeight: 1.8 }}>
              Solo tu (amministratore) puoi gestire questa lista. Le parole qui
              elencate vengono mascherate in visualizzazione nei nomi in chat e
              nei nomi squadra (una parola per riga). Il valore reale non viene
              modificato.
            </div>
            <textarea
              value={censoredDraft}
              onChange={(e) => setCensoredDraft(e.target.value)}
              rows={6}
              placeholder={'parola1\nparola2'}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 9 }}
            />
            <button className="pxbtn" onClick={() => void saveCensored()} disabled={busy}>
              {it.salva}
            </button>
          </div>
        )}

        {message && <div style={{ fontSize: 9, color: 'var(--ok)' }}>{message}</div>}
        {error && <div style={{ fontSize: 9, color: 'var(--danger)' }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button className="pxbtn pxbtn--ghost" onClick={onBack}>
          {it.indietro}
        </button>
        <button className="pxbtn pxbtn--danger" onClick={onLogout}>
          {it.esciAccount}
        </button>
      </div>

      {eggOpen && (
        <Dialog title={it.emailEggTitolo}>
          <p style={{ fontSize: 9, lineHeight: 1.9 }}>{it.emailEggTesto}</p>
          <div className="dialog-buttons">
            <button
              className="pxbtn"
              onClick={() => {
                setEggOpen(false);
                setEggEmail('');
                setPanel(null);
              }}
            >
              {it.emailEggOk}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
