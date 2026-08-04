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

// Assignment hooks and types
export { useAssignments, useAssignmentDetails } from '@/features/assignments/hooks/useAssignments'

// Compensation hooks and types
export { useCompensations } from '@/features/compensations/hooks/useCompensations'

// Exchange hooks and types
export { useGameExchanges, useApplyForExchange } from '@/features/exchanges/hooks/useExchanges'

// Settings hooks
