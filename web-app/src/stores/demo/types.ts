/**
 * Shared types for demo store slices.
 */

import type {
  Assignment,
  CompensationRecord,
  GameExchange,
  PossibleNomination,
  PersonSearchResult,
} from "@/api/client";
import type { MockNominationLists } from "../demo-generators";

// Re-export generator types for consumers
export type { DemoAssociationCode, MockNominationLists } from "../demo-generators";

// Mock player for roster display
export interface MockRosterPlayer {
  id: string;
  shirtNumber: number;
  displayName: string;
  licenseCategory?: string;
  isCaptain?: boolean;
  isLibero?: boolean;
}

// Validated game data stored after finalization
export interface ValidatedGameData {
  validatedAt: string;
  scorer: {
    __identity: string;
    displayName: string;
    birthday?: string;
  };
  scoresheetFileId?: string;
  homeRosterClosed: boolean;
  awayRosterClosed: boolean;
}

// Pending scorer selection (saved before finalization)
export interface PendingScorerData {
  __identity: string;
  displayName: string;
  birthday?: string;
}

// Compensation edits for assignments (stored separately since assignments
// don't have a convocationCompensation field like CompensationRecords do)
export interface AssignmentCompensationEdit {
  distanceInMetres?: number;
  correctionReason?: string;
  updatedAt: string;
}

// Demo user referee level configuration
export const DEMO_USER_REFEREE_LEVEL = "N2";
export const DEMO_USER_REFEREE_LEVEL_GRADATION_VALUE = 2;

// Demo data is considered stale after 6 hours
export const DEMO_DATA_STALENESS_MS = 6 * 60 * 60 * 1000;

/**
 * Core state shared across all slices.
 * This contains the lifecycle and configuration data.
 */
export interface DemoCoreState {
  // Current active association code for region-specific data
  activeAssociationCode: import("../demo-generators").DemoAssociationCode | null;

  // Demo user's referee level for filtering exchanges
  userRefereeLevel: string | null;
  userRefereeLevelGradationValue: number | null;

  // Timestamp when demo data was generated (for staleness check)
  generatedAt: number | null;
}

/**
 * Assignments slice state.
 */
export interface DemoAssignmentsState {
  assignments: Assignment[];
}

/**
 * Compensations slice state.
 */
export interface DemoCompensationsState {
  compensations: CompensationRecord[];
  assignmentCompensations: Record<string, AssignmentCompensationEdit>;
}

/**
 * Exchanges slice state.
 */
export interface DemoExchangesState {
  exchanges: GameExchange[];
}

/**
 * Nominations slice state.
 */
export interface DemoNominationsState {
  nominationLists: MockNominationLists;
  possiblePlayers: PossibleNomination[];
  scorers: PersonSearchResult[];
}

/**
 * Validation slice state.
 */
export interface DemoValidationState {
  validatedGames: Record<string, ValidatedGameData>;
  pendingScorers: Record<string, PendingScorerData>;
}

/**
 * Combined state for all demo slices.
 */
export interface DemoState
  extends DemoCoreState,
    DemoAssignmentsState,
    DemoCompensationsState,
    DemoExchangesState,
    DemoNominationsState,
    DemoValidationState {
  // Data lifecycle actions
  initializeDemoData: (
    associationCode?: import("../demo-generators").DemoAssociationCode,
  ) => void;
  clearDemoData: () => void;
  refreshData: () => void;
  setActiveAssociation: (
    associationCode: import("../demo-generators").DemoAssociationCode,
  ) => void;

  // Exchange operations
  applyForExchange: (exchangeId: string) => void;
  withdrawFromExchange: (exchangeId: string) => void;
  addAssignmentToExchange: (assignmentId: string) => void;

  // Compensation operations
  updateCompensation: (
    compensationId: string,
    data: { distanceInMetres?: number; correctionReason?: string },
  ) => void;

  // Assignment compensation operations
  updateAssignmentCompensation: (
    assignmentId: string,
    data: { distanceInMetres?: number; correctionReason?: string },
  ) => void;
  getAssignmentCompensation: (
    assignmentId: string,
  ) => AssignmentCompensationEdit | null;

  // Game validation operations
  markGameValidated: (
    gameId: string,
    data: {
      scorer: { __identity: string; displayName: string; birthday?: string };
      scoresheetFileId?: string;
    },
  ) => void;
  isGameValidated: (gameId: string) => boolean;
  getValidatedGameData: (gameId: string) => ValidatedGameData | null;
  setPendingScorer: (
    gameId: string,
    scorer: { __identity: string; displayName: string; birthday?: string },
  ) => void;
  getPendingScorer: (gameId: string) => PendingScorerData | null;
  clearPendingScorer: (gameId: string) => void;

  // Nomination list operations
  updateNominationListClosed: (
    gameId: string,
    team: "home" | "away",
    closed: boolean,
  ) => void;
  updateNominationListPlayers: (
    gameId: string,
    team: "home" | "away",
    playerNominationIds: string[],
  ) => void;
}
