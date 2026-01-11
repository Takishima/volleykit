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
 * IMPORTANT: This token is persisted to localStorage to survive PWA restarts.
 * iOS Safari PWA mode loses cookies when the app is closed, so we need to
 * store the session token client-side and send it with each request.
 */
const SESSION_TOKEN_STORAGE_KEY = "volleykit-session-token";

/**
 * In-memory cache for the session token (for performance).
 * Initialized lazily from localStorage on first access.
 */
let sessionTokenCache: string | null | undefined = undefined;

export function setSessionToken(token: string | null) {
  sessionTokenCache = token;
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    }
  } catch {
    // localStorage may not be available (e.g., private browsing)
  }
}

export function getSessionToken(): string | null {
  // Lazy initialization from localStorage
  if (sessionTokenCache === undefined) {
    try {
      sessionTokenCache = localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    } catch {
      // localStorage may not be available
      sessionTokenCache = null;
    }
  }
  return sessionTokenCache;
}

export function clearSessionToken() {
  sessionTokenCache = null;
  try {
    localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {
    // localStorage may not be available
  }
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
