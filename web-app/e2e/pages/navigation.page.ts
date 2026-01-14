import { type Page, type Locator, expect } from '@playwright/test'

import { BasePage } from './base.page'

/**
 * Page Object Model for app navigation.
 * Provides helpers for navigating between pages via the bottom nav.
 */
export class NavigationPage extends BasePage {
  readonly navigation: Locator
  readonly assignmentsLink: Locator
  readonly compensationsLink: Locator
  readonly exchangeLink: Locator
  readonly settingsLink: Locator

  constructor(page: Page) {
    super(page)
    this.navigation = page.getByRole('navigation')
    // Use stable test IDs for locale independence
    this.assignmentsLink = page.getByTestId('nav-assignments')
    this.compensationsLink = page.getByTestId('nav-compensations')
    this.exchangeLink = page.getByTestId('nav-exchange')
    this.settingsLink = page.getByTestId('nav-settings')
  }

  async expectToBeVisible() {
    await expect(this.navigation).toBeVisible()
  }

  /**
   * Dismiss any visible PWA notification that might block UI interactions.
   */
  private async dismissPWANotification() {
    const notification = this.page.getByRole('alert').filter({ hasText: /offline|ready/i })
    const isVisible = await notification.isVisible({ timeout: 500 }).catch(() => false)
    if (isVisible) {
      const closeButton = notification.getByRole('button', { name: /close/i })
      await closeButton.click().catch(() => {})
      await expect(notification)
        .not.toBeVisible({ timeout: 1000 })
        .catch(() => {})
    }
  }

  /**
   * Navigate to a page via bottom nav.
   * Uses element-based waits for reliability.
   */
  private async navigateTo(
    link: Locator,
    expectedUrl: string | RegExp,
    waitForTablist = false
  ): Promise<void> {
    // Dismiss any PWA notification that might block the navigation
    await this.dismissPWANotification()

    // Ensure the link is visible and clickable
    await expect(link).toBeVisible()

    // Use force click to avoid interception issues with overlays
    await link.click({ force: true })

    // Wait for URL and main content
    await expect(this.page).toHaveURL(expectedUrl)
    await expect(this.page.getByRole('main')).toBeVisible()

    // For pages with tabs, wait for the tablist to be visible
    // This ensures the page is fully rendered before continuing
    if (waitForTablist) {
      await expect(this.page.getByRole('tablist')).toBeVisible()
    }
  }

  async goToAssignments() {
    await this.navigateTo(this.assignmentsLink, '/', true)
  }

  async goToCompensations() {
    await this.navigateTo(this.compensationsLink, '/compensations', true)
  }

  async goToExchange() {
    await this.navigateTo(this.exchangeLink, '/exchange', true)
  }

  async goToSettings() {
    await this.navigateTo(this.settingsLink, '/settings')
  }
}
