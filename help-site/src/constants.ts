/**
 * Site-wide constants for the help site
 */

/**
 * Base path for the help site on GitHub Pages
 * Uses Astro's import.meta.env.BASE_URL which is set from astro.config.mjs
 * This ensures the path is correct for both production and PR previews
 */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Timing constants */
export const TIMING = {
  /** Debounce delay for search input (ms) */
  SEARCH_DEBOUNCE_MS: 200,
  /** Animation duration for transitions (ms) */
  ANIMATION_DURATION_MS: 300,
} as const;

/** Maximum number of search results to display */
export const MAX_SEARCH_RESULTS = 10;

/** Device types for screenshots */
export const DEVICE_TYPES = ['desktop', 'phone', 'tablet'] as const;

/** Device type union */
export type DeviceType = (typeof DEVICE_TYPES)[number];

/** Screenshot file suffix for each device type */
export const DEVICE_SUFFIXES: Record<DeviceType, string> = {
  desktop: '-desktop',
  phone: '-phone',
  tablet: '-tablet',
} as const;
