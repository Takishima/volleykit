/// <reference types="vite/client" />

/**
 * Environment variables read from `import.meta.env`. Declaring them here gives
 * them a real type instead of the `any` from Vite's index signature.
 */
interface ImportMetaEnv {
  /** Primary CORS proxy base URL */
  readonly VITE_API_PROXY_URL?: string
  /** Comma-separated fallback proxy base URLs */
  readonly VITE_FALLBACK_PROXY_URLS?: string
  /** Direct OJP API key for development; production uses the worker proxy */
  readonly VITE_OJP_API_KEY?: string
}
