import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Login page.
 * Encapsulates login page interactions for maintainable E2E tests.
 *
 * Note: Calendar Mode is the default login method. Full login mode
 * requires switching tabs first.
 */
export class LoginPage {
  readonly page: Page;
  // Full login mode elements
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  // Calendar mode elements (default)
  readonly calendarInput: Locator;
  readonly calendarLoginButton: Locator;
  // Common elements
  readonly demoButton: Locator;
  readonly fullLoginTab: Locator;
  readonly calendarTab: Locator;

  constructor(page: Page) {
    this.page = page;
    // Full login mode elements
    this.usernameInput = page.getByTestId("username-input");
    this.passwordInput = page.getByTestId("password-input");
    this.loginButton = page.getByTestId("login-button");
    // Calendar mode elements (default)
    this.calendarInput = page.getByTestId("calendar-input");
    this.calendarLoginButton = page.getByTestId("calendar-login-button");
    // Common elements
    this.demoButton = page.getByTestId("demo-button");
    this.fullLoginTab = page.getByRole("tab", { name: /full/i });
    this.calendarTab = page.getByRole("tab", { name: /calendar/i });
  }

  async goto() {
    await this.page.goto("/login");
    // Wait for login form to be ready - calendar mode is the default
    await expect(this.demoButton).toBeVisible();
  }

  /**
   * Switch to full login mode (username/password)
   */
  async switchToFullLogin() {
    await this.fullLoginTab.click();
    await expect(this.loginButton).toBeVisible();
  }

  async login(username: string, password: string) {
    await this.switchToFullLogin();
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

  /**
   * Check that calendar mode (default) elements are visible
   */
  async expectCalendarModeToBeVisible() {
    await expect(this.calendarInput).toBeVisible();
    await expect(this.calendarLoginButton).toBeVisible();
    await expect(this.demoButton).toBeVisible();
  }

  /**
   * Check that full login mode elements are visible
   * (must switch to full login mode first)
   */
  async expectFullLoginToBeVisible() {
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}
