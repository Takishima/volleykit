import { type Page, type Locator, expect } from "@playwright/test";
import { TAB_SWITCH_TIMEOUT_MS } from "../constants";
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
  private readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.tablist = page.getByRole("tablist");
    // Use stable IDs for tabs (locale-independent)
    this.openTab = page.locator("#tab-open");
    this.myApplicationsTab = page.locator("#tab-applied");
    this.tabPanel = page.getByRole("tabpanel");
    this.exchangeCards = this.tabPanel.getByRole("button");
    // Use data-tour attribute to distinguish from distance filter checkbox
    this.levelFilterToggle = page.locator('[data-tour="exchange-filter"]');
    this.emptyState = page.getByTestId("empty-state");
  }

  async goto() {
    await this.page.goto("/exchange");
  }

  async expectToBeLoaded() {
    await expect(this.tablist).toBeVisible();
    await expect(this.openTab).toBeVisible();
  }

  async switchToOpenTab() {
    await this.openTab.click();
    await expect(this.openTab).toHaveAttribute("aria-selected", "true", {
      timeout: TAB_SWITCH_TIMEOUT_MS,
    });
    await expect(this.tabPanel).toBeVisible();
  }

  async switchToMyApplicationsTab() {
    await this.myApplicationsTab.click();
    await expect(this.myApplicationsTab).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
    await expect(this.tabPanel).toBeVisible();
  }

  async getExchangeCount(): Promise<number> {
    return await this.exchangeCards.count();
  }

  async isLevelFilterVisible(): Promise<boolean> {
    return (await this.levelFilterToggle.count()) > 0;
  }

  async waitForLevelFilterHidden() {
    await expect(this.levelFilterToggle).not.toBeVisible();
  }

  async waitForLevelFilterVisible() {
    await expect(this.levelFilterToggle).toBeVisible();
  }

  async waitForExchangesLoaded() {
    await expect(this.tabPanel).toBeVisible();
    await this.waitForContentReady(this.exchangeCards, this.emptyState);
  }
}
