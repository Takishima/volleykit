import type { Assignment, CompensationRecord } from "@/api/client";

/**
 * Modal animation delay in milliseconds.
 * Used for cleanup timeout after modal closes.
 */
export const MODAL_CLEANUP_DELAY = 300;

/**
 * Extracts team names from a game object structure.
 * Works with both Assignment and CompensationRecord types.
 */
export function extractTeamNames(
  game:
    | {
        encounter?: {
          teamHome?: { name?: string };
          teamAway?: { name?: string };
        };
      }
    | undefined,
): { homeTeam: string; awayTeam: string } {
  const homeTeam = game?.encounter?.teamHome?.name || "TBD";
  const awayTeam = game?.encounter?.teamAway?.name || "TBD";
  return { homeTeam, awayTeam };
}

/**
 * Extracts team names from an assignment.
 */
export function getTeamNames(assignment: Assignment): {
  homeTeam: string;
  awayTeam: string;
} {
  return extractTeamNames(assignment.refereeGame?.game);
}

/**
 * Extracts team names from a compensation record.
 */
export function getTeamNamesFromCompensation(
  compensation: CompensationRecord,
): { homeTeam: string; awayTeam: string } {
  return extractTeamNames(compensation.refereeGame?.game);
}
