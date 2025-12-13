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

/**
 * League categories that are eligible for game report generation.
 *
 * Swiss volleyball league hierarchy (top to bottom):
 * - NLA: Nationalliga A (top tier, men's and women's)
 * - NLB: Nationalliga B (second tier, men's and women's)
 * - 1L: 1. Liga (third tier, national)
 * - 2L, 3L, 4L: Lower leagues (regional)
 *
 * Game reports are only available for NLA and NLB games
 * as they require official documentation for Swiss Volley.
 */
const GAME_REPORT_ELIGIBLE_LEAGUES = ["NLA", "NLB"];

/**
 * Checks if an assignment is eligible for game report generation.
 *
 * Game reports are only available for NLA (Nationalliga A) and NLB
 * (Nationalliga B) games, the top two tiers of Swiss volleyball.
 * Games in other leagues (1L and below) do not require official
 * game reports through this system.
 *
 * @param assignment - The referee assignment to check
 * @returns true if the assignment's league is NLA or NLB, false otherwise
 *          (including when league data is undefined)
 */
export function isGameReportEligible(assignment: Assignment): boolean {
  const leagueName =
    assignment.refereeGame?.game?.group?.phase?.league?.leagueCategory?.name;
  return leagueName !== undefined && GAME_REPORT_ELIGIBLE_LEAGUES.includes(leagueName);
}
