/**
 * OCR Error Correction Utilities
 *
 * Handles common OCR character misreads in handwritten scoresheets.
 * Maps misread characters to their likely intended digits or letters.
 */

// =============================================================================
// Constants
// =============================================================================

/** Maximum valid shirt number */
export const MAX_SHIRT_NUMBER = 99

/** Minimum name length to consider valid */
export const MIN_NAME_LENGTH = 2

// =============================================================================
// OCR Error Correction Maps
// =============================================================================

/**
 * Common OCR character substitutions for digits
 * Maps misread characters to their likely intended digit
 */
const DIGIT_CORRECTIONS: Record<string, string> = {
  O: '0',
  o: '0',
  Q: '0',
  D: '0',
  I: '1',
  l: '1',
  i: '1',
  '|': '1',
  Z: '2',
  z: '2',
  E: '3',
  A: '4',
  S: '5',
  s: '5',
  G: '6',
  b: '6',
  T: '7',
  B: '8',
  g: '9',
  q: '9',
}

/**
 * Common OCR character substitutions for letters
 * Maps misread characters to their likely intended letter
 */
const LETTER_CORRECTIONS: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '|': 'I',
  '5': 'S',
  '8': 'B',
  '@': 'A',
  '&': 'A',
  '€': 'E',
  '£': 'L',
  '¢': 'C',
}

// =============================================================================
// OCR Correction Utilities
// =============================================================================

/**
 * Correct common OCR errors in a number string
 */
export function correctDigits(text: string): string {
  return text
    .split('')
    .map((char) => DIGIT_CORRECTIONS[char] ?? char)
    .join('')
}

/**
 * Correct common OCR errors in a letter string
 */
export function correctLetters(text: string): string {
  return text
    .split('')
    .map((char) => LETTER_CORRECTIONS[char] ?? char)
    .join('')
}

/**
 * Try to extract a valid shirt number from a string
 * Applies OCR corrections and validates the result
 */
export function extractShirtNumber(text: string): number | null {
  if (!text) return null

  // Clean and correct the text
  const cleaned = text.trim()
  const corrected = correctDigits(cleaned)

  // Try to parse as number
  const match = /^(\d{1,2})$/.exec(corrected)
  if (match) {
    const num = parseInt(match[1]!, 10)
    if (num >= 1 && num <= MAX_SHIRT_NUMBER) {
      return num
    }
  }

  return null
}
