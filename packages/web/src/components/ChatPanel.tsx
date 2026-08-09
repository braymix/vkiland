/**
 * Chat di partita in tempo reale (online): pulsante flottante in basso a destra
 * che apre una finestrella con la cronologia e un campo di invio. Disponibile
 * sia nella lobby d'attesa sia durante la partita; funziona anche per gli
 * spettatori. I messaggi arrivano già validati dal server (vedi useChat).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { it } from '../i18n';
import { shadesFor } from '../render/sprites/palettes';
import type { ChatApi } from '../online/useChat';

/** Lunghezza massima consentita nel campo (il server ritronca comunque). */
const MAX_LEN = 300;

export function ChatPanel({ chat, myUserId }: { chat: ChatApi; myUserId: string }) {
  const { messages, send } = chat;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  // Quanti messaggi ho già «visto»: la differenza è il badge di non letti.
  const [seen, setSeen] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const unread = open ? 0 : Math.max(0, messages.length - seen);

  // Aperta: tutto è considerato letto e la lista scorre in fondo ai nuovi arrivi.
  useEffect(() => {
    if (!open) return;
    setSeen(messages.length);
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    send(text);
    setDraft('');
  };

  if (!open) {
    return (
      <button
        className="chat-fab pxbtn"
        onClick={() => setOpen(true)}
        aria-label={it.chat.apri}
        title={it.chat.apri}
      >
        💬
        {unread > 0 && <span className="chat-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
    );
  }

  return (
    <div className="chat-window pixel-frame">
      <div className="chat-head">
        <span>💬 {it.chat.titolo}</span>
        <button
          className="pxbtn pxbtn--ghost pxbtn--small"
          onClick={() => setOpen(false)}
          aria-label={it.chat.chiudi}
        >
          ✕
        </button>
      </div>
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">{it.chat.vuota}</div>
        ) : (
          messages.map((m) => {
            const mine = m.userId === myUserId;
            const nameColor = m.spectator || !m.color ? 'var(--ink-dim)' : shadesFor(m.color).light;
            return (
              <div key={m.id} className={`chat-msg${mine ? ' chat-msg--mine' : ''}`}>
                <span className="chat-msg-name" style={{ color: nameColor }}>
                  {mine ? it.chat.tu : m.name}
                  {m.spectator && <span className="chat-msg-spec"> 👁</span>}
                </span>
                <span className="chat-msg-text">{m.text}</span>
              </div>
            );
          })
        )}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input
          type="text"
          value={draft}
          maxLength={MAX_LEN}
          placeholder={it.chat.placeholder}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={it.chat.placeholder}
        />
        <button className="pxbtn pxbtn--small" type="submit" disabled={!draft.trim()}>
          {it.chat.invia}
        </button>
      </form>
    </div>
  );
}
