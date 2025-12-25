/**
 * Shared constants for E2E tests.
 * Centralizes timing values to avoid magic numbers throughout tests.
 *
 * Note: Avoid hardcoded delay waits (waitForTimeout). Instead, use
 * Playwright's built-in auto-waiting via expect assertions and proper
 * element state checks. These timeout values are for explicit waitFor
 * calls when waiting for specific states.
 */

/** Timeout for page/component loading (ms) */
export const PAGE_LOAD_TIMEOUT_MS = 10000;

/** Timeout for tab state changes and React updates (ms) */
export const TAB_SWITCH_TIMEOUT_MS = 5000;

/** Timeout for loading indicators to disappear (ms) */
export const LOADING_TIMEOUT_MS = 5000;
