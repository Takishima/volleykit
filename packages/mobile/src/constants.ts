/**
 * Mobile app constants
 */

/**
 * Theme colors for the mobile app
 * These match the Tailwind CSS color palette
 */
export const COLORS = {
  // Primary colors
  primary: '#0ea5e9', // sky-500

  // Gray scale
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray900: '#111827',

  // Status colors
  green100: '#dcfce7',
  green500: '#22c55e',
  green700: '#15803d',
  blue100: '#dbeafe',
  blue700: '#1d4ed8',
  amber500: '#f59e0b',
  red500: '#ef4444',
} as const;

/** Icon size for navigation tabs */
export const TAB_ICON_SIZE = 24;

/** Standard icon size for settings rows */
export const SETTINGS_ICON_SIZE = 24;

/** Small icon size (chevrons, etc.) */
export const SMALL_ICON_SIZE = 20;

// === Biometric Authentication ===

/** Storage key for biometric enabled preference */
export const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

/** Maximum biometric authentication attempts before falling back to password */
export const MAX_BIOMETRIC_ATTEMPTS = 3;

/** Icon size for biometric prompt modal */
export const BIOMETRIC_ICON_SIZE = 64;

// === Calendar ===

/** Storage key for calendar settings */
export const CALENDAR_SETTINGS_KEY = 'calendar_settings';

// === API ===

/** Session token header name used by the Cloudflare Worker for iOS Safari PWA */
export const SESSION_TOKEN_HEADER = 'X-Session-Token';
