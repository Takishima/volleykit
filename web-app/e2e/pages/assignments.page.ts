import { type Page, type Locator, expect } from "@playwright/test";

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
    // Assignment cards are interactive buttons within the tabpanel
    // They're wrapped in SwipeableCard which contains Card with role="button"
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
    // Ensure tab is visible and interactable before clicking
    await this.upcomingTab.waitFor({ state: "visible" });
    await this.upcomingTab.click();
    // Wait for React state to update
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        return tab?.textContent?.toLowerCase().includes("upcoming");
      },
      { timeout: 5000 },
    );
  }

  async switchToValidationClosedTab() {
    // Ensure tab is visible and interactable before clicking
    await this.validationClosedTab.waitFor({ state: "visible" });
    await this.validationClosedTab.click();
    // Wait for React state to update
    await this.page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][aria-selected="true"]');
        return tab?.textContent?.toLowerCase().includes("validation");
      },
      { timeout: 5000 },
    );
  }

  async getAssignmentCount(): Promise<number> {
    return await this.assignmentCards.count();
  }

  async expectAssignmentsVisible() {
    await expect(this.assignmentCards.first()).toBeVisible();
  }

  async clickFirstAssignment() {
    await this.assignmentCards.first().click();
  }

  /**
   * Get an assignment card by its game number or team names.
   */
  getAssignmentByText(text: string): Locator {
    return this.assignmentCards.filter({ hasText: text });
  }

  /**
   * Wait for assignments to load (loading spinner to disappear).
   */
  async waitForAssignmentsLoaded() {
    // Wait for the tab panel to be visible and loading to complete
    await expect(this.tabPanel).toBeVisible({ timeout: 10000 });

    // Wait for loading state to finish if present
    const loadingIndicator = this.page.getByText(/loading/i).first();
    await loadingIndicator
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {
        // Loading may have already finished or not appeared
      });

    // Give a moment for content to render
    await this.page.waitForTimeout(500);
  }
}
