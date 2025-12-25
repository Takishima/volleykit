import { type Page, type Locator, expect } from "@playwright/test";
import {
  PAGE_LOAD_TIMEOUT_MS,
  TAB_SWITCH_TIMEOUT_MS,
  LOADING_TIMEOUT_MS,
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
    // Use stable IDs for tabs (locale-independent)
    this.pendingTab = page.locator("#tab-unpaid");
    this.paidTab = page.locator("#tab-paid");
    this.allTab = page.locator("#tab-all");
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
    // Wait for the "unpaid" tab to become selected using its stable ID (locale-independent)
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector("#tab-unpaid");
        return tab?.getAttribute("aria-selected") === "true";
      },
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
    // Wait for tab panel content to stabilize
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
  }

  async switchToPaidTab() {
    await this.paidTab.waitFor({ state: "visible" });
    await this.paidTab.click();
    // Wait for the "paid" tab to become selected using its stable ID (locale-independent)
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector("#tab-paid");
        return tab?.getAttribute("aria-selected") === "true";
      },
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
    // Wait for tab panel content to stabilize
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
  }

  async switchToAllTab() {
    await this.allTab.waitFor({ state: "visible" });
    await this.allTab.click();
    // Wait for the "all" tab to become selected using its stable ID (locale-independent)
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector("#tab-all");
        return tab?.getAttribute("aria-selected") === "true";
      },
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
    // Wait for tab panel content to stabilize
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
  }

  async getCompensationCount(): Promise<number> {
    return await this.compensationCards.count();
  }

  async waitForCompensationsLoaded() {
    await expect(this.tabPanel).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT_MS });

    // Wait for loading indicator to disappear (if it appears)
    const loadingIndicator = this.page.getByTestId("loading-state");
    const isLoadingVisible = await loadingIndicator.isVisible();
    if (isLoadingVisible) {
      await loadingIndicator.waitFor({
        state: "hidden",
        timeout: LOADING_TIMEOUT_MS,
      });
    }

    // Wait for actual content: either cards are present or empty state is shown
    const emptyState = this.page.getByTestId("empty-state");
    await expect(this.compensationCards.first().or(emptyState)).toBeVisible({
      timeout: LOADING_TIMEOUT_MS,
    });
  }
}
