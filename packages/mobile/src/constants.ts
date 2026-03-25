/**
 * Mobile app constants
 */

import Constants from 'expo-constants'

/**
 * Theme colors for the mobile app
 * These match the Tailwind CSS color palette
 */
export const COLORS = {
  // Info color (used for interactive blue elements)
  primary: '#3b82f6', // info-500

  // Gray scale (cool slate tones)
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray900: '#0f172a',

  // Status colors (emerald success, amber warning, rose danger)
  success100: '#d1fae5',
  success500: '#10b981',
  success700: '#047857',
  info100: '#dbeafe',
  info500: '#3b82f6',
  info600: '#2563eb',
  info700: '#1d4ed8',
  warning500: '#f59e0b',
  warning600: '#d97706',
  danger500: '#f43f5e', // rose-500
  purple600: '#9333ea',
} as const

/** Icon size for navigation tabs */
export const TAB_ICON_SIZE = 24

/** Standard icon size for settings rows */
export const SETTINGS_ICON_SIZE = 24

/** Small icon size (chevrons, etc.) */
export const SMALL_ICON_SIZE = 20

// === Biometric Authentication ===

/** Storage key for biometric enabled preference */
export const BIOMETRIC_ENABLED_KEY = 'biometric_enabled'

/** Maximum biometric authentication attempts before falling back to password */
export const MAX_BIOMETRIC_ATTEMPTS = 3

/** Icon size for biometric prompt modal */
export const BIOMETRIC_ICON_SIZE = 64

// === Calendar ===

/** Storage key for calendar settings */
export const CALENDAR_SETTINGS_KEY = 'calendar_settings'

// === API ===

/**
 * API base URL for all requests.
 * Uses the CORS proxy configured in app.json extra settings.
 * Falls back to production proxy URL if not configured.
 */
export const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'https://proxy.volleykit.app'

/** Session token header name used by the Cloudflare Worker for iOS Safari PWA */
export const SESSION_TOKEN_HEADER = 'X-Session-Token'
