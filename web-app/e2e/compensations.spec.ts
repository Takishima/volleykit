import { test, expect } from './fixtures'
import { LoginPage, CompensationsPage, NavigationPage } from './pages'

/**
 * Compensations page E2E tests - focused on browser-specific behavior only.
 *
 * These tests verify:
 * - Page loading with real data fetching
 * - Cross-page navigation flows
 *
 * Tab navigation, ARIA attributes, card rendering, and accessibility
 * are covered by unit tests in src/pages/CompensationsPage.test.tsx
 */
test.describe('Compensations Journey', () => {
  let loginPage: LoginPage
  let compensationsPage: CompensationsPage
  let navigation: NavigationPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    compensationsPage = new CompensationsPage(page)
    navigation = new NavigationPage(page)

    await loginPage.goto()
    await loginPage.enterDemoMode()
    await navigation.goToCompensations()
  })

  test.describe('Page Loading', () => {
    test('displays compensations page with tabs after navigation', async () => {
      await compensationsPage.expectToBeLoaded()
      await expect(compensationsPage.pendingPastTab).toBeVisible()
      await expect(compensationsPage.pendingFutureTab).toBeVisible()
      await expect(compensationsPage.closedTab).toBeVisible()
    })
  })

  test.describe('Cross-Page Navigation', () => {
    test('can navigate between compensations and exchange pages', async ({ page }) => {
      await navigation.goToExchange()
      await expect(page).toHaveURL('/exchange')

      await navigation.goToCompensations()
      await expect(page).toHaveURL('/compensations')
      await compensationsPage.expectToBeLoaded()
    })
  })
})
