/**
 * Occupation parsing utilities for API responses.
 *
 * NOTE: This utility is prepared for when real profile loading from the API
 * is implemented. Currently, occupations are only set in demo mode. When
 * PersonDetails.eligibleAttributeValues is fetched from the API, use
 * parseOccupations() to filter to referee-only roles.
 *
 * @example
 * // Future usage when profile loading is implemented:
 * const occupations = parseOccupations(personDetails.eligibleAttributeValues);
 */
import type { Occupation } from "@/stores/auth";
import type { components } from "@/api/schema";

type AttributeValue = components["schemas"]["AttributeValue"];

/**
 * Role identifier patterns from the VolleyManager API.
 * Only referee roles are supported by this app.
 */
const ROLE_PATTERNS = {
  referee: /:Referee$/,
  player: /:Player$/,
  clubAdmin: /:ClubAdmin$/,
  associationAdmin: /:AssociationAdmin$/,
} as const;

/**
 * Parses an AttributeValue from the API into an Occupation.
 * Returns null if the role is not recognized or not a referee role.
 *
 * @param attr - The AttributeValue from eligibleAttributeValues
 * @param refereeOnly - If true, only return referee occupations (default: true)
 */
export function parseOccupation(
  attr: AttributeValue,
  refereeOnly = true,
): Occupation | null {
  const roleIdentifier = attr.roleIdentifier;
  if (!roleIdentifier || !attr.__identity) {
    return null;
  }

  let type: Occupation["type"] | null = null;

  if (ROLE_PATTERNS.referee.test(roleIdentifier)) {
    type = "referee";
  } else if (!refereeOnly) {
    if (ROLE_PATTERNS.player.test(roleIdentifier)) {
      type = "player";
    } else if (ROLE_PATTERNS.clubAdmin.test(roleIdentifier)) {
      type = "clubAdmin";
    } else if (ROLE_PATTERNS.associationAdmin.test(roleIdentifier)) {
      type = "associationAdmin";
    }
  }

  if (!type) {
    return null;
  }

  return {
    id: attr.__identity,
    type,
  };
}

/**
 * Parses eligibleAttributeValues from the API PersonDetails response
 * and returns only referee occupations.
 *
 * This app is designed for referee management, so non-referee roles
 * (player, clubAdmin, associationAdmin) are filtered out.
 *
 * @param attributeValues - Array of AttributeValue from the API
 * @param refereeOnly - If true, only return referee occupations (default: true)
 */
export function parseOccupations(
  attributeValues: AttributeValue[] | undefined,
  refereeOnly = true,
): Occupation[] {
  if (!attributeValues || attributeValues.length === 0) {
    return [];
  }

  return attributeValues
    .map((attr) => parseOccupation(attr, refereeOnly))
    .filter((occ): occ is Occupation => occ !== null);
}

/**
 * Filters an array of Occupation objects to only include referee roles.
 *
 * This is used to filter occupations that are already in the Occupation format
 * (e.g., from demo mode or cached data), as opposed to parseOccupations() which
 * parses raw API AttributeValue objects.
 *
 * @param occupations - Array of Occupation objects to filter
 * @returns Only occupations with type "referee"
 *
 * @example
 * // Filter demo occupations to referee-only
 * const allOccupations = [
 *   { id: "1", type: "referee", associationCode: "SV" },
 *   { id: "2", type: "player", clubName: "VBC Demo" },
 * ];
 * const refereeOnly = filterRefereeOccupations(allOccupations);
 * // Returns: [{ id: "1", type: "referee", associationCode: "SV" }]
 */
export function filterRefereeOccupations(occupations: Occupation[]): Occupation[] {
  return occupations.filter((occ) => occ.type === "referee");
}
