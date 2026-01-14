/**
 * useTranslation hook - React hook for translations
 *
 * Provides access to translated strings based on the current language setting.
 */

import { useSettingsStore } from '../stores/settings';
import { locales } from './locales';
import type { TranslationKey, Language, Translations } from './types';

/**
 * Get a nested value from an object using dot notation.
 */
function getNestedValue(obj: Translations, path: string): string | undefined {
  const keys = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj;

  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }

  return typeof current === 'string' ? current : undefined;
}

export const useTranslation = () => {
  const language = useSettingsStore((state) => state.language);

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const translations = locales[language] || locales.en;
    let translation = getNestedValue(translations, key) || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{${paramKey}}`, String(paramValue));
      });
    }

    return translation;
  };

  return { t, language };
};

/**
 * Standalone translation function for non-React contexts.
 * Falls back to English if the specified language is not available.
 */
export function translate(
  key: TranslationKey,
  language: Language,
  params?: Record<string, string | number>
): string {
  const translations = locales[language] || locales.en;
  let translation = getNestedValue(translations, key) || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, String(paramValue));
    });
  }

  return translation;
}
