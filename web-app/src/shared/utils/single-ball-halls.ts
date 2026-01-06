/**
 * Utilities for detecting single-ball halls in assignments.
 */

import {
  SINGLE_BALL_HALLS,
  SINGLE_BALL_LEAGUES,
  SINGLE_BALL_PDF_PATHS,
  type SingleBallHall,
} from "@/data/single-ball-halls";
import type { Assignment } from "@/api/client";
import type { Locale } from "@/i18n";

export interface SingleBallHallMatch {
  /** The matched hall configuration */
  hall: SingleBallHall;
  /** Whether the rule is conditional (only applies when single sub-hall available) */
  isConditional: boolean;
}

/**
 * Normalizes a string for comparison by removing accents and converting to lowercase.
 */
function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Checks if a city name matches any single-ball hall city.
 */
function matchCity(city: string, hallCity: string): boolean {
  return normalizeString(city) === normalizeString(hallCity);
}

/**
 * Checks if a hall name contains any of the keywords.
 */
function matchHallKeywords(hallName: string, keywords: string[]): boolean {
  const normalizedHallName = normalizeString(hallName);
  return keywords.some((keyword) =>
    normalizedHallName.includes(normalizeString(keyword))
  );
}

/**
 * Checks if the league category is NLA or NLB.
 */
function isTopLeague(leagueCategory: string | undefined): boolean {
  if (!leagueCategory) return false;
  const normalized = leagueCategory.toUpperCase().trim();
  return SINGLE_BALL_LEAGUES.some((league) => normalized === league);
}

/**
 * Detects if an assignment is in a single-ball hall.
 * Returns match details if found, null otherwise.
 *
 * Rules are only applied for NLA/NLB games.
 *
 * Matching requires BOTH:
 * 1. City name matches exactly (case-insensitive, accent-normalized)
 * 2. Hall name contains at least one of the keywords
 *
 * This strict matching avoids false positives since some keywords
 * like "Turnhalle" or "Gymnasium" are very common.
 */
export function detectSingleBallHall(
  assignment: Assignment
): SingleBallHallMatch | null {
  const game = assignment.refereeGame?.game;
  if (!game) return null;

  // Only apply to NLA/NLB games
  const leagueCategory = game.group?.phase?.league?.leagueCategory?.name;
  if (!isTopLeague(leagueCategory)) return null;

  // Get hall and city info
  const city = game.hall?.primaryPostalAddress?.city;
  const hallName = game.hall?.name;

  // Require both city and hall name for accurate matching
  if (!city || !hallName) return null;

  // Find matching hall - requires BOTH city AND hall keyword match
  for (const hall of SINGLE_BALL_HALLS) {
    if (
      matchCity(city, hall.city) &&
      matchHallKeywords(hallName, hall.hallKeywords)
    ) {
      return {
        hall,
        isConditional: hall.conditional,
      };
    }
  }

  return null;
}

/**
 * Gets the PDF path for single-ball halls documentation based on locale.
 * Includes the base URL for correct resolution on GitHub Pages.
 */
export function getSingleBallHallsPdfPath(locale: Locale): string {
  const basePath = import.meta.env.BASE_URL;
  const pdfPath = SINGLE_BALL_PDF_PATHS[locale];
  // Remove leading slash from pdfPath since BASE_URL already ends with /
  return `${basePath}${pdfPath.slice(1)}`;
}
