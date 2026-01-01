/**
 * Parser for activeParty data embedded in VolleyManager HTML pages.
 *
 * The activeParty object contains user context data that is only available
 * in embedded HTML, not via API. This includes eligibleAttributeValues and
 * eligibleRoles which are needed to determine if a user has multiple associations.
 */

import { z } from "zod";
import { logger } from "@/utils/logger";

/**
 * Represents an inflated association value with full details.
 */
export interface InflatedAssociationValue {
  __identity?: string; // Some inflatedValue objects don't have __identity
  name?: string;
  shortName?: string;
  /** Association identifier code (e.g., "912000" for SVRZ) */
  identifier?: string;
  /**
   * Origin ID to distinguish regional vs national associations.
   * 0 = national (Swiss Volley), >0 = regional (e.g., 12 for SVRZ)
   */
  originId?: number;
}

/**
 * Represents an association that a user is a member of.
 * All fields are optional because the API may return incomplete items.
 * Downstream code (parseOccupationFromActiveParty) filters out items missing required fields.
 */
export interface AttributeValue {
  __identity?: string;
  attributeIdentifier?: string;
  roleIdentifier?: string;
  /**
   * Domain model type - used to distinguish association memberships from boolean flags.
   * For associations: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation"
   * For player roles: "boolean"
   */
  type?: string;
  /** UUID reference to the association entity */
  value?: string;
  inflatedValue?: InflatedAssociationValue;
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

// Zod schemas for runtime validation of parsed JSON
const InflatedValueSchema = z.object({
  __identity: z.string().optional(), // Some inflatedValue objects don't have __identity
  name: z.string().optional(),
  shortName: z.string().optional(),
  identifier: z.string().optional(),
  originId: z.number().optional(),
});

const AttributeValueSchema = z.object({
  // All fields are optional to handle incomplete items in the array.
  // When one item has missing fields, strict validation would fail the entire array.
  // Downstream code (parseOccupationFromActiveParty) filters out incomplete items.
  __identity: z.string().optional(),
  attributeIdentifier: z.string().optional(),
  roleIdentifier: z.string().optional(),
  type: z.string().optional(),
  value: z.string().optional(),
  inflatedValue: InflatedValueSchema.optional(),
});

const RoleDefinitionSchema = z.object({
  identifier: z.string(),
  name: z.string().optional(),
  packageKey: z.string().optional(),
});

const ActivePartySchema = z
  .object({
    __identity: z.string().optional(),
    eligibleAttributeValues: z.array(AttributeValueSchema).optional(),
    eligibleRoles: z.record(z.string(), RoleDefinitionSchema).optional(),
    activeAttributeValue: AttributeValueSchema.optional(),
    activeRoleIdentifier: z.string().optional(),
    groupedEligibleAttributeValues: z.array(AttributeValueSchema).optional(),
  })
  .passthrough(); // Allow additional unknown properties from the API

/**
 * Regex pattern to match window.activeParty = JSON.parse('...') in HTML.
 * Captures the JSON string inside the parse() call.
 * Uses (?:[^'\\]|\\.)* to handle escaped characters including \' within the string.
 *
 * ReDoS safety: This pattern uses a non-overlapping alternation [^'\\] | \\. where each
 * character is consumed by exactly one branch, preventing catastrophic backtracking.
 * The outer * quantifier cannot cause exponential behavior because the inner alternation
 * is mutually exclusive (either a non-special char OR an escape sequence).
 */
const ACTIVE_PARTY_PATTERN =
  /window\.activeParty\s*=\s*JSON\.parse\s*\(\s*'((?:[^'\\]|\\.)*)'\s*\)/;

/**
 * Regex pattern to match Vue component attribute :active-party="$convertFromBackendToFrontend({...})".
 * This is the format used in production VolleyManager pages.
 * Captures the JSON object inside the $convertFromBackendToFrontend() call.
 *
 * Uses non-greedy matching (.+?) to stop at the first })" sequence after the opening brace.
 * This is correct because:
 * - Quotes inside JSON are HTML-encoded as &quot;, so }" cannot appear inside JSON string values
 * - The /s flag allows . to match newlines for multi-line JSON
 * - Greedy matching would incorrectly extend to later })" sequences elsewhere in the HTML
 */
const VUE_ACTIVE_PARTY_PATTERN =
  /:active-party="\$convertFromBackendToFrontend\((\{.+?\})\)"/s;

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
 * Supports two formats:
 * 1. Script tag: window.activeParty = JSON.parse('{"eligibleAttributeValues":[...],...}')
 * 2. Vue component: <main-layout :active-party="$convertFromBackendToFrontend({...})" ...>
 *
 * @param html - The HTML page content
 * @returns The parsed ActiveParty object, or null if parsing fails
 */
export function extractActivePartyFromHtml(html: string): ActiveParty | null {
  if (!html) {
    return null;
  }

  try {
    // Try the script tag pattern first (legacy format)
    let match = ACTIVE_PARTY_PATTERN.exec(html);
    if (match?.[1]) {
      const encodedJson = match[1];
      const decodedJson = decodeHtmlEntities(encodedJson);
      const parsed: unknown = JSON.parse(decodedJson);

      const result = ActivePartySchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
      logger.warn("activeParty validation failed (script format):", result.error.issues);
    }

    // Try the Vue component attribute pattern (production format)
    match = VUE_ACTIVE_PARTY_PATTERN.exec(html);
    if (match?.[1]) {
      const encodedJson = match[1];
      const decodedJson = decodeHtmlEntities(encodedJson);
      const parsed: unknown = JSON.parse(decodedJson);

      const result = ActivePartySchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
      logger.warn("activeParty validation failed (Vue format):", result.error.issues);
    }

    // activeParty not found in HTML - this is normal for login pages
    return null;
  } catch (error) {
    logger.warn("Failed to parse activeParty from HTML:", error);
    return null;
  }
}

/** Role identifier for referee role in the VolleyManager system */
const REFEREE_ROLE_IDENTIFIER = "Indoorvolleyball.RefAdmin:Referee";

/** Type suffix for association memberships (vs boolean player roles) */
const ASSOCIATION_TYPE_SUFFIX = "AbstractAssociation";

/**
 * Filter attribute values to only include referee association memberships.
 * Excludes boolean player roles and other non-association attributes.
 *
 * @param attributeValues - The user's attribute values (from activeParty)
 * @returns Filtered array containing only referee association memberships
 */
export function filterRefereeAssociations(
  attributeValues: AttributeValue[] | null | undefined,
): AttributeValue[] {
  if (!attributeValues) {
    return [];
  }

  return attributeValues.filter(
    (av) =>
      av.roleIdentifier === REFEREE_ROLE_IDENTIFIER &&
      av.type?.includes(ASSOCIATION_TYPE_SUFFIX),
  );
}

/**
 * Check if a user has access to multiple associations based on their eligible attribute values.
 * Only counts referee association memberships (excludes player roles and other attributes).
 *
 * @param attributeValues - The user's eligible attribute values (from activeParty or store)
 * @returns true if the user has multiple eligible referee associations
 */
export function hasMultipleAssociations(
  attributeValues: AttributeValue[] | null | undefined,
): boolean {
  const refereeAssociations = filterRefereeAssociations(attributeValues);

  // Count unique associations by their identity
  const uniqueAssociations = new Set(
    refereeAssociations
      .map((av) => av.inflatedValue?.__identity)
      .filter(Boolean),
  );

  return uniqueAssociations.size > 1;
}
