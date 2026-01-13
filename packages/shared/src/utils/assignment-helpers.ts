/**
 * Assignment helper utilities
 *
 * This will be extracted from web-app/src/features/assignments/utils/
 * Placeholder for now - implementation in Phase 2
 */

export interface AssignmentStatus {
  isConfirmed: boolean;
  isPending: boolean;
  isCancelled: boolean;
}

export const getAssignmentStatus = (_status: string): AssignmentStatus => {
  // Placeholder - will be implemented in Phase 2 (T025)
  return {
    isConfirmed: false,
    isPending: true,
    isCancelled: false,
  };
};

export const formatTeamMatchup = (homeTeam: string, awayTeam: string): string => {
  return `${homeTeam} vs ${awayTeam}`;
};
