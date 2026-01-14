/**
 * Platform-agnostic API client interface for VolleyKit.
 *
 * This module defines the contract for API clients without platform-specific
 * implementations. The actual implementation differs between:
 * - Web: Uses fetch with Vite proxy and CSRF token management
 * - Mobile: Uses fetch with native credential storage
 *
 * Extracted from web-app/src/api/client.ts
 */

import type { SearchConfiguration } from './queryKeys';
import type {
  Assignment,
  CompensationRecord,
  GameExchange,
  AssociationSettings,
  Season,
} from './validation';

// Re-export types from validation for convenience
export type {
  Assignment,
  CompensationRecord,
  GameExchange,
  AssociationSettings,
  Season,
  SearchConfiguration,
};

/**
 * API client configuration.
 */
export interface ApiClientConfig {
  /** Base URL for API requests */
  baseUrl: string;
  /** Optional proxy URL for CORS handling */
  proxyUrl?: string;
  /** Custom headers to include in requests */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * API error structure.
 */
export interface ApiError {
  /** HTTP status code */
  status: number;
  /** Error message */
  message: string;
  /** Optional error code */
  code?: string;
  /** Original error for debugging */
  cause?: unknown;
}

/**
 * Type-safe API result.
 */
export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

/**
 * Paginated response structure from the API.
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalItemsCount: number;
}

/**
 * Platform-agnostic API client interface.
 * Implementations provide platform-specific fetch and credential handling.
 */
export interface ApiClient {
  // Authentication
  login(username: string, password: string): Promise<ApiResult<LoginResponse>>;
  logout(): Promise<void>;
  checkSession(): Promise<boolean>;

  // Assignments
  searchAssignments(
    config: SearchConfiguration
  ): Promise<PaginatedResponse<Assignment>>;
  getAssignmentDetails(id: string, expand?: string[]): Promise<Assignment>;

  // Compensations
  searchCompensations(
    config: SearchConfiguration
  ): Promise<PaginatedResponse<CompensationRecord>>;
  updateCompensation(
    id: string,
    data: CompensationUpdateData
  ): Promise<CompensationRecord>;

  // Exchanges
  searchExchanges(
    config: SearchConfiguration
  ): Promise<PaginatedResponse<GameExchange>>;
  applyForExchange(exchangeId: string): Promise<void>;
  withdrawFromExchange(exchangeId: string): Promise<void>;
  addToExchange(assignmentId: string, reason?: string): Promise<void>;

  // Settings
  getAssociationSettings(): Promise<AssociationSettings>;
  getActiveSeason(): Promise<Season>;
}

/**
 * Login response data.
 */
export interface LoginResponse {
  success: boolean;
  user?: UserData;
  error?: string;
  locked?: boolean;
  lockoutSeconds?: number;
}

/**
 * User data from login response.
 */
export interface UserData {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  svNumber?: string;
  occupations: OccupationData[];
}

/**
 * User occupation/role data.
 */
export interface OccupationData {
  id: string;
  type: OccupationType;
  associationCode: string;
  associationName?: string;
  level?: string;
}

/**
 * Occupation types in the system.
 */
export type OccupationType =
  | 'referee'
  | 'linesmen'
  | 'player'
  | 'clubAdmin'
  | 'associationAdmin';

/**
 * Data for updating compensation.
 */
export interface CompensationUpdateData {
  kilometers?: number;
  reason?: string;
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
  return { status, message, code, cause };
}

/**
 * Type guard for API errors.
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  );
}

/**
 * Wraps a promise-returning function to return ApiResult.
 */
export async function wrapApiCall<T>(
  fn: () => Promise<T>
): Promise<ApiResult<T>> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    if (isApiError(error)) {
      return { data: null, error };
    }
    return {
      data: null,
      error: createApiError(
        500,
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        error
      ),
    };
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
} as const;
