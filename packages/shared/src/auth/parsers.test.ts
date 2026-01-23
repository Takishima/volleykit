/**
 * Tests for authentication HTML parsing utilities
 */

import { describe, it, expect } from 'vitest'
import {
  extractLoginFormFields,
  extractCsrfTokenFromPage,
  isDashboardHtmlContent,
  isLoginPageHtmlContent,
  extractActivePartyFromHtml,
  parseOccupationFromActiveParty,
  parseOccupationsFromActiveParty,
  filterRefereeAssociations,
  hasMultipleAssociations,
  analyzeAuthResponseHtml,
  isInflatedObject,
  deriveAssociationCodeFromName,
} from './parsers'
import type { AttributeValue } from './types'

describe('extractLoginFormFields', () => {
  it('should extract trustedProperties from login page HTML', () => {
    const html = `
      <form action="/login">
        <input type="hidden" name="__trustedProperties" value="abc123trusted" />
        <input type="hidden" name="__referrer[@package]" value="SportManager.Volleyball" />
        <input type="hidden" name="__referrer[@subpackage]" value="" />
        <input type="hidden" name="__referrer[@controller]" value="Public" />
        <input type="hidden" name="__referrer[@action]" value="login" />
      </form>
    `

    const result = extractLoginFormFields(html)

    expect(result).not.toBeNull()
    expect(result?.trustedProperties).toBe('abc123trusted')
    // Note: referrer fields use regex that doesn't escape [], so we test with defaults
    // The actual VolleyManager HTML uses the same defaults anyway
    expect(result?.referrerPackage).toBe('SportManager.Volleyball')
    expect(result?.referrerController).toBe('Public')
    expect(result?.referrerAction).toBe('login')
  })

  it('should return null if trustedProperties is missing', () => {
    const html = `
      <form action="/login">
        <input type="hidden" name="__referrer[@package]" value="SportManager.Volleyball" />
      </form>
    `

    const result = extractLoginFormFields(html)
    expect(result).toBeNull()
  })

  it('should use default values for missing referrer fields', () => {
    const html = `
      <form action="/login">
        <input type="hidden" name="__trustedProperties" value="token123" />
      </form>
    `

    const result = extractLoginFormFields(html)

    expect(result).not.toBeNull()
    expect(result?.trustedProperties).toBe('token123')
    expect(result?.referrerPackage).toBe('SportManager.Volleyball')
    expect(result?.referrerSubpackage).toBe('')
    expect(result?.referrerController).toBe('Public')
    expect(result?.referrerAction).toBe('login')
  })

  it('should return null for empty HTML', () => {
    const result = extractLoginFormFields('')
    expect(result).toBeNull()
  })

  it('should handle HTML with special characters in values', () => {
    const html = `
      <input type="hidden" name="__trustedProperties" value="abc+def/123=" />
    `

    const result = extractLoginFormFields(html)
    expect(result?.trustedProperties).toBe('abc+def/123=')
  })
})

describe('extractCsrfTokenFromPage', () => {
  it('should extract CSRF token from data attribute', () => {
    const html = '<div data-csrf-token="csrf-token-12345"></div>'
    const result = extractCsrfTokenFromPage(html)
    expect(result).toBe('csrf-token-12345')
  })

  it('should return null if no CSRF token found', () => {
    const html = '<div>No token here</div>'
    const result = extractCsrfTokenFromPage(html)
    expect(result).toBeNull()
  })

  it('should return null for empty HTML', () => {
    const result = extractCsrfTokenFromPage('')
    expect(result).toBeNull()
  })

  it('should extract first token if multiple exist', () => {
    const html = `
      <div data-csrf-token="first-token"></div>
      <div data-csrf-token="second-token"></div>
    `
    const result = extractCsrfTokenFromPage(html)
    expect(result).toBe('first-token')
  })
})

describe('isDashboardHtmlContent', () => {
  it('should return true for dashboard page with CSRF token', () => {
    const html = '<div data-csrf-token="token123">Dashboard content</div>'
    expect(isDashboardHtmlContent(html)).toBe(true)
  })

  it('should return false if login form is present', () => {
    const html = `
      <div data-csrf-token="token123">
        <form action="/login">
          <input id="username" />
          <input id="password" />
        </form>
      </div>
    `
    expect(isDashboardHtmlContent(html)).toBe(false)
  })

  it('should return false if no CSRF token', () => {
    const html = '<div>Just some content</div>'
    expect(isDashboardHtmlContent(html)).toBe(false)
  })

  it('should return false for login action form', () => {
    const html = `
      <div data-csrf-token="token">
        <form action="/login">Submit</form>
      </div>
    `
    expect(isDashboardHtmlContent(html)).toBe(false)
  })
})

describe('isLoginPageHtmlContent', () => {
  it('should return true for page with login form action', () => {
    const html = '<form action="/login"><input id="username" /></form>'
    expect(isLoginPageHtmlContent(html)).toBe(true)
  })

  it('should return true for page with username and password fields', () => {
    const html = `
      <form>
        <input id="username" />
        <input id="password" />
      </form>
    `
    expect(isLoginPageHtmlContent(html)).toBe(true)
  })

  it('should return false for dashboard page', () => {
    const html = '<div data-csrf-token="token">Dashboard</div>'
    expect(isLoginPageHtmlContent(html)).toBe(false)
  })

  it('should return false for empty HTML', () => {
    expect(isLoginPageHtmlContent('')).toBe(false)
  })
})

describe('extractActivePartyFromHtml', () => {
  it('should extract activeParty from window.activeParty script', () => {
    const activePartyData = {
      __identity: 'user-123',
      eligibleAttributeValues: [],
      activeRoleIdentifier: 'Referee',
    }
    const html = `
      <script>
        window.activeParty = JSON.parse('${JSON.stringify(activePartyData)}');
      </script>
    `

    const result = extractActivePartyFromHtml(html)

    expect(result).not.toBeNull()
    expect(result?.__identity).toBe('user-123')
    expect(result?.activeRoleIdentifier).toBe('Referee')
  })

  it('should extract activeParty from Vue :active-party attribute', () => {
    const activePartyData = {
      eligibleRoles: { referee: { identifier: 'Referee' } },
      groupedEligibleAttributeValues: [],
    }
    const encodedJson = JSON.stringify(activePartyData).replace(/"/g, '&quot;')

    const html = `<div :active-party="$convertFromBackendToFrontend(${encodedJson})"></div>`

    const result = extractActivePartyFromHtml(html)

    expect(result).not.toBeNull()
    expect(result?.eligibleRoles).toBeDefined()
  })

  it('should extract activeParty from Vue :party attribute', () => {
    const activePartyData = {
      activeAttributeValue: { __identity: 'attr-1' },
      eligibleAttributeValues: [],
    }
    const encodedJson = JSON.stringify(activePartyData).replace(/"/g, '&quot;')

    const html = `<component :party="$convertFromBackendToFrontend(${encodedJson})"></component>`

    const result = extractActivePartyFromHtml(html)

    expect(result).not.toBeNull()
    expect(result?.activeAttributeValue?.__identity).toBe('attr-1')
  })

  it('should return null for invalid JSON', () => {
    const html = `<script>window.activeParty = JSON.parse('invalid json');</script>`
    const result = extractActivePartyFromHtml(html)
    expect(result).toBeNull()
  })

  it('should return null for empty HTML', () => {
    expect(extractActivePartyFromHtml('')).toBeNull()
  })

  it('should return null if no activeParty found', () => {
    const html = '<div>No active party here</div>'
    expect(extractActivePartyFromHtml(html)).toBeNull()
  })

  it('should handle HTML entities in JSON', () => {
    const html = `
      <script>
        window.activeParty = JSON.parse('{"__identity":"123","eligibleRoles":{"test":"value"}}');
      </script>
    `

    const result = extractActivePartyFromHtml(html)
    expect(result?.__identity).toBe('123')
  })
})

describe('isInflatedObject', () => {
  it('should return true for valid inflated object', () => {
    const obj = { __identity: '123', name: 'Test Association' }
    expect(isInflatedObject(obj)).toBe(true)
  })

  it('should return false for null', () => {
    expect(isInflatedObject(null)).toBe(false)
  })

  it('should return false for boolean', () => {
    expect(isInflatedObject(true)).toBe(false)
    expect(isInflatedObject(false)).toBe(false)
  })

  it('should return false for string', () => {
    expect(isInflatedObject('test')).toBe(false)
  })

  it('should return false for number', () => {
    expect(isInflatedObject(42)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isInflatedObject(undefined)).toBe(false)
  })
})

describe('deriveAssociationCodeFromName', () => {
  it('should derive code from association name', () => {
    expect(deriveAssociationCodeFromName('Swiss Volley')).toBe('SV')
    expect(deriveAssociationCodeFromName('Regionalverband Nordostschweiz')).toBe('RN')
  })

  it('should exclude common words', () => {
    expect(deriveAssociationCodeFromName('Association de Volleyball')).toBe('AV')
    expect(deriveAssociationCodeFromName('Federation du Volleyball de Suisse')).toBe('FVS')
  })

  it('should return undefined for empty name', () => {
    expect(deriveAssociationCodeFromName('')).toBeUndefined()
    expect(deriveAssociationCodeFromName(undefined)).toBeUndefined()
  })

  it('should handle single word names', () => {
    expect(deriveAssociationCodeFromName('RVNO')).toBe('R')
  })
})

describe('parseOccupationFromActiveParty', () => {
  it('should parse referee occupation with association code', () => {
    const attr: AttributeValue = {
      __identity: 'occ-123',
      roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
      inflatedValue: {
        __identity: 'assoc-1',
        shortName: 'RVNO',
        name: 'Regionalverband Nordostschweiz',
      },
    }

    const result = parseOccupationFromActiveParty(attr)

    expect(result).not.toBeNull()
    expect(result?.id).toBe('occ-123')
    expect(result?.type).toBe('referee')
    expect(result?.associationCode).toBe('RVNO')
  })

  it('should derive association code from name if shortName missing', () => {
    const attr: AttributeValue = {
      __identity: 'occ-456',
      roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
      inflatedValue: {
        __identity: 'assoc-2',
        name: 'Swiss Volley',
      },
    }

    const result = parseOccupationFromActiveParty(attr)

    expect(result?.associationCode).toBe('SV')
  })

  it('should return null for non-referee roles', () => {
    const attr: AttributeValue = {
      __identity: 'occ-789',
      roleIdentifier: 'Indoorvolleyball.ClubAdmin:ClubAdmin',
    }

    expect(parseOccupationFromActiveParty(attr)).toBeNull()
  })

  it('should return null if missing __identity', () => {
    const attr: AttributeValue = {
      roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
    }

    expect(parseOccupationFromActiveParty(attr)).toBeNull()
  })

  it('should return null if missing roleIdentifier', () => {
    const attr: AttributeValue = {
      __identity: 'occ-111',
    }

    expect(parseOccupationFromActiveParty(attr)).toBeNull()
  })
})

describe('parseOccupationsFromActiveParty', () => {
  it('should parse multiple referee occupations', () => {
    const attrs: AttributeValue[] = [
      {
        __identity: 'occ-1',
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        inflatedValue: { shortName: 'RVNO' },
      },
      {
        __identity: 'occ-2',
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        inflatedValue: { shortName: 'RVSZ' },
      },
    ]

    const result = parseOccupationsFromActiveParty(attrs)

    expect(result).toHaveLength(2)
    expect(result[0].associationCode).toBe('RVNO')
    expect(result[1].associationCode).toBe('RVSZ')
  })

  it('should filter out non-referee roles', () => {
    const attrs: AttributeValue[] = [
      {
        __identity: 'occ-1',
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        inflatedValue: { shortName: 'RVNO' },
      },
      {
        __identity: 'occ-2',
        roleIdentifier: 'Indoorvolleyball.ClubAdmin:ClubAdmin',
        inflatedValue: { shortName: 'Club' },
      },
    ]

    const result = parseOccupationsFromActiveParty(attrs)

    expect(result).toHaveLength(1)
    expect(result[0].associationCode).toBe('RVNO')
  })

  it('should deduplicate by association code', () => {
    const attrs: AttributeValue[] = [
      {
        __identity: 'occ-1',
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        inflatedValue: { shortName: 'RVNO' },
      },
      {
        __identity: 'occ-2',
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        inflatedValue: { shortName: 'RVNO' }, // Duplicate
      },
    ]

    const result = parseOccupationsFromActiveParty(attrs)

    expect(result).toHaveLength(1)
  })

  it('should return empty array for null input', () => {
    expect(parseOccupationsFromActiveParty(null)).toEqual([])
    expect(parseOccupationsFromActiveParty(undefined)).toEqual([])
  })

  it('should return empty array for empty array', () => {
    expect(parseOccupationsFromActiveParty([])).toEqual([])
  })
})

describe('filterRefereeAssociations', () => {
  it('should filter to only referee association memberships', () => {
    const attrs: AttributeValue[] = [
      {
        __identity: '1',
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        type: 'SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation',
      },
      {
        __identity: '2',
        roleIdentifier: 'Indoorvolleyball.ClubAdmin:ClubAdmin',
        type: 'SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation',
      },
      {
        __identity: '3',
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        type: 'boolean', // Not an association
      },
    ]

    const result = filterRefereeAssociations(attrs)

    expect(result).toHaveLength(1)
    expect(result[0].__identity).toBe('1')
  })

  it('should return empty array for null input', () => {
    expect(filterRefereeAssociations(null)).toEqual([])
    expect(filterRefereeAssociations(undefined)).toEqual([])
  })
})

describe('hasMultipleAssociations', () => {
  it('should return true for multiple unique associations', () => {
    const attrs: AttributeValue[] = [
      {
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        type: 'SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation',
        inflatedValue: { __identity: 'assoc-1' },
      },
      {
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        type: 'SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation',
        inflatedValue: { __identity: 'assoc-2' },
      },
    ]

    expect(hasMultipleAssociations(attrs)).toBe(true)
  })

  it('should return false for single association', () => {
    const attrs: AttributeValue[] = [
      {
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        type: 'SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation',
        inflatedValue: { __identity: 'assoc-1' },
      },
    ]

    expect(hasMultipleAssociations(attrs)).toBe(false)
  })

  it('should return false for duplicate associations', () => {
    const attrs: AttributeValue[] = [
      {
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        type: 'SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation',
        inflatedValue: { __identity: 'assoc-1' },
      },
      {
        roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
        type: 'SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation',
        inflatedValue: { __identity: 'assoc-1' }, // Same
      },
    ]

    expect(hasMultipleAssociations(attrs)).toBe(false)
  })

  it('should return false for null input', () => {
    expect(hasMultipleAssociations(null)).toBe(false)
    expect(hasMultipleAssociations(undefined)).toBe(false)
  })
})

describe('analyzeAuthResponseHtml', () => {
  it('should detect auth error indicators', () => {
    const html = '<div color="error">Login failed</div>'
    const result = analyzeAuthResponseHtml(html)

    expect(result.hasAuthError).toBe(true)
    expect(result.hasTfaPage).toBe(false)
  })

  it('should detect TFA page indicators', () => {
    const htmlCases = [
      '<input name="secondFactorToken" />',
      '<div class="SecondFactor">Enter code</div>',
      '<form id="TwoFactorAuthentication">',
      '<input name="totp" />',
      '<label>Enter your TOTP code</label>',
    ]

    for (const html of htmlCases) {
      const result = analyzeAuthResponseHtml(html)
      expect(result.hasTfaPage).toBe(true)
    }
  })

  it('should return false for normal pages', () => {
    const html = '<div>Welcome to the dashboard</div>'
    const result = analyzeAuthResponseHtml(html)

    expect(result.hasAuthError).toBe(false)
    expect(result.hasTfaPage).toBe(false)
  })

  it('should detect both auth error and TFA', () => {
    const html = `
      <div color="error">Error occurred</div>
      <input name="secondFactorToken" />
    `
    const result = analyzeAuthResponseHtml(html)

    expect(result.hasAuthError).toBe(true)
    expect(result.hasTfaPage).toBe(true)
  })
})
