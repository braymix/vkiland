/**
 * Stato della chat di partita: sottoscrive i messaggi in arrivo dal server e
 * offre `send` per pubblicarne di nuovi. Vive al livello della schermata online
 * così la cronologia sopravvive al passaggio lobby → partita.
 */
import { useEffect, useState } from 'react';
import type { ChatMessage } from '@vikiland/server/protocol';
import type { ServerSocket } from './connection';

/** Massimo di messaggi tenuti in memoria (i più vecchi si scartano). */
const MAX_CHAT = 100;

export interface ChatApi {
  messages: ChatMessage[];
  send: (text: string) => void;
}

export function useChat(socket: ServerSocket | null): ChatApi {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (msg: ChatMessage) =>
      setMessages((prev) => {
        const next = [...prev, msg];
        return next.length > MAX_CHAT ? next.slice(-MAX_CHAT) : next;
      });
    socket.on('chat:message', onMessage);
    return () => {
      socket.off('chat:message', onMessage);
    };
  }, [socket]);

  const send = (text: string): void => {
    const clean = text.trim();
    if (clean && socket) socket.emit('chat:send', clean);
  };

  return { messages, send };
}
