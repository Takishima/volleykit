import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Base Page Object Model with shared utilities.
 * Provides common wait strategies used across all page objects.
 *
 * PHILOSOPHY: Prefer element-based waits over time-based waits.
 * Playwright auto-waits for elements, so explicit waits are rarely needed.
 * We rely on the Playwright config's expect.timeout (10s) rather than
 * hardcoded timeouts, which accommodates slower browsers like Firefox.
 */
export class BasePage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Wait for any loading indicators to disappear and content to be ready.
   * This is more reliable than networkidle for demo mode where there's no real network.
   * Uses Playwright's configured expect.timeout for browser compatibility.
   */
  protected async waitForContentReady(contentLocator: Locator, emptyStateLocator?: Locator) {
    // Wait for loading indicator to disappear (if present)
    const loadingIndicator = this.page.getByTestId('loading-state')
    await loadingIndicator.waitFor({ state: 'hidden' })

    // Wait for content or empty state to be visible
    if (emptyStateLocator) {
      await expect(contentLocator.first().or(emptyStateLocator)).toBeVisible()
    } else {
      await expect(contentLocator.first()).toBeVisible()
    }
  }
}
