/**
 * Authentication module.
 *
 * Platform-agnostic authentication utilities used by both web and mobile.
 */

// Types
export type {
  LoginFormFields,
  LoginResult,
  ActiveParty,
  AttributeValue,
  InflatedAssociationValue,
  RoleDefinition,
  AuthServiceConfig,
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
