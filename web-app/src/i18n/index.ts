/**
 * Internationalization (i18n) module for VolleyKit.
 *
 * Supports Swiss national languages: German (de), French (fr), Italian (it).
 * English is used as the fallback language.
 *
 * Usage:
 *   import { t, setLocale, getLocale } from '@/i18n';
 *   const label = t('assignments.title');
 */

import { logger } from '@/shared/utils/logger'

import en from './locales/en'

import type { Translations } from './types'

export type { Translations }
export type Locale = 'de' | 'fr' | 'it' | 'en'

/**
 * In-memory cache for translations (max 4 entries: de, fr, it, en).
 * English is pre-cached to prevent FOUC (Flash of Unstyled Content).
 */
const translationCache = new Map<Locale, Translations>()
translationCache.set('en', en)

let currentLocale: Locale = 'en'
let currentTranslations: Translations = en
let localeRequestId = 0

const localeLoaders: Record<Locale, () => Promise<Translations>> = {
  en: () => Promise.resolve(en),
  de: () => import('./locales/de').then((m) => m.default),
  fr: () => import('./locales/fr').then((m) => m.default),
  it: () => import('./locales/it').then((m) => m.default),
}

async function loadTranslations(locale: Locale): Promise<Translations> {
  const cached = translationCache.get(locale)
  if (cached) return cached

  try {
    const translations = await localeLoaders[locale]()
    translationCache.set(locale, translations)
    return translations
  } catch (error) {
    logger.error('[i18n] Failed to load translations, falling back to English:', error)
    return en
  }
}

/**
 * Preload all translations. Useful for testing.
 */
export async function preloadTranslations(): Promise<void> {
  await Promise.all(
    (Object.keys(localeLoaders) as Locale[]).map(async (locale) => {
      const translations = await loadTranslations(locale)
      if (locale === currentLocale) {
        currentTranslations = translations
      }
    })
  )
}

/**
 * Detect user's preferred locale from browser settings.
 * Defaults to German if a Swiss German locale is detected.
 */
function detectLocale(): Locale {
  const browserLang = navigator.language.toLowerCase()

  // gsw = Swiss German dialect
  if (browserLang.startsWith('de') || browserLang === 'gsw') return 'de'
  if (browserLang.startsWith('fr')) return 'fr'
  if (browserLang.startsWith('it')) return 'it'

  return 'en'
}

/**
 * Initialize locale from stored preference or browser detection.
 * Note: Persistence is handled by the language store, this just detects the initial locale.
 * Uses request ID to prevent race conditions if locale changes during initialization.
 */
export function initLocale(): Locale {
  const detectedLocale = detectLocale()
  const requestId = ++localeRequestId
  currentLocale = detectedLocale
  loadTranslations(detectedLocale)
    .then((translations) => {
      if (requestId === localeRequestId) {
        currentTranslations = translations
      }
    })
    .catch((error) => {
      logger.error('[i18n] Failed to load initial translations:', error)
    })
  return detectedLocale
}

/**
 * Get current locale.
 */
export function getLocale(): Locale {
  return currentLocale
}

/**
 * Set locale and load translations.
 * Note: Persistence is handled by the language store.
 * Returns a promise that resolves when translations are loaded.
 * If translations are cached, they're set immediately before the promise returns.
 * Uses request ID to prevent race conditions during rapid locale changes.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (localeLoaders[locale]) {
    const requestId = ++localeRequestId
    currentLocale = locale
    const cached = translationCache.get(locale)
    if (cached) {
      currentTranslations = cached
    } else {
      try {
        const translations = await loadTranslations(locale)
        if (requestId === localeRequestId) {
          currentTranslations = translations
        }
      } catch (error) {
        logger.error('[i18n] Failed to set locale:', error)
        // Fall back to English if locale loading fails
        currentTranslations = en
      }
    }
  }
}

/**
 * Set locale immediately without waiting for translations to load.
 * Use this for store hydration where we need to set locale before async operations complete.
 * If translations are cached, they're applied immediately. Otherwise, they load in the background.
 * Uses request ID to prevent race conditions during rapid locale changes.
 */
export function setLocaleImmediate(locale: Locale): void {
  if (localeLoaders[locale]) {
    const requestId = ++localeRequestId
    currentLocale = locale
    const cached = translationCache.get(locale)
    if (cached) {
      currentTranslations = cached
    } else {
      loadTranslations(locale)
        .then((translations) => {
          if (requestId === localeRequestId) {
            currentTranslations = translations
          }
        })
        .catch((error) => {
          logger.error('[i18n] Failed to load translations:', error)
        })
    }
  }
}

/**
 * Get available locales with their native names.
 */
export function getAvailableLocales(): Array<{ code: Locale; name: string }> {
  return [
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
    { code: 'en', name: 'English' },
  ]
}

type PathKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? PathKeys<T[K], `${Prefix}${Prefix extends '' ? '' : '.'}${K}`>
          : `${Prefix}${Prefix extends '' ? '' : '.'}${K}`
        : never
    }[keyof T]
  : never

export type TranslationKey = PathKeys<Translations>

/**
 * Get translation by dot-notation key.
 * Falls back to English if key not found in current locale.
 *
 * @example t('auth.login') // Returns "Login" or "Anmelden" depending on locale
 */
export function t(key: TranslationKey): string {
  const keys = key.split('.')
  let result: unknown = currentTranslations

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k]
    } else {
      result = en
      for (const fallbackKey of keys) {
        if (result && typeof result === 'object' && fallbackKey in result) {
          result = (result as Record<string, unknown>)[fallbackKey]
        } else {
          return key
        }
      }
      break
    }
  }

  return typeof result === 'string' ? result : key
}

export type TranslationFunction = typeof t

/**
 * Get translation with interpolation support.
 * Replaces {placeholder} patterns in the translated string with provided values.
 *
 * @example
 * // Translation: "Found {count} results"
 * tInterpolate('search.results', { count: 5 }) // Returns "Found 5 results"
 */
export function tInterpolate(key: TranslationKey, values: Record<string, string | number>): string {
  let result = t(key)
  for (const [placeholder, value] of Object.entries(values)) {
    result = result.replace(`{${placeholder}}`, String(value))
  }
  return result
}

initLocale()
