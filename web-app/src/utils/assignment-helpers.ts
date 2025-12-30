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
 * - 2L-5L: Lower leagues (regional, depth varies by region)
 * - Junior leagues: U14, U16, U18, U20, U23, SAR
 *   (in French: M14, M16, M18, M20, M23)
 *
 * Game reports are only available for NLA and NLB games
 * as they require official documentation for Swiss Volley.
 */
const GAME_REPORT_ELIGIBLE_LEAGUES = ["NLA", "NLB"];

/**
 * Checks if an assignment is eligible for game report generation.
 *
 * Game reports are only available when:
 * 1. The game is NLA (Nationalliga A) or NLB (Nationalliga B), the top two tiers
 * 2. The referee is assigned as the first head referee (head-one position)
 *
 * Only the first head referee fills out the official game report.
 * Games in other leagues (1L and below) do not require official
 * game reports through this system.
 *
 * @param assignment - The referee assignment to check
 * @returns true if the assignment is for an NLA/NLB game AND the referee
 *          is in head-one position, false otherwise
 */
export function isGameReportEligible(assignment: Assignment): boolean {
  const leagueName =
    assignment.refereeGame?.game?.group?.phase?.league?.leagueCategory?.name;
  const isEligibleLeague =
    leagueName !== undefined && GAME_REPORT_ELIGIBLE_LEAGUES.includes(leagueName);
  const isFirstReferee = assignment.refereePosition === "head-one";
  return isEligibleLeague && isFirstReferee;
}

/**
 * Checks if an assignment is eligible for game validation.
 *
 * Game validation is only available for referees assigned as the first
 * head referee (head-one position), as they are responsible for validating
 * game results. This applies to all game levels, unlike game reports which
 * are restricted to NLA/NLB games.
 *
 * @param assignment - The referee assignment to check
 * @returns true if the referee is in head-one position, false otherwise
 */
export function isValidationEligible(assignment: Assignment): boolean {
  return assignment.refereePosition === "head-one";
}

/**
 * Default validation deadline in hours after game start.
 * Used as fallback when association settings are not available.
 * Common values in Swiss volleyball: 6-24 hours.
 */
export const DEFAULT_VALIDATION_DEADLINE_HOURS = 6;

/** Milliseconds per hour constant for time calculations. */
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Parses a game start time string into a Date object.
 * Returns null for invalid or missing input.
 */
function parseGameStartTime(gameStartTime: string | undefined | null): Date | null {
  if (!gameStartTime) return null;
  const date = new Date(gameStartTime);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Checks if the validation period for a game has closed.
 *
 * Referees have a limited window to validate game results after the game starts.
 * This window is configured per association via `hoursAfterGameStartForRefereeToEditGameList`.
 * Once this window passes, the validation is considered "closed".
 *
 * Note: Uses strict "greater than" comparison (now > deadline), meaning validation
 * is open AT the exact deadline moment and closes strictly AFTER. For example,
 * with a 6-hour deadline: at exactly 6 hours after game start, validation is still
 * open; at 6 hours + 1 second, it's closed.
 *
 * @param gameStartTime - ISO datetime string of when the game started
 * @param deadlineHours - Hours after game start when validation closes
 * @returns true if validation period has closed (strictly after deadline),
 *          false if still open, game hasn't started, or invalid date
 */
export function isValidationClosed(
  gameStartTime: string | undefined | null,
  deadlineHours: number = DEFAULT_VALIDATION_DEADLINE_HOURS,
): boolean {
  const gameStart = parseGameStartTime(gameStartTime);
  if (!gameStart) return false;

  const validationDeadline = new Date(gameStart.getTime() + deadlineHours * MS_PER_HOUR);
  return new Date() > validationDeadline;
}

/**
 * Checks if a game is in the past (has started).
 *
 * @param gameStartTime - ISO datetime string of when the game starts/started
 * @returns true if game has started, false if still upcoming or invalid date
 */
export function isGamePast(gameStartTime: string | undefined | null): boolean {
  const gameStart = parseGameStartTime(gameStartTime);
  return gameStart !== null && new Date() > gameStart;
}
