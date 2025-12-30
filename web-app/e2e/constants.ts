/**
 * Shared constants for E2E tests.
 *
 * PHILOSOPHY: Prefer element-based waits over time-based waits.
 * These timeouts are only fallbacks for maximum wait times, not delays.
 * Playwright's auto-waiting handles most cases automatically.
 */

/** Maximum timeout for page/component loading (ms) - fallback only */
export const PAGE_LOAD_TIMEOUT_MS = 5000;

/** Maximum timeout for tab state changes (ms) - fallback only */
export const TAB_SWITCH_TIMEOUT_MS = 2000;

/** Maximum timeout for loading indicators to disappear (ms) - fallback only */
export const LOADING_TIMEOUT_MS = 2000;
