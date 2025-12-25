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
  }

  async switchToUpcomingTab() {
    await this.upcomingTab.waitFor({ state: "visible" });
    await this.upcomingTab.click();
    // Wait for the "upcoming" tab to become selected using its stable ID (locale-independent)
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector("#tab-upcoming");
        return tab?.getAttribute("aria-selected") === "true";
      },
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
    // Wait for tab panel content to stabilize
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
  }

  async switchToValidationClosedTab() {
    await this.validationClosedTab.waitFor({ state: "visible" });
    await this.validationClosedTab.click();
    // Wait for the "validationClosed" tab to become selected using its stable ID (locale-independent)
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector("#tab-validationClosed");
        return tab?.getAttribute("aria-selected") === "true";
      },
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
    // Wait for tab panel content to stabilize
    await expect(this.tabPanel).toBeVisible({ timeout: TAB_SWITCH_TIMEOUT_MS });
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
  }
}
