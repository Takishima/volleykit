/**
 * Shared hooks module - TanStack Query hooks for data fetching
 */

// Export hooks - use explicit exports to avoid DEFAULT_PAGE_SIZE conflicts
export {
  useAssignments,
  useAssignmentDetails,
  type UseAssignmentsOptions,
  type DatePeriod,
  DEFAULT_PAGE_SIZE,
} from './useAssignments';
export { useCompensations, type UseCompensationsOptions } from './useCompensations';
export { useExchanges, type UseExchangesOptions } from './useExchanges';
export * from './useAuth';
