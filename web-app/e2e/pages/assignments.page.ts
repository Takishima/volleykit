import { type Page, type Locator, expect } from "@playwright/test";
import {
  PAGE_LOAD_TIMEOUT_MS,
  TAB_SWITCH_TIMEOUT_MS,
  LOADING_TIMEOUT_MS,
} from "../constants";

/**
 * Page Object Model for the Assignments page.
 * Provides helpers for interacting with assignment cards and tabs.
 */
export class AssignmentsPage {
  readonly page: Page;
  readonly tablist: Locator;
  readonly upcomingTab: Locator;
  readonly validationClosedTab: Locator;
  readonly tabPanel: Locator;
  readonly assignmentCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tablist = page.getByRole("tablist");
    // Use stable IDs for tabs (locale-independent)
    this.upcomingTab = page.locator("#tab-upcoming");
    this.validationClosedTab = page.locator("#tab-validationClosed");
    this.tabPanel = page.getByRole("tabpanel");
    this.assignmentCards = this.tabPanel.getByRole("button");
  }

  async goto() {
    await this.page.goto("/");
  }

  async expectToBeLoaded() {
    await expect(this.tablist).toBeVisible();
    await expect(this.upcomingTab).toBeVisible();
    // Wait for network to be idle to ensure React has finished hydrating
    await this.page.waitForLoadState("networkidle");
  }

  async switchToUpcomingTab() {
    await expect(this.upcomingTab).toBeVisible();
    await this.upcomingTab.click();
    // Wait for tab to become selected using Playwright's built-in assertion
    await expect(this.upcomingTab).toHaveAttribute("aria-selected", "true", {
      timeout: TAB_SWITCH_TIMEOUT_MS,
    });
    // Wait for tab panel content to stabilize
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
    // Wait for network to be idle to ensure React has finished updating
    await this.page.waitForLoadState("networkidle");
  }

  async switchToValidationClosedTab() {
    await expect(this.validationClosedTab).toBeVisible();
    await this.validationClosedTab.click();
    // Wait for tab to become selected using Playwright's built-in assertion
    await expect(this.validationClosedTab).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
    // Wait for tab panel content to stabilize
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
    // Wait for network to be idle to ensure React has finished updating
    await this.page.waitForLoadState("networkidle");
  }

  async getAssignmentCount(): Promise<number> {
    return await this.assignmentCards.count();
  }

  async waitForAssignmentsLoaded() {
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
    await expect(this.assignmentCards.first().or(emptyState)).toBeVisible({
      timeout: LOADING_TIMEOUT_MS,
    });

    // Wait for network to be idle to ensure React has finished rendering
    await this.page.waitForLoadState("networkidle");
  }
}
