/**
 * Shared constants for E2E tests.
 * Centralizes timing values to avoid magic numbers throughout tests.
 */

/** Time to wait for UI animations to complete (ms) */
export const ANIMATION_DELAY_MS = 300;

/** Time to wait for content to render after loading (ms) */
export const CONTENT_RENDER_DELAY_MS = 500;

/** Timeout for page/component loading (ms) */
export const PAGE_LOAD_TIMEOUT_MS = 10000;

/** Timeout for tab state changes and React updates (ms) */
export const TAB_SWITCH_TIMEOUT_MS = 5000;

/** Timeout for loading indicators to disappear (ms) */
export const LOADING_TIMEOUT_MS = 5000;
