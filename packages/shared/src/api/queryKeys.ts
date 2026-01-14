/**
 * Centralized Query Key Factory
 *
 * This module provides a single source of truth for all TanStack Query keys.
 * Using a hierarchical structure enables:
 * - Type-safe key generation with autocomplete
 * - Hierarchical invalidation (invalidating parent keys invalidates all children)
 * - Consistency across useQuery, useMutation, and cache invalidation calls
 *
 * Pattern:
 * - `.all` - Base key for the entity, used for bulk invalidation
 * - `.lists()` - Parent key for all list queries
 * - `.list(params)` - Specific list query with parameters
 * - `.details()` - Parent key for all detail queries
 * - `.detail(id)` - Specific detail query
 *
 * Extracted from web-app/src/api/queryKeys.ts for cross-platform use.
 *
 * @example
 * // Invalidate all assignments (lists and details)
 * queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all })
 *
 * // Invalidate only assignment lists (not details)
 * queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() })
 *
 * // Query a specific assignment list
 * useQuery({ queryKey: queryKeys.assignments.list(config, demoCode) })
 */

/**
 * Search configuration for list queries.
 * Matches the API's expected filter format.
 */
export interface SearchConfiguration {
  fromDate?: string;
  toDate?: string;
  status?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Person search filter configuration.
 */
export interface PersonSearchFilter {
  searchTerm?: string;
  firstName?: string;
  lastName?: string;
  associationId?: number;
}

export const queryKeys = {
  /**
   * Assignment query keys
   */
  assignments: {
    /** Base key - invalidates ALL assignment queries */
    all: ['assignments'] as const,
    /** Parent key for all list queries */
    lists: () => [...queryKeys.assignments.all, 'list'] as const,
    /**
     * Specific list query with search configuration.
     * @param config - Search configuration filters and sorting
     * @param associationKey - In demo mode: demoAssociationCode. In production: activeOccupationId.
     *                         This ensures cache invalidation when switching associations.
     */
    list: (config?: SearchConfiguration, associationKey?: string | null) =>
      [...queryKeys.assignments.lists(), config, associationKey] as const,
    /** Parent key for all detail queries */
    details: () => [...queryKeys.assignments.all, 'detail'] as const,
    /** Specific assignment detail query */
    detail: (id: string) => [...queryKeys.assignments.details(), id] as const,
    /**
     * Validation-closed assignments query.
     * @param fromDate - Start date filter (ISO string)
     * @param toDate - End date filter (ISO string)
     * @param deadlineHours - Validation deadline hours after game start
     * @param associationKey - In demo mode: demoAssociationCode. In production: activeOccupationId.
     */
    validationClosed: (
      fromDate: string,
      toDate: string,
      deadlineHours: number,
      associationKey?: string | null
    ) =>
      [
        ...queryKeys.assignments.all,
        'validationClosed',
        fromDate,
        toDate,
        deadlineHours,
        associationKey,
      ] as const,
  },

  /**
   * Compensation query keys
   */
  compensations: {
    /** Base key - invalidates ALL compensation queries */
    all: ['compensations'] as const,
    /** Parent key for all list queries */
    lists: () => [...queryKeys.compensations.all, 'list'] as const,
    /**
     * Specific list query with search configuration.
     * @param config - Search configuration filters and sorting
     * @param associationKey - In demo mode: demoAssociationCode. In production: activeOccupationId.
     */
    list: (config?: SearchConfiguration, associationKey?: string | null) =>
      [...queryKeys.compensations.lists(), config, associationKey] as const,
  },

  /**
   * Exchange query keys
   */
  exchanges: {
    /** Base key - invalidates ALL exchange queries */
    all: ['exchanges'] as const,
    /** Parent key for all list queries */
    lists: () => [...queryKeys.exchanges.all, 'list'] as const,
    /**
     * Specific list query with search configuration.
     * @param config - Search configuration filters and sorting
     * @param associationKey - In demo mode: demoAssociationCode. In production: activeOccupationId.
     */
    list: (config?: SearchConfiguration, associationKey?: string | null) =>
      [...queryKeys.exchanges.lists(), config, associationKey] as const,
  },

  /**
   * Season query keys
   */
  seasons: {
    /** Base key - invalidates ALL season queries */
    all: ['seasons'] as const,
    /**
     * Active season query.
     * @param associationKey - In demo mode: demoAssociationCode. In production: activeOccupationId.
     */
    active: (associationKey?: string | null) =>
      [...queryKeys.seasons.all, 'active', associationKey] as const,
  },

  /**
   * Association settings query keys
   */
  settings: {
    /** Base key - invalidates ALL settings queries */
    all: ['settings'] as const,
    /**
     * Association settings query.
     * @param associationKey - In demo mode: demoAssociationCode. In production: activeOccupationId.
     */
    association: (associationKey?: string | null) =>
      [...queryKeys.settings.all, 'association', associationKey] as const,
  },

  /**
   * Nomination query keys
   */
  nominations: {
    /** Base key - invalidates ALL nomination queries */
    all: ['nominations'] as const,
    /** Parent key for possible nomination queries */
    possibles: () => [...queryKeys.nominations.all, 'possible'] as const,
    /** Possible nominations for a nomination list */
    possible: (nominationListId: string) =>
      [...queryKeys.nominations.possibles(), nominationListId] as const,
  },

  /**
   * Validation/game details query keys
   */
  validation: {
    /** Base key - invalidates ALL validation queries */
    all: ['validation'] as const,
    /** Parent key for game detail queries */
    gameDetails: () => [...queryKeys.validation.all, 'gameDetails'] as const,
    /** Specific game details with scoresheet */
    gameDetail: (gameId: string) => [...queryKeys.validation.gameDetails(), gameId] as const,
  },

  /**
   * Scorer search query keys
   */
  scorerSearch: {
    /** Base key - invalidates ALL scorer search queries */
    all: ['scorerSearch'] as const,
    /** Specific search query with filters */
    search: (filters: PersonSearchFilter) => [...queryKeys.scorerSearch.all, filters] as const,
  },

  /**
   * Travel time query keys for public transport routing.
   * Includes day type (weekday/saturday/sunday) since Swiss transport
   * schedules differ between these day types.
   */
  travelTime: {
    /** Base key - invalidates ALL travel time queries */
    all: ['travelTime'] as const,
    /** Parent key for all hall travel time queries */
    halls: () => [...queryKeys.travelTime.all, 'hall'] as const,
    /** Travel time to a specific hall from user's home location for a day type */
    hall: (hallId: string, homeLocationHash: string, dayType: 'weekday' | 'saturday' | 'sunday') =>
      [...queryKeys.travelTime.halls(), hallId, homeLocationHash, dayType] as const,
  },

  /**
   * Calendar mode query keys for iCal-based assignment fetching.
   * Used when in calendar mode instead of authenticated API mode.
   */
  calendar: {
    /** Base key - invalidates ALL calendar queries */
    all: ['calendar'] as const,
    /** Parent key for calendar assignment queries */
    assignments: () => [...queryKeys.calendar.all, 'assignments'] as const,
    /**
     * Calendar assignments for a specific calendar code.
     * @param code - The 6-character calendar code
     */
    assignmentsByCode: (code: string) => [...queryKeys.calendar.assignments(), code] as const,
  },

  /**
   * Referee backup (Pikett) query keys for on-call referee management.
   * Used by referee administrators to view on-call schedules for NLA/NLB games.
   */
  refereeBackup: {
    /** Base key - invalidates ALL referee backup queries */
    all: ['refereeBackup'] as const,
    /** Parent key for all list queries */
    lists: () => [...queryKeys.refereeBackup.all, 'list'] as const,
    /**
     * Specific list query with search configuration.
     * @param config - Search configuration filters and sorting
     * @param associationKey - In demo mode: demoAssociationCode. In production: activeOccupationId.
     */
    list: (config?: SearchConfiguration, associationKey?: string | null) =>
      [...queryKeys.refereeBackup.lists(), config, associationKey] as const,
  },

  /**
   * User profile query keys
   */
  user: {
    /** User profile query */
    profile: () => ['user', 'profile'] as const,
  },
} as const;
