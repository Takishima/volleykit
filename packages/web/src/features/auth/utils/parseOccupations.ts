/**
 * Occupation parsing utilities for HTML-embedded activeParty data.
 *
 * The activeParty data includes inflatedValue with association short names (e.g., "SVRZ")
 * which are used to set the associationCode on occupations.
 */
import type { Occupation } from '@/common/stores/auth'

import {
  isInflatedObject,
  type AttributeValue as ActivePartyAttributeValue,
} from './active-party-parser'

/**
 * Role identifier pattern for referee roles from the VolleyManager API.
 * Only referee roles are supported by this app.
 */
const REFEREE_ROLE_PATTERN = /:Referee$/

/**
 * Words to exclude when deriving association code from name.
 * These are common prepositions/articles that shouldn't be part of the abbreviation.
 */
const EXCLUDED_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'und', 'of', 'the'])

/**
 * Derives an association code from the full name by extracting first letters.
 * Excludes common prepositions/articles (de, du, la, le, etc.).
 *
 * @example
 * "Swiss Volley" → "SV"
 * "Swiss Volley Région Zurich" → "SVRZ"
 * "Association Vaudoise de Volleyball" → "AVV"
 *
 * @param name - The full association name
 * @returns A derived abbreviation, or undefined if name is empty/missing
 */
export function deriveAssociationCodeFromName(name: string | undefined): string | undefined {
  if (!name) {
    return undefined
  }

  const words = name.split(/\s+/)
  const initials = words
    .filter((word) => !EXCLUDED_WORDS.has(word.toLowerCase()))
    .map((word) => word.charAt(0).toUpperCase())
    .join('')

  return initials || undefined
}

/**
 * Parses an ActiveParty AttributeValue into an Occupation with association code.
 *
 * The activeParty data from embedded HTML includes inflatedValue which contains
 * the association's shortName (e.g., "SVRZ", "SV") that we use as the associationCode.
 *
 * If shortName is not available, derives the code from the name field by extracting
 * first letters of each word (excluding common prepositions).
 *
 * @param attr - The AttributeValue from activeParty.groupedEligibleAttributeValues
 * @returns Occupation with associationCode, or null if not a referee role
 */
export function parseOccupationFromActiveParty(attr: ActivePartyAttributeValue): Occupation | null {
  const roleIdentifier = attr.roleIdentifier
  if (!roleIdentifier || !attr.__identity) {
    return null
  }

  // Only parse referee roles
  if (!REFEREE_ROLE_PATTERN.test(roleIdentifier)) {
    return null
  }

  // Extract association code: prefer shortName, fall back to derived from name
  // inflatedValue can be an object or primitive (boolean/null/string/number)
  const inflated = isInflatedObject(attr.inflatedValue) ? attr.inflatedValue : undefined
  const associationCode = inflated?.shortName ?? deriveAssociationCodeFromName(inflated?.name)

  return {
    id: attr.__identity,
    type: 'referee',
    associationCode,
  }
}

/**
 * Parses groupedEligibleAttributeValues from activeParty HTML data
 * into an array of referee Occupations with association codes.
 *
 * This is used during login and session restoration to populate
 * user.occupations from the embedded HTML data.
 *
 * Deduplicates by association identity (inflatedValue.__identity) to ensure
 * each association appears only once, even if present multiple times in the
 * attribute values (which can happen with eligibleAttributeValues fallback).
 *
 * @param attributeValues - Array from activeParty.groupedEligibleAttributeValues or eligibleAttributeValues
 * @returns Array of unique referee Occupations with association codes
 */
export function parseOccupationsFromActiveParty(
  attributeValues: ActivePartyAttributeValue[] | null | undefined
): Occupation[] {
  if (!attributeValues || attributeValues.length === 0) {
    return []
  }

  const occupations = attributeValues
    .map((attr) => parseOccupationFromActiveParty(attr))
    .filter((occ): occ is Occupation => occ !== null)

  // Deduplicate by association code (same association = same dropdown entry)
  // Keep the first occurrence of each unique association
  const seen = new Set<string>()
  return occupations.filter((occ) => {
    // Use association code for deduplication, fall back to id if no code
    const key = occ.associationCode ?? occ.id
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
