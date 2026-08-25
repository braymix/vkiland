/**
 * Moderazione lato client: mascheramento delle parole censurate SOLO in
 * visualizzazione. Il valore reale (nome account, nome squadra, testo di chat)
 * resta intatto: qui lo si trasforma solo al momento di mostrarlo.
 *
 * La lista di parole è GLOBALE e la gestisce unicamente l'amministratore
 * (l'account «pana»); il client la scarica dal server e la applica ovunque
 * compaiano nomi visibili agli altri (chat e nomi squadra).
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiGetCensored, defaultServerUrl } from '../online/connection';
import { censorText } from './censorText';

export { censorText, maskWord } from './censorText';

interface CensorContextValue {
  words: string[];
  /** Applica la censura a un testo (nome o messaggio) per la visualizzazione. */
  censor: (text: string) => string;
  /** Ricarica la lista dal server (dopo una modifica dell'amministratore). */
  reload: () => void;
}

const CensorContext = createContext<CensorContextValue>({
  words: [],
  censor: (t) => t,
  reload: () => {},
});

export function CensorProvider({ children }: { children: ReactNode }) {
  const [words, setWords] = useState<string[]>([]);

  const reload = useCallback(() => {
    void apiGetCensored(defaultServerUrl()).then(setWords);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const censor = useCallback((text: string) => censorText(text, words), [words]);

  return <CensorContext.Provider value={{ words, censor, reload }}>{children}</CensorContext.Provider>;
}

/** Hook per ottenere la funzione di censura (e ricaricare la lista). */
export function useCensor(): CensorContextValue {
  return useContext(CensorContext);
}
