/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The Umami website ID analytics reports to. Analytics is off when unset (the default). */
  readonly VITE_UMAMI_WEBSITE_ID?: string;
  /** Overrides where the Umami tracker script loads from, e.g. for a self-hosted instance. */
  readonly VITE_UMAMI_SCRIPT_URL?: string;
}
