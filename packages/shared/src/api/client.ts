/**
 * Platform-agnostic API client interface for VolleyKit.
 *
 * This module defines the contract for data-access clients without
 * platform-specific implementations. The actual implementation differs between:
 * - Web: Uses fetch with Vite proxy and CSRF token management
 * - Mobile: Uses fetch with native credential storage
 *
 * Authentication is handled separately by AuthService (see auth/service.ts).
 */

import type { SearchConfiguration } from './queryKeys'
import type {
  Assignment,
  CompensationRecord,
  GameExchange,
  AssociationSettings,
  Season,
  ConvocationCompensationDetailed,
  Scoresheet,
  ScoresheetValidation,
  FileResource,
  NominationList,
  NominationListResponse,
  GameDetails,
  PossibleNominationsResponse,
  PersonSearchResponse,
  RefereeBackupEntry,
} from './validation'

// Re-export types from validation for convenience
export type {
  Assignment,
  CompensationRecord,
  GameExchange,
  AssociationSettings,
  Season,
  ConvocationCompensationDetailed,
  Scoresheet,
  ScoresheetValidation,
  FileResource,
  NominationList,
  NominationListResponse,
  GameDetails,
  PossibleNominationsResponse,
  PersonSearchResponse,
  RefereeBackupEntry,
  SearchConfiguration,
}

/**
 * API client configuration.
 */
export interface ApiClientConfig {
  /** Base URL for API requests */
  baseUrl: string
  /** Optional proxy URL for CORS handling */
  proxyUrl?: string
  /** Custom headers to include in requests */
  headers?: Record<string, string>
  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * API error structure.
 */
export interface ApiError {
  /** HTTP status code */
  status: number
  /** Error message */
  message: string
  /** Optional error code */
  code?: string
  /** Original error for debugging */
  cause?: unknown
}

/**
 * Type-safe API result.
 */
export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError }

/**
 * Paginated response structure from the API.
 */
export interface PaginatedResponse<T> {
  items: T[]
  totalItemsCount: number
}

/**
 * Coach assignment identifiers for nomination list operations.
 */
export interface CoachIds {
  head?: string
  firstAssistant?: string
  secondAssistant?: string
}

/**
 * Platform-agnostic API client interface.
 *
 * Defines the contract for all data-access operations. Each platform provides
 * its own implementation (real API, demo mock, calendar feed, etc.).
 *
 * Authentication is handled separately by AuthService.
 */
export interface ApiClient {
  // Assignments
  searchAssignments(config?: SearchConfiguration): Promise<PaginatedResponse<Assignment>>
  getAssignmentDetails(convocationId: string, properties: string[]): Promise<Assignment>

  // Compensations
  searchCompensations(config?: SearchConfiguration): Promise<PaginatedResponse<CompensationRecord>>
  getCompensationDetails(compensationId: string): Promise<ConvocationCompensationDetailed>
  updateCompensation(
    compensationId: string,
    data: { distanceInMetres?: number; correctionReason?: string }
  ): Promise<void>

  // Exchanges
  searchExchanges(config?: SearchConfiguration): Promise<PaginatedResponse<GameExchange>>
  applyForExchange(exchangeId: string): Promise<PickExchangeResponse>
  addToExchange(convocationId: string): Promise<void>
  removeOwnExchange(convocationId: string): Promise<void>

  // Settings
  getAssociationSettings(): Promise<AssociationSettings>
  getActiveSeason(): Promise<Season>

  // Person search
  searchPersons(
    filters: { firstName?: string; lastName?: string; yearOfBirth?: string },
    options?: { offset?: number; limit?: number }
  ): Promise<PersonSearchResponse>

  // Game validation
  getGameWithScoresheet(gameId: string): Promise<GameDetails>
  getPossiblePlayerNominations(
    nominationListId: string,
    options?: { onlyFromMyTeam?: boolean; onlyRelevantGender?: boolean }
  ): Promise<PossibleNominationsResponse>
  updateNominationList(
    nominationListId: string,
    gameId: string,
    teamId: string,
    playerNominationIds: string[],
    coachIds?: CoachIds
  ): Promise<NominationList>
  finalizeNominationList(
    nominationListId: string,
    gameId: string,
    teamId: string,
    playerNominationIds: string[],
    validationId?: string,
    coachIds?: CoachIds
  ): Promise<NominationListResponse>

  // Scoresheet
  updateScoresheet(
    scoresheetId: string | undefined,
    gameId: string,
    scorerPersonId: string,
    isSimpleScoresheet?: boolean,
    fileResourceId?: string
  ): Promise<Scoresheet>
  validateScoresheet(
    gameId: string,
    scorerPersonId: string,
    isSimpleScoresheet?: boolean
  ): Promise<ScoresheetValidation>
  finalizeScoresheet(
    scoresheetId: string,
    gameId: string,
    scorerPersonId: string,
    fileResourceId: string,
    validationId?: string,
    isSimpleScoresheet?: boolean
  ): Promise<Scoresheet>

  // File upload
  uploadResource(file: File): Promise<FileResource[]>

  // Role management
  switchRoleAndAttribute(attributeValueId: string): Promise<void>

  // Referee backup
  searchRefereeBackups(config?: SearchConfiguration): Promise<PaginatedResponse<RefereeBackupEntry>>
}

/**
 * Response from applying for/picking a referee game exchange.
 * Matches the PickExchangeResponse schema from the OpenAPI spec.
 */
export interface PickExchangeResponse {
  refereeGameExchange: {
    __identity: string
    status: 'open' | 'applied' | 'closed'
    refereePosition: string
    submittingType: 'referee' | 'admin'
    submittedAt: string
    appliedAt: string | null
    [key: string]: unknown
  }
}

/**
 * Login response data.
 */
export interface LoginResponse {
  success: boolean
  user?: UserData
  error?: string
  locked?: boolean
  lockoutSeconds?: number
}

/**
 * User data from login response.
 */
export interface UserData {
  id: string
  username: string
  firstName?: string
  lastName?: string
  svNumber?: string
  occupations: OccupationData[]
}

// OccupationType is defined in auth/types.ts - re-export it here for API consumers
import type { OccupationType } from '../auth/types'
export type { OccupationType }

/**
 * User occupation/role data.
 */
export interface OccupationData {
  id: string
  type: OccupationType
  associationCode: string
  associationName?: string
  level?: string
}

/**
 * Data for updating compensation.
 */
export interface CompensationUpdateData {
  kilometers?: number
  reason?: string
}

/**
 * Creates an API error from various error types.
 */
export function createApiError(
  status: number,
  message: string,
  code?: string,
  cause?: unknown
): ApiError {
  return { status, message, code, cause }
}

/**
 * Type guard for API errors.
 */
export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'status' in error && 'message' in error
}

/**
 * Wraps a promise-returning function to return ApiResult.
 */
export async function wrapApiCall<T>(fn: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (error) {
    if (isApiError(error)) {
      return { data: null, error }
    }
    return {
      data: null,
      error: createApiError(
        500,
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        error
      ),
    }
  }
}

/**
 * HTTP status codes for common API responses.
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const
