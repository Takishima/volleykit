/**
 * Name Parsing Utilities
 *
 * Normalizes and parses player and official names from OCR text.
 * Handles OCR letter corrections and various name formats.
 */

import { correctLetters } from './ocr-corrections'

// =============================================================================
// Name Parsing Utilities
// =============================================================================

/**
 * Normalize a name from OCR - handles various case formats
 */
export function normalizeName(name: string): string {
  if (!name) return ''

  // Apply letter corrections
  const corrected = correctLetters(name)

  // Normalize to title case
  return corrected
    .toLowerCase()
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Parse a player name - tries both LASTNAME FIRSTNAME and FIRSTNAME LASTNAME formats
 */
export function parsePlayerName(rawName: string): {
  lastName: string
  firstName: string
  displayName: string
} {
  if (!rawName || typeof rawName !== 'string') {
    return { lastName: '', firstName: '', displayName: '' }
  }

  const trimmed = rawName.trim()
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0)

  if (parts.length === 0) {
    return { lastName: '', firstName: '', displayName: '' }
  }

  if (parts.length === 1) {
    const lastName = normalizeName(parts[0]!)
    return { lastName, firstName: '', displayName: lastName }
  }

  // For manuscript, assume LASTNAME FIRSTNAME format (same as electronic)
  // The first part is the last name, rest are first names
  const lastName = normalizeName(parts[0]!)
  const firstName = parts.slice(1).map(normalizeName).join(' ')
  const displayName = `${firstName} ${lastName}`

  return { lastName, firstName, displayName }
}

/**
 * Parse an official name - format is typically "Firstname Lastname"
 */
export function parseOfficialName(rawName: string): {
  lastName: string
  firstName: string
  displayName: string
} {
  if (!rawName || typeof rawName !== 'string') {
    return { lastName: '', firstName: '', displayName: '' }
  }

  const trimmed = rawName.trim()
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0)

  if (parts.length === 0) {
    return { lastName: '', firstName: '', displayName: '' }
  }

  if (parts.length === 1) {
    const name = normalizeName(parts[0]!)
    return { lastName: name, firstName: '', displayName: name }
  }

  // For officials, format is "Firstname Lastname" - last part is last name
  const lastName = normalizeName(parts[parts.length - 1]!)
  const firstName = parts.slice(0, -1).map(normalizeName).join(' ')
  const displayName = `${firstName} ${lastName}`

  return { lastName, firstName, displayName }
}
