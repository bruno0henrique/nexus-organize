/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAVE_API_GEMINI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
