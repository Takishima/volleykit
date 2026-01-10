/**
 * Referee Backup (Pikett) Feature
 *
 * This feature provides API client integration for managing on-call
 * referee schedules for NLA and NLB games.
 *
 * Implements:
 * - useRefereeBackups: Hook for fetching all backup schedules (admin view)
 * - useMyOnCallAssignments: Hook for fetching current user's on-call duties
 * - OnCallCard: UI component for displaying on-call assignments
 */

export { useRefereeBackups } from "./hooks/useRefereeBackups";
export {
  useMyOnCallAssignments,
  isUserAssignment,
  extractUserOnCallAssignments,
  type OnCallAssignment,
} from "./hooks/useMyOnCallAssignments";
export { OnCallCard } from "./components/OnCallCard";
