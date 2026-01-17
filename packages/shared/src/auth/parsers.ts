/**
 * Authentication HTML parsing utilities.
 *
 * Platform-agnostic utilities for extracting data from Neos Flow login pages.
 * Works in both browser (DOMParser) and React Native (regex fallback) environments.
 */

import type {
  LoginFormFields,
  ActiveParty,
  AttributeValue,
  InflatedAssociationValue,
} from './types';
import type { Occupation } from '../stores/auth';

// ============================================================================
// HTML Parsing - Login Form Fields
// ============================================================================

/**
 * Extract required form fields from login page HTML.
 * The Neos Flow framework uses __trustedProperties for CSRF protection.
 *
 * Uses regex for React Native compatibility (no DOMParser).
 */
export function extractLoginFormFields(html: string): LoginFormFields | null {
  try {
    // Extract trustedProperties (required)
    const trustedPropsMatch = html.match(
      /name="__trustedProperties"\s+value="([^"]*)"/
    );
    if (!trustedPropsMatch?.[1]) {
      return null;
    }

    // Extract referrer fields with defaults
    const getFieldValue = (name: string, defaultValue: string): string => {
      const regex = new RegExp(`name="${name}"\\s+value="([^"]*)"`, 'i');
      const match = html.match(regex);
      return match?.[1] ?? defaultValue;
    };

    return {
      trustedProperties: trustedPropsMatch[1],
      referrerPackage: getFieldValue('__referrer[@package]', 'SportManager.Volleyball'),
      referrerSubpackage: getFieldValue('__referrer[@subpackage]', ''),
      referrerController: getFieldValue('__referrer[@controller]', 'Public'),
      referrerAction: getFieldValue('__referrer[@action]', 'login'),
      referrerArguments: getFieldValue('__referrer[arguments]', ''),
    };
  } catch {
    return null;
  }
}

/**
 * Extract CSRF token from authenticated page HTML.
 * After login, the dashboard HTML contains data-csrf-token attribute.
 */
export function extractCsrfTokenFromPage(html: string): string | null {
  try {
    const match = html.match(/data-csrf-token="([^"]*)"/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Checks if HTML content represents the dashboard page.
 * Used to detect successful login.
 */
export function isDashboardHtmlContent(html: string): boolean {
  const hasCsrfToken = html.includes('data-csrf-token');
  const hasLoginForm =
    html.includes('action="/login"') ||
    (html.includes('id="username"') && html.includes('id="password"'));

  return hasCsrfToken && !hasLoginForm;
}

/**
 * Checks if HTML content represents a login page.
 */
export function isLoginPageHtmlContent(html: string): boolean {
  const hasLoginFormIndicators =
    html.includes('action="/login"') ||
    (html.includes('id="username"') && html.includes('id="password"'));

  const hasDashboardIndicators = isDashboardHtmlContent(html);

  return hasLoginFormIndicators && !hasDashboardIndicators;
}

// ============================================================================
// HTML Parsing - Active Party
// ============================================================================

/**
 * Regex pattern to match window.activeParty = JSON.parse('...') in HTML.
 */
const ACTIVE_PARTY_PATTERN =
  /window\.activeParty\s*=\s*JSON\.parse\s*\(\s*'((?:[^'\\]|\\.)*)'\s*\)/;

/**
 * Regex pattern for Vue :active-party attribute.
 */
const VUE_ACTIVE_PARTY_PATTERN =
  /:active-party="\$convertFromBackendToFrontend\((\{.+?\})\)"/gs;

/**
 * Regex pattern for Vue :party attribute.
 */
const VUE_PARTY_PATTERN = /:party="\$convertFromBackendToFrontend\((\{.+?\})\)"/gs;

/**
 * Decode HTML entities in a string.
 */
function decodeHtmlEntities(str: string): string {
  const entities: Record<string, string> = {
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&apos;': "'",
    '&#39;': "'",
    '&#x27;': "'",
    '&#34;': '"',
    '&#x22;': '"',
  };

  let decoded = str;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.split(entity).join(char);
  }

  return decoded;
}

/**
 * Check if a parsed object looks like valid activeParty data.
 */
function looksLikeActiveParty(parsed: unknown): parsed is Record<string, unknown> {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }
  const obj = parsed as Record<string, unknown>;
  return (
    'eligibleAttributeValues' in obj ||
    'groupedEligibleAttributeValues' in obj ||
    'eligibleRoles' in obj ||
    'activeRoleIdentifier' in obj ||
    'activeAttributeValue' in obj
  );
}

/**
 * Extract the activeParty JSON data from HTML page content.
 *
 * Supports multiple formats:
 * 1. Script tag: window.activeParty = JSON.parse('...')
 * 2. Vue :active-party attribute
 * 3. Vue :party attribute
 */
export function extractActivePartyFromHtml(html: string): ActiveParty | null {
  if (!html) {
    return null;
  }

  try {
    // Try the script tag pattern first (legacy format)
    const scriptMatch = ACTIVE_PARTY_PATTERN.exec(html);
    if (scriptMatch?.[1]) {
      const decodedJson = decodeHtmlEntities(scriptMatch[1]);
      const parsed = JSON.parse(decodedJson) as unknown;
      if (looksLikeActiveParty(parsed)) {
        return parsed as ActiveParty;
      }
    }

    // Try the Vue :active-party pattern
    VUE_ACTIVE_PARTY_PATTERN.lastIndex = 0;
    let vueMatch: RegExpExecArray | null;

    while ((vueMatch = VUE_ACTIVE_PARTY_PATTERN.exec(html)) !== null) {
      const encodedJson = vueMatch[1];
      if (!encodedJson) continue;

      try {
        const decodedJson = decodeHtmlEntities(encodedJson);
        const parsed = JSON.parse(decodedJson) as unknown;

        if (looksLikeActiveParty(parsed)) {
          return parsed as ActiveParty;
        }
      } catch {
        // Continue to next match
      }
    }

    // Try the Vue :party pattern
    VUE_PARTY_PATTERN.lastIndex = 0;

    while ((vueMatch = VUE_PARTY_PATTERN.exec(html)) !== null) {
      const encodedJson = vueMatch[1];
      if (!encodedJson) continue;

      try {
        const decodedJson = decodeHtmlEntities(encodedJson);
        const parsed = JSON.parse(decodedJson) as unknown;

        if (looksLikeActiveParty(parsed)) {
          return parsed as ActiveParty;
        }
      } catch {
        // Continue to next match
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// Occupation Parsing
// ============================================================================

/** Role identifier for referee role in the VolleyManager system */
const REFEREE_ROLE_IDENTIFIER = 'Indoorvolleyball.RefAdmin:Referee';

/** Type suffix for association memberships */
const ASSOCIATION_TYPE_SUFFIX = 'AbstractAssociation';

/**
 * Role identifier patterns from the VolleyManager API.
 */
const ROLE_PATTERNS = {
  referee: /:Referee$/,
  player: /:Player$/,
  clubAdmin: /:ClubAdmin$/,
  associationAdmin: /:AssociationAdmin$/,
} as const;

/**
 * Type guard to check if inflatedValue is an object.
 */
export function isInflatedObject(
  value: InflatedAssociationValue | boolean | null | string | number | undefined
): value is InflatedAssociationValue {
  return value !== null && typeof value === 'object';
}

/**
 * Words to exclude when deriving association code from name.
 */
const EXCLUDED_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'und', 'of', 'the']);

/**
 * Derives an association code from the full name by extracting first letters.
 */
export function deriveAssociationCodeFromName(name: string | undefined): string | undefined {
  if (!name) {
    return undefined;
  }

  const words = name.split(/\s+/);
  const initials = words
    .filter((word) => !EXCLUDED_WORDS.has(word.toLowerCase()))
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  return initials || undefined;
}

/**
 * Parses an ActiveParty AttributeValue into an Occupation with association code.
 */
export function parseOccupationFromActiveParty(attr: AttributeValue): Occupation | null {
  const roleIdentifier = attr.roleIdentifier;
  if (!roleIdentifier || !attr.__identity) {
    return null;
  }

  // Only parse referee roles
  if (!ROLE_PATTERNS.referee.test(roleIdentifier)) {
    return null;
  }

  // Extract association code: prefer shortName, fall back to derived from name
  const inflated = isInflatedObject(attr.inflatedValue) ? attr.inflatedValue : undefined;
  const associationCode = inflated?.shortName ?? deriveAssociationCodeFromName(inflated?.name);

  return {
    id: attr.__identity,
    type: 'referee',
    associationCode,
  };
}

/**
 * Parses groupedEligibleAttributeValues from activeParty HTML data
 * into an array of referee Occupations with association codes.
 */
export function parseOccupationsFromActiveParty(
  attributeValues: AttributeValue[] | null | undefined
): Occupation[] {
  if (!attributeValues || attributeValues.length === 0) {
    return [];
  }

  const occupations = attributeValues
    .map((attr) => parseOccupationFromActiveParty(attr))
    .filter((occ): occ is Occupation => occ !== null);

  // Deduplicate by association code
  const seen = new Set<string>();
  return occupations.filter((occ) => {
    const key = occ.associationCode ?? occ.id;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Filter attribute values to only include referee association memberships.
 */
export function filterRefereeAssociations(
  attributeValues: AttributeValue[] | null | undefined
): AttributeValue[] {
  if (!attributeValues) {
    return [];
  }

  return attributeValues.filter(
    (av) =>
      av.roleIdentifier === REFEREE_ROLE_IDENTIFIER && av.type?.includes(ASSOCIATION_TYPE_SUFFIX)
  );
}

/**
 * Check if a user has access to multiple associations.
 */
export function hasMultipleAssociations(
  attributeValues: AttributeValue[] | null | undefined
): boolean {
  const refereeAssociations = filterRefereeAssociations(attributeValues);

  const uniqueAssociations = new Set(
    refereeAssociations
      .map((av) => (isInflatedObject(av.inflatedValue) ? av.inflatedValue.__identity : undefined))
      .filter(Boolean)
  );

  return uniqueAssociations.size > 1;
}

// ============================================================================
// Login Response Analysis
// ============================================================================

/**
 * HTML patterns that indicate authentication failure.
 */
const AUTH_ERROR_INDICATORS = ['color="error"', "color='error'"] as const;

/**
 * HTML patterns that indicate Two-Factor Authentication is required.
 */
const TFA_PAGE_INDICATORS = [
  'secondFactorToken',
  'SecondFactor',
  'TwoFactorAuthentication',
  'totp',
  'TOTP',
] as const;

/**
 * Analyzes HTML content to determine if it contains auth errors or TFA.
 */
export function analyzeAuthResponseHtml(html: string): {
  hasAuthError: boolean;
  hasTfaPage: boolean;
} {
  const hasAuthError = AUTH_ERROR_INDICATORS.some((indicator) => html.includes(indicator));
  const hasTfaPage = TFA_PAGE_INDICATORS.some((indicator) => html.includes(indicator));

  return { hasAuthError, hasTfaPage };
}
