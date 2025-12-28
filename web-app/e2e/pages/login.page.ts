import { type Page, type Locator, expect } from "@playwright/test";
import { PAGE_LOAD_TIMEOUT_MS } from "../constants";

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
    await expect(this.loginButton).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
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
    // Ensure button is visible and enabled before clicking
    await expect(this.demoButton).toBeVisible();
    await expect(this.demoButton).toBeEnabled();

    // Wait for network to be idle to ensure React app is fully hydrated
    // This fixes flaky tests in Firefox where clicks during hydration may not register
    await this.page.waitForLoadState("networkidle");

    // Click demo button
    await this.demoButton.click();

    // Wait for navigation away from login page
    await expect(this.page).not.toHaveURL(/login/, {
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });

    // Wait for main content to appear on the destination page
    await expect(this.page.getByRole("main")).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
  }

  async expectToBeVisible() {
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}
