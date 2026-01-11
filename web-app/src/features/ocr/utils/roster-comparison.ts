/**
 * Roster Comparison Utility
 *
 * Compares OCR-extracted players against a reference roster.
 * Matching is done by name similarity since OCR shirt numbers
 * are not reliably available in reference data.
 *
 * Uses Fuse.js for fuzzy string matching with support for:
 * - Accented characters (German: ü, ö, ä; French: é, è, ê, etc.)
 * - Word-order-independent matching
 * - Partial name matches (nicknames like Timo/Timothy)
 */

import Fuse, { type IFuseOptions } from 'fuse.js'

import type {
  ParsedPlayer,
  PlayerComparisonResult,
  TeamComparisonResult,
  ComparisonStatus,
} from '../types'

// =============================================================================
// Configuration
// =============================================================================

/** Minimum confidence threshold for a match (0-100) */
const MATCH_THRESHOLD = 50

/** Weight for last name in similarity calculation */
const LAST_NAME_WEIGHT = 0.6

/** Weight for first name in similarity calculation */
const FIRST_NAME_WEIGHT = 0.4

/** Maximum similarity score for contained name matches (0-100) */
const CONTAINED_MATCH_SCORE = 90

/** Maximum similarity score for word overlap matches (0-100) */
const WORD_OVERLAP_MATCH_SCORE = 85

/** Maximum similarity score for word-order-independent full name matches (0-100) */
const WORD_ORDER_INDEPENDENT_SCORE = 95

/** Minimum Fuse.js score (0-1, lower is better) to consider a word match */
const MAX_FUSE_WORD_SCORE = 0.4

/** Minimum normalized similarity (0-1) for word-level match to count */
const MIN_WORD_MATCH_SIMILARITY = 0.6

/**
 * Fuse.js options for word-level matching.
 * - threshold: 0.4 allows for typos and OCR errors
 * - ignoreLocation: true for matching anywhere in the string
 * - includeScore: true to get similarity scores
 */
const FUSE_WORD_OPTIONS: IFuseOptions<string> = {
  threshold: MAX_FUSE_WORD_SCORE,
  ignoreLocation: true,
  includeScore: true,
}

/** Max confidence score */
const MAX_CONFIDENCE = 100

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
])

// =============================================================================
// Types
// =============================================================================

/**
 * Simplified roster player interface for comparison.
 * Matches the RosterPlayer type from validation feature.
 */
export interface RosterPlayerForComparison {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
}

/**
 * Pre-computed Fuse instances and word arrays for a roster player.
 * Used to avoid repeated Fuse instantiation during comparison loops.
 */
interface RosterPlayerCache {
  fullNameWords: string[]
  fullNameFuse: Fuse<string> | null
  lastNameWords: string[]
  lastNameFuse: Fuse<string> | null
  firstNameWords: string[]
  firstNameFuse: Fuse<string> | null
}

// =============================================================================
// Fuse Cache
// =============================================================================

/**
 * Build a cache of pre-computed Fuse instances for roster players.
 * This avoids O(n*m) Fuse instantiation during roster comparison.
 */
function buildRosterPlayerCache(
  rosterPlayers: RosterPlayerForComparison[]
): Map<string, RosterPlayerCache> {
  const cache = new Map<string, RosterPlayerCache>()

  for (const player of rosterPlayers) {
    const fullName = [player.firstName ?? '', player.lastName ?? '']
      .filter((p) => p && p.trim())
      .join(' ')

    // For word-order-independent matching (uses extractNameWords logic)
    const fullNameNormalized = normalizeForComparisonInternal(fullName)
    const fullNameWords = fullNameNormalized
      ? fullNameNormalized.split(' ').filter((w) => w.length >= 2 || NOBILITY_PARTICLES.has(w))
      : []
    const fullNameFuse =
      fullNameWords.length > 0 ? new Fuse(fullNameWords, FUSE_WORD_OPTIONS) : null

    // For structured matching (lastName)
    const lastNameNormalized = normalizeForComparisonInternal(player.lastName ?? '')
    const lastNameWords = lastNameNormalized
      ? lastNameNormalized.split(' ').filter((w) => w.length > 1)
      : []
    const lastNameFuse =
      lastNameWords.length > 0 ? new Fuse(lastNameWords, FUSE_WORD_OPTIONS) : null

    // For structured matching (firstName)
    const firstNameNormalized = normalizeForComparisonInternal(player.firstName ?? '')
    const firstNameWords = firstNameNormalized
      ? firstNameNormalized.split(' ').filter((w) => w.length > 1)
      : []
    const firstNameFuse =
      firstNameWords.length > 0 ? new Fuse(firstNameWords, FUSE_WORD_OPTIONS) : null

    cache.set(player.id, {
      fullNameWords,
      fullNameFuse,
      lastNameWords,
      lastNameFuse,
      firstNameWords,
      firstNameFuse,
    })
  }

  return cache
}

// =============================================================================
// Name Similarity
// =============================================================================

/**
 * Internal normalize function (used by cache building before export is defined)
 */
function normalizeForComparisonInternal(str: string): string {
  if (!str) {
    return ''
  }
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize a string for comparison (lowercase, remove accents, trim)
 */
export function normalizeForComparison(str: string): string {
  return normalizeForComparisonInternal(str)
}

/**
 * Extract meaningful words from a name, filtering out very short words
 * but keeping nobility particles
 */
function extractNameWords(name: string): string[] {
  const normalized = normalizeForComparison(name)
  if (!normalized) return []

  return normalized.split(' ').filter((w) => {
    // Keep words with 2+ chars OR nobility particles
    return w.length >= 2 || NOBILITY_PARTICLES.has(w)
  })
}

/**
 * Calculate word-order-independent similarity between two full names.
 * This compares all words in both names regardless of their order using Fuse.js.
 *
 * Example: "De Courten Renée" vs "Renée Sophie de Courten"
 * Words1: [de, courten, renee]
 * Words2: [renee, sophie, de, courten]
 * Matching: 3 words match out of 4 unique = 75%
 *
 * Uses Fuse.js for word comparison which handles:
 * - Accented characters (Müller ↔ Mueller)
 * - Typos and OCR errors
 * - Partial matches with configurable threshold
 */
export function calculateWordOrderIndependentSimilarity(name1: string, name2: string): number {
  const words1 = extractNameWords(name1)
  const words2 = extractNameWords(name2)

  if (words1.length === 0 || words2.length === 0) {
    return 0
  }

  // Create Fuse instance for searching words2
  const fuse = new Fuse(words2, FUSE_WORD_OPTIONS)

  // Count matching words using Fuse.js for comparison
  let matchScore = 0
  const usedIndices = new Set<number>()

  for (const w1 of words1) {
    const results = fuse.search(w1)

    // Find best unused match
    for (const result of results) {
      const idx = result.refIndex
      if (usedIndices.has(idx)) continue

      // Fuse.js score: 0 = perfect match, 1 = no match
      // Convert to 0-1 where 1 is perfect
      const similarity = 1 - (result.score ?? 1)

      if (similarity > 0) {
        matchScore += similarity
        usedIndices.add(idx)
        break
      }
    }
  }

  // Calculate similarity based on matched words vs total unique words
  const totalUniqueWords = Math.max(words1.length, words2.length)
  return Math.round((matchScore / totalUniqueWords) * WORD_ORDER_INDEPENDENT_SCORE)
}

/**
 * Calculate similarity between two names (0-100) using Fuse.js.
 *
 * This handles:
 * - Case differences
 * - Accented characters (Müller ↔ Muller)
 * - Minor typos and OCR errors
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeForComparison(name1)
  const n2 = normalizeForComparison(name2)

  if (!n1 || !n2) {
    return 0
  }
  if (n1 === n2) {
    return MAX_CONFIDENCE
  }

  // Check if one contains the other (fast path, no Fuse needed)
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = n1.length < n2.length ? n1 : n2
    const longer = n1.length >= n2.length ? n1 : n2
    return Math.round((shorter.length / longer.length) * CONTAINED_MATCH_SCORE)
  }

  // Check word-by-word overlap using Fuse.js
  const words1 = n1.split(' ').filter((w) => w.length > 1)
  const words2 = n2.split(' ').filter((w) => w.length > 1)

  if (words2.length === 0) {
    return 0
  }

  const wordFuse = new Fuse(words2, FUSE_WORD_OPTIONS)
  let matchingScore = 0
  const usedIndices = new Set<number>()

  for (const w1 of words1) {
    const results = wordFuse.search(w1)

    // Find best unused match to avoid double-counting
    for (const result of results) {
      const idx = result.refIndex
      if (usedIndices.has(idx)) continue

      const similarity = 1 - (result.score ?? 1)
      if (similarity > MIN_WORD_MATCH_SIMILARITY) {
        matchingScore += similarity
        usedIndices.add(idx)
        break
      }
    }
  }

  const totalWords = Math.max(words1.length, words2.length)
  if (totalWords === 0) {
    return 0
  }

  return Math.round((matchingScore / totalWords) * WORD_OVERLAP_MATCH_SCORE)
}

/**
 * Optimized word-order-independent similarity using pre-built Fuse instance.
 * Used internally by compareRosters for O(m) instead of O(n*m) Fuse instantiation.
 */
function calculateWordOrderIndependentSimilarityWithCache(
  name1: string,
  cachedWords2: string[],
  cachedFuse: Fuse<string> | null
): number {
  const words1 = extractNameWords(name1)

  if (words1.length === 0 || cachedWords2.length === 0 || !cachedFuse) {
    return 0
  }

  let matchScore = 0
  const usedIndices = new Set<number>()

  for (const w1 of words1) {
    const results = cachedFuse.search(w1)

    for (const result of results) {
      const idx = result.refIndex
      if (usedIndices.has(idx)) continue

      const similarity = 1 - (result.score ?? 1)
      if (similarity > 0) {
        matchScore += similarity
        usedIndices.add(idx)
        break
      }
    }
  }

  const totalUniqueWords = Math.max(words1.length, cachedWords2.length)
  return Math.round((matchScore / totalUniqueWords) * WORD_ORDER_INDEPENDENT_SCORE)
}

/**
 * Optimized name similarity using pre-built Fuse instance.
 * Used internally by compareRosters for O(m) instead of O(n*m) Fuse instantiation.
 */
function calculateNameSimilarityWithCache(
  name1: string,
  name2Normalized: string,
  cachedWords2: string[],
  cachedFuse: Fuse<string> | null
): number {
  const n1 = normalizeForComparison(name1)

  if (!n1 || !name2Normalized) {
    return 0
  }
  if (n1 === name2Normalized) {
    return MAX_CONFIDENCE
  }

  // Check if one contains the other (fast path, no Fuse needed)
  if (n1.includes(name2Normalized) || name2Normalized.includes(n1)) {
    const shorter = n1.length < name2Normalized.length ? n1 : name2Normalized
    const longer = n1.length >= name2Normalized.length ? n1 : name2Normalized
    return Math.round((shorter.length / longer.length) * CONTAINED_MATCH_SCORE)
  }

  // Check word-by-word overlap using cached Fuse
  const words1 = n1.split(' ').filter((w) => w.length > 1)

  if (cachedWords2.length === 0 || !cachedFuse) {
    return 0
  }

  let matchingScore = 0
  const usedIndices = new Set<number>()

  for (const w1 of words1) {
    const results = cachedFuse.search(w1)

    for (const result of results) {
      const idx = result.refIndex
      if (usedIndices.has(idx)) continue

      const similarity = 1 - (result.score ?? 1)
      if (similarity > MIN_WORD_MATCH_SIMILARITY) {
        matchingScore += similarity
        usedIndices.add(idx)
        break
      }
    }
  }

  const totalWords = Math.max(words1.length, cachedWords2.length)
  if (totalWords === 0) {
    return 0
  }

  return Math.round((matchingScore / totalWords) * WORD_OVERLAP_MATCH_SCORE)
}

/**
 * Build a combined full name from firstName and lastName parts.
 */
function buildFullName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter((p) => p && p.trim()).join(' ')
}

// =============================================================================
// Player Matching
// =============================================================================

interface MatchResult {
  player: RosterPlayerForComparison | null
  confidence: number
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
  cache?: Map<string, RosterPlayerCache>
): MatchResult {
  let bestMatch: RosterPlayerForComparison | null = null
  let bestConfidence = 0

  // Build OCR full name for word-order-independent matching
  const ocrFullName = buildFullName(ocrPlayer.firstName, ocrPlayer.lastName)

  for (const rosterPlayer of rosterPlayers) {
    if (usedRosterIds.has(rosterPlayer.id)) {
      continue
    }

    let structuredConfidence: number
    let wordOrderConfidence: number

    // Use cached Fuse instances if available
    const playerCache = cache?.get(rosterPlayer.id)

    if (playerCache) {
      // Optimized path: use pre-built Fuse instances
      const lastNameNormalized = normalizeForComparisonInternal(rosterPlayer.lastName ?? '')
      const firstNameNormalized = normalizeForComparisonInternal(rosterPlayer.firstName ?? '')

      const lastNameSim = calculateNameSimilarityWithCache(
        ocrPlayer.lastName,
        lastNameNormalized,
        playerCache.lastNameWords,
        playerCache.lastNameFuse
      )
      const firstNameSim = calculateNameSimilarityWithCache(
        ocrPlayer.firstName,
        firstNameNormalized,
        playerCache.firstNameWords,
        playerCache.firstNameFuse
      )
      structuredConfidence = lastNameSim * LAST_NAME_WEIGHT + firstNameSim * FIRST_NAME_WEIGHT

      wordOrderConfidence = calculateWordOrderIndependentSimilarityWithCache(
        ocrFullName,
        playerCache.fullNameWords,
        playerCache.fullNameFuse
      )
    } else {
      // Fallback: create Fuse instances on-the-fly (original behavior)
      const lastNameSim = calculateNameSimilarity(ocrPlayer.lastName, rosterPlayer.lastName ?? '')
      const firstNameSim = calculateNameSimilarity(
        ocrPlayer.firstName,
        rosterPlayer.firstName ?? ''
      )
      structuredConfidence = lastNameSim * LAST_NAME_WEIGHT + firstNameSim * FIRST_NAME_WEIGHT

      const rosterFullName = buildFullName(
        rosterPlayer.firstName ?? '',
        rosterPlayer.lastName ?? ''
      )
      wordOrderConfidence = calculateWordOrderIndependentSimilarity(ocrFullName, rosterFullName)
    }

    // Use the higher of the two strategies
    const confidence = Math.max(structuredConfidence, wordOrderConfidence)

    if (confidence > bestConfidence) {
      bestConfidence = confidence
      bestMatch = rosterPlayer
    }
  }

  // Require minimum confidence threshold for a match
  if (bestConfidence < MATCH_THRESHOLD) {
    return { player: null, confidence: 0 }
  }

  return {
    player: bestMatch,
    confidence: Math.min(MAX_CONFIDENCE, Math.round(bestConfidence)),
  }
}

// =============================================================================
// Roster Comparison
// =============================================================================

/**
 * Compare OCR players against a roster.
 *
 * Performance: Pre-builds Fuse instances for roster players to reduce
 * Fuse instantiation from O(n*m) to O(m), where n = OCR players, m = roster players.
 */
export function compareRosters(
  ocrPlayers: ParsedPlayer[],
  rosterPlayers: RosterPlayerForComparison[]
): PlayerComparisonResult[] {
  const results: PlayerComparisonResult[] = []
  const usedRosterIds = new Set<string>()

  // Pre-build Fuse instances for all roster players (O(m) instead of O(n*m))
  const cache = buildRosterPlayerCache(rosterPlayers)

  // Compare each OCR player against the roster
  for (const ocrPlayer of ocrPlayers) {
    const { player: matchedRoster, confidence } = findBestPlayerMatch(
      ocrPlayer,
      rosterPlayers,
      usedRosterIds,
      cache
    )

    if (matchedRoster) {
      usedRosterIds.add(matchedRoster.id)
      results.push({
        status: 'match',
        ocrPlayer,
        rosterPlayerId: matchedRoster.id,
        rosterPlayerName: matchedRoster.displayName,
        confidence,
      })
    } else {
      results.push({
        status: 'ocr-only',
        ocrPlayer,
        rosterPlayerId: null,
        rosterPlayerName: null,
        confidence: 0,
      })
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
      })
    }
  }

  // Sort: matches first, then ocr-only, then roster-only
  const statusOrder: Record<ComparisonStatus, number> = {
    match: 0,
    'ocr-only': 1,
    'roster-only': 2,
  }
  results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  return results
}

/**
 * Compare both teams and return full comparison result
 */
export function compareTeamRosters(
  ocrTeamName: string,
  ocrPlayers: ParsedPlayer[],
  rosterTeamName: string,
  rosterPlayers: RosterPlayerForComparison[]
): TeamComparisonResult {
  const playerResults = compareRosters(ocrPlayers, rosterPlayers)

  const counts = {
    matched: playerResults.filter((r) => r.status === 'match').length,
    ocrOnly: playerResults.filter((r) => r.status === 'ocr-only').length,
    rosterOnly: playerResults.filter((r) => r.status === 'roster-only').length,
  }

  return {
    ocrTeamName,
    rosterTeamName,
    playerResults,
    counts,
  }
}

/**
 * Calculate overall match score for a team comparison
 */
export function calculateMatchScore(result: TeamComparisonResult): number {
  const total = result.counts.matched + result.counts.ocrOnly + result.counts.rosterOnly
  if (total === 0) {
    return 0
  }
  return Math.round((result.counts.matched / total) * MAX_CONFIDENCE)
}
