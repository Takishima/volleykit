import { type Page, type Locator, expect } from "@playwright/test";
import {
  PAGE_LOAD_TIMEOUT_MS,
  TAB_SWITCH_TIMEOUT_MS,
  LOADING_TIMEOUT_MS,
  CONTENT_RENDER_DELAY_MS,
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
    this.upcomingTab = page.getByRole("tab", { name: /upcoming/i });
    this.validationClosedTab = page.getByRole("tab", {
      name: /validation/i,
    });
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
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        return tab?.textContent?.toLowerCase().includes("upcoming");
      },
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
  }

  async switchToValidationClosedTab() {
    await this.validationClosedTab.waitFor({ state: "visible" });
    await this.validationClosedTab.click();
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        return tab?.textContent?.toLowerCase().includes("validation");
      },
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
  }

  async getAssignmentCount(): Promise<number> {
    return await this.assignmentCards.count();
  }

  async waitForAssignmentsLoaded() {
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
