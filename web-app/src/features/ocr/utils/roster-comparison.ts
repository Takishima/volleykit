/**
 * Roster Comparison Utility
 *
 * Compares OCR-extracted players against a reference roster.
 * Matching is done by name similarity since OCR shirt numbers
 * are not reliably available in reference data.
 */

import type {
  ParsedPlayer,
  PlayerComparisonResult,
  TeamComparisonResult,
  ComparisonStatus,
} from '../types';

// =============================================================================
// Configuration
// =============================================================================

/** Minimum confidence threshold for a match (0-100) */
const MATCH_THRESHOLD = 50;

/** Weight for last name in similarity calculation */
const LAST_NAME_WEIGHT = 0.6;

/** Weight for first name in similarity calculation */
const FIRST_NAME_WEIGHT = 0.4;

/** Maximum similarity score for contained name matches (0-100) */
const CONTAINED_MATCH_SCORE = 90;

/** Maximum similarity score for word overlap matches (0-100) */
const WORD_OVERLAP_MATCH_SCORE = 85;

/** Maximum similarity score for word-order-independent full name matches (0-100) */
const WORD_ORDER_INDEPENDENT_SCORE = 95;

/** Max confidence score */
const MAX_CONFIDENCE = 100;

/**
 * Common nobility particles that should be considered part of surnames.
 * These are case-insensitive and used for word matching.
 */
const NOBILITY_PARTICLES = new Set([
  'de',
  'del',
  'della',
  'di',
  'du',
  'von',
  'van',
  'den',
  'der',
  'la',
  'le',
  'las',
  'los',
  'dos',
  'da',
  'das',
]);

// =============================================================================
// Types
// =============================================================================

/**
 * Simplified roster player interface for comparison.
 * Matches the RosterPlayer type from validation feature.
 */
export interface RosterPlayerForComparison {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
}

// =============================================================================
// Name Similarity
// =============================================================================

/**
 * Normalize a string for comparison (lowercase, remove accents, trim)
 */
export function normalizeForComparison(str: string): string {
  if (!str) {
    return '';
  }
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract meaningful words from a name, filtering out very short words
 * but keeping nobility particles
 */
function extractNameWords(name: string): string[] {
  const normalized = normalizeForComparison(name);
  if (!normalized) return [];

  return normalized.split(' ').filter((w) => {
    // Keep words with 2+ chars OR nobility particles
    return w.length >= 2 || NOBILITY_PARTICLES.has(w);
  });
}

/**
 * Calculate word-order-independent similarity between two full names.
 * This compares all words in both names regardless of their order.
 *
 * Example: "De Courten Renée" vs "Renée Sophie de Courten"
 * Words1: [de, courten, renee]
 * Words2: [renee, sophie, de, courten]
 * Matching: 3 words match out of 4 unique = 75%
 */
export function calculateWordOrderIndependentSimilarity(
  name1: string,
  name2: string,
): number {
  const words1 = extractNameWords(name1);
  const words2 = extractNameWords(name2);

  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }

  // Count matching words (allowing partial matches for longer words)
  let matchScore = 0;
  const usedWords2 = new Set<number>();

  for (const w1 of words1) {
    let bestMatchScore = 0;
    let bestMatchIdx = -1;

    for (let i = 0; i < words2.length; i++) {
      if (usedWords2.has(i)) continue;

      const w2 = words2[i]!;

      // Exact match
      if (w1 === w2) {
        if (1 > bestMatchScore) {
          bestMatchScore = 1;
          bestMatchIdx = i;
        }
      }
      // One contains the other (for partial matches like "Timo" vs "Timothy")
      else if (w1.length >= 3 && w2.length >= 3) {
        if (w1.includes(w2) || w2.includes(w1)) {
          const shorter = w1.length < w2.length ? w1 : w2;
          const longer = w1.length >= w2.length ? w1 : w2;
          const partialScore = shorter.length / longer.length;
          if (partialScore > bestMatchScore) {
            bestMatchScore = partialScore;
            bestMatchIdx = i;
          }
        }
        // Check if words start the same (nickname matching: Tim/Timo/Timothy)
        else if (w1.startsWith(w2.substring(0, 3)) || w2.startsWith(w1.substring(0, 3))) {
          const partialScore = 0.6; // Give 60% credit for prefix matches
          if (partialScore > bestMatchScore) {
            bestMatchScore = partialScore;
            bestMatchIdx = i;
          }
        }
      }
    }

    if (bestMatchIdx >= 0) {
      matchScore += bestMatchScore;
      usedWords2.add(bestMatchIdx);
    }
  }

  // Calculate similarity based on matched words vs total unique words
  const totalUniqueWords = Math.max(words1.length, words2.length);
  return Math.round((matchScore / totalUniqueWords) * WORD_ORDER_INDEPENDENT_SCORE);
}

/**
 * Calculate similarity between two names (0-100)
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeForComparison(name1);
  const n2 = normalizeForComparison(name2);

  if (!n1 || !n2) {
    return 0;
  }
  if (n1 === n2) {
    return MAX_CONFIDENCE;
  }

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = n1.length < n2.length ? n1 : n2;
    const longer = n1.length >= n2.length ? n1 : n2;
    return Math.round((shorter.length / longer.length) * CONTAINED_MATCH_SCORE);
  }

  // Check word-by-word overlap
  const words1 = n1.split(' ').filter((w) => w.length > 1);
  const words2 = n2.split(' ').filter((w) => w.length > 1);

  let matchingWords = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matchingWords++;
        break;
      }
    }
  }

  const totalWords = Math.max(words1.length, words2.length);
  if (totalWords === 0) {
    return 0;
  }

  return Math.round((matchingWords / totalWords) * WORD_OVERLAP_MATCH_SCORE);
}

/**
 * Build a combined full name from firstName and lastName parts.
 */
function buildFullName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter((p) => p && p.trim()).join(' ');
}

// =============================================================================
// Player Matching
// =============================================================================

interface MatchResult {
  player: RosterPlayerForComparison | null;
  confidence: number;
}

/**
 * Find the best matching roster player for an OCR player.
 *
 * Uses a hybrid approach:
 * 1. Structured comparison (lastName vs lastName, firstName vs firstName)
 * 2. Word-order-independent full name comparison
 *
 * This handles cases where:
 * - Names are parsed with different orderings (De Courten Renée vs Renée de Courten)
 * - Compound surnames are split differently (De vs De Courten)
 * - OCR only captures partial names (RENÉE vs Renée Sophie)
 * - Officials are in reversed format (Lastname Firstname vs Firstname Lastname)
 */
function findBestPlayerMatch(
  ocrPlayer: ParsedPlayer,
  rosterPlayers: RosterPlayerForComparison[],
  usedRosterIds: Set<string>,
): MatchResult {
  let bestMatch: RosterPlayerForComparison | null = null;
  let bestConfidence = 0;

  // Build OCR full name for word-order-independent matching
  const ocrFullName = buildFullName(ocrPlayer.firstName, ocrPlayer.lastName);

  for (const rosterPlayer of rosterPlayers) {
    if (usedRosterIds.has(rosterPlayer.id)) {
      continue;
    }

    // Strategy 1: Structured comparison (lastName vs lastName, firstName vs firstName)
    const lastNameSim = calculateNameSimilarity(
      ocrPlayer.lastName,
      rosterPlayer.lastName ?? '',
    );
    const firstNameSim = calculateNameSimilarity(
      ocrPlayer.firstName,
      rosterPlayer.firstName ?? '',
    );
    const structuredConfidence =
      lastNameSim * LAST_NAME_WEIGHT + firstNameSim * FIRST_NAME_WEIGHT;

    // Strategy 2: Word-order-independent full name comparison
    // This catches cases where name parts are in different order or parsed differently
    const rosterFullName = buildFullName(
      rosterPlayer.firstName ?? '',
      rosterPlayer.lastName ?? '',
    );
    const wordOrderConfidence = calculateWordOrderIndependentSimilarity(
      ocrFullName,
      rosterFullName,
    );

    // Use the higher of the two strategies
    const confidence = Math.max(structuredConfidence, wordOrderConfidence);

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = rosterPlayer;
    }
  }

  // Require minimum confidence threshold for a match
  if (bestConfidence < MATCH_THRESHOLD) {
    return { player: null, confidence: 0 };
  }

  return {
    player: bestMatch,
    confidence: Math.min(MAX_CONFIDENCE, Math.round(bestConfidence)),
  };
}

// =============================================================================
// Roster Comparison
// =============================================================================

/**
 * Compare OCR players against a roster
 */
export function compareRosters(
  ocrPlayers: ParsedPlayer[],
  rosterPlayers: RosterPlayerForComparison[],
): PlayerComparisonResult[] {
  const results: PlayerComparisonResult[] = [];
  const usedRosterIds = new Set<string>();

  // Compare each OCR player against the roster
  for (const ocrPlayer of ocrPlayers) {
    const { player: matchedRoster, confidence } = findBestPlayerMatch(
      ocrPlayer,
      rosterPlayers,
      usedRosterIds,
    );

    if (matchedRoster) {
      usedRosterIds.add(matchedRoster.id);
      results.push({
        status: 'match',
        ocrPlayer,
        rosterPlayerId: matchedRoster.id,
        rosterPlayerName: matchedRoster.displayName,
        confidence,
      });
    } else {
      results.push({
        status: 'ocr-only',
        ocrPlayer,
        rosterPlayerId: null,
        rosterPlayerName: null,
        confidence: 0,
      });
    }
  }

  // Find unmatched roster players
  for (const rosterPlayer of rosterPlayers) {
    if (!usedRosterIds.has(rosterPlayer.id)) {
      results.push({
        status: 'roster-only',
        ocrPlayer: null,
        rosterPlayerId: rosterPlayer.id,
        rosterPlayerName: rosterPlayer.displayName,
        confidence: 0,
      });
    }
  }

  // Sort: matches first, then ocr-only, then roster-only
  const statusOrder: Record<ComparisonStatus, number> = {
    match: 0,
    'ocr-only': 1,
    'roster-only': 2,
  };
  results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return results;
}

/**
 * Compare both teams and return full comparison result
 */
export function compareTeamRosters(
  ocrTeamName: string,
  ocrPlayers: ParsedPlayer[],
  rosterTeamName: string,
  rosterPlayers: RosterPlayerForComparison[],
): TeamComparisonResult {
  const playerResults = compareRosters(ocrPlayers, rosterPlayers);

  const counts = {
    matched: playerResults.filter((r) => r.status === 'match').length,
    ocrOnly: playerResults.filter((r) => r.status === 'ocr-only').length,
    rosterOnly: playerResults.filter((r) => r.status === 'roster-only').length,
  };

  return {
    ocrTeamName,
    rosterTeamName,
    playerResults,
    counts,
  };
}

/**
 * Calculate overall match score for a team comparison
 */
export function calculateMatchScore(result: TeamComparisonResult): number {
  const total = result.counts.matched + result.counts.ocrOnly + result.counts.rosterOnly;
  if (total === 0) {
    return 0;
  }
  return Math.round((result.counts.matched / total) * MAX_CONFIDENCE);
}
