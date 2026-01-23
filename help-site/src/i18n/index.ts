import { en } from './en'
import { de } from './de'
import { fr } from './fr'
import { it } from './it'
import { defaultLanguage, type Language, type TranslationKeys } from './types'

export { type Language, type TranslationKeys, languages, defaultLanguage } from './types'

const translations: Record<Language, TranslationKeys> = {
  en,
  de,
  fr,
  it,
}

/**
 * Get a nested value from an object using a dot-separated path
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Get the current language from URL parameter, localStorage, or browser settings
 * Priority: URL param > localStorage > browser language > default
 * Falls back to default language if not found
 */
export function getLanguage(): Language {
  if (typeof window === 'undefined') {
    return defaultLanguage
  }

  // Check URL parameter first (allows main app to pass language)
  const urlParams = new URLSearchParams(window.location.search)
  const urlLang = urlParams.get('lang')
  if (urlLang && isValidLanguage(urlLang)) {
    // Persist the URL language to localStorage for subsequent page loads
    localStorage.setItem('help-site-language', urlLang)
    return urlLang
  }

  // Check localStorage second
  const stored = localStorage.getItem('help-site-language')
  if (stored && isValidLanguage(stored)) {
    return stored
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0]
  if (isValidLanguage(browserLang)) {
    return browserLang
  }

  return defaultLanguage
}

/**
 * Set the current language and persist to localStorage
 */
export function setLanguage(lang: Language): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('help-site-language', lang)
  // Dispatch event for components to react to language change
  window.dispatchEvent(new CustomEvent('language-change', { detail: { language: lang } }))
}

/**
 * Check if a string is a valid language code
 */
export function isValidLanguage(lang: string): lang is Language {
  return lang === 'en' || lang === 'de' || lang === 'fr' || lang === 'it'
}

/**
 * Translate a key to the current language
 * Supports dot notation for nested keys (e.g., 'nav.home')
 * Supports variable interpolation with {variable} syntax
 *
 * @param key - The translation key (dot notation)
 * @param variables - Optional variables to interpolate
 * @param lang - Optional language override (defaults to current language)
 * @returns The translated string, or the key if not found
 */
export function t(
  key: string,
  variables?: Record<string, string | number>,
  lang?: Language
): string {
  const language = lang ?? getLanguage()
  const translation = getNestedValue(translations[language], key)

  if (translation === undefined) {
    // Fallback to English if translation not found
    const fallback = getNestedValue(translations.en, key)
    if (fallback === undefined) {
      console.warn(`Translation key not found: ${key}`)
      return key
    }
    return interpolate(fallback, variables)
  }

  return interpolate(translation, variables)
}

/**
 * Interpolate variables into a translation string
 * Replaces {variable} with the corresponding value
 */
function interpolate(text: string, variables?: Record<string, string | number>): string {
  if (!variables) return text

  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key]?.toString() ?? match
  })
}

/**
 * Get all translations for the current language
 * Useful for passing to client-side scripts
 */
export function getTranslations(lang?: Language): TranslationKeys {
  return translations[lang ?? getLanguage()]
}

/**
 * Type-safe translation function for use in Astro components
 * Use this in the frontmatter of .astro files
 */
export function createTranslator(lang: Language = defaultLanguage) {
  return {
    t: (key: string, variables?: Record<string, string | number>) => t(key, variables, lang),
    language: lang,
    translations: translations[lang],
  }
}
