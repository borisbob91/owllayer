/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OWLLAYER_ENDPOINT?: string;
  readonly VITE_OWLLAYER_API_KEY?: string;
  readonly VITE_OWLLAYER_DISABLE_API_KEY?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
