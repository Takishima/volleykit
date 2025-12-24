import { type Page, type Locator, expect } from "@playwright/test";
import {
  PAGE_LOAD_TIMEOUT_MS,
  TAB_SWITCH_TIMEOUT_MS,
  LOADING_TIMEOUT_MS,
  CONTENT_RENDER_DELAY_MS,
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
    await this.openTab.waitFor({ state: "visible" });
    await this.openTab.click();
    // Wait for the "open" tab to become selected using its stable ID (locale-independent)
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector('#tab-open');
        return tab?.getAttribute("aria-selected") === "true";
      },
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
  }

  async switchToMyApplicationsTab() {
    await this.myApplicationsTab.waitFor({ state: "visible" });
    await this.myApplicationsTab.click();
    // Wait for the "applied" tab to become selected using its stable ID (locale-independent)
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector('#tab-applied');
        return tab?.getAttribute("aria-selected") === "true";
      },
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
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

    const loadingIndicator = this.page.getByText(/loading/i).first();
    await loadingIndicator
      .waitFor({ state: "hidden", timeout: LOADING_TIMEOUT_MS })
      .catch(() => {
        // Loading may have already finished or not appeared
      });

    await this.page.waitForTimeout(CONTENT_RENDER_DELAY_MS);
  }
}
