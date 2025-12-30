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
    // Use stable test IDs for locale independence
    this.usernameInput = page.getByTestId("username-input");
    this.passwordInput = page.getByTestId("password-input");
    this.loginButton = page.getByTestId("login-button");
    this.demoButton = page.getByTestId("demo-button");
  }

  async goto() {
    await this.page.goto("/login");
    // Wait for login form to be ready
    await expect(this.loginButton).toBeVisible();
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
    // Playwright auto-waits for the button to be actionable (visible + enabled)
    await this.demoButton.click();

    // Wait for navigation away from login page and main content to appear
    await expect(this.page).not.toHaveURL(/login/);
    await expect(this.page.getByRole("main")).toBeVisible();
  }

  async expectToBeVisible() {
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}
