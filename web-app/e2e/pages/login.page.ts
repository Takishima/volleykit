import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object Model for the Login page.
 * Encapsulates login page interactions for maintainable E2E tests.
 *
 * Note: Calendar Mode is the default login method. Full login mode
 * requires switching tabs first.
 */
export class LoginPage {
  readonly page: Page
  // Full login mode elements
  readonly usernameInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  // Calendar mode elements (default)
  readonly calendarInput: Locator
  readonly calendarLoginButton: Locator
  // Common elements
  readonly demoButton: Locator
  readonly fullLoginTab: Locator
  readonly calendarModeTab: Locator

  constructor(page: Page) {
    this.page = page
    // Full login mode elements
    this.usernameInput = page.getByTestId('username-input')
    this.passwordInput = page.getByTestId('password-input')
    this.loginButton = page.getByTestId('login-button')
    // Calendar mode elements (default)
    this.calendarInput = page.getByTestId('calendar-input')
    this.calendarLoginButton = page.getByTestId('calendar-login-button')
    // Common elements
    this.demoButton = page.getByTestId('demo-button')
    this.fullLoginTab = page.getByTestId('full-login-tab')
    this.calendarModeTab = page.getByTestId('calendar-login-tab')
  }

  async goto() {
    await this.page.goto('/login')
    // Wait for login form to be ready - calendar mode is the default
    await expect(this.demoButton).toBeVisible()
  }

  async login(username: string, password: string) {
    await this.switchToFullLogin()
    await this.usernameInput.fill(username)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  /**
   * Enter demo mode - the primary way to access the app in E2E tests.
   * Demo mode provides consistent mock data for reliable testing.
   */
  async enterDemoMode() {
    // Playwright auto-waits for the button to be actionable (visible + enabled)
    await this.demoButton.click()

    // Wait for navigation away from login page and main content to appear
    await expect(this.page).not.toHaveURL(/login/)
    await expect(this.page.getByRole('main')).toBeVisible()
  }

  async expectToBeVisible() {
    await expect(this.calendarInput).toBeVisible()
    await expect(this.demoButton).toBeVisible()
  }

  /**
   * Switch to calendar mode tab on the login page.
   */
  async switchToCalendarMode() {
    await this.calendarModeTab.click()
    await expect(this.calendarInput).toBeVisible()
  }

  /**
   * Switch to full login tab on the login page.
   */
  async switchToFullLogin() {
    await this.fullLoginTab.click()
    await expect(this.usernameInput).toBeVisible()
  }

  /**
   * Enter calendar mode using a calendar code.
   * Note: Requires the calendar API to be mocked for E2E tests.
   */
  async enterCalendarMode(calendarCode: string) {
    await this.switchToCalendarMode()
    await this.calendarInput.fill(calendarCode)
    await this.calendarLoginButton.click()

    // Wait for navigation away from login page and main content to appear
    await expect(this.page).not.toHaveURL(/login/)
    await expect(this.page.getByRole('main')).toBeVisible()
  }

  /**
   * Expect calendar mode tab to be visible.
   */
  async expectCalendarModeTabVisible() {
    await expect(this.calendarModeTab).toBeVisible()
    await expect(this.fullLoginTab).toBeVisible()
  }
}
