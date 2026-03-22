/**
 * Concatenated Data Splitting Utilities
 *
 * Handles OCR artifacts where data from both teams gets concatenated together
 * in Swiss tabular scoresheets (e.g., names run together, dates merge).
 */

// =============================================================================
// Constants
// =============================================================================

/** Maximum single digit jersey number */
const MAX_SINGLE_DIGIT = 9

/** Minimum two-digit jersey number */
const MIN_TWO_DIGIT = 10

/** Maximum two-digit jersey number */
const MAX_TWO_DIGIT = 99

// =============================================================================
// Concatenated Data Splitting
// =============================================================================

/**
 * Split concatenated names like "S. AngeliL. CollierO. Follouier"
 * into individual names ["S. Angeli", "L. Collier", "O. Follouier"]
 *
 * Handles patterns:
 * - Initial + dot + LastName (e.g., "S. Angeli")
 * - Full names with uppercase start after lowercase
 */
export function splitConcatenatedNames(text: string): string[] {
  if (!text || text.trim().length === 0) return []

  // Pattern: uppercase letter + dot + space? + name, followed by another uppercase
  // or: lowercase letter followed by uppercase (word boundary)
  const names: string[] = []

  // First try splitting on pattern: "NameX." where X is an uppercase letter starting next name
  // Pattern matches: end of one name (lowercase) followed by start of next (uppercase + dot)
  const splitPattern = /([a-zà-ÿ])([A-Z]\.)/g
  const withMarkers = text.replace(splitPattern, '$1|||$2')

  // Also split where a lowercase letter is followed by uppercase (without dot)
  // This handles "SuterA." -> "Suter" + "A."
  const furtherSplit = withMarkers.replace(/([a-zà-ÿ])([A-Z][a-zà-ÿ])/g, '$1|||$2')

  const parts = furtherSplit.split('|||').filter((p) => p.trim().length > 0)

  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.length >= 2) {
      names.push(trimmed)
    }
  }

  return names
}

/**
 * Split concatenated birth dates like "20.2.9721.1.9713.1.97"
 * into individual dates ["20.2.97", "21.1.97", "13.1.97"]
 */
export function splitConcatenatedDates(text: string): string[] {
  if (!text || text.trim().length === 0) return []

  const dates: string[] = []
  let remaining = text

  // Process dates iteratively - each date is D.M.YY or DD.M.YY or DD.MM.YY format
  // We need to be greedy about finding dates but careful about year boundaries
  while (remaining.length > 0) {
    // Try to match a date at the start of remaining string
    // Pattern for 4-digit years: only valid years (1900-2099)
    const match4 = remaining.match(/^(\d{1,2})\.(\d{1,2})\.((?:19|20)\d{2})/)
    if (match4) {
      dates.push(match4[0])
      remaining = remaining.substring(match4[0].length)
      continue
    }

    // Pattern for 2-digit years (most common in Swiss forms)
    const match2 = remaining.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})/)
    if (match2) {
      dates.push(match2[0])
      remaining = remaining.substring(match2[0].length)
      continue
    }

    // No date found at start, skip one character and try again
    remaining = remaining.substring(1)
  }

  return dates
}

/**
 * Split concatenated jersey numbers like "51396102581915"
 * This is tricky as we don't know boundaries. Use heuristics:
 * - Numbers 1-9 are single digit
 * - Numbers 10-99 are two digits
 * - Prefer single digits when ambiguous (volleyball typically uses 1-20)
 */
export function splitConcatenatedNumbers(text: string, expectedCount?: number): number[] {
  if (!text || text.trim().length === 0) return []

  const cleaned = text.replace(/\D/g, '') // Remove non-digits
  if (cleaned.length === 0) return []

  const numbers: number[] = []
  let i = 0

  while (i < cleaned.length) {
    const oneDigit = parseInt(cleaned[i]!, 10)

    // If we have an expected count, use it to guide decisions
    if (expectedCount !== undefined) {
      const remainingChars = cleaned.length - i
      const remainingNeeded = expectedCount - numbers.length
      // If we need more numbers than remaining chars, take single digits
      if (remainingNeeded >= remainingChars && oneDigit >= 1) {
        numbers.push(oneDigit)
        i += 1
        continue
      }
    }

    // Try two-digit number if we have room
    if (i + 1 < cleaned.length) {
      const twoDigit = parseInt(cleaned.substring(i, i + 2), 10)

      // If first digit is 0, skip it (invalid jersey number)
      if (cleaned[i] === '0') {
        i += 1
        continue
      }

      // Prefer single digit for most cases (volleyball numbers 1-20 are common)
      // Only take two digits if the single digit would be 0 or if two-digit is clearly intended
      if (oneDigit >= 1 && oneDigit <= MAX_SINGLE_DIGIT) {
        numbers.push(oneDigit)
        i += 1
        continue
      }

      // For numbers starting with 0, skip the leading zero
      if (twoDigit >= MIN_TWO_DIGIT && twoDigit <= MAX_TWO_DIGIT) {
        numbers.push(twoDigit)
        i += 2
        continue
      }
    }

    // Single digit remaining or default
    if (oneDigit >= 1) {
      numbers.push(oneDigit)
    }
    i += 1
  }

  return numbers
}
