/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DOMOS_ENDPOINT: string;
  readonly VITE_DOMOS_API_KEY?: string;
  readonly VITE_DOMOS_DISABLE_API_KEY?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
