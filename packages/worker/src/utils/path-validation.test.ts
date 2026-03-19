import { describe, it, expect } from 'vitest'

import { isAllowedPath, isPathSafe, requiresApiPrefix } from './path-validation'
import { extractRawPathAndSearch } from './constants'

describe('Path Filtering', () => {
  describe('isAllowedPath', () => {
    it('allows login page path', () => {
      expect(isAllowedPath('/login')).toBe(true)
    })

    it('allows logout path', () => {
      expect(isAllowedPath('/logout')).toBe(true)
    })

    it('allows authentication endpoint', () => {
      expect(isAllowedPath('/sportmanager.security/authentication/authenticate')).toBe(true)
    })

    it('allows dashboard path', () => {
      expect(isAllowedPath('/sportmanager.volleyball/main/dashboard')).toBe(true)
    })

    it('allows referee admin API paths', () => {
      expect(isAllowedPath('/indoorvolleyball.refadmin/api/test')).toBe(true)
    })

    it('allows sport manager API paths', () => {
      expect(isAllowedPath('/sportmanager.indoorvolleyball/api/test')).toBe(true)
    })

    it('allows root path', () => {
      expect(isAllowedPath('/')).toBe(true)
    })

    it('rejects unknown paths', () => {
      expect(isAllowedPath('/admin/secret')).toBe(false)
    })

    it('rejects paths that look similar but are not allowed', () => {
      expect(isAllowedPath('/loginpage')).toBe(false) // not exactly /login
      expect(isAllowedPath('/logoutuser')).toBe(false) // not exactly /logout
    })

    it('allows core API paths', () => {
      expect(isAllowedPath('/sportmanager.core/api/test')).toBe(true)
    })

    it('allows resource management API paths', () => {
      expect(isAllowedPath('/sportmanager.resourcemanagement/api/upload')).toBe(true)
    })

    it('allows notification center API paths', () => {
      expect(isAllowedPath('/sportmanager.notificationcenter/api/notifications')).toBe(true)
    })

    it('allows static resource paths (profile pictures, uploads)', () => {
      expect(isAllowedPath('/_Resources/Persistent/abc123/profile.jpg')).toBe(true)
      expect(isAllowedPath('/_Resources/Static/Packages/some-asset.png')).toBe(true)
    })
  })

  describe('requiresApiPrefix', () => {
    it('returns true for referee admin API paths', () => {
      expect(requiresApiPrefix('/indoorvolleyball.refadmin/api/test')).toBe(true)
    })

    it('returns true for indoor volleyball API paths', () => {
      expect(requiresApiPrefix('/sportmanager.indoorvolleyball/api/game')).toBe(true)
    })

    it('returns true for core API paths', () => {
      expect(requiresApiPrefix('/sportmanager.core/api/search')).toBe(true)
    })

    it('returns true for resource management API paths', () => {
      expect(requiresApiPrefix('/sportmanager.resourcemanagement/api/upload')).toBe(true)
    })

    it('returns true for notification center API paths', () => {
      expect(requiresApiPrefix('/sportmanager.notificationcenter/api/test')).toBe(true)
    })

    it('returns false for authentication endpoint', () => {
      expect(requiresApiPrefix('/sportmanager.security/authentication/authenticate')).toBe(false)
    })

    it('returns false for dashboard path', () => {
      expect(requiresApiPrefix('/sportmanager.volleyball/main/dashboard')).toBe(false)
    })

    it('returns false for login path', () => {
      expect(requiresApiPrefix('/login')).toBe(false)
    })

    it('returns false for logout path', () => {
      expect(requiresApiPrefix('/logout')).toBe(false)
    })

    it('returns false for root path', () => {
      expect(requiresApiPrefix('/')).toBe(false)
    })

    it('returns false for PDF download endpoint (exception)', () => {
      // PDF download endpoint does NOT use /api/ prefix
      // even though it's under /indoorvolleyball.refadmin/
      expect(
        requiresApiPrefix(
          '/indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses'
        )
      ).toBe(false)
    })

    it('returns false for PDF download endpoint with query params', () => {
      expect(
        requiresApiPrefix(
          '/indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses?refereeConvocation=abc-123'
        )
      ).toBe(false)
    })

    it('returns false for static resource paths', () => {
      expect(requiresApiPrefix('/_Resources/Persistent/abc123/image.jpg')).toBe(false)
    })
  })
})

describe('Path Safety (Traversal Prevention)', () => {
  it('accepts normal paths', () => {
    expect(isPathSafe('/neos/login')).toBe(true)
    expect(isPathSafe('/indoorvolleyball.refadmin/api/test')).toBe(true)
  })

  it('rejects path traversal with ..', () => {
    expect(isPathSafe('/api/../secret')).toBe(false)
    expect(isPathSafe('/../etc/passwd')).toBe(false)
  })

  it('rejects double slashes', () => {
    expect(isPathSafe('//evil.com/path')).toBe(false)
  })

  it('rejects null bytes', () => {
    expect(isPathSafe('/api/test%00.txt')).toBe(false)
  })

  it('allows backslashes (used by Neos/Flow as namespace separators)', () => {
    // TYPO3 Neos/Flow uses backslashes in API paths for namespace separation
    // e.g., /indoorvolleyball.refadmin/api\refereeconvocation/search
    expect(isPathSafe('/api\\test')).toBe(true)
    expect(isPathSafe('/indoorvolleyball.refadmin/api\\refereeconvocation/search')).toBe(true)
    expect(isPathSafe('/indoorvolleyball.refadmin/api\\refereeassociationsettings/get')).toBe(true)
  })

  it('rejects encoded traversal attempts', () => {
    expect(isPathSafe('/api/%2e%2e/secret')).toBe(false) // encoded ..
  })

  it('rejects invalid encoding', () => {
    expect(isPathSafe('/api/%ZZ/test')).toBe(false) // invalid hex
  })
})

describe('URL Encoding Preservation', () => {
  it('preserves URL-encoded backslashes (%5c) in paths', () => {
    // TYPO3 Neos/Flow requires exact %5c encoding for namespace separators
    const requestUrl =
      'https://proxy.example.com/indoorvolleyball.refadmin/api%5crefereeconvocation/search'
    const result = extractRawPathAndSearch(requestUrl)
    expect(result).toBe('/indoorvolleyball.refadmin/api%5crefereeconvocation/search')
    expect(result).toContain('%5c') // Encoding must be preserved
  })

  it('preserves URL-encoded backslashes in complex paths', () => {
    const requestUrl =
      'https://proxy.example.com/indoorvolleyball.refadmin/api%5Crefereeassociationsettings/get'
    const result = extractRawPathAndSearch(requestUrl)
    expect(result).toBe('/indoorvolleyball.refadmin/api%5Crefereeassociationsettings/get')
    expect(result).toContain('%5C') // Uppercase encoding also preserved
  })

  it('preserves query parameters with URL encoding', () => {
    const requestUrl = 'https://proxy.example.com/api/search?filter=%5Cnamespace%5Cclass'
    const result = extractRawPathAndSearch(requestUrl)
    expect(result).toBe('/api/search?filter=%5Cnamespace%5Cclass')
    expect(result).toContain('filter=%5Cnamespace%5Cclass')
  })

  it('preserves multiple special characters in URL encoding', () => {
    const requestUrl = 'https://proxy.example.com/api/test?param=%20%2B%3D%26'
    const result = extractRawPathAndSearch(requestUrl)
    expect(result).toBe('/api/test?param=%20%2B%3D%26')
    // Space, plus, equals, ampersand should all be preserved
    expect(result).toContain('%20') // space
    expect(result).toContain('%2B') // plus
    expect(result).toContain('%3D') // equals
    expect(result).toContain('%26') // ampersand
  })

  it('handles root path correctly', () => {
    const requestUrl = 'https://proxy.example.com/'
    const result = extractRawPathAndSearch(requestUrl)
    expect(result).toBe('/')
  })

  it('handles paths without encoding correctly', () => {
    const requestUrl = 'https://proxy.example.com/indoorvolleyball.refadmin/api/test'
    const result = extractRawPathAndSearch(requestUrl)
    expect(result).toBe('/indoorvolleyball.refadmin/api/test')
  })

  it('extracts path and search together', () => {
    const requestUrl = 'https://proxy.example.com/api/search?q=test&limit=10'
    const result = extractRawPathAndSearch(requestUrl)
    expect(result).toBe('/api/search?q=test&limit=10')
  })

  it('handles URL without path (defaults to /)', () => {
    // Edge case: URL without path separator after host
    const requestUrl = 'https://proxy.example.com'
    const result = extractRawPathAndSearch(requestUrl)
    expect(result).toBe('/')
  })

  it('preserves hash fragments if present in request URL', () => {
    // Note: Hash fragments typically don't reach the server, but if they do, preserve them
    const requestUrl = 'https://proxy.example.com/api/test#section'
    const result = extractRawPathAndSearch(requestUrl)
    expect(result).toBe('/api/test#section')
  })

  it('does not double-encode already encoded characters', () => {
    // Regression test: URL constructor would re-encode %5c to %255c
    const requestUrl = 'https://proxy.example.com/api%5ctest'
    const result = extractRawPathAndSearch(requestUrl)
    expect(result).toBe('/api%5ctest')
    expect(result).not.toContain('%255c') // Should NOT be double-encoded
  })
})
