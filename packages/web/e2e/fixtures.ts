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
 * Suppress PWA notifications to prevent them from blocking UI interactions.
 *
 * The PWA "App ready for offline use" notification appears as a fixed overlay
 * that can intercept pointer events, causing test clicks to fail.
 *
 * This helper prevents the notification by mocking the service worker ready promise.
 */
export async function suppressPWANotifications(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      // Override the ready promise to prevent PWA notifications
      Object.defineProperty(navigator.serviceWorker, 'ready', {
        get: () => new Promise(() => {}), // Never resolves
      })
    }
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
   * Override the page fixture to pre-configure the browser environment.
   * This runs before each test and sets up:
   * - Disables tours to prevent navigation interference
   * - Suppresses PWA notifications to prevent click interception
   */
  page: async ({ page }, use) => {
    await disableTours(page)
    await suppressPWANotifications(page)
    await use(page)
  },
})

// Re-export expect for convenience
export { expect }
