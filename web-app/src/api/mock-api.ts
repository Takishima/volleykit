/**
 * Mock API implementation for demo mode.
 *
 * This module implements the same API interface as the real API client,
 * but uses in-memory demo data instead of making network requests.
 * The filtering and sorting logic mirrors what the real API does,
 * ensuring demo mode behavior matches production.
 */

import type {
  SearchConfiguration,
  PropertyFilter,
  PropertyOrdering,
  Assignment,
  CompensationRecord,
  ConvocationCompensationDetailed,
  GameExchange,
  AssignmentsResponse,
  CompensationsResponse,
  ExchangesResponse,
  AssociationSettings,
  Season,
  NominationList,
  NominationListFinalizeResponse,
  Scoresheet,
  FileResource,
  GameDetails,
  PossibleNominationsResponse,
  PersonSearchFilter,
  PersonSearchResponse,
  PersonSearchResult,
} from "./client";
import { useDemoStore, DEMO_USER_PERSON_IDENTITY } from "@/shared/stores/demo";
import {
  assignmentsResponseSchema,
  compensationsResponseSchema,
  exchangesResponseSchema,
  personSearchResponseSchema,
  validateResponse,
} from "./validation";
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES,
  DEFAULT_SEARCH_RESULTS_LIMIT,
} from "./constants";

// Network delay constants for realistic demo behavior
const MOCK_NETWORK_DELAY_MS = 50;
const MOCK_MUTATION_DELAY_MS = 100;

/**
 * Extended compensation data type for demo mode.
 * The demo store adds additional fields like correctionReason that aren't
 * in the base ConvocationCompensation type (they're in ConvocationCompensationDetailed).
 */
interface DemoConvocationCompensation {
  __identity?: string;
  distanceInMetres?: number;
  distanceFormatted?: string;
  correctionReason?: string | null;
}

/**
 * Normalize a string for accent-insensitive comparison.
 * Converts to lowercase, decomposes accented characters (NFD normalization),
 * then removes diacritical marks.
 * @example normalizeForSearch("Müller") // returns "muller"
 * @example normalizeForSearch("José") // returns "jose"
 */
function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Get a nested property value from an object using dot notation.
 * @example getNestedValue({ a: { b: 1 } }, "a.b") // returns 1
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Check if an item matches a property filter.
 * Implements the same filtering logic as the real API.
 */
function matchesFilter<T>(item: T, filter: PropertyFilter): boolean {
  const value = getNestedValue(item, filter.propertyName);

  // Date range filter - uses inclusive bounds (date >= from && date <= to)
  // This matches the real API behavior where "to" timestamps are set to 22:59:59
  // to include the entire end day (see docs/api/captures/assignments_request.txt)
  if (filter.dateRange) {
    if (typeof value !== "string") return false;
    const date = new Date(value);
    const from = new Date(filter.dateRange.from);
    const to = new Date(filter.dateRange.to);
    // Validate all dates are valid before comparing
    if (isNaN(date.getTime()) || isNaN(from.getTime()) || isNaN(to.getTime())) {
      return false;
    }
    return date >= from && date <= to;
  }

  // Enum values filter (for status fields)
  if (filter.enumValues?.length) {
    return filter.enumValues.includes(String(value));
  }

  // Values filter (for boolean/string fields)
  // Converts value to string for comparison (handles booleans, strings, numbers)
  if (filter.values?.length) {
    return filter.values.includes(String(value));
  }

  // No filter criteria - include all
  return true;
}

/**
 * Apply all filters from SearchConfiguration to a list of items.
 */
function applyFilters<T>(items: T[], filters?: PropertyFilter[]): T[] {
  if (!filters?.length) {
    return items;
  }

  return items.filter((item) =>
    filters.every((filter) => matchesFilter(item, filter)),
  );
}

/**
 * Compare two values for sorting.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
function compareValues(
  valueA: unknown,
  valueB: unknown,
  descending: boolean,
): number {
  // Handle missing values - sort to end
  if (valueA === undefined || valueA === null) return 1;
  if (valueB === undefined || valueB === null) return -1;

  // Handle dates (ISO string format)
  if (typeof valueA === "string" && typeof valueB === "string") {
    const dateA = new Date(valueA);
    const dateB = new Date(valueB);

    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
      const diff = dateA.getTime() - dateB.getTime();
      return descending ? -diff : diff;
    }
  }

  // Handle numbers
  if (typeof valueA === "number" && typeof valueB === "number") {
    const diff = valueA - valueB;
    return descending ? -diff : diff;
  }

  // Handle strings
  const strA = String(valueA);
  const strB = String(valueB);
  const comparison = strA.localeCompare(strB);
  return descending ? -comparison : comparison;
}

/**
 * Sort items based on property orderings from SearchConfiguration.
 * Implements the same sorting logic as the real API.
 *
 * Uses a single comparator that evaluates all orderings together,
 * with earlier orderings taking priority (only used as tiebreakers
 * when previous orderings are equal).
 */
function applySorting<T>(items: T[], orderings?: PropertyOrdering[]): T[] {
  if (!orderings?.length) {
    return items;
  }

  // Create a copy to avoid mutating the original
  const sorted = [...items];

  // Single sort with multi-column comparator
  sorted.sort((a, b) => {
    for (const ordering of orderings) {
      const valueA = getNestedValue(a, ordering.propertyName);
      const valueB = getNestedValue(b, ordering.propertyName);
      const comparison = compareValues(valueA, valueB, ordering.descending);

      // If values differ, return this comparison
      if (comparison !== 0) {
        return comparison;
      }
      // If equal, continue to next ordering (tiebreaker)
    }
    // All orderings equal - maintain original order
    return 0;
  });

  return sorted;
}

/**
 * Apply pagination (offset and limit) to items.
 */
function applyPagination<T>(items: T[], offset?: number, limit?: number): T[] {
  const start = offset ?? 0;
  const end = limit ? start + limit : undefined;
  return items.slice(start, end);
}

/**
 * Process a search request: filter, sort, and paginate items.
 */
function processSearchRequest<T>(
  items: T[],
  config: SearchConfiguration = {},
): { items: T[]; total: number } {
  // Filter
  const filtered = applyFilters(items, config.propertyFilters);

  // Sort
  const sorted = applySorting(filtered, config.propertyOrderings);

  // Get total before pagination
  const total = sorted.length;

  // Paginate
  const paginated = applyPagination(sorted, config.offset, config.limit);

  return { items: paginated, total };
}

/**
 * Mock API implementation that mirrors the real API interface.
 * Uses demo store data and applies the same filtering/sorting logic.
 */
export const mockApi = {
  async searchAssignments(
    config: SearchConfiguration = {},
  ): Promise<AssignmentsResponse> {
    await delay(MOCK_NETWORK_DELAY_MS);

    const store = useDemoStore.getState();
    const { items, total } = processSearchRequest(store.assignments, config);

    // Enrich assignments with scoresheet.closedAt from validated games
    const enrichedItems = items.map((assignment) => {
      const gameId = assignment.refereeGame?.game?.__identity;
      const validatedData = gameId ? store.validatedGames[gameId] : null;

      if (validatedData && assignment.refereeGame?.game) {
        return {
          ...assignment,
          refereeGame: {
            ...assignment.refereeGame,
            game: {
              ...assignment.refereeGame.game,
              scoresheet: {
                closedAt: validatedData.validatedAt,
              },
            },
          },
        };
      }
      return assignment;
    });

    const response = {
      items: enrichedItems as Assignment[],
      totalItemsCount: total,
    };

    // Validate mock response matches real API schema, then cast back to expected type
    // (validation ensures data structure is correct, cast preserves original type compatibility)
    validateResponse(response, assignmentsResponseSchema, "mock:searchAssignments");
    return response;
  },

  async getAssignmentDetails(
    convocationId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required for API interface compatibility; mock data already contains all properties
    _properties: string[],
  ): Promise<Assignment> {
    await delay(MOCK_NETWORK_DELAY_MS);

    const store = useDemoStore.getState();
    const assignment = store.assignments.find(
      (a) => a.__identity === convocationId,
    );

    if (!assignment) {
      throw new Error(`Assignment not found: ${convocationId}`);
    }

    return assignment;
  },

  async searchCompensations(
    config: SearchConfiguration = {},
  ): Promise<CompensationsResponse> {
    await delay(MOCK_NETWORK_DELAY_MS);

    const store = useDemoStore.getState();
    const { items, total } = processSearchRequest(store.compensations, config);

    const response = {
      items: items as CompensationRecord[],
      totalItemsCount: total,
    };

    // Validate mock response matches real API schema, then cast back to expected type
    validateResponse(response, compensationsResponseSchema, "mock:searchCompensations");
    return response;
  },

  async getCompensationDetails(
    compensationId: string,
  ): Promise<ConvocationCompensationDetailed> {
    await delay(MOCK_NETWORK_DELAY_MS);

    const store = useDemoStore.getState();
    const compensation = store.compensations.find(
      (c) => c.convocationCompensation?.__identity === compensationId,
    );

    if (!compensation?.convocationCompensation) {
      throw new Error(`Compensation not found: ${compensationId}`);
    }

    // Cast to extended type that includes demo-specific fields
    const demoCompensation =
      compensation.convocationCompensation as DemoConvocationCompensation;

    // Return detailed compensation data matching the real API structure
    return {
      convocationCompensation: {
        __identity: demoCompensation.__identity,
        distanceInMetres: demoCompensation.distanceInMetres,
        distanceFormatted: demoCompensation.distanceFormatted,
        correctionReason: demoCompensation.correctionReason ?? null,
      },
    };
  },

  async updateCompensation(
    compensationId: string,
    data: { distanceInMetres?: number; correctionReason?: string },
  ): Promise<void> {
    await delay(MOCK_MUTATION_DELAY_MS);

    const store = useDemoStore.getState();
    store.updateCompensation(compensationId, data);
  },

  async searchExchanges(
    config: SearchConfiguration = {},
  ): Promise<ExchangesResponse> {
    await delay(MOCK_NETWORK_DELAY_MS);

    const store = useDemoStore.getState();
    const { items, total } = processSearchRequest(store.exchanges, config);

    const response = {
      items: items as GameExchange[],
      totalItemsCount: total,
    };

    // Validate mock response matches real API schema, then cast back to expected type
    validateResponse(response, exchangesResponseSchema, "mock:searchExchanges");
    return response;
  },

  async applyForExchange(exchangeId: string): Promise<void> {
    await delay(MOCK_MUTATION_DELAY_MS);

    const store = useDemoStore.getState();
    store.applyForExchange(exchangeId);
  },

  async withdrawFromExchange(exchangeId: string): Promise<void> {
    await delay(MOCK_MUTATION_DELAY_MS);

    const store = useDemoStore.getState();

    // Check if this is the user's own exchange (they submitted it)
    const exchange = store.exchanges.find((e) => e.__identity === exchangeId);
    const isOwnExchange =
      exchange?.submittedByPerson?.__identity === DEMO_USER_PERSON_IDENTITY;

    if (isOwnExchange) {
      // Remove own exchange - restores original assignment
      store.removeOwnExchange(exchangeId);
    } else {
      // Withdraw application from someone else's exchange
      store.withdrawFromExchange(exchangeId);
    }
  },

  async getAssociationSettings(): Promise<AssociationSettings> {
    await delay(MOCK_NETWORK_DELAY_MS);

    // Return mock settings with default validation deadline
    return {
      hoursAfterGameStartForRefereeToEditGameList: 6,
    } as AssociationSettings;
  },

  async getActiveSeason(): Promise<Season> {
    await delay(MOCK_NETWORK_DELAY_MS);

    // Return mock season spanning current year
    const now = new Date();
    const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
    const seasonEnd = new Date(now.getFullYear() + 1, 5, 30); // June 30th next year

    return {
      seasonStartDate: seasonStart.toISOString(),
      seasonEndDate: seasonEnd.toISOString(),
    } as Season;
  },

  async getPossiblePlayerNominations(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required for API interface compatibility
    _nominationListId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required for API interface compatibility
    _options?: { onlyFromMyTeam?: boolean; onlyRelevantGender?: boolean },
  ): Promise<PossibleNominationsResponse> {
    await delay(MOCK_NETWORK_DELAY_MS);

    const store = useDemoStore.getState();
    return {
      items: store.possiblePlayers,
      totalItemsCount: store.possiblePlayers.length,
    };
  },

  async searchPersons(
    filters: PersonSearchFilter,
    options?: { offset?: number; limit?: number },
  ): Promise<PersonSearchResponse> {
    await delay(MOCK_NETWORK_DELAY_MS);

    const store = useDemoStore.getState();
    const { firstName, lastName, yearOfBirth } = filters;

    // When only lastName is provided (single search term), search both
    // firstName and lastName fields to mimic Elasticsearch fuzzy matching.
    // The real API searches across both name fields for better UX.
    const isSingleTermSearch = lastName && !firstName;

    const filtered = store.scorers.filter((scorer: PersonSearchResult) => {
      // Use accent-insensitive matching (e.g., "muller" matches "Müller")
      const scorerFirstName = normalizeForSearch(scorer.firstName ?? "");
      const scorerLastName = normalizeForSearch(scorer.lastName ?? "");
      const scorerYear = scorer.birthday
        ? new Date(scorer.birthday).getFullYear().toString()
        : "";

      if (
        firstName &&
        !scorerFirstName.includes(normalizeForSearch(firstName))
      ) {
        return false;
      }

      if (lastName) {
        const searchTerm = normalizeForSearch(lastName);
        if (isSingleTermSearch) {
          // Single term: match against either firstName or lastName
          const matchesFirstName = scorerFirstName.includes(searchTerm);
          const matchesLastName = scorerLastName.includes(searchTerm);
          if (!matchesFirstName && !matchesLastName) {
            return false;
          }
        } else {
          // Two terms provided: lastName must match lastName field
          if (!scorerLastName.includes(searchTerm)) {
            return false;
          }
        }
      }

      if (yearOfBirth && !scorerYear.includes(yearOfBirth)) {
        return false;
      }
      return true;
    });

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? DEFAULT_SEARCH_RESULTS_LIMIT;
    const paginated = filtered.slice(offset, offset + limit);

    const response = {
      items: paginated,
      totalItemsCount: filtered.length,
    };

    // Validate mock response matches real API schema, then cast back to expected type
    validateResponse(response, personSearchResponseSchema, "mock:searchPersons");
    return response;
  },

  async getGameWithScoresheet(gameId: string): Promise<GameDetails> {
    await delay(MOCK_NETWORK_DELAY_MS);

    const store = useDemoStore.getState();
    const gameNominations = store.nominationLists[gameId];
    const validatedData = store.validatedGames[gameId];
    const pendingScorer = store.getPendingScorer(gameId);

    // Find the assignment with this game to get group info
    const assignment = store.assignments.find(
      (a) => a.refereeGame?.game?.__identity === gameId,
    );
    const group = assignment?.refereeGame?.game?.group;

    // Determine the scorer to show: validated scorer takes precedence, then pending
    const scorerToShow = validatedData?.scorer ?? pendingScorer;

    // Build mock game details with scoresheet and nomination lists
    // Cast to allow extended writerPerson type with birthday (demo mode only)
    const gameDetails = {
      __identity: gameId,
      // Include group info for scoresheet requirements
      ...(group && {
        group: {
          isTournamentGroup: group.isTournamentGroup ?? false,
          hasNoScoresheet: group.hasNoScoresheet ?? false,
        },
      }),
      scoresheet: {
        __identity: `scoresheet-${gameId}`,
        game: { __identity: gameId },
        isSimpleScoresheet: false,
        hasFile: !!validatedData?.scoresheetFileId,
        // Include writerPerson for both validated and pending scorers
        ...(scorerToShow && {
          writerPerson: {
            __identity: scorerToShow.__identity,
            displayName: scorerToShow.displayName,
            birthday: scorerToShow.birthday,
          },
        }),
        // Only validated games have closedAt
        ...(validatedData && {
          closedAt: validatedData.validatedAt,
          closedBy: "referee",
        }),
      },
      nominationListOfTeamHome: gameNominations?.home ?? undefined,
      nominationListOfTeamAway: gameNominations?.away ?? undefined,
    } as GameDetails;

    return gameDetails;
  },

  async updateNominationList(
    nominationListId: string,
    gameId: string,
    teamId: string,
    playerNominationIds: string[],
  ): Promise<NominationList> {
    await delay(MOCK_MUTATION_DELAY_MS);

    const store = useDemoStore.getState();

    // Determine which team (home or away) based on the nomination list
    const gameNominations = store.nominationLists[gameId];
    if (gameNominations) {
      const team =
        gameNominations.home?.__identity === nominationListId ? "home" : "away";
      // Persist player changes to demo store
      store.updateNominationListPlayers(gameId, team, playerNominationIds);
    }

    // In demo mode, return a mock updated nomination list
    return {
      __identity: nominationListId,
      game: { __identity: gameId },
      team: { __identity: teamId },
      closed: false,
      isClosedForTeam: true,
    };
  },

  async finalizeNominationList(
    nominationListId: string,
    gameId: string,
    teamId: string,
    playerNominationIds: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required for API interface compatibility
    _validationId?: string,
  ): Promise<NominationListFinalizeResponse> {
    await delay(MOCK_MUTATION_DELAY_MS);

    const store = useDemoStore.getState();

    // Determine which team (home or away) based on the nomination list
    const gameNominations = store.nominationLists[gameId];
    if (gameNominations) {
      const team =
        gameNominations.home?.__identity === nominationListId ? "home" : "away";
      // Persist player changes and mark as closed
      store.updateNominationListPlayers(gameId, team, playerNominationIds);
      store.updateNominationListClosed(gameId, team, true);
    }

    // In demo mode, return a mock finalized nomination list
    return {
      nominationList: {
        __identity: nominationListId,
        game: { __identity: gameId },
        team: { __identity: teamId },
        closed: true,
        closedAt: new Date().toISOString(),
        closedBy: "referee",
        isClosedForTeam: true,
      },
    };
  },

  async updateScoresheet(
    scoresheetId: string,
    gameId: string,
    scorerPersonId: string,
    isSimpleScoresheet: boolean = false,
  ): Promise<Scoresheet> {
    await delay(MOCK_MUTATION_DELAY_MS);

    const store = useDemoStore.getState();

    // Find the scorer's info from the scorers list
    const scorer = store.scorers.find((s) => s.__identity === scorerPersonId);
    const scorerDisplayName = scorer?.displayName ?? "Unknown Scorer";
    // Convert null to undefined for type compatibility
    const scorerBirthday = scorer?.birthday ?? undefined;

    // Persist pending scorer selection to demo store
    store.setPendingScorer(gameId, {
      __identity: scorerPersonId,
      displayName: scorerDisplayName,
      birthday: scorerBirthday,
    });

    // In demo mode, return a mock updated scoresheet
    return {
      __identity: scoresheetId,
      game: { __identity: gameId },
      writerPerson: { __identity: scorerPersonId },
      isSimpleScoresheet,
      hasFile: false,
    };
  },

  async finalizeScoresheet(
    scoresheetId: string,
    gameId: string,
    scorerPersonId: string,
    fileResourceId?: string,
    _validationId?: string,
    isSimpleScoresheet: boolean = false,
  ): Promise<Scoresheet> {
    await delay(MOCK_MUTATION_DELAY_MS);

    const store = useDemoStore.getState();

    // Find the scorer's info from the scorers list
    const scorer = store.scorers.find((s) => s.__identity === scorerPersonId);
    const scorerDisplayName = scorer?.displayName ?? "Unknown Scorer";
    // Convert null to undefined for type compatibility
    const scorerBirthday = scorer?.birthday ?? undefined;

    // Mark the game as validated in the store
    store.markGameValidated(gameId, {
      scorer: {
        __identity: scorerPersonId,
        displayName: scorerDisplayName,
        birthday: scorerBirthday,
      },
      scoresheetFileId: fileResourceId,
    });

    // Clear pending scorer since game is now validated
    store.clearPendingScorer(gameId);

    // In demo mode, return a mock finalized scoresheet
    return {
      __identity: scoresheetId,
      game: { __identity: gameId },
      writerPerson: { __identity: scorerPersonId },
      isSimpleScoresheet,
      hasFile: !!fileResourceId,
      ...(fileResourceId && { file: { __identity: fileResourceId } }),
      closedAt: new Date().toISOString(),
      closedBy: "referee",
    };
  },

  async uploadResource(file: File): Promise<FileResource[]> {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type: ${file.type || "unknown"}. Only JPEG, PNG, or PDF files are allowed.`,
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(`File too large: ${sizeMB} MB. Maximum size is 10 MB.`);
    }

    await delay(MOCK_MUTATION_DELAY_MS);

    // In demo mode, return a mock file resource
    const mockResourceId = `resource-${Date.now()}`;
    return [
      {
        __identity: mockResourceId,
        persistentResource: {
          __identity: `persistent-${mockResourceId}`,
          filename: file.name,
          mediaType: file.type,
          fileSize: file.size,
        },
      },
    ];
  },

  /**
   * Switch the active role/association.
   * In demo mode, looks up the occupation by ID and regenerates demo data
   * for the corresponding association code.
   */
  async switchRoleAndAttribute(attributeValueId: string): Promise<void> {
    await delay(MOCK_MUTATION_DELAY_MS);

    // Import stores dynamically to avoid circular dependencies
    const { useAuthStore } = await import("@/shared/stores/auth");

    // Find the occupation by ID to get its association code
    const user = useAuthStore.getState().user;
    const occupation = user?.occupations?.find((o) => o.id === attributeValueId);

    if (occupation?.associationCode) {
      const validCodes = ["SV", "SVRBA", "SVRZ"] as const;
      type DemoCode = (typeof validCodes)[number];

      if (validCodes.includes(occupation.associationCode as DemoCode)) {
        const store = useDemoStore.getState();
        store.setActiveAssociation(occupation.associationCode as DemoCode);
      }
    }
  },
};

/**
 * Helper to simulate network delay for more realistic demo behavior.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
