import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Login page.
 * Encapsulates login page interactions for maintainable E2E tests.
 */
export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly demoButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByLabel(/username/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.loginButton = page.getByRole("button", { name: /login|sign in/i });
    this.demoButton = page.getByRole("button", { name: /demo/i });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Enter demo mode - the primary way to access the app in E2E tests.
   * Demo mode provides consistent mock data for reliable testing.
   */
  async enterDemoMode() {
    await this.demoButton.click();
    // Wait for navigation away from login
    await expect(this.page).not.toHaveURL(/login/);
  }

  async expectToBeVisible() {
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}
