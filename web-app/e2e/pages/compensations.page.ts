import { type Page, type Locator, expect } from "@playwright/test";
import {
  PAGE_LOAD_TIMEOUT_MS,
  TAB_SWITCH_TIMEOUT_MS,
  LOADING_TIMEOUT_MS,
} from "../constants";
import { BasePage } from "./base.page";

/**
 * Page Object Model for the Compensations page.
 * Provides helpers for interacting with compensation cards and filters.
 */
export class CompensationsPage extends BasePage {
  readonly tablist: Locator;
  readonly pendingTab: Locator;
  readonly paidTab: Locator;
  readonly allTab: Locator;
  readonly tabPanel: Locator;
  readonly compensationCards: Locator;

  constructor(page: Page) {
    super(page);
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
    await this.waitForStableState();
  }

  async switchToPendingTab() {
    await expect(this.pendingTab).toBeVisible();
    await this.pendingTab.click();
    await expect(this.pendingTab).toHaveAttribute("aria-selected", "true", {
      timeout: TAB_SWITCH_TIMEOUT_MS,
    });
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
    await this.waitForStableState();
  }

  async switchToPaidTab() {
    await expect(this.paidTab).toBeVisible();
    await this.paidTab.click();
    await expect(this.paidTab).toHaveAttribute("aria-selected", "true", {
      timeout: TAB_SWITCH_TIMEOUT_MS,
    });
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
    await this.waitForStableState();
  }

  async switchToAllTab() {
    await expect(this.allTab).toBeVisible();
    await this.allTab.click();
    await expect(this.allTab).toHaveAttribute("aria-selected", "true", {
      timeout: TAB_SWITCH_TIMEOUT_MS,
    });
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
    await this.waitForStableState();
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

    await this.waitForStableState();
  }
}
