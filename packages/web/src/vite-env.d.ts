/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Indirizzo del server di gioco precompilato nel form Online (deploy). */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
