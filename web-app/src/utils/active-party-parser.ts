/**
 * Parser for activeParty data embedded in VolleyManager HTML pages.
 *
 * The activeParty object contains user context data that is only available
 * in embedded HTML, not via API. This includes eligibleAttributeValues and
 * eligibleRoles which are needed to determine if a user has multiple associations.
 */

import { logger } from "@/utils/logger";

/**
 * Represents an association that a user is a member of.
 */
export interface AttributeValue {
  __identity: string;
  attributeIdentifier: string;
  roleIdentifier: string;
  inflatedValue?: {
    __identity: string;
    name?: string;
    shortName?: string;
  };
}

/**
 * Definition of a role in the VolleyManager system.
 */
export interface RoleDefinition {
  identifier: string;
  name?: string;
  packageKey?: string;
}

/**
 * The activeParty data embedded in VolleyManager HTML pages.
 * Contains user context including association memberships and roles.
 */
export interface ActiveParty {
  __identity?: string;
  eligibleAttributeValues?: AttributeValue[];
  eligibleRoles?: Record<string, RoleDefinition>;
  activeAttributeValue?: AttributeValue;
  activeRoleIdentifier?: string;
  groupedEligibleAttributeValues?: AttributeValue[];
}

/**
 * Regex pattern to match window.activeParty = JSON.parse('...') in HTML.
 * Captures the JSON string inside the parse() call.
 * Uses (?:[^'\\]|\\.)+ to handle escaped characters including \' within the string.
 */
const ACTIVE_PARTY_PATTERN = /window\.activeParty\s*=\s*JSON\.parse\s*\(\s*'((?:[^'\\]|\\.)*)'\s*\)/;

/**
 * Decode HTML entities in a string.
 * The embedded JSON uses HTML entities like &quot; for quotes.
 */
function decodeHtmlEntities(str: string): string {
  const entities: Record<string, string> = {
    "&quot;": '"',
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&apos;": "'",
    "&#39;": "'",
    "&#x27;": "'",
    "&#34;": '"',
    "&#x22;": '"',
  };

  let decoded = str;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replaceAll(entity, char);
  }

  return decoded;
}

/**
 * Extract the activeParty JSON data from HTML page content.
 *
 * The VolleyManager app embeds user context in script tags like:
 * window.activeParty = JSON.parse('{"eligibleAttributeValues":[...],...}')
 *
 * @param html - The HTML page content
 * @returns The parsed ActiveParty object, or null if parsing fails
 */
export function extractActivePartyFromHtml(html: string): ActiveParty | null {
  if (!html) {
    return null;
  }

  try {
    const match = ACTIVE_PARTY_PATTERN.exec(html);
    if (!match?.[1]) {
      // activeParty not found in HTML - this is normal for login pages
      return null;
    }

    const encodedJson = match[1];
    const decodedJson = decodeHtmlEntities(encodedJson);

    const parsed = JSON.parse(decodedJson) as unknown;

    // Basic validation that we got an object
    if (typeof parsed !== "object" || parsed === null) {
      logger.warn("activeParty parsed but is not an object");
      return null;
    }

    return parsed as ActiveParty;
  } catch (error) {
    logger.warn("Failed to parse activeParty from HTML:", error);
    return null;
  }
}

/**
 * Check if a user has access to multiple associations based on their eligible attribute values.
 *
 * @param eligibleAttributeValues - The user's eligible attribute values (from activeParty or store)
 * @returns true if the user has multiple eligible associations
 */
export function hasMultipleAssociations(
  eligibleAttributeValues: AttributeValue[] | null | undefined,
): boolean {
  if (!eligibleAttributeValues) {
    return false;
  }

  // Count unique associations by their identity
  const uniqueAssociations = new Set(
    eligibleAttributeValues
      .map((av) => av.inflatedValue?.__identity)
      .filter(Boolean),
  );

  return uniqueAssociations.size > 1;
}
