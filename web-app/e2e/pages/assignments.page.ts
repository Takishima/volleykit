import { type Page, type Locator, expect } from "@playwright/test";
import { TAB_SWITCH_TIMEOUT_MS } from "../constants";
import { BasePage } from "./base.page";

/**
 * Page Object Model for the Assignments page.
 * Provides helpers for interacting with assignment cards and tabs.
 */
export class AssignmentsPage extends BasePage {
  readonly tablist: Locator;
  readonly upcomingTab: Locator;
  readonly validationClosedTab: Locator;
  readonly tabPanel: Locator;
  readonly assignmentCards: Locator;
  private readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.tablist = page.getByRole("tablist");
    // Use stable IDs for tabs (locale-independent)
    this.upcomingTab = page.locator("#tab-upcoming");
    this.validationClosedTab = page.locator("#tab-validationClosed");
    this.tabPanel = page.getByRole("tabpanel");
    this.assignmentCards = this.tabPanel.getByRole("button");
    this.emptyState = page.getByTestId("empty-state");
  }

  async goto() {
    await this.page.goto("/");
  }

  async expectToBeLoaded() {
    await expect(this.tablist).toBeVisible();
    await expect(this.upcomingTab).toBeVisible();
  }

  async switchToUpcomingTab() {
    await this.upcomingTab.click();
    await expect(this.upcomingTab).toHaveAttribute("aria-selected", "true", {
      timeout: TAB_SWITCH_TIMEOUT_MS,
    });
    await expect(this.tabPanel).toBeVisible();
  }

  async switchToValidationClosedTab() {
    await this.validationClosedTab.click();
    await expect(this.validationClosedTab).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: TAB_SWITCH_TIMEOUT_MS },
    );
    await expect(this.tabPanel).toBeVisible();
  }

  async getAssignmentCount(): Promise<number> {
    return await this.assignmentCards.count();
  }

  async waitForAssignmentsLoaded() {
    await expect(this.tabPanel).toBeVisible();
    await this.waitForContentReady(this.assignmentCards, this.emptyState);
  }
}
