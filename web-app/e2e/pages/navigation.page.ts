import { type Page, type Locator, expect } from "@playwright/test";
import { PAGE_LOAD_TIMEOUT_MS } from "../constants";

/**
 * Page Object Model for app navigation.
 * Provides helpers for navigating between pages via the bottom nav.
 */
export class NavigationPage {
  readonly page: Page;
  readonly navigation: Locator;
  readonly assignmentsLink: Locator;
  readonly compensationsLink: Locator;
  readonly exchangeLink: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page) {
    this.page = page;
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
   * Helper to navigate to a page reliably.
   * Waits for network idle before clicking to handle Firefox timing issues.
   */
  private async navigateTo(
    link: Locator,
    expectedUrl: string | RegExp,
  ): Promise<void> {
    // Wait for network to be idle before clicking to ensure app is fully hydrated
    await this.page.waitForLoadState("networkidle");
    await link.click();
    await expect(this.page).toHaveURL(expectedUrl, {
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
    // Wait for main content area to be visible
    await expect(this.page.getByRole("main")).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
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
