import { describe, it, expect } from 'vitest'

import { AUTH_ENDPOINT, hasAuthCredentials, transformAuthFormData } from './auth-detection'

describe('iOS Authentication Workaround', () => {
  describe('hasAuthCredentials', () => {
    it('detects Neos Flow format credentials', () => {
      const body =
        '__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]=testuser&' +
        '__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][password]=testpass'
      expect(hasAuthCredentials(body)).toBe(true)
    })

    it('detects URL-encoded Neos Flow format credentials', () => {
      const body =
        '__authentication%5BNeos%5D%5BFlow%5D%5BSecurity%5D%5BAuthentication%5D%5BToken%5D%5BUsernamePassword%5D%5Busername%5D=testuser&' +
        '__authentication%5BNeos%5D%5BFlow%5D%5BSecurity%5D%5BAuthentication%5D%5BToken%5D%5BUsernamePassword%5D%5Bpassword%5D=testpass'
      expect(hasAuthCredentials(body)).toBe(true)
    })

    it('detects simple HTML form format credentials', () => {
      const body = 'username=testuser&password=testpass'
      expect(hasAuthCredentials(body)).toBe(true)
    })

    it('returns false for body without credentials', () => {
      const body = 'search=test&filter=active'
      expect(hasAuthCredentials(body)).toBe(false)
    })

    it('returns false for body with only username', () => {
      const body = 'username=testuser&filter=active'
      expect(hasAuthCredentials(body)).toBe(false)
    })

    it('returns false for body with only password', () => {
      const body = 'password=testpass&filter=active'
      expect(hasAuthCredentials(body)).toBe(false)
    })

    it('returns false for empty body', () => {
      expect(hasAuthCredentials('')).toBe(false)
    })
  })

  describe('transformAuthFormData', () => {
    it('transforms simple form fields to Neos Flow format', () => {
      const body = 'username=testuser&password=testpass'
      const result = transformAuthFormData(body)
      expect(result).toContain(
        '__authentication%5BNeos%5D%5BFlow%5D%5BSecurity%5D%5BAuthentication%5D%5BToken%5D%5BUsernamePassword%5D%5Busername%5D=testuser'
      )
      expect(result).toContain(
        '__authentication%5BNeos%5D%5BFlow%5D%5BSecurity%5D%5BAuthentication%5D%5BToken%5D%5BUsernamePassword%5D%5Bpassword%5D=testpass'
      )
    })

    it('returns body unchanged if already in Neos Flow format', () => {
      const body =
        '__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]=testuser&' +
        '__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][password]=testpass'
      const result = transformAuthFormData(body)
      expect(result).toBe(body)
    })

    it('returns body unchanged if URL-encoded Neos Flow format', () => {
      const body =
        '__authentication%5BNeos%5D%5BFlow%5D%5BSecurity%5D%5BAuthentication%5D%5BToken%5D%5BUsernamePassword%5D%5Busername%5D=testuser'
      const result = transformAuthFormData(body)
      expect(result).toBe(body)
    })

    it('preserves additional fields when transforming', () => {
      const body = 'username=testuser&password=testpass&rememberMe=true'
      const result = transformAuthFormData(body)
      expect(result).toContain('rememberMe=true')
    })

    it('returns body unchanged if missing username', () => {
      const body = 'password=testpass&filter=active'
      const result = transformAuthFormData(body)
      expect(result).toBe(body)
    })

    it('returns body unchanged if missing password', () => {
      const body = 'username=testuser&filter=active'
      const result = transformAuthFormData(body)
      expect(result).toBe(body)
    })

    it('handles special characters in credentials', () => {
      const body = 'username=test%40user.com&password=pass%26word%3D123'
      const result = transformAuthFormData(body)
      // URLSearchParams decodes then re-encodes, so check decoded values are preserved
      expect(result).toContain('test%40user.com')
      expect(result).toContain('pass%26word%3D123')
    })
  })

  describe('AUTH_ENDPOINT constant', () => {
    it('points to correct authentication endpoint', () => {
      expect(AUTH_ENDPOINT).toBe('/sportmanager.security/authentication/authenticate')
    })
  })
})
