/**
 * Real API client for mobile app.
 *
 * Implements the mobile API client interface using the actual backend API.
 * Uses the same endpoints and form serialization as the web app.
 *
 * Resolves TODO(#775): Replace mock API client with real implementation.
 */

import Constants from 'expo-constants';
import type { SearchConfiguration } from '@volleykit/shared/api';
import type { Assignment, CompensationRecord, GameExchange } from '@volleykit/shared/api';

/**
 * API base URL for requests.
 * Uses the CORS proxy configured in app.json extra settings.
 */
const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'https://proxy.volleykit.app';

/**
 * Session token header name used by the Cloudflare Worker for iOS Safari PWA.
 */
const SESSION_TOKEN_HEADER = 'X-Session-Token';

/**
 * In-memory session token storage.
 * Managed by the auth service, shared here for API requests.
 */
let sessionToken: string | null = null;

/**
 * CSRF token for state-changing requests.
 * Extracted from the login response.
 */
let csrfToken: string | null = null;

/**
 * Set the session token (called by auth service).
 */
export function setSessionToken(token: string | null): void {
  sessionToken = token;
}

/**
 * Get the current session token.
 */
export function getSessionToken(): string | null {
  return sessionToken;
}

/**
 * Set the CSRF token (called by auth service after login).
 */
export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

/**
 * Clear all tokens (called on logout).
 */
export function clearTokens(): void {
  sessionToken = null;
  csrfToken = null;
}

/**
 * Get session headers for API requests.
 */
function getSessionHeaders(): Record<string, string> {
  return sessionToken ? { [SESSION_TOKEN_HEADER]: sessionToken } : {};
}

/**
 * Capture session token from response headers.
 */
function captureSessionToken(response: Response): void {
  const token = response.headers.get(SESSION_TOKEN_HEADER);
  if (token) {
    sessionToken = token;
  }
}

/**
 * Maximum nesting depth for form serialization.
 */
const MAX_DEPTH = 10;

/**
 * Build form data with nested bracket notation (Neos Flow format).
 */
function buildFormData(
  data: Record<string, unknown>,
  options: { includeCsrfToken?: boolean } = {}
): URLSearchParams {
  const { includeCsrfToken = true } = options;
  const params = new URLSearchParams();
  const pathStack = new Set<object>();

  function flatten(obj: unknown, prefix: string, depth: number): void {
    if (depth > MAX_DEPTH) {
      throw new Error(`Form data exceeds maximum nesting depth of ${MAX_DEPTH}`);
    }

    if (obj === null || obj === undefined) return;

    if (typeof obj === 'object') {
      if (pathStack.has(obj)) {
        throw new Error('Circular reference detected in form data');
      }
      pathStack.add(obj);

      try {
        if (Array.isArray(obj)) {
          obj.forEach((item: unknown, index: number) => {
            flatten(item, `${prefix}[${index}]`, depth + 1);
          });
        } else {
          Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
            flatten(value, prefix ? `${prefix}[${key}]` : key, depth + 1);
          });
        }
      } finally {
        pathStack.delete(obj);
      }
    } else {
      params.append(prefix, String(obj));
    }
  }

  Object.entries(data).forEach(([key, value]) => {
    flatten(value, key, 0);
  });

  if (includeCsrfToken && csrfToken) {
    params.append('__csrfToken', csrfToken);
  }

  return params;
}

/**
 * HTTP status codes for error handling.
 */
const HttpStatus = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_ACCEPTABLE: 406,
} as const;

/**
 * Generic fetch wrapper for API requests.
 */
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  let url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...getSessionHeaders(),
  };

  if (method === 'GET' && body) {
    const params = buildFormData(body, { includeCsrfToken: false });
    url = `${url}?${params.toString()}`;
  }

  if (method !== 'GET' && body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: method !== 'GET' && body ? buildFormData(body) : undefined,
  });

  captureSessionToken(response);

  if (!response.ok) {
    if (
      response.status === HttpStatus.UNAUTHORIZED ||
      response.status === HttpStatus.FORBIDDEN ||
      response.status === HttpStatus.NOT_ACCEPTABLE
    ) {
      clearTokens();
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(`${method} ${endpoint}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('Content-Type') || '';

  try {
    return await response.json();
  } catch {
    if (contentType.includes('text/html')) {
      const pathname = new URL(response.url).pathname.toLowerCase();
      const isLoginPage = pathname === '/login' || pathname.endsWith('/login');
      if (isLoginPage) {
        clearTokens();
        throw new Error('Session expired. Please log in again.');
      }
    }
    throw new Error(
      `${method} ${endpoint}: Invalid JSON response (Content-Type: ${contentType || 'unknown'})`
    );
  }
}

/**
 * Property configuration for assignments endpoint.
 */
const ASSIGNMENT_PROPERTIES = [
  'refereeConvocationStatus',
  'refereeGame.game.startingDateTime',
  'refereeGame.game.playingWeekday',
  'isOpenEntryInRefereeGameExchange',
  'confirmationStatus',
  'hasLastMessageToReferee',
  'hasLinkedDoubleConvocation',
  'refereeGame.game.encounter.teamHome.name',
  'refereeGame.game.encounter.teamAway.name',
  'refereePosition',
  'refereeGame.game.number',
  'refereeGame.game.group.phase.league.leagueCategory.name',
  'refereeGame.game.group.phase.league.gender',
  'refereeGame.game.group.name',
  'refereeGame.game.hall.name',
  'refereeGame.game.hall.primaryPostalAddress.combinedAddress',
  'refereeGame.game.hall.primaryPostalAddress.city',
  'refereeGame.game.hall.primaryPostalAddress.geographicalLocation.latitude',
  'refereeGame.game.hall.primaryPostalAddress.geographicalLocation.longitude',
  'refereeGame.isGameInFuture',
];

/**
 * Property configuration for exchanges endpoint.
 */
const EXCHANGE_PROPERTIES = [
  'refereeGame.game.startingDateTime',
  'refereeGame.game.playingWeekday',
  'submittedAt',
  'submittedByPerson',
  'submittedByPerson.displayName',
  'status',
  'refereePosition',
  'requiredRefereeLevel',
  'appliedBy.indoorReferee.person.displayName',
  'appliedAt',
  'refereeGame.game.number',
  'refereeGame.game.group.phase.league.leagueCategory.name',
  'refereeGame.game.group.phase.league.gender',
  'refereeGame.game.group.name',
  'refereeGame.game.encounter.teamHome.name',
  'refereeGame.game.encounter.teamAway.name',
  'refereeGame.game.hall.name',
  'refereeGame.game.hall.primaryPostalAddress.combinedAddress',
  'refereeGame.game.hall.primaryPostalAddress.city',
  'refereeGame.game.hall.primaryPostalAddress.geographicalLocation.latitude',
  'refereeGame.game.hall.primaryPostalAddress.geographicalLocation.longitude',
];

/**
 * Property configuration for compensations endpoint.
 */
const COMPENSATION_PROPERTIES = [
  'refereeConvocationStatus',
  'compensationDate',
  'refereeGame.game.startingDateTime',
  'refereeGame.game.playingWeekday',
  'refereeGame.game.number',
  'refereeGame.game.group.phase.league.leagueCategory.name',
  'refereeGame.game.group.name',
  'refereeGame.game.group.phase.league.gender',
  'refereeGame.game.encounter.teamHome.name',
  'refereeGame.game.encounter.teamAway.name',
  'refereeGame.game.hall.name',
  'refereeGame.game.hall.primaryPostalAddress.combinedAddress',
  'refereeGame.game.hall.primaryPostalAddress.city',
  'refereePosition',
  'convocationCompensation.gameCompensationFormatted',
  'convocationCompensation.travelExpensesFormatted',
  'convocationCompensation.costFormatted',
  'convocationCompensation.paymentDone',
  'convocationCompensation.paymentValueDate',
  'refereeGame.isGameInFuture',
];

/**
 * Assignments response from API.
 */
interface AssignmentsResponse {
  items?: Assignment[];
  totalItemsCount?: number;
}

/**
 * Exchanges response from API.
 */
interface ExchangesResponse {
  items?: GameExchange[];
  totalItemsCount?: number;
}

/**
 * Compensations response from API.
 */
interface CompensationsResponse {
  items?: CompensationRecord[];
  totalItemsCount?: number;
}

/**
 * Real API client for mobile.
 *
 * Implements the same interface as the mock client but makes real API calls.
 */
export const realApiClient = {
  /**
   * Search assignments with optional filtering.
   */
  async searchAssignments(
    config: SearchConfiguration = {}
  ): Promise<{ items: Assignment[]; totalItemsCount: number }> {
    const data = await apiRequest<AssignmentsResponse>(
      '/indoorvolleyball.refadmin/api%5crefereeconvocation/searchMyRefereeConvocations',
      'POST',
      {
        searchConfiguration: config,
        propertyRenderConfiguration: ASSIGNMENT_PROPERTIES,
      }
    );
    return {
      items: data.items ?? [],
      totalItemsCount: data.totalItemsCount ?? 0,
    };
  },

  /**
   * Get assignment details by ID.
   */
  async getAssignmentDetails(id: string): Promise<Assignment> {
    const query = new URLSearchParams();
    query.set('convocation', id);
    ASSIGNMENT_PROPERTIES.forEach((prop, i) => query.set(`nestedPropertyNames[${i}]`, prop));

    return apiRequest<Assignment>(
      `/indoorvolleyball.refadmin/api%5crefereeconvocation/showWithNestedObjects?${query}`
    );
  },

  /**
   * Search exchanges with optional filtering.
   */
  async searchExchanges(
    config: SearchConfiguration = {}
  ): Promise<{ items: GameExchange[]; totalItemsCount: number }> {
    const data = await apiRequest<ExchangesResponse>(
      '/indoorvolleyball.refadmin/api%5crefereegameexchange/search',
      'POST',
      {
        searchConfiguration: config,
        propertyRenderConfiguration: EXCHANGE_PROPERTIES,
      }
    );
    return {
      items: data.items ?? [],
      totalItemsCount: data.totalItemsCount ?? 0,
    };
  },

  /**
   * Search compensations with optional filtering.
   */
  async searchCompensations(
    config: SearchConfiguration = {}
  ): Promise<{ items: CompensationRecord[]; totalItemsCount: number }> {
    const data = await apiRequest<CompensationsResponse>(
      '/indoorvolleyball.refadmin/api%5crefereeconvocationcompensation/search',
      'POST',
      {
        searchConfiguration: config,
        propertyRenderConfiguration: COMPENSATION_PROPERTIES,
      }
    );
    return {
      items: data.items ?? [],
      totalItemsCount: data.totalItemsCount ?? 0,
    };
  },
};

export type RealApiClient = typeof realApiClient;
