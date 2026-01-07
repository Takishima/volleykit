/**
 * Playwright script to capture screenshots for the help website.
 *
 * Usage: npx playwright test e2e/capture-screenshots.spec.ts --project=chromium
 *
 * This script captures screenshots of various app states for documentation.
 * Screenshots are saved to ../help-site/public/images/screenshots/
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { LoginPage, AssignmentsPage, NavigationPage, ExchangesPage, CompensationsPage } from './pages';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Screenshot output directory (relative to web-app)
const SCREENSHOT_DIR = path.resolve(__dirname, '../../help-site/public/images/screenshots');

// Viewport configurations for device-specific screenshots
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 375, height: 667 },
} as const;

// Ensure screenshot directory exists
test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

// Helper to dismiss all tours and PWA notifications by setting localStorage
async function setupCleanEnvironment(page: Page) {
  await page.addInitScript(() => {
    // Pre-dismiss all tours to avoid them interfering with screenshots
    const tourState = {
      state: {
        completedTours: ['assignments', 'compensations', 'exchange', 'settings'],
        dismissedTours: [],
      },
      version: 0,
    };
    localStorage.setItem('volleykit-tour', JSON.stringify(tourState));

    // Disable PWA prompts by mocking the service worker registration
    // This prevents "App ready for offline use" notifications
    if ('serviceWorker' in navigator) {
      // Override the ready promise to prevent PWA notifications
      Object.defineProperty(navigator.serviceWorker, 'ready', {
        get: () => new Promise(() => {}), // Never resolves
      });
    }
  });
}

// Helper to dismiss any visible PWA notification
async function dismissPWANotification(page: Page) {
  // Look for the PWA notification and dismiss it if visible
  const closeButton = page.locator('[role="alert"] button').last();
  if (await closeButton.isVisible({ timeout: 500 }).catch(() => false)) {
    await closeButton.click();
    await page.waitForTimeout(300);
  }
}

// Helper to take a screenshot with a specific name
async function takeScreenshot(page: Page, name: string) {
  // Dismiss any PWA notifications before taking screenshot
  await dismissPWANotification(page);

  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`✅ Captured: ${name}.png`);
}

// Helper to add a spotlight effect highlighting a specific element
// Creates a dark overlay with a "hole" around the spotlighted element
async function addSpotlight(page: Page, selector: string, padding = 8) {
  await page.evaluate(
    ({ selector, padding }) => {
      const element = document.querySelector(selector);
      if (!element) return;

      const rect = element.getBoundingClientRect();

      // Create spotlight overlay
      const overlay = document.createElement('div');
      overlay.id = 'screenshot-spotlight-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.6);
        /* Create a hole using clip-path */
        clip-path: polygon(
          0% 0%,
          0% 100%,
          ${rect.left - padding}px 100%,
          ${rect.left - padding}px ${rect.top - padding}px,
          ${rect.right + padding}px ${rect.top - padding}px,
          ${rect.right + padding}px ${rect.bottom + padding}px,
          ${rect.left - padding}px ${rect.bottom + padding}px,
          ${rect.left - padding}px 100%,
          100% 100%,
          100% 0%
        );
      `;
      document.body.appendChild(overlay);

      // Add a subtle border around the spotlighted area
      const border = document.createElement('div');
      border.id = 'screenshot-spotlight-border';
      border.style.cssText = `
        position: fixed;
        left: ${rect.left - padding}px;
        top: ${rect.top - padding}px;
        width: ${rect.width + padding * 2}px;
        height: ${rect.height + padding * 2}px;
        z-index: 100000;
        pointer-events: none;
        border: 2px solid rgba(255, 255, 255, 0.8);
        border-radius: 12px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(border);
    },
    { selector, padding }
  );
}

// Helper to remove the spotlight overlay
async function removeSpotlight(page: Page) {
  await page.evaluate(() => {
    document.getElementById('screenshot-spotlight-overlay')?.remove();
    document.getElementById('screenshot-spotlight-border')?.remove();
  });
}

// Helper to take a screenshot with a spotlight effect on a specific element
async function takeSpotlightScreenshot(
  page: Page,
  name: string,
  selector: string,
  padding = 8
) {
  await dismissPWANotification(page);
  await addSpotlight(page, selector, padding);
  await page.waitForTimeout(100); // Let the overlay render

  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`✅ Captured: ${name}.png (with spotlight on ${selector})`);

  await removeSpotlight(page);
}

// Helper to take device-specific screenshots
async function takeDeviceScreenshots(
  context: BrowserContext,
  name: string,
  setupFn: (page: Page) => Promise<void>
) {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    const page = await context.newPage();
    await page.setViewportSize(viewport);

    await setupFn(page);

    const filename = `${name}-${device}`;
    await takeScreenshot(page, filename);
    await page.close();
  }
}

// Helper to enter demo mode with clean environment
async function enterDemoModeWithoutTours(page: Page) {
  await setupCleanEnvironment(page);
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.enterDemoMode();

  // Wait for any initial notifications to appear and dismiss them
  await page.waitForTimeout(500);
  await dismissPWANotification(page);
}

// Helper to perform a swipe gesture using mouse events
async function performSwipe(
  page: Page,
  element: { x: number; y: number; width: number; height: number },
  direction: 'left' | 'right',
  distance: number
) {
  const startX = element.x + element.width / 2;
  const startY = element.y + element.height / 2;
  const endX = direction === 'right' ? startX + distance : startX - distance;

  // Start with mouse position at the element
  await page.mouse.move(startX, startY);
  await page.waitForTimeout(50);

  // Mouse down to start drag
  await page.mouse.down();
  await page.waitForTimeout(50);

  // Move in small steps to simulate a real swipe - slower for reliability
  const steps = 30;
  for (let i = 1; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps;
    await page.mouse.move(x, startY);
    await page.waitForTimeout(15);
  }

  // Hold at end position briefly before releasing
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

test.describe('Help Site Screenshots', () => {
  // Run tests in parallel for speed since they're independent
  test.describe.configure({ mode: 'parallel' });

  // ============================================
  // Login Page Screenshots (Device-specific)
  // ============================================
  test('login-page - capture login page for all devices', async ({ browser }) => {
    const context = await browser.newContext();

    await takeDeviceScreenshots(context, 'login-page', async (page) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Switch to full login tab to show username/password fields
      await page.getByTestId('full-login-tab').click();
      await expect(page.getByTestId('username-input')).toBeVisible();

      // Small delay to ensure UI is fully rendered
      await page.waitForTimeout(300);
    });

    await context.close();
  });

  test('calendar-mode-login - capture calendar mode entry', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Calendar mode is the default tab
    await expect(page.getByTestId('calendar-input')).toBeVisible();
    await page.waitForTimeout(300);

    await takeScreenshot(page, 'calendar-mode-login');
  });

  // ============================================
  // Assignments Screenshots
  // ============================================
  test('assignments-list - capture assignment list', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const assignmentsPage = new AssignmentsPage(page);
    await assignmentsPage.waitForAssignmentsLoaded();

    // Wait for any animations to complete and dismiss notifications
    await page.waitForTimeout(1000);
    await dismissPWANotification(page);

    await takeScreenshot(page, 'assignments-list');
  });

  test('assignment-detail - capture assignment detail view', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const assignmentsPage = new AssignmentsPage(page);
    await assignmentsPage.waitForAssignmentsLoaded();

    // Click on the first assignment card to expand it
    const firstCard = assignmentsPage.assignmentCards.first();
    await firstCard.click();

    // Wait for expansion animation
    await page.waitForTimeout(500);

    // Use spotlight to highlight the expanded card
    await takeSpotlightScreenshot(page, 'assignment-detail', '[data-tour="assignment-card"]', 4);
  });

  test('assignment-actions - capture swipe actions', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const assignmentsPage = new AssignmentsPage(page);
    await assignmentsPage.waitForAssignmentsLoaded();

    // Get the first assignment card
    const firstCard = assignmentsPage.assignmentCards.first();
    const cardBox = await firstCard.boundingBox();

    if (cardBox) {
      // Calculate swipe distance - needs to be past the drawer threshold (30% of width)
      // Swipe RIGHT to reveal the exchange action (which appears on the left side behind the card)
      const swipeDistance = cardBox.width * 0.4; // 40% of card width

      await performSwipe(page, cardBox, 'right', swipeDistance);

      // Wait for the drawer animation to complete
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, 'assignment-actions');
  });

  // ============================================
  // Exchange Screenshots
  // ============================================
  test('exchange-list - capture exchange board', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const navigation = new NavigationPage(page);
    const exchangesPage = new ExchangesPage(page);

    await navigation.goToExchange();
    await exchangesPage.waitForExchangesLoaded();

    await page.waitForTimeout(500);
    await takeScreenshot(page, 'exchange-list');
  });

  test('exchange-request - capture exchange swipe action', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const assignmentsPage = new AssignmentsPage(page);
    await assignmentsPage.waitForAssignmentsLoaded();

    // Get the first assignment card
    const firstCard = assignmentsPage.assignmentCards.first();
    const cardBox = await firstCard.boundingBox();

    if (cardBox) {
      // Swipe right to reveal exchange action
      const swipeDistance = cardBox.width * 0.4;
      await performSwipe(page, cardBox, 'right', swipeDistance);
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, 'exchange-request');
  });

  // ============================================
  // Compensations Screenshots
  // ============================================
  test('compensations-list - capture compensation list', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const navigation = new NavigationPage(page);
    const compensationsPage = new CompensationsPage(page);

    await navigation.goToCompensations();
    await compensationsPage.waitForCompensationsLoaded();

    await page.waitForTimeout(500);
    await takeScreenshot(page, 'compensations-list');
  });

  test('compensations-filters - capture compensation tabs', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const navigation = new NavigationPage(page);
    const compensationsPage = new CompensationsPage(page);

    await navigation.goToCompensations();
    await compensationsPage.waitForCompensationsLoaded();

    // Focus on the tabs area at the top
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'compensations-filters');
  });

  // ============================================
  // Settings Screenshots
  // ============================================
  test('settings-overview - capture full settings page', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const navigation = new NavigationPage(page);

    await navigation.goToSettings();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'settings-overview');
  });

  test('language-settings - capture language selection', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const navigation = new NavigationPage(page);

    await navigation.goToSettings();

    await page.waitForLoadState('networkidle');

    // Try to find and click the language dropdown or section
    const languageSection = page.getByText(/Language|Sprache|Langue|Lingua/i).first();
    if (await languageSection.isVisible()) {
      // Scroll to language section
      await languageSection.scrollIntoViewIfNeeded();
    }

    await page.waitForTimeout(500);
    await takeScreenshot(page, 'language-settings');
  });

  test('data-privacy-settings - capture data privacy section', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const navigation = new NavigationPage(page);

    await navigation.goToSettings();

    await page.waitForLoadState('networkidle');

    // Scroll to bottom of settings page to show data/privacy section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'data-privacy-settings');
  });

  test('home-location-setting - capture home location input', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const navigation = new NavigationPage(page);

    await navigation.goToSettings();

    await page.waitForLoadState('networkidle');

    // Try to find the home location section
    const locationSection = page
      .getByText(/Home Location|Heimatort|Lieu de départ|Posizione di partenza/i)
      .first();
    if (await locationSection.isVisible()) {
      await locationSection.scrollIntoViewIfNeeded();
    }

    await page.waitForTimeout(500);
    await takeScreenshot(page, 'home-location-setting');
  });

  // ============================================
  // Travel Time Screenshots
  // ============================================
  test('travel-time-display - capture travel time on assignment', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const assignmentsPage = new AssignmentsPage(page);
    await assignmentsPage.waitForAssignmentsLoaded();

    // Click on an assignment to see the travel time
    const firstCard = assignmentsPage.assignmentCards.first();
    await firstCard.click();

    // Wait for detail view
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'travel-time-display');
  });

  test('journey-details - capture journey details', async ({ page }) => {
    await enterDemoModeWithoutTours(page);
    const assignmentsPage = new AssignmentsPage(page);
    await assignmentsPage.waitForAssignmentsLoaded();

    // Click on an assignment to see the travel time
    const firstCard = assignmentsPage.assignmentCards.first();
    await firstCard.click();

    // Wait for detail view
    await page.waitForTimeout(500);

    // Try to find and click on travel time to expand journey details
    const travelTimeElement = page
      .getByText(/min|h|Travel|Reise|Trajet|Viaggio/i)
      .first();
    if (await travelTimeElement.isVisible()) {
      await travelTimeElement.click();
      await page.waitForTimeout(500);
    }

    await takeScreenshot(page, 'journey-details');
  });

  // ============================================
  // Calendar Mode View Screenshot
  // ============================================
  test('calendar-mode-view - capture calendar mode assignments view', async ({ page }) => {
    // This would require a valid calendar code or mocking
    // For now, we'll use demo mode as a placeholder
    await enterDemoModeWithoutTours(page);
    const assignmentsPage = new AssignmentsPage(page);
    await assignmentsPage.waitForAssignmentsLoaded();

    await page.waitForTimeout(500);
    await takeScreenshot(page, 'calendar-mode-view');
  });

  // ============================================
  // PWA Screenshots (placeholder - require manual capture)
  // ============================================
  test.skip('install-prompt - PWA install prompt', async () => {
    // PWA install prompt cannot be easily automated
    // This would need to be captured manually
    console.log('⚠️ install-prompt: Requires manual capture of PWA install prompt');
  });

  test.skip('offline-indicator - offline mode indicator', async () => {
    // Offline indicator would need network simulation
    console.log('⚠️ offline-indicator: Requires manual capture or network simulation');
  });

  test.skip('update-prompt - app update notification', async () => {
    // Update prompt requires service worker update
    console.log('⚠️ update-prompt: Requires manual capture of update notification');
  });
});
