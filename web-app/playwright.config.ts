import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration.
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  // Global timeout for each test (prevents hanging tests)
  timeout: 30000,
  // Timeout for expect assertions (allows slower browsers like Firefox)
  expect: {
    timeout: 10000,
  },
  // Run tests in parallel
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry on CI only (helps catch flaky tests locally too)
  retries: process.env.CI ? 2 : 1,
  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,
  // Reporter to use
  reporter: process.env.CI ? 'github' : 'html',
  // Shared settings for all the projects below
  use: {
    // Base URL for navigation actions like `await page.goto('/')`
    baseURL: 'http://localhost:4173',
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    // Timeout for actions (click, fill, etc.)
    actionTimeout: 10000,
    // Timeout for navigation
    navigationTimeout: 15000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Firefox is slower, increase timeouts
        actionTimeout: 15000,
        navigationTimeout: 20000,
      },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server before starting the tests
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
