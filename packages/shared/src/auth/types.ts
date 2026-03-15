/**
 * Shared authentication types.
 *
 * These types are platform-agnostic and used by both web and mobile.
 * Domain types (OccupationType, Occupation, UserProfile) live here as the
 * canonical source and are re-exported by stores/auth.ts for backward compat.
 */

// ============================================================================
// Domain Types - User occupations and profiles
// ============================================================================

/**
 * Occupation types for volleyball referees and administrators.
 */
export type OccupationType = 'referee' | 'linesmen' | 'player' | 'clubAdmin' | 'associationAdmin'

/**
 * User occupation (role within an association or club).
 */
export interface Occupation {
  /** Unique identifier for this occupation */
  id: string
  /** Type of occupation */
  type: OccupationType
  /** Association code (e.g., 'SV', 'RVNO', 'RVSZ') */
  associationCode?: string
  /** Association name */
  associationName?: string
  /** Club name (for club-level occupations) */
  clubName?: string
  /** Referee level (e.g., 'National', 'Regional') */
  level?: string
}

/**
 * User profile information.
 */
export interface UserProfile {
  /** Unique identifier (SwissVolley person ID) */
  id: string
  /** First name */
  firstName: string
  /** Last name */
  lastName: string
  /** Email address */
  email?: string
  /** SwissVolley license number */
  svNumber?: string
  /** User's occupations/roles */
  occupations: Occupation[]
  /** Profile picture URL */
  profilePictureUrl?: string
}

/**
 * Authentication error details.
 */
export interface AuthError {
  /** Error message */
  message: string
  /** Error code (for programmatic handling) */
  code?: 'invalid_credentials' | 'session_expired' | 'network_error' | 'locked' | 'unknown'
  /** Seconds until lockout expires (for rate limiting) */
  lockedUntilSeconds?: number
}

/**
 * Authentication status states.
 */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error'

/**
 * Data source for assignments and compensations.
 * - 'api': Real SwissVolley API (full authentication)
 * - 'demo': Demo mode with simulated data
 * - 'calendar': Calendar mode with read-only iCal feed access
 */
export type DataSource = 'api' | 'demo' | 'calendar'

// ============================================================================
// Auth Flow Types
// ============================================================================

/**
 * Login form fields extracted from the Neos Flow login page HTML.
 * The framework requires these fields for CSRF protection.
 */
export interface LoginFormFields {
  trustedProperties: string
  referrerPackage: string
  referrerSubpackage: string
  referrerController: string
  referrerAction: string
  referrerArguments: string
}

/**
 * Result of a login attempt.
 */
export type LoginResult =
  | { success: true; csrfToken: string; dashboardHtml: string }
  | { success: false; error: string; lockedUntil?: number }

/**
 * Represents an inflated association value with full details.
 */
export interface InflatedAssociationValue {
  __identity?: string
  name?: string
  shortName?: string
  /** Association identifier code (e.g., "912000" for SVRZ) */
  identifier?: string
  /**
   * Origin ID to distinguish regional vs national associations.
   * 0 = national (Swiss Volley), >0 = regional (e.g., 12 for SVRZ)
   */
  originId?: number
}

/**
 * Represents an association that a user is a member of.
 * All fields are optional because the API may return incomplete items.
 */
export interface AttributeValue {
  __identity?: string
  attributeIdentifier?: string
  roleIdentifier?: string
  /**
   * Domain model type - used to distinguish association memberships from boolean flags.
   * For associations: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation"
   * For player roles: "boolean"
   */
  type?: string
  /** UUID reference to the association entity */
  value?: string
  /**
   * Inflated value containing association details.
   * Can be an object with association info, or a primitive value (boolean, null, string, number)
   * for certain attribute types like boolean player flags.
   */
  inflatedValue?: InflatedAssociationValue | boolean | null | string | number
}

/**
 * Definition of a role in the VolleyManager system.
 */
export interface RoleDefinition {
  identifier: string
  name?: string
  packageKey?: string
}

/**
 * The activeParty data embedded in VolleyManager HTML pages.
 * Contains user context including association memberships and roles.
 */
export interface ActiveParty {
  __identity?: string
  eligibleAttributeValues?: AttributeValue[]
  eligibleRoles?: Record<string, RoleDefinition>
  activeAttributeValue?: AttributeValue
  activeRoleIdentifier?: string
  groupedEligibleAttributeValues?: AttributeValue[]
}

/**
 * Configuration for the auth service.
 */
export interface AuthServiceConfig {
  /** Base URL for API requests (e.g., proxy URL) */
  apiBaseUrl: string
  /** Function to get session headers (e.g., X-Session-Token) */
  getSessionHeaders?: () => Record<string, string>
  /** Function to capture session token from response */
  captureSessionToken?: (response: Response) => void
  /**
   * Delay in ms to allow browser to process Set-Cookie headers after redirects.
   * Increase this value if cookies are not being properly set on slower devices/networks.
   * @default 100
   */
  cookieProcessingDelayMs?: number
  /** Logger for debug output */
  logger?: {
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
  }
}

/**
 * Platform-agnostic authentication provider interface.
 *
 * Defines the contract for authentication operations. The concrete
 * implementation (e.g., createAuthService) handles the protocol-specific
 * details (HTML form parsing, CSRF, redirect handling).
 */
export interface AuthProvider {
  /** Authenticate with credentials and return a session token. */
  login(username: string, password: string): Promise<LoginResult>
  /** End the current session. */
  logout(): Promise<void>
  /** Check if the current session is still valid. */
  checkSession(): Promise<{
    valid: boolean
    csrfToken?: string
    activeParty?: ActiveParty | null
  }>
}

/**
 * HTTP status codes used in auth flow.
 */
export const HTTP_STATUS = {
  OK: 200,
  REDIRECT_MIN: 300,
  REDIRECT_MAX: 400,
  LOCKED: 423,
} as const

/**
 * API endpoints for authentication.
 */
export const AUTH_ENDPOINTS = {
  LOGIN_PAGE: '/login',
  AUTHENTICATE: '/sportmanager.security/authentication/authenticate',
  LOGOUT: '/logout',
  DASHBOARD: '/sportmanager.volleyball/main/dashboard',
} as const
