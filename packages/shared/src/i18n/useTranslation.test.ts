/**
 * Tests for useTranslation hook and translate function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { translate } from './useTranslation'
import type { Language } from './types'

// Mock the settings store for useTranslation hook tests
vi.mock('../stores/settings', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = { language: 'en' as Language }
    return selector ? selector(state) : state
  }),
}))

describe('translate', () => {
  describe('basic translations', () => {
    it('should return English translation for English language', () => {
      expect(translate('common.loading', 'en')).toBe('Loading...')
    })

    it('should return German translation for German language', () => {
      expect(translate('common.loading', 'de')).toBe('Laden...')
    })

    it('should return French translation for French language', () => {
      expect(translate('common.loading', 'fr')).toBe('Chargement...')
    })

    it('should return Italian translation for Italian language', () => {
      expect(translate('common.loading', 'it')).toBe('Caricamento...')
    })
  })

  describe('nested key access', () => {
    it('should access first-level nested keys', () => {
      expect(translate('common.error', 'en')).toBe('An error occurred')
    })

    it('should access deeply nested keys', () => {
      expect(translate('settings.biometric.title', 'en')).toBe('Biometric Login')
    })

    it('should access three-level nested keys', () => {
      expect(translate('settings.calendar.title', 'en')).toBe('Calendar Sync')
    })
  })

  describe('parameter substitution', () => {
    it('should replace single parameter', () => {
      const result = translate('auth.useBiometric', 'en', { biometricType: 'Face ID' })
      expect(result).toBe('Use Face ID')
    })

    it('should replace multiple parameters', () => {
      const result = translate('departure.notification.withTransit', 'en', {
        line: 'S3',
        stop: 'Central',
        direction: 'Airport',
      })
      expect(result).toBe('Take S3 from Central (→ Airport)')
    })

    it('should handle numeric parameters', () => {
      const result = translate('auth.attemptsRemaining', 'en', { count: 3 })
      expect(result).toBe('3 attempt remaining')
    })

    it('should leave unreplaced parameters in template', () => {
      const result = translate('auth.useBiometric', 'en', {})
      expect(result).toBe('Use {biometricType}')
    })

    it('should work with German translations and parameters', () => {
      const result = translate('auth.useBiometric', 'de', { biometricType: 'Touch ID' })
      expect(result).toBe('Touch ID verwenden')
    })
  })

  describe('fallback behavior', () => {
    it('should return the key when translation is not found', () => {
      expect(translate('nonexistent.key' as never, 'en')).toBe('nonexistent.key')
    })

    it('should return the key for partially valid paths', () => {
      expect(translate('common.nonexistent' as never, 'en')).toBe('common.nonexistent')
    })

    it('should fall back to English for unsupported language', () => {
      // Cast to Language to test the fallback behavior for edge cases
      const result = translate('common.loading', 'xx' as Language)
      expect(result).toBe('Loading...')
    })
  })

  describe('language-specific translations', () => {
    it('should provide different translations for auth.login across languages', () => {
      expect(translate('auth.login', 'en')).toBe('Login')
      expect(translate('auth.login', 'de')).toBe('Anmelden')
      expect(translate('auth.login', 'fr')).toBe('Connexion')
      expect(translate('auth.login', 'it')).toBe('Accesso')
    })

    it('should provide different translations for common.save across languages', () => {
      expect(translate('common.save', 'en')).toBe('Save')
      expect(translate('common.save', 'de')).toBe('Speichern')
      expect(translate('common.save', 'fr')).toBe('Enregistrer')
      expect(translate('common.save', 'it')).toBe('Salva')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string parameter values', () => {
      const result = translate('auth.useBiometric', 'en', { biometricType: '' })
      expect(result).toBe('Use ')
    })

    it('should handle zero as parameter value', () => {
      const result = translate('auth.attemptsRemaining', 'en', { count: 0 })
      expect(result).toBe('0 attempt remaining')
    })

    it('should handle special characters in parameter values', () => {
      const result = translate('auth.useBiometric', 'en', { biometricType: '<script>' })
      expect(result).toBe('Use <script>')
    })
  })
})

describe('useTranslation hook', () => {
  let mockLanguage: Language = 'en'

  beforeEach(() => {
    mockLanguage = 'en'
    // Re-mock with dynamic language
    vi.doMock('../stores/settings', () => ({
      useSettingsStore: vi.fn((selector) => {
        const state = { language: mockLanguage }
        return selector ? selector(state) : state
      }),
    }))
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('should be importable', async () => {
    const { useTranslation } = await import('./useTranslation')
    expect(useTranslation).toBeDefined()
    expect(typeof useTranslation).toBe('function')
  })
})
