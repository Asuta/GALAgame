/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAT_COMPLETIONS_URL?: string;
  readonly VITE_CHAT_API_KEY?: string;
  readonly VITE_CHAT_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
