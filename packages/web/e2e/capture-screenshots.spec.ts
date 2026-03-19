/**
 * Playwright script to capture screenshots for the help website.
 *
 * Usage: npx playwright test e2e/capture-screenshots.spec.ts --project=chromium
 *
 * This script captures screenshots of various app states for documentation.
 * Screenshots are saved to ../help-site/public/images/screenshots/
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

import { disableTours } from './fixtures'
import {
  LoginPage,
  AssignmentsPage,
  NavigationPage,
  ExchangesPage,
  CompensationsPage,
} from './pages'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Screenshot output directory (relative to web-app)
const SCREENSHOT_DIR = path.resolve(__dirname, '../../help-site/public/images/screenshots')

// Viewport configurations for device-specific screenshots
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 375, height: 667 },
} as const

// ============================================
// Animation and timing constants
// ============================================
// Swipe gesture timing
const SWIPE_ANIMATION_STEPS = 30
const SWIPE_STEP_DELAY_MS = 15
const SWIPE_MOUSE_SETTLE_DELAY_MS = 50
const SWIPE_HOLD_DELAY_MS = 100
const SWIPE_COMPLETE_DELAY_MS = 400

// UI timing delays
const OVERLAY_RENDER_DELAY_MS = 100
const PWA_DISMISS_DELAY_MS = 300
const ANIMATION_SETTLE_DELAY_MS = 500
const PAGE_LOAD_DELAY_MS = 1000
const GEOCODING_DELAY_MS = 1500
const TRAVEL_TIME_LOAD_DELAY_MS = 2000

// ============================================
// Spotlight styling constants
// ============================================
const SPOTLIGHT_OVERLAY_Z_INDEX = 99999
const SPOTLIGHT_BORDER_Z_INDEX = 100000
const SPOTLIGHT_OVERLAY_OPACITY = 0.6
const SPOTLIGHT_BORDER_OPACITY = 0.8
const SPOTLIGHT_SHADOW_OPACITY = 0.3
const SPOTLIGHT_BORDER_RADIUS_PX = 12
const SPOTLIGHT_BORDER_WIDTH_PX = 2
const SPOTLIGHT_SHADOW_BLUR_PX = 20

// Ensure screenshot directory exists
test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
})

// Helper to dismiss all tours and PWA notifications by setting localStorage
async function setupCleanEnvironment(page: Page) {
  // Use shared helper to disable tours
  await disableTours(page)

  // Disable PWA prompts by mocking the service worker registration
  // This prevents "App ready for offline use" notifications
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      // Override the ready promise to prevent PWA notifications
      Object.defineProperty(navigator.serviceWorker, 'ready', {
        get: () => new Promise(() => {}), // Never resolves
      })
    }
  })
}

// Helper to dismiss any visible PWA notification
async function dismissPWANotification(page: Page) {
  // Look for the PWA notification and dismiss it if visible
  const closeButton = page.locator('[role="alert"] button').last()
  if (await closeButton.isVisible({ timeout: 500 }).catch(() => false)) {
    await closeButton.click()
    await page.waitForTimeout(PWA_DISMISS_DELAY_MS)
  }
}

// Helper to take a screenshot with a specific name
async function takeScreenshot(page: Page, name: string) {
  // Dismiss any PWA notifications before taking screenshot
  await dismissPWANotification(page)

  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: false })
  console.log(`✅ Captured: ${name}.png`)
}

// Helper to add a spotlight effect highlighting a specific element
// Creates a dark overlay with a "hole" around the spotlighted element
async function addSpotlight(page: Page, selector: string, padding = 8) {
  // Pass constants to evaluate context since they're not accessible inside
  const styles = {
    overlayZIndex: SPOTLIGHT_OVERLAY_Z_INDEX,
    borderZIndex: SPOTLIGHT_BORDER_Z_INDEX,
    overlayOpacity: SPOTLIGHT_OVERLAY_OPACITY,
    borderOpacity: SPOTLIGHT_BORDER_OPACITY,
    shadowOpacity: SPOTLIGHT_SHADOW_OPACITY,
    borderRadius: SPOTLIGHT_BORDER_RADIUS_PX,
    borderWidth: SPOTLIGHT_BORDER_WIDTH_PX,
    shadowBlur: SPOTLIGHT_SHADOW_BLUR_PX,
  }

  await page.evaluate(
    ({ selector, padding, styles }) => {
      const element = document.querySelector(selector)
      if (!element) return

      const rect = element.getBoundingClientRect()

      // Create spotlight overlay with clip-path hole
      const overlay = document.createElement('div')
      overlay.id = 'screenshot-spotlight-overlay'
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: ${styles.overlayZIndex};
        pointer-events: none;
        background: rgba(0, 0, 0, ${styles.overlayOpacity});
        clip-path: polygon(
          0% 0%, 0% 100%,
          ${rect.left - padding}px 100%,
          ${rect.left - padding}px ${rect.top - padding}px,
          ${rect.right + padding}px ${rect.top - padding}px,
          ${rect.right + padding}px ${rect.bottom + padding}px,
          ${rect.left - padding}px ${rect.bottom + padding}px,
          ${rect.left - padding}px 100%,
          100% 100%, 100% 0%
        );
      `
      document.body.appendChild(overlay)

      // Add border around the spotlighted area
      const border = document.createElement('div')
      border.id = 'screenshot-spotlight-border'
      border.style.cssText = `
        position: fixed;
        left: ${rect.left - padding}px;
        top: ${rect.top - padding}px;
        width: ${rect.width + padding * 2}px;
        height: ${rect.height + padding * 2}px;
        z-index: ${styles.borderZIndex};
        pointer-events: none;
        border: ${styles.borderWidth}px solid rgba(255, 255, 255, ${styles.borderOpacity});
        border-radius: ${styles.borderRadius}px;
        box-shadow: 0 0 ${styles.shadowBlur}px rgba(0, 0, 0, ${styles.shadowOpacity});
      `
      document.body.appendChild(border)
    },
    { selector, padding, styles }
  )
}

// Helper to remove the spotlight overlay
async function removeSpotlight(page: Page) {
  await page.evaluate(() => {
    document.getElementById('screenshot-spotlight-overlay')?.remove()
    document.getElementById('screenshot-spotlight-border')?.remove()
  })
}

// Helper to take a screenshot with a spotlight effect on a specific element
async function takeSpotlightScreenshot(page: Page, name: string, selector: string, padding = 8) {
  await dismissPWANotification(page)
  await addSpotlight(page, selector, padding)
  await page.waitForTimeout(OVERLAY_RENDER_DELAY_MS)

  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: false })
  console.log(`✅ Captured: ${name}.png (with spotlight on ${selector})`)

  await removeSpotlight(page)
}

// Helper to take device-specific screenshots
async function takeDeviceScreenshots(
  context: BrowserContext,
  name: string,
  setupFn: (page: Page) => Promise<void>
) {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    // Clear all storage between device screenshots to avoid state leaking
    await context.clearCookies()

    const page = await context.newPage()
    await page.setViewportSize(viewport)

    // Navigate to app and clear storage before running setup
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await setupFn(page)

    const filename = `${name}-${device}`
    await takeScreenshot(page, filename)
    await page.close()
  }
}

// Helper to take device-specific screenshots with spotlight
async function takeDeviceSpotlightScreenshots(
  context: BrowserContext,
  name: string,
  setupFn: (page: Page) => Promise<{ selector: string; padding?: number }>
) {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    // Clear all storage between device screenshots to avoid state leaking
    await context.clearCookies()

    const page = await context.newPage()
    await page.setViewportSize(viewport)

    // Navigate to app and clear storage before running setup
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    const { selector, padding = 8 } = await setupFn(page)

    const filename = `${name}-${device}`
    await takeSpotlightScreenshot(page, filename, selector, padding)
    await page.close()
  }
}

// Helper to enter demo mode with clean environment
async function enterDemoModeWithoutTours(page: Page) {
  await setupCleanEnvironment(page)
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.enterDemoMode()

  // Wait for any initial notifications to appear and dismiss them
  await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
  await dismissPWANotification(page)
}

// Helper to perform a swipe gesture using mouse events
async function performSwipe(
  page: Page,
  element: { x: number; y: number; width: number; height: number },
  direction: 'left' | 'right',
  distance: number
) {
  const startX = element.x + element.width / 2
  const startY = element.y + element.height / 2
  const endX = direction === 'right' ? startX + distance : startX - distance

  // Start with mouse position at the element
  await page.mouse.move(startX, startY)
  await page.waitForTimeout(SWIPE_MOUSE_SETTLE_DELAY_MS)

  // Mouse down to start drag
  await page.mouse.down()
  await page.waitForTimeout(SWIPE_MOUSE_SETTLE_DELAY_MS)

  // Move in small steps to simulate a real swipe
  for (let i = 1; i <= SWIPE_ANIMATION_STEPS; i++) {
    const x = startX + ((endX - startX) * i) / SWIPE_ANIMATION_STEPS
    await page.mouse.move(x, startY)
    await page.waitForTimeout(SWIPE_STEP_DELAY_MS)
  }

  // Hold at end position briefly before releasing
  await page.waitForTimeout(SWIPE_HOLD_DELAY_MS)
  await page.mouse.up()
  await page.waitForTimeout(SWIPE_COMPLETE_DELAY_MS)
}

test.describe('Help Site Screenshots', () => {
  // Run tests in parallel for speed since they're independent
  test.describe.configure({ mode: 'parallel' })

  // ============================================
  // Login Page Screenshots (Device-specific)
  // ============================================
  test('login-page - capture login page for all devices', async ({ browser }) => {
    const context = await browser.newContext()

    await takeDeviceScreenshots(context, 'login-page', async (page) => {
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      // Switch to full login tab to show username/password fields
      await page.getByTestId('full-login-tab').click()
      await expect(page.getByTestId('username-input')).toBeVisible()

      // Small delay to ensure UI is fully rendered
      await page.waitForTimeout(PWA_DISMISS_DELAY_MS)
    })

    await context.close()
  })

  test('calendar-mode-login - capture calendar mode entry', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Calendar mode is the default tab
    await expect(page.getByTestId('calendar-input')).toBeVisible()
    await page.waitForTimeout(PWA_DISMISS_DELAY_MS)

    await takeScreenshot(page, 'calendar-mode-login')
  })

  // ============================================
  // Assignments Screenshots
  // ============================================
  test('assignments-list - capture assignment list', async ({ page }) => {
    await enterDemoModeWithoutTours(page)
    const assignmentsPage = new AssignmentsPage(page)
    await assignmentsPage.waitForAssignmentsLoaded()

    // Wait for any animations to complete and dismiss notifications
    await page.waitForTimeout(PAGE_LOAD_DELAY_MS)
    await dismissPWANotification(page)

    await takeScreenshot(page, 'assignments-list')
  })

  test('assignment-detail - capture assignment detail view', async ({ page }) => {
    await enterDemoModeWithoutTours(page)
    const assignmentsPage = new AssignmentsPage(page)
    await assignmentsPage.waitForAssignmentsLoaded()

    // Click on the first assignment card to expand it
    const firstCard = assignmentsPage.assignmentCards.first()
    await firstCard.click()

    // Wait for expansion animation
    await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

    // Use spotlight to highlight the expanded card
    await takeSpotlightScreenshot(page, 'assignment-detail', '[data-tour="assignment-card"]', 4)
  })

  test('assignment-actions - capture swipe actions', async ({ page }) => {
    await enterDemoModeWithoutTours(page)
    const assignmentsPage = new AssignmentsPage(page)
    await assignmentsPage.waitForAssignmentsLoaded()

    // Find the SECOND assignment card where user is 1st referee (head-one position)
    // This is the middle column, top row card
    // The position label shows "1. SR" in German, "1st Referee" in English, etc.
    const firstRefCards = page
      .locator('[role="group"][aria-label*="Swipeable"]')
      .filter({ hasText: /1\. SR|1st Ref|1er arbitre|1° arbitro/i })

    // Use the second 1st-ref card (index 1), fallback to first if only one exists
    const cardCount = await firstRefCards.count()
    const targetCard = cardCount > 1 ? firstRefCards.nth(1) : firstRefCards.first()

    const cardBox = await targetCard.boundingBox()

    if (cardBox) {
      // Calculate swipe distance - needs to be past the drawer threshold (30% of width)
      // Swipe LEFT to reveal validate/edit/report actions (which appear on the right side behind the card)
      const swipeDistance = cardBox.width * 0.4 // 40% of card width

      await performSwipe(page, cardBox, 'left', swipeDistance)

      // Wait for the drawer animation to complete
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
    }

    // Spotlight the same card we swiped
    const containerSelector = await targetCard.evaluate((el) => {
      el.id = 'screenshot-target-actions'
      return '#screenshot-target-actions'
    })

    await takeSpotlightScreenshot(page, 'assignment-actions', containerSelector, 4)
  })

  // ============================================
  // Exchange Screenshots
  // ============================================
  test('exchange-list - capture exchange board', async ({ page }) => {
    await enterDemoModeWithoutTours(page)
    const navigation = new NavigationPage(page)
    const exchangesPage = new ExchangesPage(page)

    await navigation.goToExchange()
    await exchangesPage.waitForExchangesLoaded()

    await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
    await takeScreenshot(page, 'exchange-list')
  })

  test('exchange-request - capture exchange swipe action', async ({ page }) => {
    await enterDemoModeWithoutTours(page)
    const assignmentsPage = new AssignmentsPage(page)
    await assignmentsPage.waitForAssignmentsLoaded()

    // Get the first assignment card
    const firstCard = assignmentsPage.assignmentCards.first()
    const cardBox = await firstCard.boundingBox()

    if (cardBox) {
      // Swipe right to reveal exchange action
      const swipeDistance = cardBox.width * 0.4
      await performSwipe(page, cardBox, 'right', swipeDistance)
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
    }

    // Spotlight the first swipeable card container to highlight the action
    const swipeableContainer = page.locator('[role="group"][aria-label*="Swipeable"]').first()
    const containerSelector = await swipeableContainer.evaluate((el) => {
      el.id = 'screenshot-target-exchange'
      return '#screenshot-target-exchange'
    })

    await takeSpotlightScreenshot(page, 'exchange-request', containerSelector, 4)
  })

  // ============================================
  // Compensations Screenshots
  // ============================================
  test('compensations-list - capture compensation list', async ({ page }) => {
    await enterDemoModeWithoutTours(page)
    const navigation = new NavigationPage(page)
    const compensationsPage = new CompensationsPage(page)

    await navigation.goToCompensations()
    await compensationsPage.waitForCompensationsLoaded()

    await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
    await takeScreenshot(page, 'compensations-list')
  })

  test.skip('compensations-filters - capture compensation tabs', async ({ page }) => {
    // Skipped: Filters are not available in demo mode
    await enterDemoModeWithoutTours(page)
    const navigation = new NavigationPage(page)
    const compensationsPage = new CompensationsPage(page)

    await navigation.goToCompensations()
    await compensationsPage.waitForCompensationsLoaded()

    // Focus on the tabs area at the top
    await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
    await takeScreenshot(page, 'compensations-filters')
  })

  // ============================================
  // Settings Screenshots
  // ============================================
  test('settings-overview - capture full settings page', async ({ page }) => {
    await enterDemoModeWithoutTours(page)
    const navigation = new NavigationPage(page)

    await navigation.goToSettings()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

    await takeScreenshot(page, 'settings-overview')
  })

  test('language-settings - capture language selection', async ({ page }) => {
    await enterDemoModeWithoutTours(page)
    const navigation = new NavigationPage(page)

    await navigation.goToSettings()

    await page.waitForLoadState('networkidle')

    // Scroll to and spotlight the language switcher section
    const languageSwitcher = page.locator('[data-tour="language-switcher"]')
    await languageSwitcher.scrollIntoViewIfNeeded()
    await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

    await takeSpotlightScreenshot(page, 'language-settings', '[data-tour="language-switcher"]', 8)
  })

  test('data-privacy-settings - capture data privacy section', async ({ page }) => {
    await enterDemoModeWithoutTours(page)
    const navigation = new NavigationPage(page)

    await navigation.goToSettings()

    await page.waitForLoadState('networkidle')

    // Scroll to bottom of settings page to show data/privacy section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

    // Find the Data Retention card by looking for the card containing "Data" and "Privacy" text
    // The section header contains translations like "Daten & Datenschutz", "Data & Privacy", etc.
    const dataRetentionCard = page
      .locator('section, div')
      .filter({ has: page.getByText(/Daten|Data|Données|Dati/i) })
      .filter({ has: page.getByText(/Datenschutz|Privacy|Confidentialité|Riservatezza/i) })
      .first()

    // If not found, try finding by the card structure with shield icon text
    let targetCard = dataRetentionCard
    if (!(await dataRetentionCard.isVisible({ timeout: 1000 }).catch(() => false))) {
      // Fallback: find any card near the bottom
      targetCard = page.locator('.max-w-2xl > div').last()
    }

    const cardSelector = await targetCard.evaluate((el) => {
      el.id = 'screenshot-target-privacy'
      return '#screenshot-target-privacy'
    })

    await takeSpotlightScreenshot(page, 'data-privacy-settings', cardSelector, 4)
  })

  test('home-location-setting - capture home location input', async ({ page }) => {
    await enterDemoModeWithoutTours(page)
    const navigation = new NavigationPage(page)

    await navigation.goToSettings()

    await page.waitForLoadState('networkidle')

    // Scroll to the home location section
    const locationSection = page.locator('[data-tour="home-location"]')
    await locationSection.scrollIntoViewIfNeeded()

    await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

    // Spotlight the home location card (using the parent Card element)
    const homeLocationCard = page
      .locator('[data-tour="home-location"]')
      .locator('xpath=ancestor::*[contains(@class, "rounded")]')
      .first()
    const cardSelector = await homeLocationCard.evaluate((el) => {
      el.id = 'screenshot-target-home-location'
      return '#screenshot-target-home-location'
    })

    await takeSpotlightScreenshot(page, 'home-location-setting', cardSelector, 4)
  })

  // ============================================
  // Travel Time Screenshots (require production site with OJP API)
  // ============================================
  // These tests require the production site where the OJP API is configured.
  // To run them manually:
  // 1. Ensure you can access https://takishima.github.io/volleykit/
  // 2. Run with: PRODUCTION_URL=https://takishima.github.io/volleykit/ npx playwright test -g "travel-time"
  const PRODUCTION_URL = process.env.PRODUCTION_URL || ''

  test.skip('travel-time-display - capture travel time on assignment', async ({ page }) => {
    // Skipped: Requires production site with OJP API configured.
    // Run manually with PRODUCTION_URL env var set.
    if (!PRODUCTION_URL) {
      console.log('⚠️ travel-time-display: Set PRODUCTION_URL env var to run this test')
      return
    }

    await setupCleanEnvironment(page)
    await page.goto(`${PRODUCTION_URL}login`)
    await page.waitForLoadState('networkidle')

    // Enter demo mode on production
    const demoButton = page.getByTestId('demo-mode-button')
    await expect(demoButton).toBeVisible({ timeout: 10000 })
    await demoButton.click()

    // Wait for assignments to load
    await page.waitForURL(/\/assignments/, { timeout: 15000 })
    const assignmentsPage = new AssignmentsPage(page)
    await assignmentsPage.waitForAssignmentsLoaded()

    // First, set a home location in settings so travel time can be calculated
    const navigation = new NavigationPage(page)
    await navigation.goToSettings()
    await page.waitForLoadState('networkidle')

    // Enter a home location (Bern, Switzerland)
    const addressInput = page.locator('#address-search')
    await addressInput.fill('Bern')
    await page.waitForTimeout(GEOCODING_DELAY_MS) // Wait for geocoding

    // Select first result if available
    const firstResult = page.locator('ul li button').first()
    if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstResult.click()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
    }

    // Navigate back to assignments
    await page
      .getByRole('link', { name: /assignments|Einsätze|Désignations|Convocazioni/i })
      .click()
    await page.waitForURL(/\/assignments/)
    await assignmentsPage.waitForAssignmentsLoaded()

    // Click on an assignment to see the travel time
    const firstCard = assignmentsPage.assignmentCards.first()
    await firstCard.click()

    // Wait for travel time to load (may take a moment)
    await page.waitForTimeout(TRAVEL_TIME_LOAD_DELAY_MS)
    await dismissPWANotification(page)

    await takeScreenshot(page, 'travel-time-display')
  })

  test.skip('journey-details - capture journey details', async ({ page }) => {
    // Skipped: Requires production site with OJP API configured.
    // Run manually with PRODUCTION_URL env var set.
    if (!PRODUCTION_URL) {
      console.log('⚠️ journey-details: Set PRODUCTION_URL env var to run this test')
      return
    }

    await setupCleanEnvironment(page)
    await page.goto(`${PRODUCTION_URL}login`)
    await page.waitForLoadState('networkidle')

    // Enter demo mode on production
    const demoButton = page.getByTestId('demo-mode-button')
    await expect(demoButton).toBeVisible({ timeout: 10000 })
    await demoButton.click()

    // Wait for assignments to load
    await page.waitForURL(/\/assignments/, { timeout: 15000 })
    const assignmentsPage = new AssignmentsPage(page)
    await assignmentsPage.waitForAssignmentsLoaded()

    // First, set a home location in settings
    const navigation = new NavigationPage(page)
    await navigation.goToSettings()
    await page.waitForLoadState('networkidle')

    // Enter a home location (Bern, Switzerland)
    const addressInput = page.locator('#address-search')
    await addressInput.fill('Bern')
    await page.waitForTimeout(GEOCODING_DELAY_MS)

    const firstResult = page.locator('ul li button').first()
    if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstResult.click()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
    }

    // Navigate back to assignments
    await page
      .getByRole('link', { name: /assignments|Einsätze|Désignations|Convocazioni/i })
      .click()
    await page.waitForURL(/\/assignments/)
    await assignmentsPage.waitForAssignmentsLoaded()

    // Click on an assignment to see the travel time
    const firstCard = assignmentsPage.assignmentCards.first()
    await firstCard.click()

    // Wait for travel time to load
    await page.waitForTimeout(TRAVEL_TIME_LOAD_DELAY_MS)

    // Try to find and click on travel time to expand journey details
    const travelTimeButton = page
      .locator('[aria-label*="travel"], [aria-label*="Reise"], [aria-label*="trajet"]')
      .first()
    if (await travelTimeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await travelTimeButton.click()
      await page.waitForTimeout(PAGE_LOAD_DELAY_MS)
    }

    await dismissPWANotification(page)
    await takeScreenshot(page, 'journey-details')
  })

  // ============================================
  // PWA Screenshots (placeholder - require manual capture)
  // ============================================
  test.skip('install-prompt - PWA install prompt', async () => {
    // PWA install prompt cannot be easily automated
    // This would need to be captured manually
    console.log('⚠️ install-prompt: Requires manual capture of PWA install prompt')
  })

  test.skip('offline-indicator - offline mode indicator', async () => {
    // Offline indicator would need network simulation
    console.log('⚠️ offline-indicator: Requires manual capture or network simulation')
  })

  test.skip('update-prompt - app update notification', async () => {
    // Update prompt requires service worker update
    console.log('⚠️ update-prompt: Requires manual capture of update notification')
  })

  // ============================================
  // Device-Specific Screenshots (tablet & phone)
  // ============================================
  test('assignments-list-devices - capture for tablet and phone', async ({ browser }) => {
    const context = await browser.newContext()

    await takeDeviceScreenshots(context, 'assignments-list', async (page) => {
      await setupCleanEnvironment(page)
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.enterDemoMode()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
      await dismissPWANotification(page)

      const assignmentsPage = new AssignmentsPage(page)
      await assignmentsPage.waitForAssignmentsLoaded()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
      await dismissPWANotification(page)
    })

    await context.close()
  })

  test('assignment-detail-devices - capture for tablet and phone', async ({ browser }) => {
    const context = await browser.newContext()

    await takeDeviceSpotlightScreenshots(context, 'assignment-detail', async (page) => {
      await setupCleanEnvironment(page)
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.enterDemoMode()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

      const assignmentsPage = new AssignmentsPage(page)
      await assignmentsPage.waitForAssignmentsLoaded()

      // Click on the first assignment card to expand it
      const firstCard = assignmentsPage.assignmentCards.first()
      await firstCard.click()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

      return { selector: '[data-tour="assignment-card"]', padding: 4 }
    })

    await context.close()
  })

  test('assignment-actions-devices - capture for tablet and phone', async ({ browser }) => {
    const context = await browser.newContext()

    await takeDeviceSpotlightScreenshots(context, 'assignment-actions', async (page) => {
      await setupCleanEnvironment(page)
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.enterDemoMode()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

      const assignmentsPage = new AssignmentsPage(page)
      await assignmentsPage.waitForAssignmentsLoaded()

      // Find the SECOND 1st referee card
      const firstRefCards = page
        .locator('[role="group"][aria-label*="Swipeable"]')
        .filter({ hasText: /1\. SR|1st Ref|1er arbitre|1° arbitro/i })
      const cardCount = await firstRefCards.count()
      const targetCard = cardCount > 1 ? firstRefCards.nth(1) : firstRefCards.first()

      const cardBox = await targetCard.boundingBox()
      if (cardBox) {
        const swipeDistance = cardBox.width * 0.4
        await performSwipe(page, cardBox, 'left', swipeDistance)
        await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
      }

      // Add ID for spotlight
      await targetCard.evaluate((el) => {
        el.id = 'screenshot-target-actions'
      })
      return { selector: '#screenshot-target-actions', padding: 4 }
    })

    await context.close()
  })

  test('exchange-list-devices - capture for tablet and phone', async ({ browser }) => {
    const context = await browser.newContext()

    await takeDeviceScreenshots(context, 'exchange-list', async (page) => {
      await setupCleanEnvironment(page)
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.enterDemoMode()
      await page.waitForTimeout(PAGE_LOAD_DELAY_MS)
      await dismissPWANotification(page)

      // Navigate directly via URL to avoid click interception
      await page.goto('/exchange')
      const exchangesPage = new ExchangesPage(page)
      await exchangesPage.waitForExchangesLoaded()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
      await dismissPWANotification(page)
    })

    await context.close()
  })

  test('exchange-request-devices - capture for tablet and phone', async ({ browser }) => {
    const context = await browser.newContext()

    await takeDeviceSpotlightScreenshots(context, 'exchange-request', async (page) => {
      await setupCleanEnvironment(page)
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.enterDemoMode()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

      const assignmentsPage = new AssignmentsPage(page)
      await assignmentsPage.waitForAssignmentsLoaded()

      const firstCard = assignmentsPage.assignmentCards.first()
      const cardBox = await firstCard.boundingBox()
      if (cardBox) {
        const swipeDistance = cardBox.width * 0.4
        await performSwipe(page, cardBox, 'right', swipeDistance)
        await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
      }

      const container = page.locator('[role="group"][aria-label*="Swipeable"]').first()
      await container.evaluate((el) => {
        el.id = 'screenshot-target-exchange'
      })
      return { selector: '#screenshot-target-exchange', padding: 4 }
    })

    await context.close()
  })

  test('compensations-list-devices - capture for tablet and phone', async ({ browser }) => {
    const context = await browser.newContext()

    await takeDeviceScreenshots(context, 'compensations-list', async (page) => {
      await setupCleanEnvironment(page)
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.enterDemoMode()
      await page.waitForTimeout(PAGE_LOAD_DELAY_MS)
      await dismissPWANotification(page)

      // Navigate directly via URL to avoid click interception
      await page.goto('/compensations')
      const compensationsPage = new CompensationsPage(page)
      await compensationsPage.waitForCompensationsLoaded()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
      await dismissPWANotification(page)
    })

    await context.close()
  })

  test('settings-overview-devices - capture for tablet and phone', async ({ browser }) => {
    const context = await browser.newContext()

    await takeDeviceScreenshots(context, 'settings-overview', async (page) => {
      await setupCleanEnvironment(page)
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.enterDemoMode()
      await page.waitForTimeout(PAGE_LOAD_DELAY_MS)
      await dismissPWANotification(page)

      // Navigate to settings directly via URL to avoid click interception
      await page.goto('/settings')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)
      await dismissPWANotification(page)
    })

    await context.close()
  })

  test('language-settings-devices - capture for tablet and phone', async ({ browser }) => {
    const context = await browser.newContext()

    await takeDeviceSpotlightScreenshots(context, 'language-settings', async (page) => {
      await setupCleanEnvironment(page)
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.enterDemoMode()
      await page.waitForTimeout(PAGE_LOAD_DELAY_MS)
      await dismissPWANotification(page)

      // Navigate to settings directly via URL
      await page.goto('/settings')
      await page.waitForLoadState('networkidle')
      await dismissPWANotification(page)

      const languageSwitcher = page.locator('[data-tour="language-switcher"]')
      await languageSwitcher.scrollIntoViewIfNeeded()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

      return { selector: '[data-tour="language-switcher"]', padding: 8 }
    })

    await context.close()
  })

  test('home-location-setting-devices - capture for tablet and phone', async ({ browser }) => {
    const context = await browser.newContext()

    await takeDeviceSpotlightScreenshots(context, 'home-location-setting', async (page) => {
      await setupCleanEnvironment(page)
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.enterDemoMode()
      await page.waitForTimeout(PAGE_LOAD_DELAY_MS)
      await dismissPWANotification(page)

      // Navigate to settings directly via URL
      await page.goto('/settings')
      await page.waitForLoadState('networkidle')
      await dismissPWANotification(page)

      const locationSection = page.locator('[data-tour="home-location"]')
      await locationSection.scrollIntoViewIfNeeded()
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

      const homeLocationCard = page
        .locator('[data-tour="home-location"]')
        .locator('xpath=ancestor::*[contains(@class, "rounded")]')
        .first()
      await homeLocationCard.evaluate((el) => {
        el.id = 'screenshot-target-home-location'
      })

      return { selector: '#screenshot-target-home-location', padding: 4 }
    })

    await context.close()
  })

  test('data-privacy-settings-devices - capture for tablet and phone', async ({ browser }) => {
    const context = await browser.newContext()

    await takeDeviceSpotlightScreenshots(context, 'data-privacy-settings', async (page) => {
      await setupCleanEnvironment(page)
      const loginPage = new LoginPage(page)
      await loginPage.goto()
      await loginPage.enterDemoMode()
      await page.waitForTimeout(PAGE_LOAD_DELAY_MS)
      await dismissPWANotification(page)

      // Navigate to settings directly via URL
      await page.goto('/settings')
      await page.waitForLoadState('networkidle')
      await dismissPWANotification(page)

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(ANIMATION_SETTLE_DELAY_MS)

      const dataRetentionCard = page
        .locator('section, div')
        .filter({ has: page.getByText(/Daten|Data|Données|Dati/i) })
        .filter({ has: page.getByText(/Datenschutz|Privacy|Confidentialité|Riservatezza/i) })
        .first()

      let targetCard = dataRetentionCard
      if (!(await dataRetentionCard.isVisible({ timeout: 1000 }).catch(() => false))) {
        targetCard = page.locator('.max-w-2xl > div').last()
      }

      await targetCard.evaluate((el) => {
        el.id = 'screenshot-target-privacy'
      })
      return { selector: '#screenshot-target-privacy', padding: 4 }
    })

    await context.close()
  })
})
