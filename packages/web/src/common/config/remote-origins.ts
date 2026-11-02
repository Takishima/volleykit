/**
 * Remote services the web app talks to directly from the browser.
 *
 * Single source of truth for both the runtime code (fetch targets) and the
 * build-time Content-Security-Policy (`connect-src` / `img-src` in
 * vite.config.ts). Adding a host here is what lets production reach it;
 * a host used in code but missing here is blocked by CSP in production only.
 *
 * Deployment-specific origins (API proxy, fallback proxies, OCR endpoint)
 * come from `VITE_*` env vars and are merged in at build time.
 */

/** SwissVolley VolleyManager backend (direct access in development) */
export const VOLLEYMANAGER_ORIGIN = 'https://volleymanager.volleyball.ch'

/** Default Cloudflare Worker host when VITE_OCR_ENDPOINT is not set */
const DEFAULT_OCR_PROXY_ORIGIN = 'https://volleykit-proxy.takishima.workers.dev'

/**
 * Production CORS proxy origin, used by the service worker cache pattern when
 * VITE_API_PROXY_URL is not set at build time. Not part of the CSP allowlist:
 * the runtime only talks to the proxy named by VITE_API_PROXY_URL.
 */
export const DEFAULT_API_PROXY_ORIGIN = 'https://api.volleykit.ch'

/** OpenStreetMap Nominatim geocoder */
const NOMINATIM_ORIGIN = 'https://nominatim.openstreetmap.org'

/** Swiss federal geoportal geocoder */
const GEOADMIN_ORIGIN = 'https://api3.geo.admin.ch'

/** Swiss public transport OJP 2.0 API (direct access when no proxy is configured) */
const OJP_ORIGIN = 'https://api.opentransportdata.swiss'

/** Default OCR proxy endpoint - used if VITE_OCR_ENDPOINT is not provided */
export const DEFAULT_OCR_ENDPOINT = `${DEFAULT_OCR_PROXY_ORIGIN}/ocr`

/** Nominatim free-text search endpoint */
export const NOMINATIM_SEARCH_URL = `${NOMINATIM_ORIGIN}/search`

/** geo.admin.ch SearchServer endpoint */
export const GEOADMIN_SEARCH_URL = `${GEOADMIN_ORIGIN}/rest/services/api/SearchServer`

/** OJP 2.0 endpoint for direct (non-proxied) access */
export const OJP_DIRECT_ENDPOINT = `${OJP_ORIGIN}/ojp20`

/** Every remote origin above, for the Content-Security-Policy allowlist. */
export const STATIC_REMOTE_ORIGINS: readonly string[] = [
  VOLLEYMANAGER_ORIGIN,
  DEFAULT_OCR_PROXY_ORIGIN,
  NOMINATIM_ORIGIN,
  GEOADMIN_ORIGIN,
  OJP_ORIGIN,
]
