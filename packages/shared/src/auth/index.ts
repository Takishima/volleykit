/**
 * Authentication module.
 *
 * Platform-agnostic authentication utilities used by both web and mobile.
 */

// Domain types (canonical source)
export type {
  OccupationType,
  Occupation,
  UserProfile,
  AuthError,
  AuthStatus,
  DataSource,
} from './types'

// Auth flow types
export type {
  LoginFormFields,
  LoginResult,
  ActiveParty,
  AttributeValue,
  InflatedAssociationValue,
  RoleDefinition,
  AuthServiceConfig,
  AuthProvider,
} from './types'

export { HTTP_STATUS, AUTH_ENDPOINTS } from './types'

// Parsers
export {
  extractLoginFormFields,
  extractCsrfTokenFromPage,
  extractActivePartyFromHtml,
  isDashboardHtmlContent,
  isLoginPageHtmlContent,
  isInflatedObject,
  deriveAssociationCodeFromName,
  parseOccupationFromActiveParty,
  parseOccupationsFromActiveParty,
  filterRefereeAssociations,
  hasMultipleAssociations,
  analyzeAuthResponseHtml,
} from './parsers'

// Service
export { createAuthService, type AuthService } from './service'
