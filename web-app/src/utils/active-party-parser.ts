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
  /**
   * Inflated value containing association details.
   * Can be an object with association info, or a primitive value (boolean, null, string, number)
   * for certain attribute types like boolean player flags.
   */
  inflatedValue?: InflatedAssociationValue | boolean | null | string | number;
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
// The inflatedValue can be an object with association details, or a primitive value
// (e.g., false, null) for some attribute types like boolean flags
const InflatedValueObjectSchema = z
  .object({
    __identity: z.string().optional(), // Some inflatedValue objects don't have __identity
    name: z.string().optional(),
    shortName: z.string().optional(),
    identifier: z.string().optional(),
    originId: z.number().optional(),
  })
  .passthrough(); // Allow additional unknown properties from the API

// inflatedValue can be an object, boolean, null, string, or number depending on the attribute type
const InflatedValueSchema = z.union([
  InflatedValueObjectSchema,
  z.boolean(),
  z.null(),
  z.string(),
  z.number(),
]);

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
 *
 * @internal Exported for use in debug panel diagnostics
 */
export const ACTIVE_PARTY_PATTERN =
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
 *
 * Uses the global (g) flag to find ALL occurrences, since there may be multiple components
 * with :active-party attributes (e.g., form permissions vs user party data).
 *
 * @internal Exported for use in debug panel diagnostics
 */
export const VUE_ACTIVE_PARTY_PATTERN =
  /:active-party="\$convertFromBackendToFrontend\((\{.+?\})\)"/gs;

/**
 * Regex pattern to match Vue component attribute :party="$convertFromBackendToFrontend({...})".
 * This is an alternative attribute name that may be used in some pages.
 *
 * @internal Exported for use in debug panel diagnostics
 */
export const VUE_PARTY_PATTERN =
  /:party="\$convertFromBackendToFrontend\((\{.+?\})\)"/gs;

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
 * Diagnostic result from attempting to extract activeParty from HTML.
 * Used by the debug panel to show detailed parsing information.
 */
export interface ActivePartyDiagnostic {
  /** Which pattern matched (script, vue, or none) */
  patternMatched: "script" | "vue" | "none";
  /** Length of the raw captured match before decoding */
  rawMatchLength?: number;
  /** Whether JSON.parse succeeded */
  jsonParseSuccess?: boolean;
  /** JSON parse error message if failed */
  jsonParseError?: string;
  /** Whether Zod validation succeeded */
  zodValidationSuccess?: boolean;
  /** Zod validation error issues if failed */
  zodValidationErrors?: string[];
  /** The successfully parsed activeParty, or null */
  activeParty: ActiveParty | null;
  /** Top-level keys found in parsed JSON (for debugging structure) */
  parsedKeys?: string[];
}

/**
 * Check if a parsed object looks like valid activeParty data.
 * Returns true if it has expected fields like eligibleAttributeValues or groupedEligibleAttributeValues.
 */
function looksLikeActiveParty(parsed: unknown): parsed is Record<string, unknown> {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return false;
  }
  const obj = parsed as Record<string, unknown>;
  // Check for expected activeParty fields (not form permission objects)
  return (
    "eligibleAttributeValues" in obj ||
    "groupedEligibleAttributeValues" in obj ||
    "eligibleRoles" in obj ||
    "activeRoleIdentifier" in obj ||
    "activeAttributeValue" in obj
  );
}

/**
 * Try to parse and validate encoded JSON from a regex match.
 * Updates the diagnostic result and returns the parsed activeParty if successful.
 */
function tryParseMatch(
  encodedJson: string,
  result: ActivePartyDiagnostic,
  patternType: "script" | "vue",
  requiresActivePartyFields: boolean
): ActiveParty | null {
  result.patternMatched = patternType;
  result.rawMatchLength = encodedJson.length;

  try {
    const decodedJson = decodeHtmlEntities(encodedJson);
    const parsed: unknown = JSON.parse(decodedJson);
    result.jsonParseSuccess = true;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      result.parsedKeys = Object.keys(parsed as Record<string, unknown>);
    }

    // Skip if we require activeParty fields and this doesn't look like activeParty
    if (requiresActivePartyFields && !looksLikeActiveParty(parsed)) {
      return null;
    }

    const zodResult = ActivePartySchema.safeParse(parsed);
    if (zodResult.success) {
      result.zodValidationSuccess = true;
      result.activeParty = zodResult.data;
      return zodResult.data;
    }

    result.zodValidationSuccess = false;
    result.zodValidationErrors = zodResult.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return null;
  } catch (parseError) {
    result.jsonParseSuccess = false;
    result.jsonParseError = parseError instanceof Error ? parseError.message : String(parseError);
    return null;
  }
}

/**
 * Iterate through all regex matches and try to find valid activeParty data.
 */
function tryVuePatternMatches(
  html: string,
  pattern: RegExp,
  result: ActivePartyDiagnostic
): ActiveParty | null {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const encodedJson = match[1];
    if (!encodedJson) continue;

    const activeParty = tryParseMatch(encodedJson, result, "vue", true);
    if (activeParty) {
      return activeParty;
    }
    // If we found the right structure but validation failed, stop searching
    if (result.zodValidationErrors && result.zodValidationErrors.length > 0) {
      return null;
    }
  }
  return null;
}

/**
 * Extract the activeParty JSON data from HTML page content with diagnostics.
 * This is the diagnostic version that returns detailed parsing information.
 *
 * @param html - The HTML page content
 * @returns Diagnostic information including the parsed ActiveParty or null
 */
export function extractActivePartyWithDiagnostics(html: string): ActivePartyDiagnostic {
  if (!html) {
    return { patternMatched: "none", activeParty: null };
  }

  const result: ActivePartyDiagnostic = {
    patternMatched: "none",
    activeParty: null,
  };

  try {
    // Try the script tag pattern first (legacy format)
    const scriptMatch = ACTIVE_PARTY_PATTERN.exec(html);
    if (scriptMatch?.[1]) {
      tryParseMatch(scriptMatch[1], result, "script", false);
      if (result.activeParty) {
        return result;
      }
    }

    // Try the Vue :active-party pattern (production format)
    tryVuePatternMatches(html, VUE_ACTIVE_PARTY_PATTERN, result);
    if (result.activeParty) {
      return result;
    }

    // Also try :party pattern
    tryVuePatternMatches(html, VUE_PARTY_PATTERN, result);
  } catch (error) {
    logger.warn("Failed to extract activeParty from HTML:", error);
  }

  return result;
}

/**
 * Extract the activeParty JSON data from HTML page content.
 *
 * Supports multiple formats:
 * 1. Script tag: window.activeParty = JSON.parse('{"eligibleAttributeValues":[...],...}')
 * 2. Vue :active-party attribute: <main-layout :active-party="$convertFromBackendToFrontend({...})" ...>
 * 3. Vue :party attribute: <component :party="$convertFromBackendToFrontend({...})" ...>
 *
 * Since there may be multiple :active-party attributes (e.g., form permissions vs user party data),
 * this function iterates through all matches to find the one with actual activeParty data.
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
    const scriptMatch = ACTIVE_PARTY_PATTERN.exec(html);
    if (scriptMatch?.[1]) {
      const encodedJson = scriptMatch[1];
      const decodedJson = decodeHtmlEntities(encodedJson);
      const parsed: unknown = JSON.parse(decodedJson);

      const result = ActivePartySchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
      logger.warn("activeParty validation failed (script format):", result.error.issues);
    }

    // Try the Vue :active-party pattern (production format)
    // Iterate through all matches to find the one with actual activeParty data
    let vueMatch: RegExpExecArray | null;

    // Reset lastIndex for global regex
    VUE_ACTIVE_PARTY_PATTERN.lastIndex = 0;

    while ((vueMatch = VUE_ACTIVE_PARTY_PATTERN.exec(html)) !== null) {
      const encodedJson = vueMatch[1];
      if (!encodedJson) continue;

      try {
        const decodedJson = decodeHtmlEntities(encodedJson);
        const parsed: unknown = JSON.parse(decodedJson);

        // Only accept if it looks like activeParty data (not form permissions)
        if (looksLikeActiveParty(parsed)) {
          const result = ActivePartySchema.safeParse(parsed);
          if (result.success) {
            return result.data;
          }
          logger.warn("activeParty validation failed (Vue :active-party format):", result.error.issues);
        }
      } catch (error) {
        logger.warn("Failed to parse :active-party match:", error);
      }
    }

    // Try the Vue :party pattern
    VUE_PARTY_PATTERN.lastIndex = 0;

    while ((vueMatch = VUE_PARTY_PATTERN.exec(html)) !== null) {
      const encodedJson = vueMatch[1];
      if (!encodedJson) continue;

      try {
        const decodedJson = decodeHtmlEntities(encodedJson);
        const parsed: unknown = JSON.parse(decodedJson);

        if (looksLikeActiveParty(parsed)) {
          const result = ActivePartySchema.safeParse(parsed);
          if (result.success) {
            return result.data;
          }
          logger.warn("activeParty validation failed (Vue :party format):", result.error.issues);
        }
      } catch (error) {
        logger.warn("Failed to parse :party match:", error);
      }
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
 * Type guard to check if inflatedValue is an object (InflatedAssociationValue).
 * Returns false for primitive values (boolean, null, string, number).
 */
export function isInflatedObject(
  value: InflatedAssociationValue | boolean | null | string | number | undefined,
): value is InflatedAssociationValue {
  return value !== null && typeof value === "object";
}

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
      .map((av) => (isInflatedObject(av.inflatedValue) ? av.inflatedValue.__identity : undefined))
      .filter(Boolean),
  );

  return uniqueAssociations.size > 1;
}
