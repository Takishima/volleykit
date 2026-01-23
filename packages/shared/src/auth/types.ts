/**
 * Shared authentication types.
 *
 * These types are platform-agnostic and used by both web and mobile.
 */

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
