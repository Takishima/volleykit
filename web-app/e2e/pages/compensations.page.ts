import { type Page, type Locator, expect } from "@playwright/test";
import {
  PAGE_LOAD_TIMEOUT_MS,
  TAB_SWITCH_TIMEOUT_MS,
  LOADING_TIMEOUT_MS,
  CONTENT_RENDER_DELAY_MS,
} from "../constants";

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

  constructor(page: Page) {
    this.page = page;
    this.tablist = page.getByRole("tablist");
    this.pendingTab = page.getByRole("tab", { name: /pending|unpaid/i });
    this.paidTab = page.getByRole("tab", { name: /paid/i });
    this.allTab = page.getByRole("tab", { name: /all/i });
    this.tabPanel = page.getByRole("tabpanel");
    this.compensationCards = this.tabPanel.getByRole("button");
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
      { timeout: TAB_SWITCH_TIMEOUT_MS },
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
      { timeout: TAB_SWITCH_TIMEOUT_MS },
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
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
  }

  async getCompensationCount(): Promise<number> {
    return await this.compensationCards.count();
  }

  async waitForCompensationsLoaded() {
    await expect(this.tabPanel).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT_MS });

    const loadingIndicator = this.page.getByText(/loading/i).first();
    await loadingIndicator
      .waitFor({ state: "hidden", timeout: LOADING_TIMEOUT_MS })
      .catch(() => {
        // Loading may have already finished or not appeared
      });

    await this.page.waitForTimeout(CONTENT_RENDER_DELAY_MS);
  }
}
