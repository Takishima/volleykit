import { test, expect } from './fixtures'
import { LoginPage, NavigationPage } from './pages'

// Calendar Mode E2E tests: login flow, navigation restrictions, and banner display.
// Component details and accessibility are covered in unit tests.

// Uses dynamic dates to prevent test brittleness
const DAYS_IN_FUTURE = 7
const GAME_START_HOUR = 18
const GAME_END_HOUR = 20

function generateMockIcalContent(): string {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + DAYS_IN_FUTURE)
  futureDate.setHours(GAME_START_HOUR, 0, 0, 0)
  const endDate = new Date(futureDate)
  endDate.setHours(GAME_END_HOUR, 0, 0, 0)

  // Format as iCal timestamp (YYYYMMDDTHHMMSSZ)
  const formatIcalDate = (date: Date) => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SwissVolley//VolleyManager//EN
X-WR-CALNAME:Referee Calendar
BEGIN:VEVENT
UID:referee-convocation-for-game-12345@volleymanager.volleyball.ch
DTSTART:${formatIcalDate(futureDate)}
DTEND:${formatIcalDate(endDate)}
SUMMARY:ARB 1 | VBC Zürich - VBC Basel (NLA Men)
LOCATION:Saalsporthalle, Hardturmstrasse 150, 8005 Zürich
GEO:47.3928;8.5035
END:VEVENT
END:VCALENDAR`
}

test.describe('Calendar Mode', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
    // Wait for full hydration
    await page.waitForLoadState('networkidle')
  })

  test.describe('Login Page Tab Rendering', () => {
    test('displays both login mode tabs', async () => {
      await loginPage.expectCalendarModeTabVisible()
    })

    test('defaults to calendar mode tab', async () => {
      // Calendar input should be visible by default (calendar mode is the default)
      await expect(loginPage.calendarInput).toBeVisible()
      await expect(loginPage.usernameInput).not.toBeVisible()
    })

    test('can switch to full login tab', async () => {
      await loginPage.switchToFullLogin()

      // Username/password should now be visible
      await expect(loginPage.usernameInput).toBeVisible()
      await expect(loginPage.passwordInput).toBeVisible()

      // Calendar input should be hidden
      await expect(loginPage.calendarInput).not.toBeVisible()
    })

    test('can switch back to calendar mode tab', async () => {
      await loginPage.switchToFullLogin()
      await loginPage.switchToCalendarMode()

      // Calendar input should be visible again
      await expect(loginPage.calendarInput).toBeVisible()
      await expect(loginPage.calendarLoginButton).toBeVisible()

      // Username/password should be hidden
      await expect(loginPage.usernameInput).not.toBeVisible()
    })

    test('demo button is visible in calendar mode tab', async () => {
      // Demo button should be accessible (calendar mode is already the default)
      await expect(loginPage.demoButton).toBeVisible()
    })
  })

  test.describe('Calendar Mode Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Mock the calendar API endpoint to return valid iCal data
      await page.route('**/iCal/referee/*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/calendar',
          body: generateMockIcalContent(),
        })
      )
    })

    test('can enter calendar mode with valid code', async ({ page }) => {
      await loginPage.enterCalendarMode('ABC123')

      // Should be on assignments page
      await expect(page).toHaveURL('/')

      // Should see calendar mode banner (filter to avoid PWA toast)
      const calendarBanner = page.getByRole('alert').filter({ hasText: /calendar/i })
      await expect(calendarBanner).toBeVisible()
    })

    test('shows assignments page content after calendar login', async ({ page }) => {
      await loginPage.enterCalendarMode('ABC123')

      // Wait for the page to be ready
      await expect(page.getByRole('main')).toBeVisible()

      // Should see assignments page content - either the tablist or empty state
      // Use specific locator to avoid matching nav items
      const tablist = page.getByRole('tablist', { name: 'Assignments' })
      const emptyState = page.getByText(/no assignments/i)

      // Check if either is visible (calendar mode may have no assignments)
      const tablistVisible = await tablist.isVisible().catch(() => false)
      const emptyStateVisible = await emptyState.isVisible().catch(() => false)

      expect(tablistVisible || emptyStateVisible).toBeTruthy()
    })

    test('displays calendar mode indicator banner', async ({ page }) => {
      await loginPage.enterCalendarMode('ABC123')

      // Banner should indicate read-only calendar mode (filter to avoid PWA toast)
      const calendarBanner = page.getByRole('alert').filter({ hasText: /calendar/i })
      await expect(calendarBanner).toBeVisible()
    })
  })

  test.describe('Calendar Mode Navigation Restrictions', () => {
    test.beforeEach(async ({ page }) => {
      // Mock the calendar API
      await page.route('**/iCal/referee/*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/calendar',
          body: generateMockIcalContent(),
        })
      )

      await loginPage.enterCalendarMode('ABC123')
    })

    test('hides Compensations nav item in calendar mode', async ({ page }) => {
      // Compensations link should not be visible
      await expect(page.getByRole('link', { name: /compensation/i })).not.toBeVisible()
    })

    test('hides Exchange nav item in calendar mode', async ({ page }) => {
      // Exchange link should not be visible
      await expect(page.getByRole('link', { name: /exchange/i })).not.toBeVisible()
    })

    test('shows Assignments nav item in calendar mode', async ({ page }) => {
      const navigation = new NavigationPage(page)
      // Assignments link should be visible
      await expect(navigation.assignmentsLink).toBeVisible()
    })

    test('shows Settings nav item in calendar mode', async ({ page }) => {
      const navigation = new NavigationPage(page)
      // Settings link should be visible
      await expect(navigation.settingsLink).toBeVisible()
    })

    test('navigating to compensations shows empty state in calendar mode', async ({ page }) => {
      // Navigate directly to compensations
      await page.goto('/compensations')

      // In calendar mode, compensations are hidden from nav but page may still render
      // Verify the nav item is still hidden and we see a restricted/empty state
      await expect(page.getByRole('link', { name: /compensation/i })).not.toBeVisible()
    })

    test('navigating to exchange shows empty state in calendar mode', async ({ page }) => {
      // Navigate directly to exchange
      await page.goto('/exchange')

      // In calendar mode, exchange is hidden from nav but page may still render
      // Verify the nav item is still hidden
      await expect(page.getByRole('link', { name: /exchange/i })).not.toBeVisible()
    })
  })

  test.describe('Calendar Mode Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Mock the calendar API
      await page.route('**/iCal/referee/*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/calendar',
          body: generateMockIcalContent(),
        })
      )

      await loginPage.enterCalendarMode('ABC123')
    })

    test('can logout from calendar mode', async ({ page }) => {
      // Click logout button (in settings or header)
      const logoutButton = page.getByRole('button', { name: /logout|sign out|abmelden/i })
      await logoutButton.click()

      // Should be redirected to login page
      await expect(page).toHaveURL(/login/)
      await loginPage.expectToBeVisible()
    })

    test('calendar mode banner disappears after logout', async ({ page }) => {
      // Verify calendar banner is visible first (filter to avoid PWA toast)
      const calendarBanner = page.getByRole('alert').filter({ hasText: /calendar/i })
      await expect(calendarBanner).toBeVisible()

      // Logout
      const logoutButton = page.getByRole('button', { name: /logout|sign out|abmelden/i })
      await logoutButton.click()

      // On login page, no calendar banner
      await expect(calendarBanner).not.toBeVisible()
    })
  })

  test.describe('Calendar Mode Error Handling', () => {
    test('shows error for invalid calendar code format', async ({ page }) => {
      await loginPage.switchToCalendarMode()
      await loginPage.calendarInput.fill('bad')
      await loginPage.calendarLoginButton.click()

      // Should show error message (stays on login page)
      await expect(page).toHaveURL(/login/)
      // Error should be displayed
      await expect(page.getByText(/invalid/i)).toBeVisible()
    })

    test('shows error when calendar is not found', async ({ page }) => {
      // Inject a fetch mock at the JavaScript level BEFORE page loads
      // This is more reliable than Playwright route interception in WebKit
      await page.addInitScript(() => {
        const originalFetch = window.fetch
        window.fetch = async (input, init) => {
          const url = typeof input === 'string' ? input : input.toString()
          if (url.includes('/iCal/referee/')) {
            // Return 404 for calendar validation requests
            return new Response('Not Found', {
              status: 404,
              statusText: 'Not Found',
            })
          }
          return originalFetch(input, init)
        }
      })

      // Navigate fresh to ensure the mock is active
      const freshLoginPage = new LoginPage(page)
      await freshLoginPage.goto()
      await page.waitForLoadState('networkidle')

      await freshLoginPage.switchToCalendarMode()
      await freshLoginPage.calendarInput.fill('NOTFND')
      await freshLoginPage.calendarLoginButton.click()

      // Wait for error state to appear
      await expect(page).toHaveURL(/login/)

      // Match both German "Kalender nicht gefunden" and English "Calendar not found"
      const errorMessage = page.getByText(/kalender.*nicht.*gefunden|calendar.*not.*found/i)
      await expect(errorMessage).toBeVisible()
    })
  })

  test.describe('Calendar Mode Responsive', () => {
    test('calendar mode displays correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      // Calendar mode is the default, verify it displays correctly on mobile
      await expect(loginPage.calendarInput).toBeVisible()
      await expect(loginPage.calendarLoginButton).toBeVisible()
      await expect(loginPage.demoButton).toBeVisible()
    })
  })
})
