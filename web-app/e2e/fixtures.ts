/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixtures use 'use' callback, not React hooks */
import { test as base, expect, type Page } from '@playwright/test'

/**
 * Pre-complete all tours to prevent them from auto-starting.
 *
 * Tours auto-start in demo mode after 500ms and disable navigation
 * links while active, which causes E2E tests to fail when trying
 * to click disabled navigation elements.
 *
 * This helper can be used:
 * - Automatically via the `test` fixture for standard tests
 * - Manually via `disableTours(page)` for dynamically created pages
 */
export async function disableTours(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Zustand persist format for the tour store
    const tourState = {
      state: {
        completedTours: ['assignments', 'compensations', 'exchange', 'settings'],
        dismissedTours: [],
      },
      version: 0,
    }
    localStorage.setItem('volleykit-tour', JSON.stringify(tourState))
  })
}

/**
 * Custom test fixtures for E2E tests.
 *
 * This extends the base Playwright test with additional setup
 * that runs before each test.
 */
export const test = base.extend({
  /**
   * Override the page fixture to pre-configure localStorage.
   * This runs before each test and sets up the browser state.
   */
  page: async ({ page }, use) => {
    await disableTours(page)
    await use(page)
  },
})

// Re-export expect for convenience
export { expect }
