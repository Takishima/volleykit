import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object Model for the Compensations page.
 * Provides helpers for interacting with compensation cards and filters.
 */
export class CompensationsPage extends BasePage {
  readonly tablist: Locator;
  readonly pendingPastTab: Locator;
  readonly pendingFutureTab: Locator;
  readonly closedTab: Locator;
  readonly allTab: Locator;
  readonly tabPanel: Locator;
  readonly compensationCards: Locator;
  private readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.tablist = page.getByRole("tablist");
    // Use stable IDs for tabs (locale-independent)
    this.pendingPastTab = page.locator("#tab-pendingPast");
    this.pendingFutureTab = page.locator("#tab-pendingFuture");
    this.closedTab = page.locator("#tab-closed");
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

  async switchToPendingPastTab() {
    await this.pendingPastTab.click();
    await expect(this.pendingPastTab).toHaveAttribute("aria-selected", "true");
    await expect(this.tabPanel).toBeVisible();
  }

  async switchToPendingFutureTab() {
    await this.pendingFutureTab.click();
    await expect(this.pendingFutureTab).toHaveAttribute("aria-selected", "true");
    await expect(this.tabPanel).toBeVisible();
  }

  async switchToClosedTab() {
    await this.closedTab.click();
    await expect(this.closedTab).toHaveAttribute("aria-selected", "true");
    await expect(this.tabPanel).toBeVisible();
  }

  async switchToAllTab() {
    await this.allTab.click();
    await expect(this.allTab).toHaveAttribute("aria-selected", "true");
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
