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

/**
 * Header for iOS Safari PWA session token capture.
 * When this header is present on a request, redirect responses with session tokens
 * are converted to JSON so the client can capture the token.
 *
 * This is necessary because fetch with `redirect: 'manual'` returns an opaque redirect
 * for cross-origin requests, hiding all response headers including X-Session-Token.
 */
export const CAPTURE_SESSION_TOKEN_HEADER = "X-Capture-Session-Token";

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

// =============================================================================
// Auth Lockout Configuration
// =============================================================================

/** Maximum failed login attempts before lockout */
export const AUTH_LOCKOUT_MAX_ATTEMPTS = 5;

/** Initial lockout duration in seconds (30 seconds) */
export const AUTH_LOCKOUT_INITIAL_DURATION_SECONDS = 30;

/** Maximum lockout duration in seconds (5 minutes) */
export const AUTH_LOCKOUT_MAX_DURATION_SECONDS = 300;

/** Time window for counting failed attempts in seconds (15 minutes) */
export const AUTH_LOCKOUT_ATTEMPT_WINDOW_SECONDS = 900;

/** TTL for lockout KV entries in seconds (1 hour) - cleanup old entries */
export const AUTH_LOCKOUT_KV_TTL_SECONDS = 3600;

// =============================================================================
// Auth Lockout Types
// =============================================================================

/**
 * Stored lockout state in KV.
 */
export interface AuthLockoutState {
  /** Number of failed attempts in current window */
  failedAttempts: number;
  /** Timestamp of first failed attempt in current window (ms) */
  firstAttemptAt: number;
  /** Timestamp when lockout expires (ms), null if not locked */
  lockedUntil: number | null;
  /** Number of times user has been locked out (for progressive lockout) */
  lockoutCount: number;
}

/**
 * Result of checking lockout status.
 */
export interface LockoutCheckResult {
  /** Whether the IP is currently locked out */
  isLocked: boolean;
  /** Seconds remaining until lockout expires (0 if not locked) */
  remainingSeconds: number;
  /** Current number of failed attempts */
  failedAttempts: number;
  /** Number of attempts remaining before lockout (0 if locked) */
  attemptsRemaining: number;
}

/**
 * KV namespace interface for auth lockout storage.
 */
export interface AuthLockoutKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

// =============================================================================
// Auth Lockout Functions
// =============================================================================

/**
 * Create the KV key for an IP address.
 */
export function getAuthLockoutKey(ip: string): string {
  return `auth:lockout:${ip}`;
}

/**
 * Validate that an object has the expected AuthLockoutState shape.
 * Returns true if valid, false if corrupted or malformed.
 */
export function isValidAuthLockoutState(obj: unknown): obj is AuthLockoutState {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const state = obj as Record<string, unknown>;

  return (
    typeof state.failedAttempts === "number" &&
    typeof state.firstAttemptAt === "number" &&
    (state.lockedUntil === null || typeof state.lockedUntil === "number") &&
    typeof state.lockoutCount === "number"
  );
}

/**
 * Get the current lockout state for an IP address.
 */
export async function getAuthLockoutState(
  kv: AuthLockoutKV,
  ip: string,
): Promise<AuthLockoutState | null> {
  const key = getAuthLockoutKey(ip);
  const data = await kv.get(key);
  if (!data) return null;

  try {
    const parsed: unknown = JSON.parse(data);
    if (!isValidAuthLockoutState(parsed)) {
      // Corrupted data - treat as no state (will be overwritten on next attempt)
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check if an IP is currently locked out.
 */
export function checkLockoutStatus(
  state: AuthLockoutState | null,
  now: number = Date.now(),
): LockoutCheckResult {
  if (!state) {
    return {
      isLocked: false,
      remainingSeconds: 0,
      failedAttempts: 0,
      attemptsRemaining: AUTH_LOCKOUT_MAX_ATTEMPTS,
    };
  }

  // Check if locked and lockout hasn't expired
  if (state.lockedUntil && state.lockedUntil > now) {
    const remainingMs = state.lockedUntil - now;
    return {
      isLocked: true,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      failedAttempts: state.failedAttempts,
      attemptsRemaining: 0,
    };
  }

  // Check if attempt window has expired (reset counter)
  const windowExpiry = state.firstAttemptAt + AUTH_LOCKOUT_ATTEMPT_WINDOW_SECONDS * 1000;
  if (now > windowExpiry) {
    return {
      isLocked: false,
      remainingSeconds: 0,
      failedAttempts: 0,
      attemptsRemaining: AUTH_LOCKOUT_MAX_ATTEMPTS,
    };
  }

  // Not locked, return current attempt count
  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: state.failedAttempts,
    attemptsRemaining: Math.max(0, AUTH_LOCKOUT_MAX_ATTEMPTS - state.failedAttempts),
  };
}

/**
 * Calculate progressive lockout duration based on lockout count.
 * Doubles each time: 30s -> 60s -> 120s -> 240s -> 300s (max)
 */
export function calculateLockoutDuration(lockoutCount: number): number {
  const duration = AUTH_LOCKOUT_INITIAL_DURATION_SECONDS * Math.pow(2, lockoutCount);
  return Math.min(duration, AUTH_LOCKOUT_MAX_DURATION_SECONDS);
}

/**
 * Record a failed login attempt and update lockout state.
 * Returns the updated lockout check result.
 */
export async function recordFailedAttempt(
  kv: AuthLockoutKV,
  ip: string,
  now: number = Date.now(),
): Promise<LockoutCheckResult> {
  const state = await getAuthLockoutState(kv, ip);
  const key = getAuthLockoutKey(ip);

  let newState: AuthLockoutState;

  if (!state) {
    // First failed attempt
    newState = {
      failedAttempts: 1,
      firstAttemptAt: now,
      lockedUntil: null,
      lockoutCount: 0,
    };
  } else {
    // Check if attempt window has expired
    const windowExpiry = state.firstAttemptAt + AUTH_LOCKOUT_ATTEMPT_WINDOW_SECONDS * 1000;
    if (now > windowExpiry) {
      // Reset counter, start new window
      newState = {
        failedAttempts: 1,
        firstAttemptAt: now,
        lockedUntil: null,
        lockoutCount: state.lockoutCount, // Keep lockout count for progressive duration
      };
    } else if (state.lockedUntil && state.lockedUntil > now) {
      // Still locked, don't count this attempt (they shouldn't be able to try)
      return checkLockoutStatus(state, now);
    } else {
      // Increment failed attempts
      newState = {
        ...state,
        failedAttempts: state.failedAttempts + 1,
        lockedUntil: null,
      };
    }
  }

  // Check if we should lock out
  if (newState.failedAttempts >= AUTH_LOCKOUT_MAX_ATTEMPTS) {
    const lockoutDuration = calculateLockoutDuration(newState.lockoutCount);
    newState.lockedUntil = now + lockoutDuration * 1000;
    newState.lockoutCount += 1;
  }

  // Save state to KV
  await kv.put(key, JSON.stringify(newState), {
    expirationTtl: AUTH_LOCKOUT_KV_TTL_SECONDS,
  });

  return checkLockoutStatus(newState, now);
}

/**
 * Clear lockout state after successful login.
 */
export async function clearAuthLockout(kv: AuthLockoutKV, ip: string): Promise<void> {
  const key = getAuthLockoutKey(ip);
  await kv.delete(key);
}

/**
 * Check if a response indicates a failed login attempt.
 * The volleymanager API redirects back to login page on failure,
 * or returns HTML with error indicators.
 */
export function isFailedLoginResponse(
  response: { status: number; headers: { get: (name: string) => string | null } },
  responseBody?: string,
): boolean {
  // Check for redirect back to login page
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location");
    if (location) {
      const normalizedLocation = location.toLowerCase();
      // Redirect back to login indicates failure
      if (
        normalizedLocation.includes("/login") ||
        normalizedLocation.includes("authentication") ||
        normalizedLocation.endsWith("/")
      ) {
        return true;
      }
    }
  }

  // Check for 401/403 responses
  if (response.status === 401 || response.status === 403) {
    return true;
  }

  // Check response body for error indicators
  if (responseBody) {
    const lowerBody = responseBody.toLowerCase();
    // Look for error indicators in the HTML
    if (lowerBody.includes('color="error"') || lowerBody.includes('color: "error"')) {
      return true;
    }
    // Check if we got a login form back (means credentials were rejected)
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

/**
 * Check if a response indicates a successful login.
 * Successful logins redirect to the dashboard (any path except login/auth pages).
 *
 * Logic: A 3xx redirect from auth that does NOT go back to login/auth pages
 * is considered successful. This is more robust than looking for specific
 * dashboard paths since the upstream server may redirect to various paths.
 */
export function isSuccessfulLoginResponse(
  response: { status: number; headers: { get: (name: string) => string | null } },
): boolean {
  // Check for session cookies - if present, login succeeded regardless of redirect target
  // This is the most reliable indicator as the server sets session cookies on successful auth
  const setCookie = response.headers.get("Set-Cookie");
  const hasSessionCookie = setCookie && setCookie.toLowerCase().includes("neos_session");

  // Successful login results in a redirect to dashboard
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location");

    // If session cookie is set, login succeeded even if redirecting to root
    // The server may redirect to / or /indoor/ after successful authentication
    if (hasSessionCookie) {
      return true;
    }

    if (location) {
      const normalizedLocation = location.toLowerCase();

      // Failed login redirects back to login page or root
      // Check for patterns that indicate authentication failure
      if (
        normalizedLocation.endsWith("/login") ||
        normalizedLocation.includes("/login?") ||
        normalizedLocation.includes("/authentication") ||
        // Root path redirect without session cookie indicates session creation failed
        normalizedLocation.match(/^https?:\/\/[^/]+\/?$/)
      ) {
        return false;
      }

      // Any other redirect from auth endpoint is considered success
      // This includes redirects to /indoor/, /sportmanager.volleyball/, etc.
      return true;
    }
  }

  // 200 OK with session cookies also indicates success
  if (response.status === 200 && hasSessionCookie) {
    return true;
  }

  return false;
}

/**
 * Check if a request is an authentication request.
 */
export function isAuthRequest(pathname: string, method: string): boolean {
  // POST to /login or authentication endpoints
  if (method !== "POST" && method !== "GET") {
    return false;
  }

  return (
    pathname === "/login" ||
    pathname.includes("sportmanager.security/authentication")
  );
}
