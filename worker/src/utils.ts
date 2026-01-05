/**
 * Utility functions for the VolleyKit CORS Proxy Worker.
 * Exported separately to allow direct testing without reimplementation.
 */

// =============================================================================
// Path Configuration Constants
// =============================================================================

/** Exact match paths (no subpaths allowed) - NOT prefixed with /api/ */
export const ALLOWED_EXACT_PATHS = ["/", "/login", "/logout"];

/** Prefix match paths that are NOT prefixed with /api/ (auth and dashboard) */
export const ALLOWED_PREFIX_PATHS_NO_API = [
  "/sportmanager.security/",
  "/sportmanager.volleyball/",
];

/** Prefix match paths that ARE prefixed with /api/ (API endpoints) */
export const ALLOWED_PREFIX_PATHS_WITH_API = [
  "/indoorvolleyball.refadmin/",
  "/sportmanager.indoorvolleyball/",
  "/sportmanager.core/",
  "/sportmanager.resourcemanagement/",
  "/sportmanager.notificationcenter/",
];

/**
 * Specific paths within NO_API prefixes that DO need the /api/ prefix.
 * These are API endpoints under packages that normally serve dashboard/auth pages.
 */
export const EXCEPTIONS_NEED_API = [
  "/sportmanager.security/api",
  "/sportmanager.volleyball/api",
];

/**
 * Specific paths within WITH_API prefixes that do NOT need the /api/ prefix.
 * These are file download endpoints that serve binary content (PDFs, etc.)
 */
export const EXCEPTIONS_NO_API = [
  "/indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses",
];

/** The correct authentication endpoint */
export const AUTH_ENDPOINT =
  "/sportmanager.security/authentication/authenticate";

/** Form field name that indicates authentication credentials are present */
export const AUTH_USERNAME_FIELD =
  "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]";

/** Custom User-Agent to identify VolleyKit traffic */
export const VOLLEYKIT_USER_AGENT =
  "VolleyKit/1.0 (PWA; https://github.com/Takishima/volleykit)";

/** Retry-After duration when service is unavailable (kill switch enabled) */
export const KILL_SWITCH_RETRY_AFTER_SECONDS = 86400; // 24 hours

// =============================================================================
// Origin Validation Functions
// =============================================================================

/**
 * Parse comma-separated allowed origins string into an array.
 */
export function parseAllowedOrigins(allowedOrigins: string): string[] {
  return allowedOrigins
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

/**
 * Validate that all origins in the array are valid URLs with http/https protocol.
 * @throws {Error} If any origin is invalid
 */
export function validateAllowedOrigins(origins: string[]): void {
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error(`Origin must use http or https protocol: ${origin}`);
      }
      if (url.pathname !== "/" || url.search || url.hash) {
        throw new Error(
          `Origin should not include path, query, or fragment: ${origin}`,
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Origin")) {
        throw e;
      }
      throw new Error(`Invalid origin format: ${origin}`);
    }
  }
}

/**
 * Check if the given origin is in the allowed origins list.
 * Case-insensitive comparison per RFC 6454.
 */
export function isAllowedOrigin(
  origin: string | null,
  allowedOrigins: string[],
): boolean {
  if (!origin) return false;
  const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();
  return allowedOrigins.some(
    (allowed) => allowed.replace(/\/$/, "").toLowerCase() === normalizedOrigin,
  );
}

// =============================================================================
// Path Validation Functions
// =============================================================================

/**
 * Check if the given pathname is in the allowed paths list.
 */
export function isAllowedPath(pathname: string): boolean {
  if (ALLOWED_EXACT_PATHS.includes(pathname)) {
    return true;
  }
  return (
    ALLOWED_PREFIX_PATHS_NO_API.some((prefix) => pathname.startsWith(prefix)) ||
    ALLOWED_PREFIX_PATHS_WITH_API.some((prefix) => pathname.startsWith(prefix))
  );
}

/**
 * Check if a path requires the /api/ prefix when forwarding to the target host.
 * API endpoints need this prefix, while auth/dashboard endpoints do not.
 */
export function requiresApiPrefix(pathname: string): boolean {
  if (EXCEPTIONS_NO_API.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  if (EXCEPTIONS_NEED_API.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return ALLOWED_PREFIX_PATHS_WITH_API.some((prefix) =>
    pathname.startsWith(prefix),
  );
}

/**
 * Validate pathname to prevent path traversal attacks.
 * Returns true if the path is safe, false if it contains suspicious patterns.
 *
 * Note: Backslashes (\) are ALLOWED because the TYPO3 Neos/Flow backend uses
 * them as namespace separators in controller paths.
 */
export function isPathSafe(pathname: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }

  if (
    decoded.includes("..") ||
    decoded.includes("//") ||
    decoded.includes("\0")
  ) {
    return false;
  }

  return true;
}

// =============================================================================
// Authentication Functions
// =============================================================================

/**
 * Check if request body contains authentication credentials.
 * Detects both Neos Flow format and simple HTML form format.
 */
export function hasAuthCredentials(body: string): boolean {
  const encodedField = encodeURIComponent(AUTH_USERNAME_FIELD);
  if (body.includes(AUTH_USERNAME_FIELD) || body.includes(encodedField)) {
    return true;
  }

  const params = new URLSearchParams(body);
  return params.has("username") && params.has("password");
}

/**
 * Transform simple form fields to Neos Flow authentication format.
 */
export function transformAuthFormData(body: string): string {
  const encodedField = encodeURIComponent(AUTH_USERNAME_FIELD);
  if (body.includes(AUTH_USERNAME_FIELD) || body.includes(encodedField)) {
    return body;
  }

  const params = new URLSearchParams(body);
  const username = params.get("username");
  const password = params.get("password");

  if (!username || !password) {
    return body;
  }

  const neosParams = new URLSearchParams();
  neosParams.set(
    "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]",
    username,
  );
  neosParams.set(
    "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][password]",
    password,
  );

  for (const [key, value] of params.entries()) {
    if (key !== "username" && key !== "password") {
      neosParams.set(key, value);
    }
  }

  return neosParams.toString();
}

// =============================================================================
// iCal Functions
// =============================================================================

/**
 * Validate iCal referee code format.
 * Codes must be exactly 6 alphanumeric characters.
 */
export function isValidICalCode(code: string): boolean {
  return /^[A-Za-z0-9]{6}$/.test(code);
}

/**
 * Extract iCal referee code from path.
 * Matches paths like /iCal/referee/ABC123
 */
export function extractICalCode(pathname: string): string | null {
  const match = pathname.match(/^\/iCal\/referee\/([^/]+)$/);
  return match ? match[1] : null;
}

// =============================================================================
// Cookie Functions
// =============================================================================

/**
 * Rewrite cookie for cross-origin compatibility.
 * Removes Domain, adds SameSite=None, Secure, and Partitioned.
 */
export function rewriteCookie(cookie: string): string {
  return (
    cookie
      .replace(/Domain=[^;]+;?\s*/gi, "")
      .replace(/;\s*Secure\s*(;|$)/gi, "$1")
      .replace(/SameSite=[^;]+;?\s*/gi, "")
      .replace(/;\s*Partitioned\s*(;|$)/gi, "$1") +
    "; SameSite=None; Secure; Partitioned"
  );
}

// =============================================================================
// Cache Control Functions
// =============================================================================

/**
 * Cache control headers to prevent stale data from being served.
 * Dynamic content (API responses, HTML pages) should never be cached.
 */
export function noCacheHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  };
}

/**
 * Check if a response contains dynamic content that should not be cached.
 * This includes HTML pages (login, dashboard) and API JSON responses.
 */
export function isDynamicContent(contentType: string | null): boolean {
  if (!contentType) return true;

  const normalizedType = contentType.toLowerCase();
  return (
    normalizedType.includes("text/html") ||
    normalizedType.includes("application/json") ||
    normalizedType.includes("application/x-www-form-urlencoded")
  );
}

/**
 * Response-like interface for session detection.
 * Used to allow testing without full Response objects.
 */
export interface SessionCheckResponse {
  status: number;
  headers: { get: (name: string) => string | null };
}

/**
 * Check if the response appears to be from an expired or invalid session.
 * The upstream server may return a login redirect or error page when
 * the session has expired, which we should detect and not cache.
 */
export function detectSessionIssue(
  response: SessionCheckResponse,
  responseBody?: string,
): boolean {
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location");
    if (location) {
      const normalizedLocation = location.toLowerCase();
      if (
        normalizedLocation.includes("/login") ||
        normalizedLocation.endsWith("/") ||
        normalizedLocation.includes("authentication")
      ) {
        return true;
      }
    }
  }

  if (response.status === 401 || response.status === 403) {
    return true;
  }

  if (responseBody) {
    const lowerBody = responseBody.toLowerCase();
    if (
      lowerBody.includes('name="username"') &&
      lowerBody.includes('name="password"') &&
      lowerBody.includes("login")
    ) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// URL Functions
// =============================================================================

/**
 * Extract the raw path and search from a request URL string.
 * Preserves URL encoding (important for TYPO3 Neos/Flow backslash encoding).
 */
export function extractRawPathAndSearch(requestUrlStr: string): string {
  const pathStart = requestUrlStr.indexOf(
    "/",
    requestUrlStr.indexOf("://") + 3,
  );
  return pathStart >= 0 ? requestUrlStr.substring(pathStart) : "/";
}

// =============================================================================
// Kill Switch
// =============================================================================

/**
 * Check if the kill switch is enabled.
 */
export function checkKillSwitch(env: { KILL_SWITCH?: string }): boolean {
  return env.KILL_SWITCH === "true";
}
