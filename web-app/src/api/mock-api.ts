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
  GameExchange,
  AssignmentsResponse,
  CompensationsResponse,
  ExchangesResponse,
} from "./client";
import { useDemoStore } from "@/stores/demo";

// Network delay constants for realistic demo behavior
const MOCK_NETWORK_DELAY_MS = 50;
const MOCK_MUTATION_DELAY_MS = 100;

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
  if (filter.enumValues && filter.enumValues.length > 0) {
    return filter.enumValues.includes(String(value));
  }

  // Values filter (for boolean/string fields)
  // Converts value to string for comparison (handles booleans, strings, numbers)
  if (filter.values && filter.values.length > 0) {
    return filter.values.includes(String(value));
  }

  // No filter criteria - include all
  return true;
}

/**
 * Apply all filters from SearchConfiguration to a list of items.
 */
function applyFilters<T>(items: T[], filters?: PropertyFilter[]): T[] {
  if (!filters || filters.length === 0) {
    return items;
  }

  return items.filter((item) => filters.every((filter) => matchesFilter(item, filter)));
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
  if (!orderings || orderings.length === 0) {
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

    // Type assertion safe by design: store.assignments is Assignment[], and
    // processSearchRequest only filters/sorts/paginates without type transformation
    return {
      items: items as Assignment[],
      totalItemsCount: total,
    };
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

    // Type assertion safe by design: store.compensations is CompensationRecord[], and
    // processSearchRequest only filters/sorts/paginates without type transformation
    return {
      items: items as CompensationRecord[],
      totalItemsCount: total,
    };
  },

  async searchExchanges(
    config: SearchConfiguration = {},
  ): Promise<ExchangesResponse> {
    await delay(MOCK_NETWORK_DELAY_MS);

    const store = useDemoStore.getState();
    const { items, total } = processSearchRequest(store.exchanges, config);

    // Type assertion safe by design: store.exchanges is GameExchange[], and
    // processSearchRequest only filters/sorts/paginates without type transformation
    return {
      items: items as GameExchange[],
      totalItemsCount: total,
    };
  },

  async applyForExchange(exchangeId: string): Promise<void> {
    await delay(MOCK_MUTATION_DELAY_MS);

    const store = useDemoStore.getState();
    store.applyForExchange(exchangeId);
  },

  async withdrawFromExchange(exchangeId: string): Promise<void> {
    await delay(MOCK_MUTATION_DELAY_MS);

    const store = useDemoStore.getState();
    store.withdrawFromExchange(exchangeId);
  },
};

/**
 * Helper to simulate network delay for more realistic demo behavior.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default mockApi;
