/**
 * Demo store - re-exports from the modular demo store structure.
 *
 * This file exists for backward compatibility. The actual implementation
 * has been split into domain-specific slices in the ./demo/ directory:
 *
 * - demo/types.ts: Shared type definitions
 * - demo/assignments.ts: Assignment state
 * - demo/compensations.ts: Compensation state and operations
 * - demo/exchanges.ts: Exchange state and operations
 * - demo/nominations.ts: Nomination list state and operations
 * - demo/validation.ts: Game validation state and operations
 * - demo/index.ts: Combined store with lifecycle actions
 */

export {
  useDemoStore,
  type DemoState,
  type DemoAssociationCode,
  type MockNominationLists,
  type MockRosterPlayer,
  type ValidatedGameData,
  type PendingScorerData,
  type AssignmentCompensationEdit,
} from "./demo/index";
