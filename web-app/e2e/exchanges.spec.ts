import { test, expect } from './fixtures'
import { LoginPage, ExchangesPage, NavigationPage } from './pages'

/**
 * Exchanges page E2E tests - focused on browser-specific behavior only.
 *
 * These tests verify:
 * - Page loading with real data fetching
 * - Cross-page navigation flows
 * - Empty state vs data loaded state (API integration)
 *
 * Tab navigation, level filter visibility, ARIA attributes, and accessibility
 * are covered by unit tests in src/pages/ExchangePage.test.tsx
 */
test.describe('Exchanges Journey', () => {
  let loginPage: LoginPage
  let exchangesPage: ExchangesPage
  let navigation: NavigationPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    exchangesPage = new ExchangesPage(page)
    navigation = new NavigationPage(page)

    await loginPage.goto()
    await loginPage.enterDemoMode()
    await navigation.goToExchange()
  })

  test.describe('Page Loading', () => {
    test('displays exchanges page with tabs after navigation', async () => {
      await exchangesPage.expectToBeLoaded()
      await expect(exchangesPage.openTab).toBeVisible()
      await expect(exchangesPage.myApplicationsTab).toBeVisible()
    })

    test('loads exchange data or shows empty state', async ({ page }) => {
      await exchangesPage.waitForExchangesLoaded()
      const hasCards = (await exchangesPage.getExchangeCount()) > 0
      const hasEmptyState = (await page.getByTestId('empty-state').count()) > 0
      expect(hasCards || hasEmptyState).toBe(true)
    })
  })

  test.describe('Cross-Page Navigation', () => {
    test('can navigate between exchange and assignments pages', async ({ page }) => {
      await navigation.goToAssignments()
      await expect(page).toHaveURL('/')

      await navigation.goToExchange()
      await expect(page).toHaveURL('/exchange')
      await exchangesPage.expectToBeLoaded()
    })
  })
})
