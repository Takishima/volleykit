/**
 * Auth lockout KV logic for the VolleyKit CORS Proxy Worker.
 */

// =============================================================================
// Auth Lockout Configuration
// =============================================================================

/** Maximum failed login attempts before lockout */
export const AUTH_LOCKOUT_MAX_ATTEMPTS = 5

/** Initial lockout duration in seconds (30 seconds) */
export const AUTH_LOCKOUT_INITIAL_DURATION_SECONDS = 30

/** Maximum lockout duration in seconds (5 minutes) */
export const AUTH_LOCKOUT_MAX_DURATION_SECONDS = 300

/** Time window for counting failed attempts in seconds (15 minutes) */
export const AUTH_LOCKOUT_ATTEMPT_WINDOW_SECONDS = 900

/** TTL for lockout KV entries in seconds (1 hour) - cleanup old entries */
export const AUTH_LOCKOUT_KV_TTL_SECONDS = 3600

// =============================================================================
// Auth Lockout Types
// =============================================================================

/**
 * Stored lockout state in KV.
 */
export interface AuthLockoutState {
  /** Number of failed attempts in current window */
  failedAttempts: number
  /** Timestamp of first failed attempt in current window (ms) */
  firstAttemptAt: number
  /** Timestamp when lockout expires (ms), null if not locked */
  lockedUntil: number | null
  /** Number of times user has been locked out (for progressive lockout) */
  lockoutCount: number
}

/**
 * Result of checking lockout status.
 */
export interface LockoutCheckResult {
  /** Whether the IP is currently locked out */
  isLocked: boolean
  /** Seconds remaining until lockout expires (0 if not locked) */
  remainingSeconds: number
  /** Current number of failed attempts */
  failedAttempts: number
  /** Number of attempts remaining before lockout (0 if locked) */
  attemptsRemaining: number
}

/**
 * KV namespace interface for auth lockout storage.
 */
export interface AuthLockoutKV {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

// =============================================================================
// Auth Lockout Functions
// =============================================================================

/**
 * Create the KV key for an IP address.
 */
export function getAuthLockoutKey(ip: string): string {
  return `auth:lockout:${ip}`
}

/**
 * Validate that an object has the expected AuthLockoutState shape.
 * Returns true if valid, false if corrupted or malformed.
 */
export function isValidAuthLockoutState(obj: unknown): obj is AuthLockoutState {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const state = obj as Record<string, unknown>

  return (
    typeof state.failedAttempts === 'number' &&
    typeof state.firstAttemptAt === 'number' &&
    (state.lockedUntil === null || typeof state.lockedUntil === 'number') &&
    typeof state.lockoutCount === 'number'
  )
}

/**
 * Get the current lockout state for an IP address.
 */
export async function getAuthLockoutState(
  kv: AuthLockoutKV,
  ip: string
): Promise<AuthLockoutState | null> {
  const key = getAuthLockoutKey(ip)
  const data = await kv.get(key)
  if (!data) return null

  try {
    const parsed: unknown = JSON.parse(data)
    if (!isValidAuthLockoutState(parsed)) {
      // Corrupted data - treat as no state (will be overwritten on next attempt)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Check if an IP is currently locked out.
 */
export function checkLockoutStatus(
  state: AuthLockoutState | null,
  now: number = Date.now()
): LockoutCheckResult {
  if (!state) {
    return {
      isLocked: false,
      remainingSeconds: 0,
      failedAttempts: 0,
      attemptsRemaining: AUTH_LOCKOUT_MAX_ATTEMPTS,
    }
  }

  // Check if locked and lockout hasn't expired
  if (state.lockedUntil && state.lockedUntil > now) {
    const remainingMs = state.lockedUntil - now
    return {
      isLocked: true,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      failedAttempts: state.failedAttempts,
      attemptsRemaining: 0,
    }
  }

  // Check if attempt window has expired (reset counter)
  const windowExpiry = state.firstAttemptAt + AUTH_LOCKOUT_ATTEMPT_WINDOW_SECONDS * 1000
  if (now > windowExpiry) {
    return {
      isLocked: false,
      remainingSeconds: 0,
      failedAttempts: 0,
      attemptsRemaining: AUTH_LOCKOUT_MAX_ATTEMPTS,
    }
  }

  // Not locked, return current attempt count
  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: state.failedAttempts,
    attemptsRemaining: Math.max(0, AUTH_LOCKOUT_MAX_ATTEMPTS - state.failedAttempts),
  }
}

/**
 * Calculate progressive lockout duration based on lockout count.
 * Doubles each time: 30s -> 60s -> 120s -> 240s -> 300s (max)
 */
export function calculateLockoutDuration(lockoutCount: number): number {
  const duration = AUTH_LOCKOUT_INITIAL_DURATION_SECONDS * Math.pow(2, lockoutCount)
  return Math.min(duration, AUTH_LOCKOUT_MAX_DURATION_SECONDS)
}

/**
 * Record a failed login attempt and update lockout state.
 * Returns the updated lockout check result.
 */
export async function recordFailedAttempt(
  kv: AuthLockoutKV,
  ip: string,
  now: number = Date.now()
): Promise<LockoutCheckResult> {
  const state = await getAuthLockoutState(kv, ip)
  const key = getAuthLockoutKey(ip)

  let newState: AuthLockoutState

  if (!state) {
    // First failed attempt
    newState = {
      failedAttempts: 1,
      firstAttemptAt: now,
      lockedUntil: null,
      lockoutCount: 0,
    }
  } else {
    // Check if attempt window has expired
    const windowExpiry = state.firstAttemptAt + AUTH_LOCKOUT_ATTEMPT_WINDOW_SECONDS * 1000
    if (now > windowExpiry) {
      // Reset counter, start new window
      newState = {
        failedAttempts: 1,
        firstAttemptAt: now,
        lockedUntil: null,
        lockoutCount: state.lockoutCount, // Keep lockout count for progressive duration
      }
    } else if (state.lockedUntil && state.lockedUntil > now) {
      // Still locked, don't count this attempt (they shouldn't be able to try)
      return checkLockoutStatus(state, now)
    } else {
      // Increment failed attempts
      newState = {
        ...state,
        failedAttempts: state.failedAttempts + 1,
        lockedUntil: null,
      }
    }
  }

  // Check if we should lock out
  if (newState.failedAttempts >= AUTH_LOCKOUT_MAX_ATTEMPTS) {
    const lockoutDuration = calculateLockoutDuration(newState.lockoutCount)
    newState.lockedUntil = now + lockoutDuration * 1000
    newState.lockoutCount += 1
  }

  // Save state to KV
  await kv.put(key, JSON.stringify(newState), {
    expirationTtl: AUTH_LOCKOUT_KV_TTL_SECONDS,
  })

  return checkLockoutStatus(newState, now)
}

/**
 * Clear lockout state after successful login.
 */
export async function clearAuthLockout(kv: AuthLockoutKV, ip: string): Promise<void> {
  const key = getAuthLockoutKey(ip)
  await kv.delete(key)
}
