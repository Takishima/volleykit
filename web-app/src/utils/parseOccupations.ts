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

  // Determine the occupation type from roleIdentifier
  let type: Occupation["type"] | null = null;

  if (ROLE_PATTERNS.referee.test(roleIdentifier)) {
    type = "referee";
  } else if (!refereeOnly) {
    // Only check non-referee types if refereeOnly is false
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

  // For referee roles, we only support the referee type
  if (refereeOnly && type !== "referee") {
    return null;
  }

  return {
    id: attr.__identity,
    type,
    // associationCode could be extracted from attributeIdentifier if needed
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
