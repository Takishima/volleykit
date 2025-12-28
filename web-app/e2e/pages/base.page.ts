import { type Page } from "@playwright/test";

/**
 * Base Page Object Model with shared utilities.
 * Provides common wait strategies used across all page objects.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for the page to reach a stable state.
   * This ensures React has finished rendering and all network requests are complete.
   * Use this after navigation, tab switches, or any action that triggers re-renders.
   */
  async waitForStableState() {
    await this.page.waitForLoadState("networkidle");
  }
}
