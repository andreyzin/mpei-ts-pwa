/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Umami tracker, e.g. `https://stats.example.com/script.js`. Unset disables analytics. */
  readonly VITE_UMAMI_SCRIPT_URL?: string
  /** Website id from the Umami dashboard. */
  readonly VITE_UMAMI_WEBSITE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
