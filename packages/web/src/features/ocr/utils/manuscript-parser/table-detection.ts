/**
 * Swiss Tabular Format Detection
 *
 * Detects Swiss tabular manuscript format, filters noise lines,
 * and identifies section boundaries (libero, officials, end markers).
 */

// =============================================================================
// Constants
// =============================================================================

/** Maximum tab-separated parts per line in sequential format (date, number, name) */
const MAX_SEQUENTIAL_PARTS_PER_LINE = 3

/** Minimum number of tab-separated lines required to detect Swiss tabular format */
const MIN_TAB_LINES_FOR_SWISS_FORMAT = 3

/** Minimum length for noise line pattern match */
const NOISE_LINE_MIN_LENGTH = 10

// =============================================================================
// Swiss Header & Noise Detection
// =============================================================================

/**
 * Multilingual header labels found in Swiss manuscript scoresheets
 * These indicate a tabular format where OCR reads horizontally
 */
export const SWISS_HEADER_PATTERNS = [
  /punkte.*points.*punti/i, // Score header (DE/FR/IT)
  /lizenz.*licence.*licenza/i, // License header (DE/FR/IT)
  /spieler.*joueur.*giocatore/i, // Player header (DE/FR/IT)
  /name.*nom.*nome/i, // Name header (DE/FR/IT)
  /mannschaft.*equipe.*squadra/i, // Team header (DE/FR/IT)
  /offizielle.*officiels.*ufficiali/i, // Officials header (DE/FR/IT)
  /kapitän.*capitaine.*capitano/i, // Captain header (DE/FR/IT)
  /trainer.*entraîneur.*allenatore/i, // Trainer header (DE/FR/IT)
  /oder\/ou\/o/i, // Common marker for "and/or" in Swiss forms (A oder/ou/o B)
]

const NOISE_PATTERNS = [
  /^[\d\s.]+$/, // Lines with only numbers, spaces, dots (e.g., "4 8 4 8 . 4 8...")
  /^["T:\s]+$/i, // Quote marks, T, and colons
  /^\d+$/, // Single numbers
]

/**
 * Check if a line is noise that should be filtered
 */
export function isNoiseLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length < 2) return true

  // Check for long sequences of digits and spaces
  if (trimmed.length >= NOISE_LINE_MIN_LENGTH && /^[\d\s]+$/.test(trimmed)) {
    return true
  }

  return NOISE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

// =============================================================================
// Swiss Tabular Format Detection
// =============================================================================

/**
 * Detect if the OCR text appears to be from a Swiss tabular manuscript format
 * (two-column layout with both teams side-by-side).
 *
 * Distinguishes from sequential format (Team A section followed by Team B section)
 * which may also have Swiss headers and tabs but with fewer parts per line.
 */
export function isSwissTabularFormat(ocrText: string): boolean {
  const lines = ocrText.split('\n')

  // Check for Swiss multilingual headers
  const hasSwissHeaders = lines.some((line) =>
    SWISS_HEADER_PATTERNS.some((pattern) => pattern.test(line))
  )

  // Check for tab-separated content with multiple columns
  const tabSeparatedLines = lines.filter((line) => line.includes('\t'))
  const hasTabularStructure = tabSeparatedLines.length >= MIN_TAB_LINES_FOR_SWISS_FORMAT

  // Check for concatenated names pattern (e.g., "S. AngeliL. Collier")
  const hasConcatenatedNames = /[A-Z]\.\s*[A-Za-zÀ-ÿ]+[A-Z]\.\s*[A-Za-zÀ-ÿ]+/.test(ocrText)

  if (!hasSwissHeaders) return false
  if (!hasTabularStructure && !hasConcatenatedNames) return false

  // Distinguish from sequential tab-separated format:
  // Swiss tabular lines contain data for BOTH teams (4+ parts per line),
  // while sequential format has data for ONE team per line (2-3 parts).
  // Only apply this check when there are enough non-header data lines to be conclusive.
  if (hasTabularStructure && !hasConcatenatedNames) {
    const minDataLinesForCheck = 3
    const dataLineParts = tabSeparatedLines
      .filter((line) => !SWISS_HEADER_PATTERNS.some((p) => p.test(line)))
      .map((line) => line.split('\t').filter((p) => p.trim().length > 0).length)
      .filter((count) => count > 0)

    if (dataLineParts.length >= minDataLinesForCheck) {
      // Sort and find median
      const sorted = [...dataLineParts].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]!
      // Sequential format typically has ≤3 parts per line (date, number, name)
      // Swiss tabular has 4+ parts (data for both teams)
      if (median <= MAX_SEQUENTIAL_PARTS_PER_LINE) return false
    }
  }

  return true
}

// =============================================================================
// Section Markers (shared with sequential format)
// =============================================================================

/**
 * Check if a line indicates the libero section
 */
export function isLiberoMarker(line: string): boolean {
  return line.toUpperCase().includes('LIBERO')
}

/**
 * Check if a line indicates the officials section
 * Note: We only match section headers, not individual official lines
 */
export function isOfficialsMarker(line: string): boolean {
  const upper = line.toUpperCase()
  return (
    upper.includes('OFFICIAL') ||
    upper.includes('OFFICIEL') ||
    upper.includes('OFFIZIEL') ||
    upper.includes('UFFICIALI') ||
    upper.startsWith('COACH') ||
    /^TRAINER\b/.test(upper)
  )
}

/**
 * Check if a line indicates end of player data (signature/captain/trainer section)
 */
export function isEndMarker(line: string): boolean {
  const upper = line.toUpperCase()
  return (
    upper.includes('SIGNATURE') ||
    upper.includes('UNTERSCHRIFT') ||
    upper.includes('CAPTAIN') ||
    upper.includes('KAPITÄN') ||
    upper.includes('CAPITAINE') ||
    upper.includes('CAPITANO') ||
    upper.includes('REFEREE') ||
    upper.includes('ARBITRE') ||
    /^TRAINER\b/i.test(line) ||
    upper.includes('ENTRAÎNEUR') ||
    upper.includes('ENTRAINEUR') ||
    upper.includes('ALLENATORE')
  )
}

// =============================================================================
// Line Classification Helpers
// =============================================================================

/**
 * Check if a line should be skipped (noise or header-only)
 */
export function shouldSkipLine(line: string): boolean {
  if (isNoiseLine(line)) return true
  if (SWISS_HEADER_PATTERNS.some((pattern) => pattern.test(line))) {
    return true
  }
  return false
}

/**
 * Update section state based on line markers
 * Returns: 'libero' | 'officials' | 'end' | null
 */
export function detectSectionMarker(line: string): 'libero' | 'officials' | 'end' | null {
  if (isLiberoMarker(line)) return 'libero'
  if (isOfficialsMarker(line)) return 'officials'
  if (isEndMarker(line)) return 'end'
  return null
}
