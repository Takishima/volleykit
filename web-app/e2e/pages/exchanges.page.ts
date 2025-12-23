import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Exchanges page.
 * Provides helpers for interacting with exchange cards and filters.
 */
export class ExchangesPage {
  readonly page: Page;
  readonly tablist: Locator;
  readonly openTab: Locator;
  readonly myApplicationsTab: Locator;
  readonly tabPanel: Locator;
  readonly exchangeCards: Locator;
  readonly levelFilterToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tablist = page.getByRole("tablist");
    this.openTab = page.getByRole("tab", { name: /open/i });
    this.myApplicationsTab = page.getByRole("tab", {
      name: /my applications|applied/i,
    });
    this.tabPanel = page.getByRole("tabpanel");
    // Exchange cards are interactive buttons within the tabpanel
    this.exchangeCards = this.tabPanel.getByRole("button");
    // Level filter toggle checkbox
    this.levelFilterToggle = page.getByRole("checkbox");
  }

  async goto() {
    await this.page.goto("/exchange");
  }

  async expectToBeLoaded() {
    await expect(this.tablist).toBeVisible();
    await expect(this.openTab).toBeVisible();
  }

  async switchToOpenTab() {
    // Ensure tab is visible and interactable before clicking
    await this.openTab.waitFor({ state: "visible" });
    await this.openTab.click();
    // Wait for React state to update
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        return tab?.textContent?.toLowerCase().includes("open");
      },
      { timeout: 5000 },
    );
  }

  async switchToMyApplicationsTab() {
    // Ensure tab is visible and interactable before clicking
    await this.myApplicationsTab.waitFor({ state: "visible" });
    await this.myApplicationsTab.click();
    // Wait for React state to update
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        const text = tab?.textContent?.toLowerCase() ?? "";
        return text.includes("application") || text.includes("applied");
      },
      { timeout: 5000 },
    );
  }

  async getExchangeCount(): Promise<number> {
    return await this.exchangeCards.count();
  }

  async expectExchangesVisible() {
    await expect(this.exchangeCards.first()).toBeVisible();
  }

  async clickFirstExchange() {
    await this.exchangeCards.first().click();
  }

  /**
   * Get an exchange card by its text content.
   */
  getExchangeByText(text: string): Locator {
    return this.exchangeCards.filter({ hasText: text });
  }

  /**
   * Toggle the level filter (only visible in demo mode).
   */
  async toggleLevelFilter() {
    await this.levelFilterToggle.click();
  }

  /**
   * Check if level filter is available (demo mode only).
   */
  async isLevelFilterVisible(): Promise<boolean> {
    return (await this.levelFilterToggle.count()) > 0;
  }

  /**
   * Wait for exchanges to load.
   */
  async waitForExchangesLoaded() {
    // Wait for the tab panel to be visible
    await expect(this.tabPanel).toBeVisible({ timeout: 10000 });

    // Wait for loading state to finish if present
    const loadingIndicator = this.page.getByText(/loading/i).first();
    await loadingIndicator
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {
        // Loading may have already finished or not appeared
      });

    // Give a moment for content to render
    await this.page.waitForTimeout(500);
  }
}
