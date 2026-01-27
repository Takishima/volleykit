/**
 * Tests for useTranslation hook and translate function
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { useSettingsStore } from '../stores/settings'

import { translate, useTranslation } from './useTranslation'

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
  beforeEach(() => {
    // Reset store to default state before each test
    useSettingsStore.getState().reset()
  })

  it('should return translation function and current language', () => {
    const { result } = renderHook(() => useTranslation())

    expect(result.current.t).toBeDefined()
    expect(typeof result.current.t).toBe('function')
    expect(result.current.language).toBe('de') // Default language
  })

  it('should translate keys correctly', () => {
    const { result } = renderHook(() => useTranslation())

    // Default language is German
    expect(result.current.t('common.loading')).toBe('Laden...')
  })

  it('should update translations when language changes', () => {
    const { result } = renderHook(() => useTranslation())

    // Initial state (German)
    expect(result.current.t('auth.login')).toBe('Anmelden')

    // Change to English
    act(() => {
      useSettingsStore.getState().setLanguage('en')
    })

    expect(result.current.language).toBe('en')
    expect(result.current.t('auth.login')).toBe('Login')
  })

  it('should handle parameter substitution', () => {
    act(() => {
      useSettingsStore.getState().setLanguage('en')
    })

    const { result } = renderHook(() => useTranslation())

    const translated = result.current.t('auth.useBiometric', { biometricType: 'Face ID' })
    expect(translated).toBe('Use Face ID')
  })

  it('should work with all supported languages', () => {
    const { result } = renderHook(() => useTranslation())

    const languages = ['de', 'en', 'fr', 'it'] as const
    const expectedLoading = ['Laden...', 'Loading...', 'Chargement...', 'Caricamento...']

    languages.forEach((lang, index) => {
      act(() => {
        useSettingsStore.getState().setLanguage(lang)
      })

      expect(result.current.language).toBe(lang)
      expect(result.current.t('common.loading')).toBe(expectedLoading[index])
    })
  })
})
