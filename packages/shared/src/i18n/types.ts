/**
 * Translation key types
 *
 * This will be extracted from web-app/src/i18n/types.ts
 * Placeholder for now - implementation in Phase 2
 */

export type Language = 'de' | 'en' | 'fr' | 'it';

export interface TranslationKeys {
  // Common
  'common.loading': string;
  'common.error': string;
  'common.retry': string;
  'common.cancel': string;
  'common.save': string;
  'common.delete': string;
  'common.confirm': string;
  'common.close': string;

  // Navigation
  'nav.assignments': string;
  'nav.compensations': string;
  'nav.exchanges': string;
  'nav.settings': string;

  // Assignments
  'assignments.title': string;
  'assignments.empty': string;
  'assignments.loading': string;

  // Smart Departure Reminder (US5)
  'departure.notification.title': string;
  'departure.notification.body': string;
  'departure.notification.noRoute': string;
  'departure.settings.title': string;
  'departure.settings.enable': string;
  'departure.settings.buffer': string;

  // Settings
  'settings.title': string;
  'settings.language': string;
  'settings.biometric': string;
  'settings.calendar': string;
  'settings.departure': string;
  'settings.about': string;
}

export type TranslationKey = keyof TranslationKeys;
