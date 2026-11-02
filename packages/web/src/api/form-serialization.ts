/**
 * Form data serialization utilities for the TYPO3 Neos/Flow API.
 * The framework expects nested parameters in bracket notation:
 * e.g., searchConfiguration[offset] = 0, searchConfiguration[limit] = 10
 *
 * This module re-exports the shared buildFormData and provides web-specific
 * token management (CSRF and session tokens with encryption for iOS Safari PWA).
 */

import { buildFormData as sharedBuildFormData } from '@volleykit/shared/api'

let csrfToken: string | null = null

export function setCsrfToken(token: string | null) {
  csrfToken = token
}

export function getCsrfToken(): string | null {
  return csrfToken
}

export function clearCsrfToken() {
  csrfToken = null
}

/**
 * Session token for iOS Safari PWA mode.
 * The Cloudflare Worker extracts session cookies from Set-Cookie headers
 * and sends them as X-Session-Token header to bypass iOS Safari ITP.
 *
 * Security: Token is encrypted using Web Crypto API before storage.
 * - Encryption key is stored in IndexedDB as a non-extractable CryptoKey
 * - Encrypted token is stored in localStorage
 * - Without Web Crypto (or when encryption fails) the token is kept in memory only
 *   and never written to localStorage in plaintext
 */
import {
  encryptToken,
  decryptToken,
  isSecureStorageAvailable,
  clearEncryptionKey,
} from './session-crypto'

const SESSION_TOKEN_STORAGE_KEY = 'volleykit-session-token'

/**
 * In-memory cache for the session token (for performance).
 * Initialized lazily from localStorage on first access.
 */
let sessionTokenCache: string | null | undefined = undefined

/**
 * Tracks pending encryption key clear operations.
 * Used to prevent race conditions between logout (clearing) and login (encrypting).
 */
let pendingKeyClear: Promise<void> | null = null

/** Remove the persisted token; tolerates environments without localStorage. */
function removeStoredSessionToken(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY)
  } catch {
    // localStorage may not be available
  }
}

/**
 * Set the session token (encrypts and stores asynchronously).
 * The in-memory cache is updated immediately for sync access.
 *
 * If an encryption key clear is in progress (from logout), we wait for it
 * to complete before encrypting the new token to prevent race conditions.
 *
 * The token is only ever persisted encrypted. When Web Crypto is unavailable
 * or encryption fails, it stays in memory for this page load and the user
 * logs in again after a reload (cookies still cover non-iOS browsers).
 */
export function setSessionToken(token: string | null): void {
  sessionTokenCache = token

  if (!token) {
    removeStoredSessionToken()
    return
  }

  if (!isSecureStorageAvailable()) {
    console.warn('[session-token] Web Crypto not available, keeping session token in memory only')
    removeStoredSessionToken()
    return
  }

  // Wait for any pending key clear to complete before encrypting
  const encryptAndStore = async () => {
    if (pendingKeyClear) {
      await pendingKeyClear
    }
    const encrypted = await encryptToken(token)
    try {
      localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, encrypted)
    } catch {
      // localStorage may not be available
    }
  }

  encryptAndStore().catch(() => {
    console.warn('[session-token] Encryption failed, keeping session token in memory only')
    removeStoredSessionToken()
  })
}

/**
 * Get the session token synchronously from cache.
 * Call initSessionToken() at app startup to load from encrypted storage.
 */
export function getSessionToken(): string | null {
  return sessionTokenCache ?? null
}

/**
 * Initialize session token from encrypted storage.
 * Should be called at app startup before any API requests.
 */
export async function initSessionToken(): Promise<void> {
  if (sessionTokenCache !== undefined) {
    return // Already initialized
  }

  try {
    const stored = localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)
    if (!stored) {
      sessionTokenCache = null
      return
    }

    // Only an encrypted token is ever accepted from storage. Anything that does
    // not decrypt (no crypto, cleared key, legacy plaintext, tampering) is dropped.
    const decrypted = isSecureStorageAvailable() ? await decryptToken(stored) : null
    sessionTokenCache = decrypted
    if (decrypted === null) {
      removeStoredSessionToken()
    }
  } catch {
    sessionTokenCache = null
  }
}

/**
 * Clear the session token and encryption key.
 * The encryption key clear is tracked to prevent race conditions with
 * subsequent setSessionToken calls (login after logout).
 */
export function clearSessionToken(): void {
  sessionTokenCache = null
  removeStoredSessionToken()
  // Clear encryption key asynchronously and track the operation
  // This prevents race conditions when encrypting a new token immediately after logout
  pendingKeyClear = clearEncryptionKey()
    .catch(() => {
      // Ignore errors during cleanup
    })
    .finally(() => {
      pendingKeyClear = null
    })
}

export interface BuildFormDataOptions {
  /** Include CSRF token in params. Default true. Set false for GET requests. */
  includeCsrfToken?: boolean
}

/**
 * Build form data with nested bracket notation (Neos Flow format).
 * Flattens nested objects/arrays into URL-encoded form parameters.
 *
 * Uses the shared implementation from @volleykit/shared and adds
 * web-specific CSRF token handling.
 */
export function buildFormData(
  data: Record<string, unknown>,
  options: BuildFormDataOptions = {}
): URLSearchParams {
  const { includeCsrfToken = true } = options
  // Only include CSRF token for state-changing requests (POST/PUT/DELETE).
  // GET requests should not include CSRF tokens in URLs as they can leak
  // through browser history, server logs, referer headers, and proxy logs.
  return sharedBuildFormData(data, {
    csrfToken: includeCsrfToken ? csrfToken : null,
  })
}
