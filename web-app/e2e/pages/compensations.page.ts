import { type Page, type Locator, expect } from "@playwright/test";
import { TAB_SWITCH_TIMEOUT_MS } from "../constants";
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
  private readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.tablist = page.getByRole("tablist");
    // Use stable IDs for tabs (locale-independent)
    this.pendingTab = page.locator("#tab-unpaid");
    this.paidTab = page.locator("#tab-paid");
    this.allTab = page.locator("#tab-all");
    this.tabPanel = page.getByRole("tabpanel");
    this.compensationCards = this.tabPanel.getByRole("button");
    this.emptyState = page.getByTestId("empty-state");
  }

  async goto() {
    await this.page.goto("/compensations");
  }

  async expectToBeLoaded() {
    await expect(this.tablist).toBeVisible();
  }

  async switchToPendingTab() {
    await this.pendingTab.click();
    await expect(this.pendingTab).toHaveAttribute("aria-selected", "true", {
      timeout: TAB_SWITCH_TIMEOUT_MS,
    });
    await expect(this.tabPanel).toBeVisible();
  }

  async switchToPaidTab() {
    await this.paidTab.click();
    await expect(this.paidTab).toHaveAttribute("aria-selected", "true", {
      timeout: TAB_SWITCH_TIMEOUT_MS,
    });
    await expect(this.tabPanel).toBeVisible();
  }

  async switchToAllTab() {
    await this.allTab.click();
    await expect(this.allTab).toHaveAttribute("aria-selected", "true", {
      timeout: TAB_SWITCH_TIMEOUT_MS,
    });
    await expect(this.tabPanel).toBeVisible();
  }

  async getCompensationCount(): Promise<number> {
    return await this.compensationCards.count();
  }

  async waitForCompensationsLoaded() {
    await expect(this.tabPanel).toBeVisible();
    await this.waitForContentReady(this.compensationCards, this.emptyState);
  }
}
