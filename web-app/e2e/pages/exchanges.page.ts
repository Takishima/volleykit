import { type Page, type Locator, expect } from "@playwright/test";
import {
  PAGE_LOAD_TIMEOUT_MS,
  TAB_SWITCH_TIMEOUT_MS,
  LOADING_TIMEOUT_MS,
} from "../constants";

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
    // Use stable IDs for tabs (locale-independent)
    this.openTab = page.locator('#tab-open');
    this.myApplicationsTab = page.locator('#tab-applied');
    this.tabPanel = page.getByRole("tabpanel");
    this.exchangeCards = this.tabPanel.getByRole("button");
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
    await expect(this.openTab).toBeVisible();
    await this.openTab.click();
    // Wait for tab to become selected using Playwright's built-in assertion
    await expect(this.openTab).toHaveAttribute("aria-selected", "true", {
      timeout: TAB_SWITCH_TIMEOUT_MS,
    });
    // Wait for tab panel content to stabilize
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
  }

  async switchToMyApplicationsTab() {
    await expect(this.myApplicationsTab).toBeVisible();
    await this.myApplicationsTab.click();
    // Wait for tab to become selected using Playwright's built-in assertion
    await expect(this.myApplicationsTab).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
    // Wait for tab panel content to stabilize
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
  }

  async getExchangeCount(): Promise<number> {
    return await this.exchangeCards.count();
  }

  async isLevelFilterVisible(): Promise<boolean> {
    return (await this.levelFilterToggle.count()) > 0;
  }

  async waitForLevelFilterHidden() {
    await this.levelFilterToggle.waitFor({ state: "detached", timeout: TAB_SWITCH_TIMEOUT_MS });
  }

  async waitForLevelFilterVisible() {
    await this.levelFilterToggle.waitFor({ state: "attached", timeout: TAB_SWITCH_TIMEOUT_MS });
  }

  async waitForExchangesLoaded() {
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
    await expect(this.exchangeCards.first().or(emptyState)).toBeVisible({
      timeout: LOADING_TIMEOUT_MS,
    });
  }
}
