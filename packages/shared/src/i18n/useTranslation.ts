/**
 * useTranslation hook - React hook for translations
 *
 * This will be extracted from web-app/src/shared/hooks/useTranslation.ts
 * Placeholder for now - implementation in Phase 2
 */

import { useSettingsStore } from '../stores/settings';
import type { TranslationKey, Language } from './types';

// Placeholder translations - will be populated from locale files in Phase 2
const translations: Record<Language, Record<string, string>> = {
  de: {},
  en: {},
  fr: {},
  it: {},
};

export const useTranslation = () => {
  const language = useSettingsStore((state) => state.language);

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let translation = translations[language][key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{{${paramKey}}}`, String(paramValue));
      });
    }

    return translation;
  };

  return { t, language };
};
