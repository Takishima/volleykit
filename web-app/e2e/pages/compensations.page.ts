import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Compensations page.
 * Provides helpers for interacting with compensation cards and filters.
 */
export class CompensationsPage {
  readonly page: Page;
  readonly tablist: Locator;
  readonly pendingTab: Locator;
  readonly paidTab: Locator;
  readonly allTab: Locator;
  readonly tabPanel: Locator;
  readonly compensationCards: Locator;
  readonly pendingTotal: Locator;
  readonly paidTotal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tablist = page.getByRole("tablist");
    this.pendingTab = page.getByRole("tab", { name: /pending|unpaid/i });
    this.paidTab = page.getByRole("tab", { name: /paid/i });
    this.allTab = page.getByRole("tab", { name: /all/i });
    this.tabPanel = page.getByRole("tabpanel");
    // Compensation cards are interactive buttons within the tabpanel
    this.compensationCards = this.tabPanel.getByRole("button");
    // Totals display - look for CHF amounts
    this.pendingTotal = page.locator("text=/CHF.*\\d/").first();
    this.paidTotal = page.locator("text=/CHF.*\\d/").last();
  }

  async goto() {
    await this.page.goto("/compensations");
  }

  async expectToBeLoaded() {
    await expect(this.tablist).toBeVisible();
  }

  async switchToPendingTab() {
    await this.pendingTab.waitFor({ state: "visible" });
    await this.pendingTab.click();
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        const text = tab?.textContent?.toLowerCase() ?? "";
        return text.includes("pending") || text.includes("unpaid");
      },
      { timeout: 5000 },
    );
  }

  async switchToPaidTab() {
    await this.paidTab.waitFor({ state: "visible" });
    await this.paidTab.click();
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        return tab?.textContent?.toLowerCase().includes("paid");
      },
      { timeout: 5000 },
    );
  }

  async switchToAllTab() {
    await this.allTab.waitFor({ state: "visible" });
    await this.allTab.click();
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        return tab?.textContent?.toLowerCase().includes("all");
      },
      { timeout: 5000 },
    );
  }

  async getCompensationCount(): Promise<number> {
    return await this.compensationCards.count();
  }

  async expectCompensationsVisible() {
    await expect(this.compensationCards.first()).toBeVisible();
  }

  async clickFirstCompensation() {
    await this.compensationCards.first().click();
  }

  /**
   * Get a compensation card by its text content.
   */
  getCompensationByText(text: string): Locator {
    return this.compensationCards.filter({ hasText: text });
  }

  /**
   * Wait for compensations to load.
   */
  async waitForCompensationsLoaded() {
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

  /**
   * Verify totals are displayed with CHF currency.
   */
  async expectTotalsVisible() {
    await expect(this.page.getByText(/CHF/)).toBeVisible();
  }
}
