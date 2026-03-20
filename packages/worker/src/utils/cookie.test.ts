import { describe, it, expect } from 'vitest'

import { rewriteCookie } from './cookie'

describe('Cookie Rewriting', () => {
  describe('rewriteCookie', () => {
    it('adds SameSite=None, Secure, and Partitioned', () => {
      const cookie = 'session=abc123; Path=/'
      const result = rewriteCookie(cookie)
      expect(result).toContain('SameSite=None')
      expect(result).toContain('Secure')
      expect(result).toContain('Partitioned')
    })

    it('removes existing Domain attribute', () => {
      const cookie = 'session=abc123; Domain=.example.com; Path=/'
      const result = rewriteCookie(cookie)
      expect(result).not.toContain('Domain=')
      expect(result).not.toContain('.example.com')
    })

    it('removes existing Secure attribute', () => {
      const cookie = 'session=abc123; Secure; Path=/'
      const result = rewriteCookie(cookie)
      // Should only have one Secure (the one we add)
      const secureCount = (result.match(/Secure/g) || []).length
      expect(secureCount).toBe(1)
    })

    it('removes existing Partitioned attribute', () => {
      const cookie = 'session=abc123; Partitioned; Path=/'
      const result = rewriteCookie(cookie)
      // Should only have one Partitioned (the one we add)
      const partitionedCount = (result.match(/Partitioned/g) || []).length
      expect(partitionedCount).toBe(1)
    })

    it('removes existing SameSite attribute', () => {
      const cookie = 'session=abc123; SameSite=Strict; Path=/'
      const result = rewriteCookie(cookie)
      expect(result).not.toContain('SameSite=Strict')
      expect(result).toContain('SameSite=None')
    })

    it('handles complex cookies', () => {
      const cookie =
        'TYPO3_Flow_Session=abc; Domain=.volleyball.ch; Path=/; Secure; SameSite=Lax; HttpOnly'
      const result = rewriteCookie(cookie)
      expect(result).not.toContain('Domain=')
      expect(result).toContain('SameSite=None')
      expect(result).toContain('Secure')
      expect(result).toContain('Partitioned')
      expect(result).toContain('HttpOnly')
    })

    it('handles cookies with all attributes already present', () => {
      const cookie =
        'session=abc; Domain=.example.com; Secure; SameSite=Strict; Partitioned; HttpOnly'
      const result = rewriteCookie(cookie)
      // Should remove Domain and replace attributes with our values
      expect(result).not.toContain('Domain=')
      expect(result).not.toContain('SameSite=Strict')
      expect(result).toContain('SameSite=None')
      // Should only have one of each
      const secureCount = (result.match(/Secure/g) || []).length
      const partitionedCount = (result.match(/Partitioned/g) || []).length
      expect(secureCount).toBe(1)
      expect(partitionedCount).toBe(1)
    })
  })
})
