/**
 * Public facade for compensation hooks.
 *
 * Re-exports from focused sub-modules:
 * - useCompensationsQuery.ts  — data fetching (useCompensations)
 * - useCompensationMutations.ts — mutations (useUpdateCompensation, useBatchUpdateCompensations, useUpdateAssignmentCompensation)
 *
 * All consumers can continue to import from this file without changes.
 */

// --- Query hooks & constants ---
export {
  COMPENSATION_ERROR_KEYS,
  type CompensationErrorKey,
  useCompensations,
} from './useCompensationsQuery'

// --- Mutation hooks & types ---
export {
  type BatchUpdateResult,
  useUpdateCompensation,
  useBatchUpdateCompensations,
  useUpdateAssignmentCompensation,
} from './useCompensationMutations'
