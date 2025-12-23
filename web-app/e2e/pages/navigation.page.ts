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
    // Navigation links - match by accessible name patterns
    this.assignmentsLink = page.getByRole("link", {
      name: /assignment|home/i,
    });
    this.compensationsLink = page.getByRole("link", {
      name: /compensation|wallet/i,
    });
    this.exchangeLink = page.getByRole("link", { name: /exchange/i });
    this.settingsLink = page.getByRole("link", { name: /settings/i });
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
