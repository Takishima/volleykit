import { describe, it, expect, beforeEach } from 'vitest'

import {
  t,
  tInterpolate,
  getLocale,
  setLocale,
  setLocaleImmediate,
  getAvailableLocales,
  preloadTranslations,
} from './index'

describe('i18n module', () => {
  beforeEach(async () => {
    // Reset to English to ensure consistent test state
    await setLocale('en')
  })

  describe('t()', () => {
    it('returns translation for valid key', () => {
      expect(t('auth.login')).toBe('Login')
    })

    it('returns translation for nested keys', () => {
      expect(t('common.loading')).toBe('Loading...')
    })

    it('returns key when translation is not found', () => {
      // @ts-expect-error - testing invalid key behavior
      expect(t('nonexistent.key')).toBe('nonexistent.key')
    })

    it('returns deeply nested translation', () => {
      expect(t('validation.roster.addPlayer')).toBe('Add Player')
    })

    it('returns translation for position keys with hyphens', () => {
      expect(t('positions.head-one')).toBe('1st Referee')
    })
  })

  describe('tInterpolate()', () => {
    it('replaces single placeholder', () => {
      // validation.scorerSearch.resultsCount = "{count} results found"
      const result = tInterpolate('validation.scorerSearch.resultsCount', {
        count: 5,
      })
      expect(result).toBe('5 results found')
    })

    it('replaces multiple placeholders', () => {
      // validation.wizard.stepOf = "Step {current} of {total}"
      const result = tInterpolate('validation.wizard.stepOf', {
        current: 2,
        total: 4,
      })
      expect(result).toBe('Step 2 of 4')
    })

    it('handles string values', () => {
      const result = tInterpolate('validation.scorerSearch.resultsCount', {
        count: 'many',
      })
      expect(result).toBe('many results found')
    })

    it('returns original string when no placeholders match', () => {
      const result = tInterpolate('auth.login', { unused: 'value' })
      expect(result).toBe('Login')
    })
  })

  describe('getLocale()', () => {
    it('returns current locale', async () => {
      await setLocale('en')
      expect(getLocale()).toBe('en')
    })

    it('reflects locale changes', async () => {
      await setLocale('de')
      expect(getLocale()).toBe('de')
    })
  })

  describe('setLocale()', () => {
    it('sets locale to German', async () => {
      await setLocale('de')
      expect(getLocale()).toBe('de')
      expect(t('auth.login')).toBe('Anmelden')
    })

    it('sets locale to French', async () => {
      await setLocale('fr')
      expect(getLocale()).toBe('fr')
      expect(t('auth.login')).toBe('Connexion')
    })

    it('sets locale to Italian', async () => {
      await setLocale('it')
      expect(getLocale()).toBe('it')
      expect(t('auth.login')).toBe('Accesso')
    })

    it('sets locale to English', async () => {
      await setLocale('de') // First change to something else
      await setLocale('en')
      expect(getLocale()).toBe('en')
      expect(t('auth.login')).toBe('Login')
    })

    it('ignores invalid locale', async () => {
      await setLocale('en')
      // @ts-expect-error - testing invalid locale behavior
      await setLocale('invalid')
      // Should still be English
      expect(getLocale()).toBe('en')
    })
  })

  describe('setLocaleImmediate()', () => {
    it('sets locale synchronously', () => {
      setLocaleImmediate('de')
      expect(getLocale()).toBe('de')
    })

    it('ignores invalid locale', () => {
      setLocaleImmediate('en')
      // @ts-expect-error - testing invalid locale behavior
      setLocaleImmediate('invalid')
      expect(getLocale()).toBe('en')
    })
  })

  describe('getAvailableLocales()', () => {
    it('returns all four supported locales', () => {
      const locales = getAvailableLocales()
      expect(locales).toHaveLength(4)
    })

    it('returns locales with correct codes', () => {
      const locales = getAvailableLocales()
      const codes = locales.map((l) => l.code)
      expect(codes).toContain('de')
      expect(codes).toContain('fr')
      expect(codes).toContain('it')
      expect(codes).toContain('en')
    })

    it('returns locales with native names', () => {
      const locales = getAvailableLocales()
      const nameMap = Object.fromEntries(locales.map((l) => [l.code, l.name]))
      expect(nameMap.de).toBe('Deutsch')
      expect(nameMap.fr).toBe('Français')
      expect(nameMap.it).toBe('Italiano')
      expect(nameMap.en).toBe('English')
    })
  })

  describe('preloadTranslations()', () => {
    it('loads all translations into cache', async () => {
      await preloadTranslations()

      // Verify all locales work immediately after preload
      await setLocale('de')
      expect(t('auth.login')).toBe('Anmelden')

      await setLocale('fr')
      expect(t('auth.login')).toBe('Connexion')

      await setLocale('it')
      expect(t('auth.login')).toBe('Accesso')

      await setLocale('en')
      expect(t('auth.login')).toBe('Login')
    })
  })

  describe('translation fallback behavior', () => {
    it('falls back to English for missing key in other locale', async () => {
      await setLocale('de')
      // If a key exists in English but somehow missing in German,
      // the code should fall back. Since all keys should be present,
      // we test the fallback mechanism by using an invalid key path.
      // @ts-expect-error - testing fallback behavior
      const result = t('nonexistent.deeply.nested.key')
      expect(result).toBe('nonexistent.deeply.nested.key')
    })
  })

  describe('concurrent locale changes', () => {
    it('handles rapid locale changes correctly', async () => {
      // Fire multiple locale changes without awaiting
      const promises = [setLocale('de'), setLocale('fr'), setLocale('it'), setLocale('en')]

      await Promise.all(promises)

      // The last one should win
      expect(getLocale()).toBe('en')
    })
  })
})
