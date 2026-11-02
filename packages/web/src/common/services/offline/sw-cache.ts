/**
 * Service worker runtime cache purge.
 *
 * Workbox keeps API responses in CacheStorage for offline viewing (see the
 * `runtimeCaching` entries in vite.config.ts, configured from sw-cache-config.ts).
 * Those caches belong to the signed-in user, so they are dropped on logout.
 */

import { API_RESPONSE_CACHE_NAMES } from './sw-cache-config'

/**
 * Delete every service-worker runtime cache that holds API responses.
 * No-op where CacheStorage is unavailable (tests, insecure contexts).
 */
export async function clearApiResponseCaches(): Promise<void> {
  if (typeof caches === 'undefined') return
  await Promise.all(API_RESPONSE_CACHE_NAMES.map((name) => caches.delete(name)))
}
