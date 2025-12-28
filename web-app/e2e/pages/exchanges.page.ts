import { type Page, type Locator, expect } from "@playwright/test";
import {
  PAGE_LOAD_TIMEOUT_MS,
  TAB_SWITCH_TIMEOUT_MS,
  LOADING_TIMEOUT_MS,
} from "../constants";
import { BasePage } from "./base.page";

/**
 * Page Object Model for the Exchanges page.
 * Provides helpers for interacting with exchange cards and filters.
 */
export class ExchangesPage extends BasePage {
  readonly tablist: Locator;
  readonly openTab: Locator;
  readonly myApplicationsTab: Locator;
  readonly tabPanel: Locator;
  readonly exchangeCards: Locator;
  readonly levelFilterToggle: Locator;

  constructor(page: Page) {
    super(page);
    this.tablist = page.getByRole("tablist");
    // Use stable IDs for tabs (locale-independent)
    this.openTab = page.locator('#tab-open');
    this.myApplicationsTab = page.locator('#tab-applied');
    this.tabPanel = page.getByRole("tabpanel");
    this.exchangeCards = this.tabPanel.getByRole("button");
    // Use data-tour attribute to distinguish from distance filter checkbox
    this.levelFilterToggle = page.locator('[data-tour="exchange-filter"]');
  }

  async goto() {
    await this.page.goto("/exchange");
  }

  async expectToBeLoaded() {
    await expect(this.tablist).toBeVisible();
    await expect(this.openTab).toBeVisible();
    await this.waitForStableState();
  }

  async switchToOpenTab() {
    await expect(this.openTab).toBeVisible();
    await this.openTab.click();
    await expect(this.openTab).toHaveAttribute("aria-selected", "true", {
      timeout: TAB_SWITCH_TIMEOUT_MS,
    });
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
    await this.waitForStableState();
  }

  async switchToMyApplicationsTab() {
    await expect(this.myApplicationsTab).toBeVisible();
    await this.myApplicationsTab.click();
    await expect(this.myApplicationsTab).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
    await this.waitForStableState();
  }

  async getExchangeCount(): Promise<number> {
    return await this.exchangeCards.count();
  }

  async isLevelFilterVisible(): Promise<boolean> {
    return (await this.levelFilterToggle.count()) > 0;
  }

  async waitForLevelFilterHidden() {
    // Use expect with negation for more robust waiting
    await expect(this.levelFilterToggle).not.toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
  }

  async waitForLevelFilterVisible() {
    // Use expect for more robust waiting than waitFor
    await expect(this.levelFilterToggle).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
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

    await this.waitForStableState();
  }
}
