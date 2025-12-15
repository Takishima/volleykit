import type { components } from "./schema";
import { z } from "zod";
import {
  assignmentsResponseSchema,
  compensationsResponseSchema,
  exchangesResponseSchema,
  validateResponse,
} from "./validation";
import { mockApi } from "./mock-api";

// Base URL configuration
// - Development: Vite proxy (avoids CORS)
// - Production: Cloudflare Worker proxy
const API_BASE =
  import.meta.env.VITE_API_PROXY_URL || (import.meta.env.DEV ? "" : "");

// Warn if proxy URL is not configured in production
if (!import.meta.env.DEV && !API_BASE) {
  console.warn(
    "VITE_API_PROXY_URL is not configured for production. API calls will fail.",
  );
}

/**
 * Default limit for search results when not explicitly specified.
 * 50 balances comprehensive results with reasonable response times
 * for typical Elasticsearch person searches.
 */
const DEFAULT_SEARCH_RESULTS_LIMIT = 50;

// Backend error response schema
const backendErrorSchema = z
  .object({
    error: z.string().optional(),
    message: z.string().optional(),
    errors: z
      .array(
        z.object({
          field: z.string().optional(),
          message: z.string(),
        }),
      )
      .optional(),
  })
  .passthrough();

/**
 * Parses backend error response to extract meaningful error message.
 */
async function parseErrorResponse(response: Response): Promise<string> {
  const status = response.status;
  const statusText = response.statusText;

  try {
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      const parsed = backendErrorSchema.safeParse(data);

      if (parsed.success) {
        // Check for specific error fields
        if (parsed.data.message) {
          return parsed.data.message;
        }
        if (parsed.data.error) {
          return parsed.data.error;
        }
        if (parsed.data.errors && parsed.data.errors.length > 0) {
          return parsed.data.errors
            .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
            .join(", ");
        }
      }
    }

    // Try to get text content for non-JSON responses
    if (contentType.includes("text/")) {
      const text = await response.text();
      // Limit text length and strip HTML tags if present
      const cleanText = text
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 200);
      if (cleanText) {
        return cleanText;
      }
    }
  } catch {
    // Failed to parse error body, fall through to default
  }

  // Default error message
  return `${status} ${statusText}`;
}

// Re-export schema types for convenience
export type Schemas = components["schemas"];
export type Assignment = Schemas["Assignment"];
export type CompensationRecord = Schemas["CompensationRecord"];
export type ConvocationCompensation = Schemas["ConvocationCompensation"];
export type GameExchange = Schemas["GameExchange"];
export type Game = Schemas["Game"];
export type Team = Schemas["Team"];
export type Hall = Schemas["Hall"];
export type RefereeGame = Schemas["RefereeGame"];
export type PersonSummary = Schemas["PersonSummary"];
export type AssociationSettings = Schemas["AssociationSettings"];
export type Season = Schemas["Season"];
// API response types
export type AssignmentsResponse = Schemas["AssignmentsResponse"];
export type CompensationsResponse = Schemas["CompensationsResponse"];
export type ExchangesResponse = Schemas["ExchangesResponse"];

// Nomination types
export type NominationList = Schemas["NominationList"];
export type IndoorPlayerNomination = Schemas["IndoorPlayerNomination"];
export type PossibleNomination = Schemas["PossibleNomination"];
export type PossibleNominationsResponse =
  Schemas["PossibleNominationsResponse"];

// Person search types
export type PersonSearchResult = Schemas["PersonSearchResult"];
export type PersonSearchResponse = Schemas["PersonSearchResponse"];

/**
 * Search filters for person search endpoint.
 * All filters use fuzzy matching via Elasticsearch.
 * Results match persons where all provided filters match (AND logic).
 */
export interface PersonSearchFilter {
  /** First name to search for (fuzzy match) */
  firstName?: string;
  /** Last name to search for (fuzzy match) */
  lastName?: string;
  /** Year of birth as 4-digit string (e.g., "1985") */
  yearOfBirth?: string;
}

// Request parameter types
export interface SearchConfiguration {
  offset?: number;
  limit?: number;
  propertyFilters?: PropertyFilter[];
  propertyOrderings?: PropertyOrdering[];
}

export interface PropertyFilter {
  propertyName: string;
  values?: string[];
  enumValues?: string[];
  dateRange?: { from: string; to: string };
}

export interface PropertyOrdering {
  propertyName: string;
  descending: boolean;
  isSetByUser?: boolean;
}

// Type for form data values (primitives only at leaf level)
type FormDataPrimitive = string | number | boolean;
type FormDataObject = { [key: string]: FormDataValue };
type FormDataArray = FormDataValue[];
type FormDataValue = FormDataPrimitive | FormDataArray | FormDataObject;

// Auth state
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function clearSession() {
  csrfToken = null;
}

// Build form data with nested bracket notation (Neos Flow format)
// TYPO3 Neos/Flow framework expects nested parameters in bracket notation:
// e.g., searchConfiguration[offset] = 0, searchConfiguration[limit] = 10
const MAX_DEPTH = 10;

function buildFormData(data: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  // Track objects in current path to detect true circular references
  // Using Set<object> and removing after recursion allows shared references
  const pathStack = new Set<object>();

  function flatten(obj: unknown, prefix: string, depth: number): void {
    // Prevent infinite recursion from deeply nested structures
    if (depth > MAX_DEPTH) {
      throw new Error(
        `Form data exceeds maximum nesting depth of ${MAX_DEPTH}`,
      );
    }

    if (obj === null || obj === undefined) return;

    if (typeof obj === "object") {
      // Detect circular references (object appearing in its own ancestry)
      // This allows shared references (same object in different branches)
      if (pathStack.has(obj)) {
        throw new Error("Circular reference detected in form data");
      }
      pathStack.add(obj);

      try {
        if (Array.isArray(obj)) {
          obj.forEach((item: unknown, index: number) => {
            flatten(item, `${prefix}[${index}]`, depth + 1);
          });
        } else {
          Object.entries(obj as Record<string, unknown>).forEach(
            ([key, value]) => {
              flatten(value, prefix ? `${prefix}[${key}]` : key, depth + 1);
            },
          );
        }
      } finally {
        // Remove from path after processing to allow shared references
        pathStack.delete(obj);
      }
    } else {
      params.append(prefix, String(obj));
    }
  }

  Object.entries(data).forEach(([key, value]) => {
    flatten(value, key, 0);
  });

  if (csrfToken) {
    params.append("__csrfToken", csrfToken);
  }

  return params;
}

// Generic fetch wrapper
async function apiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (method !== "GET" && body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: method !== "GET" && body ? buildFormData(body) : undefined,
  });

  if (!response.ok) {
    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 406
    ) {
      clearSession();
      throw new Error("Session expired. Please log in again.");
    }
    const errorMessage = await parseErrorResponse(response);
    // Include request context for debugging
    throw new Error(`${method} ${endpoint}: ${errorMessage}`);
  }

  // Try to parse as JSON regardless of Content-Type.
  // The TYPO3 Neos/Flow backend sometimes returns JSON with text/html Content-Type.
  try {
    return await response.json();
  } catch {
    const contentType = response.headers.get("Content-Type") || "";
    throw new Error(
      `${method} ${endpoint}: Invalid JSON response (Content-Type: ${contentType || "unknown"}, status: ${response.status})`,
    );
  }
}

// Property render configuration for assignments endpoint
// This tells the API which fields to include in the response
const ASSIGNMENT_PROPERTIES = [
  "refereeConvocationStatus",
  "refereeGame.game.startingDateTime",
  "refereeGame.game.playingWeekday",
  "isOpenEntryInRefereeGameExchange",
  "confirmationStatus",
  "confirmationDate",
  "hasLastMessageToReferee",
  "hasLinkedDoubleConvocation",
  "linkedDoubleConvocationGameNumberAndRefereePosition",
  "refereeGame.game.encounter.teamHome.name",
  "refereeGame.game.encounter.teamAway.name",
  "refereeGame.game.hasNominationListToReviewByReferee",
  "refereePosition",
  "refereeGame.game.number",
  "refereeGame.game.group.phase.league.leagueCategory.name",
  "refereeGame.game.group.phase.league.gender",
  "refereeGame.game.group.phase.name",
  "refereeGame.game.group.name",
  "refereeGame.activeRefereeConvocationFirstHeadReferee.indoorAssociationReferee.indoorReferee.person.displayName",
  "refereeGame.activeRefereeConvocationSecondHeadReferee.indoorAssociationReferee.indoorReferee.person.displayName",
  "refereeGame.activeRefereeConvocationFirstLinesman.indoorAssociationReferee.indoorReferee.person.displayName",
  "refereeGame.activeRefereeConvocationSecondLinesman.indoorAssociationReferee.indoorReferee.person.displayName",
  "refereeGame.activeRefereeConvocationThirdLinesman.indoorAssociationReferee.indoorReferee.person.displayName",
  "refereeGame.activeRefereeConvocationFourthLinesman.indoorAssociationReferee.indoorReferee.person.displayName",
  "refereeGame.activeRefereeConvocationStandbyHeadReferee.indoorAssociationReferee.indoorReferee.person.displayName",
  "refereeGame.activeRefereeConvocationStandbyLinesman.indoorAssociationReferee.indoorReferee.person.displayName",
  "refereeGame.game.hall.name",
  "refereeGame.game.hall.primaryPostalAddress.additionToAddress",
  "refereeGame.game.hall.primaryPostalAddress.combinedAddress",
  "refereeGame.game.hall.primaryPostalAddress.postalCode",
  "refereeGame.game.hall.primaryPostalAddress.city",
  "refereeGame.game.hall.primaryPostalAddress.geographicalLocation.plusCode",
  "refereeGame.game.lastPostponement.activeRefereeConvocationsAtTimeOfAcceptedPostponement.*.indoorAssociationReferee.indoorReferee.person",
  "refereeGame.game.lastPostponement.createdAt",
  "refereeGame.isGameInFuture",
];

// Property render configuration for exchanges endpoint
// This tells the API which fields to include in the exchange response
const EXCHANGE_PROPERTIES = [
  "refereeGame.game.startingDateTime",
  "refereeGame.game.playingWeekday",
  "submittedAt",
  "submittedByPerson.displayName",
  "submittingType",
  "status",
  "refereePosition",
  "requiredRefereeLevel",
  "requiredRefereeLevelGradationValue",
  "appliedBy.indoorReferee.person.displayName",
  "appliedAt",
  "refereeGame.game.number",
  "refereeGame.game.group.phase.league.leagueCategory.name",
  "refereeGame.game.group.phase.league.gender",
  "refereeGame.game.group.name",
  "refereeGame.game.group.phase.name",
  "refereeGame.game.encounter.teamHome.identifier",
  "refereeGame.game.encounter.teamHome.name",
  "refereeGame.game.encounter.teamAway.identifier",
  "refereeGame.game.encounter.teamAway.name",
  "refereeGame.game.hall.name",
  "refereeGame.game.hall.primaryPostalAddress.additionToAddress",
  "refereeGame.game.hall.primaryPostalAddress.combinedAddress",
  "refereeGame.game.hall.primaryPostalAddress.postalCode",
  "refereeGame.game.hall.primaryPostalAddress.city",
  "refereeGame.game.hall.primaryPostalAddress.geographicalLocation.plusCode",
  "refereeGame.activeFirstHeadRefereeName",
  "refereeGame.openFirstHeadRefereeName",
  "refereeGame.activeSecondHeadRefereeName",
  "refereeGame.openSecondHeadRefereeName",
  "refereeGame.activeFirstLinesmanRefereeName",
  "refereeGame.openFirstLinesmanRefereeName",
  "refereeGame.activeSecondLinesmanRefereeName",
  "refereeGame.openSecondLinesmanRefereeName",
  "refereeGame.activeThirdLinesmanRefereeName",
  "refereeGame.openThirdLinesmanRefereeName",
  "refereeGame.activeFourthLinesmanRefereeName",
  "refereeGame.openFourthLinesmanRefereeName",
  "refereeGame.activeRefereeConvocationFirstHeadReferee",
  "refereeGame.activeRefereeConvocationSecondHeadReferee",
  "refereeGame.activeRefereeConvocationFirstLinesman",
  "refereeGame.activeRefereeConvocationSecondLinesman",
  "refereeGame.activeRefereeConvocationThirdLinesman",
  "refereeGame.activeRefereeConvocationFourthLinesman",
  "refereeGame.activeRefereeConvocationStandbyHeadReferee",
  "refereeGame.activeRefereeConvocationStandbyLinesman",
];

// Property render configuration for compensations endpoint
// This tells the API which fields to include in the compensation response
const COMPENSATION_PROPERTIES = [
  "refereeConvocationStatus",
  "compensationDate",
  "refereeGame.game.startingDateTime",
  "refereeGame.game.playingWeekday",
  "refereeGame.game.number",
  "refereeGame.game.group.phase.league.leagueCategory.name",
  "refereeGame.game.group.name",
  "refereeGame.game.group.phase.name",
  "refereeGame.game.group.phase.league.gender",
  "refereeGame.game.encounter.teamHome.name",
  "refereeGame.game.encounter.teamAway.name",
  "refereeGame.game.hall.name",
  "refereeGame.game.hall.primaryPostalAddress.additionToAddress",
  "refereeGame.game.hall.primaryPostalAddress.combinedAddress",
  "refereeGame.game.hall.primaryPostalAddress.country.countryCode",
  "refereeGame.game.hall.primaryPostalAddress.postalCode",
  "refereeGame.game.hall.primaryPostalAddress.city",
  "refereePosition",
  "convocationCompensation.hasFlexibleGameCompensations",
  "convocationCompensation.gameCompensationFormatted",
  "convocationCompensation.hasFlexibleTravelExpenses",
  "convocationCompensation.travelExpensesFormatted",
  "convocationCompensation.hasFlexibleOvernightStayExpenses",
  "convocationCompensation.overnightStayExpensesFormatted",
  "convocationCompensation.hasFlexibleCateringExpenses",
  "convocationCompensation.cateringExpensesFormatted",
  "convocationCompensation.costFormatted",
  "convocationCompensation.distanceFormatted",
  "convocationCompensation.transportationMode",
  "convocationCompensation.paymentDone",
  "convocationCompensation.paymentValueDate",
  "convocationCompensation.paymentUpdatedByAssociation.name",
  "indoorAssociationReferee.indoorReferee.person.associationId",
  "refereeGame.isGameInFuture",
  "refereeGame.game.isVolleyCupGameWithoutNationalAssociationLeagueCategoryTeams",
  "refereeGame.game.displayName",
];

// API Methods
// Note: Backslash (%5c) in URL paths is required by TYPO3 Neos/Flow backend routing.
// The framework uses backslash as a namespace separator in controller paths.
// e.g., api%5crefereeconvocation maps to the RefereeConvocation controller in the API namespace.
// We must pre-encode the backslash as %5c because browsers do not encode literal backslashes.
export const api = {
  // Assignments
  async searchAssignments(
    config: SearchConfiguration = {},
  ): Promise<AssignmentsResponse> {
    const data = await apiRequest<unknown>(
      "/indoorvolleyball.refadmin/api%5crefereeconvocation/searchMyRefereeConvocations",
      "POST",
      {
        searchConfiguration: config,
        propertyRenderConfiguration: ASSIGNMENT_PROPERTIES,
      },
    );
    // Two-step validation pattern:
    // 1. Zod validates the response has required fields with correct types
    // 2. Cast to schema type for TypeScript (Zod's passthrough adds index signature)
    // This catches API contract changes at runtime while preserving type safety.
    // See validation.ts for the validation strategy documentation.
    validateResponse(data, assignmentsResponseSchema, "searchAssignments");
    return data as AssignmentsResponse;
  },

  async getAssignmentDetails(
    convocationId: string,
    properties: string[],
  ): Promise<Assignment> {
    const query = new URLSearchParams();
    query.set("convocation", convocationId);
    properties.forEach((prop, i) =>
      query.set(`nestedPropertyNames[${i}]`, prop),
    );

    // Assignment details has a complex structure - skip validation for now
    return apiRequest<Assignment>(
      `/indoorvolleyball.refadmin/api%5crefereeconvocation/showWithNestedObjects?${query}`,
    );
  },

  // Compensations
  async searchCompensations(
    config: SearchConfiguration = {},
  ): Promise<CompensationsResponse> {
    const data = await apiRequest<unknown>(
      "/indoorvolleyball.refadmin/api%5crefereeconvocationcompensation/search",
      "POST",
      {
        searchConfiguration: config,
        propertyRenderConfiguration: COMPENSATION_PROPERTIES,
      },
    );
    // Validate response structure, then cast to expected type
    validateResponse(data, compensationsResponseSchema, "searchCompensations");
    return data as CompensationsResponse;
  },

  // Game Exchanges
  async searchExchanges(
    config: SearchConfiguration = {},
  ): Promise<ExchangesResponse> {
    const data = await apiRequest<unknown>(
      "/indoorvolleyball.refadmin/api%5crefereegameexchange/search",
      "POST",
      {
        searchConfiguration: config,
        propertyRenderConfiguration: EXCHANGE_PROPERTIES,
      },
    );
    // Validate response structure, then cast to expected type
    validateResponse(data, exchangesResponseSchema, "searchExchanges");
    return data as ExchangesResponse;
  },

  async applyForExchange(exchangeId: string): Promise<void> {
    // Format per OpenAPI spec: __identity=<uuid>&apply=1
    return apiRequest(
      "/indoorvolleyball.refadmin/api%5crefereegameexchange",
      "PUT",
      { __identity: exchangeId, apply: "1" },
    );
  },

  async withdrawFromExchange(exchangeId: string): Promise<void> {
    // Format per OpenAPI spec: __identity=<uuid>&withdrawApplication=1
    return apiRequest(
      "/indoorvolleyball.refadmin/api%5crefereegameexchange",
      "PUT",
      { __identity: exchangeId, withdrawApplication: "1" },
    );
  },

  // Settings
  async getAssociationSettings(): Promise<Schemas["AssociationSettings"]> {
    return apiRequest(
      "/indoorvolleyball.refadmin/api%5ccrefereeassociationsettings/getRefereeAssociationSettingsOfActiveParty",
    );
  },

  async getActiveSeason(): Promise<Schemas["Season"]> {
    return apiRequest(
      "/sportmanager.indoorvolleyball/api%5ccindoorseason/getActiveIndoorSeason",
    );
  },

  /**
   * Fetches possible player nominations for a nomination list.
   * Returns players that can be added to a team's roster for a game.
   *
   * @param nominationListId - UUID of the nomination list to fetch possible players for
   * @param options - Optional filtering parameters
   * @param options.onlyFromMyTeam - When true, returns only players already on the team's
   *   roster. When false, includes all players from the association who could potentially
   *   be added. Defaults to true.
   * @param options.onlyRelevantGender - When true, filters players to match the league's
   *   gender requirements (e.g., only female players for women's leagues). When false,
   *   returns players of all genders. Defaults to true.
   * @returns List of possible player nominations including license numbers and player details
   *
   * @example
   * // Get all eligible players from the association (not just team roster)
   * // while still respecting gender requirements
   * const allEligiblePlayers = await api.getPossiblePlayerNominations(
   *   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   *   { onlyFromMyTeam: false, onlyRelevantGender: true }
   * );
   *
   * @example
   * // Get only players from the team's roster with default filtering
   * // (both options default to true)
   * const rosterPlayers = await api.getPossiblePlayerNominations(
   *   'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   * );
   */
  async getPossiblePlayerNominations(
    nominationListId: string,
    options?: { onlyFromMyTeam?: boolean; onlyRelevantGender?: boolean },
  ): Promise<PossibleNominationsResponse> {
    return apiRequest(
      "/sportmanager.indoorvolleyball/api%5cnominationlist/getPossibleIndoorPlayerNominationsForNominationList",
      "POST",
      {
        nominationList: nominationListId,
        onlyFromMyTeam: options?.onlyFromMyTeam ?? true,
        onlyRelevantGender: options?.onlyRelevantGender ?? true,
      },
    );
  },

  /**
   * Searches for persons by name or year of birth using Elasticsearch.
   * Used for autocomplete when selecting scorers or other personnel.
   *
   * The Elasticsearch API uses OR logic across property filters. When only
   * one name field is provided (single-term search), the term is sent to both
   * firstName and lastName fields for broader matching. When both name fields
   * are provided, each is sent to its respective field only.
   *
   * @param filters - Search filters (firstName, lastName, yearOfBirth)
   * @param options - Pagination options (offset, limit)
   * @returns Search results with person details
   * @example
   * // Single term via lastName - matches firstName OR lastName
   * const results = await api.searchPersons({ lastName: 'müller' });
   *
   * // Single term via firstName - also matches firstName OR lastName
   * const results = await api.searchPersons({ firstName: 'hans' });
   *
   * // Two terms - firstName matches firstName, lastName matches lastName
   * const results = await api.searchPersons({ firstName: 'hans', lastName: 'müller' });
   *
   * // Search by name and birth year
   * const results = await api.searchPersons({ lastName: 'müller', yearOfBirth: '1985' });
   */
  async searchPersons(
    filters: PersonSearchFilter,
    options?: { offset?: number; limit?: number },
  ): Promise<PersonSearchResponse> {
    const propertyFilters: Array<{ propertyName: string; text: string }> = [];

    const { firstName, lastName, yearOfBirth } = filters;

    // Single-term search: send to both firstName and lastName for OR matching.
    // This enables searches like "hans" to find matches in either name field.
    const isSingleTermSearch =
      (firstName && !lastName) || (lastName && !firstName);

    if (isSingleTermSearch) {
      // One of firstName or lastName is guaranteed to be defined here
      const searchTerm = (firstName ?? lastName)!;
      propertyFilters.push({
        propertyName: "firstName",
        text: searchTerm,
      });
      propertyFilters.push({
        propertyName: "lastName",
        text: searchTerm,
      });
    } else {
      // Two-term search: send each to its respective field
      if (firstName) {
        propertyFilters.push({
          propertyName: "firstName",
          text: firstName,
        });
      }
      if (lastName) {
        propertyFilters.push({
          propertyName: "lastName",
          text: lastName,
        });
      }
    }

    if (yearOfBirth) {
      propertyFilters.push({
        propertyName: "yearOfBirth",
        text: yearOfBirth,
      });
    }

    const searchConfig: Record<string, unknown> = {
      propertyFilters,
      offset: options?.offset ?? 0,
      limit: options?.limit ?? DEFAULT_SEARCH_RESULTS_LIMIT,
    };

    return apiRequest<PersonSearchResponse>(
      "/sportmanager.core/api%5celasticsearchperson/search",
      "POST",
      {
        searchConfiguration: searchConfig,
        propertyRenderConfiguration: ["birthday"],
      },
    );
  },
};

/**
 * API interface type - shared between real and mock implementations.
 * This ensures both implementations have the same method signatures.
 */
export type ApiClient = typeof api;

/**
 * Get the appropriate API client based on demo mode.
 * In demo mode, uses the mock API that operates on local demo data.
 * In production mode, uses the real API that makes network requests.
 *
 * @param isDemoMode - Whether the app is in demo mode
 * @returns The API client (real or mock)
 */
export function getApiClient(isDemoMode: boolean): ApiClient {
  return isDemoMode ? mockApi : api;
}

export default api;
