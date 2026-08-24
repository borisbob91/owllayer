/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OWLLAYER_ENDPOINT?: string;
  readonly VITE_OWLLAYER_API_KEY?: string;
  readonly VITE_USE_DEFAULT_WIDGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
