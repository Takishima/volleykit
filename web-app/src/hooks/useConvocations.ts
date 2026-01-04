/**
 * Barrel file for convocation-related hooks.
 *
 * This file re-exports hooks from focused modules to maintain backwards compatibility.
 * New code should import directly from the specific modules:
 * - useAssignments.ts - Assignment queries and mutations
 * - useCompensations.ts - Compensation queries and mutations
 * - useExchanges.ts - Exchange queries and mutations
 * - useSettings.ts - Association settings and season hooks
 * - usePaginatedQuery.ts - Shared pagination utilities
 */

// Re-export query keys for backwards compatibility
export { queryKeys } from "@/api/queryKeys";

// Assignment hooks and types
export {
  type DatePeriod,
  getDateRangeForPeriod,
  useAssignments,
  useUpcomingAssignments,
  usePastAssignments,
  useValidationClosedAssignments,
  useAssignmentDetails,
  useCalendarAssignments,
  type CalendarAssignment,
} from "./useAssignments";

// Compensation hooks and types
export {
  type CompensationUpdateData,
  type CompensationErrorKey,
  COMPENSATION_ERROR_KEYS,
  useCompensations,
  usePaidCompensations,
  useUnpaidCompensations,
  useUpdateCompensation,
  useUpdateAssignmentCompensation,
} from "./useCompensations";

// Exchange hooks and types
export {
  type ExchangeStatus,
  useGameExchanges,
  useApplyForExchange,
  useWithdrawFromExchange,
} from "./useExchanges";

// Settings hooks
export { useAssociationSettings, useActiveSeason } from "./useSettings";
