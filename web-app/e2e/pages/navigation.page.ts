import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object Model for app navigation.
 * Provides helpers for navigating between pages via the bottom nav.
 */
export class NavigationPage extends BasePage {
  readonly navigation: Locator;
  readonly assignmentsLink: Locator;
  readonly compensationsLink: Locator;
  readonly exchangeLink: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page) {
    super(page);
    this.navigation = page.getByRole("navigation");
    // Use stable test IDs for locale independence
    this.assignmentsLink = page.getByTestId("nav-assignments");
    this.compensationsLink = page.getByTestId("nav-compensations");
    this.exchangeLink = page.getByTestId("nav-exchange");
    this.settingsLink = page.getByTestId("nav-settings");
  }

  async expectToBeVisible() {
    await expect(this.navigation).toBeVisible();
  }

  /**
   * Navigate to a page via bottom nav.
   * Uses element-based waits for reliability.
   */
  private async navigateTo(
    link: Locator,
    expectedUrl: string | RegExp,
  ): Promise<void> {
    // Playwright auto-waits for the link to be actionable before clicking
    await link.click();
    // Wait for URL and main content - no explicit delays needed
    await expect(this.page).toHaveURL(expectedUrl);
    await expect(this.page.getByRole("main")).toBeVisible();
  }

  async goToAssignments() {
    await this.navigateTo(this.assignmentsLink, "/");
  }

  async goToCompensations() {
    await this.navigateTo(this.compensationsLink, "/compensations");
  }

  async goToExchange() {
    await this.navigateTo(this.exchangeLink, "/exchange");
  }

  async goToSettings() {
    await this.navigateTo(this.settingsLink, "/settings");
  }
}
