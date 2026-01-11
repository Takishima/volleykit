/**
 * Form data serialization utilities for the TYPO3 Neos/Flow API.
 * The framework expects nested parameters in bracket notation:
 * e.g., searchConfiguration[offset] = 0, searchConfiguration[limit] = 10
 */

const MAX_DEPTH = 10;

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function clearCsrfToken() {
  csrfToken = null;
}

/**
 * Session token for iOS Safari PWA mode.
 * The Cloudflare Worker extracts session cookies from Set-Cookie headers
 * and sends them as X-Session-Token header to bypass iOS Safari ITP.
 *
 * Security: Token is encrypted using Web Crypto API before storage.
 * - Encryption key is stored in IndexedDB as a non-extractable CryptoKey
 * - Encrypted token is stored in localStorage
 * - Falls back to plaintext if Web Crypto is unavailable
 */
import {
  encryptToken,
  decryptToken,
  isSecureStorageAvailable,
  clearEncryptionKey,
} from "./session-crypto";

const SESSION_TOKEN_STORAGE_KEY = "volleykit-session-token";

/**
 * In-memory cache for the session token (for performance).
 * Initialized lazily from localStorage on first access.
 */
let sessionTokenCache: string | null | undefined = undefined;

/**
 * Tracks pending encryption key clear operations.
 * Used to prevent race conditions between logout (clearing) and login (encrypting).
 */
let pendingKeyClear: Promise<void> | null = null;

/**
 * Set the session token (encrypts and stores asynchronously).
 * The in-memory cache is updated immediately for sync access.
 *
 * If an encryption key clear is in progress (from logout), we wait for it
 * to complete before encrypting the new token to prevent race conditions.
 */
export function setSessionToken(token: string | null): void {
  sessionTokenCache = token;

  if (!token) {
    // Clear storage synchronously
    try {
      localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    } catch {
      // localStorage may not be available
    }
    return;
  }

  // Encrypt and store asynchronously
  if (isSecureStorageAvailable()) {
    // Wait for any pending key clear to complete before encrypting
    const encryptAndStore = async () => {
      if (pendingKeyClear) {
        await pendingKeyClear;
      }
      const encrypted = await encryptToken(token);
      try {
        localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, encrypted);
      } catch {
        // localStorage may not be available
      }
    };

    encryptAndStore().catch(() => {
      // Fallback to plaintext on encryption failure
      console.warn(
        "[session-token] Encryption failed, falling back to plaintext storage",
      );
      try {
        localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
      } catch {
        // localStorage may not be available
      }
    });
  } else {
    // Fallback to plaintext storage
    console.warn(
      "[session-token] Web Crypto not available, using plaintext storage",
    );
    try {
      localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
    } catch {
      // localStorage may not be available
    }
  }
}

/**
 * Get the session token synchronously from cache.
 * Call initSessionToken() at app startup to load from encrypted storage.
 */
export function getSessionToken(): string | null {
  return sessionTokenCache ?? null;
}

/**
 * Initialize session token from encrypted storage.
 * Should be called at app startup before any API requests.
 */
export async function initSessionToken(): Promise<void> {
  if (sessionTokenCache !== undefined) {
    return; // Already initialized
  }

  try {
    const stored = localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    if (!stored) {
      sessionTokenCache = null;
      return;
    }

    if (isSecureStorageAvailable()) {
      // Try to decrypt
      const decrypted = await decryptToken(stored);
      if (decrypted !== null) {
        sessionTokenCache = decrypted;
      } else {
        // Decryption failed - token may be plaintext (migration) or corrupted
        // Try using as-is if it looks like a valid token (base64)
        if (/^[A-Za-z0-9+/=]+$/.test(stored)) {
          sessionTokenCache = stored;
        } else {
          sessionTokenCache = null;
          localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
        }
      }
    } else {
      // No crypto available, use plaintext
      sessionTokenCache = stored;
    }
  } catch {
    sessionTokenCache = null;
  }
}

/**
 * Clear the session token and encryption key.
 * The encryption key clear is tracked to prevent race conditions with
 * subsequent setSessionToken calls (login after logout).
 */
export function clearSessionToken(): void {
  sessionTokenCache = null;
  try {
    localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {
    // localStorage may not be available
  }
  // Clear encryption key asynchronously and track the operation
  // This prevents race conditions when encrypting a new token immediately after logout
  pendingKeyClear = clearEncryptionKey()
    .catch(() => {
      // Ignore errors during cleanup
    })
    .finally(() => {
      pendingKeyClear = null;
    });
}

export interface BuildFormDataOptions {
  /** Include CSRF token in params. Default true. Set false for GET requests. */
  includeCsrfToken?: boolean;
}

/**
 * Build form data with nested bracket notation (Neos Flow format).
 * Flattens nested objects/arrays into URL-encoded form parameters.
 */
export function buildFormData(
  data: Record<string, unknown>,
  options: BuildFormDataOptions = {},
): URLSearchParams {
  const { includeCsrfToken = true } = options;
  const params = new URLSearchParams();
  // Track objects in current path to detect true circular references
  const pathStack = new Set<object>();

  function flatten(obj: unknown, prefix: string, depth: number): void {
    // Prevent infinite recursion from deeply nested structures
    if (depth > MAX_DEPTH) {
      throw new Error(
        `Form data exceeds maximum nesting depth of ${MAX_DEPTH}`,
      );
    }

    if (obj === null || obj === undefined) return;

    if (typeof obj === "object") {
      // Detect circular references (object appearing in its own ancestry)
      if (pathStack.has(obj)) {
        throw new Error("Circular reference detected in form data");
      }
      pathStack.add(obj);

      try {
        if (Array.isArray(obj)) {
          obj.forEach((item: unknown, index: number) => {
            flatten(item, `${prefix}[${index}]`, depth + 1);
          });
        } else {
          Object.entries(obj as Record<string, unknown>).forEach(
            ([key, value]) => {
              flatten(value, prefix ? `${prefix}[${key}]` : key, depth + 1);
            },
          );
        }
      } finally {
        // Remove from path after processing to allow shared references
        pathStack.delete(obj);
      }
    } else {
      params.append(prefix, String(obj));
    }
  }

  Object.entries(data).forEach(([key, value]) => {
    flatten(value, key, 0);
  });

  // Only include CSRF token for state-changing requests (POST/PUT/DELETE).
  // GET requests should not include CSRF tokens in URLs as they can leak
  // through browser history, server logs, referer headers, and proxy logs.
  if (includeCsrfToken && csrfToken) {
    params.append("__csrfToken", csrfToken);
  }

  return params;
}
