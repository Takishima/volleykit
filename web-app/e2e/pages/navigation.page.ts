import { type Page, type Locator, expect } from "@playwright/test";

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

  async goToAssignments() {
    await this.assignmentsLink.click();
    await expect(this.page).toHaveURL("/");
  }

  async goToCompensations() {
    await this.compensationsLink.click();
    await expect(this.page).toHaveURL("/compensations");
  }

  async goToExchange() {
    await this.exchangeLink.click();
    await expect(this.page).toHaveURL("/exchange");
  }

  async goToSettings() {
    await this.settingsLink.click();
    await expect(this.page).toHaveURL("/settings");
  }
}
