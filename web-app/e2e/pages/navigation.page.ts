import { type Page, type Locator, expect } from "@playwright/test";
import { PAGE_LOAD_TIMEOUT_MS } from "../constants";
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
   * Helper to navigate to a page reliably.
   * Waits for stable state before and after clicking to handle timing issues.
   */
  private async navigateTo(
    link: Locator,
    expectedUrl: string | RegExp,
  ): Promise<void> {
    await this.waitForStableState();
    await link.click();
    await expect(this.page).toHaveURL(expectedUrl, {
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
    await expect(this.page.getByRole("main")).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
    await this.waitForStableState();
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
