/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_DEV_EMAIL?: string;
  readonly VITE_DEV_PASSWORD?: string;
  readonly VITE_DEMO_EMAIL?: string;
  readonly VITE_DEMO_PASSWORD?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_PRIVACY_URL?: string;
  readonly VITE_AI_DISCLAIMER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
