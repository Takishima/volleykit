/* eslint-disable @typescript-eslint/no-magic-numbers -- Config file with timeout/retry values */
import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for screenshot capture.
 * The default playwright.config.ts excludes capture-screenshots.spec.ts via testIgnore,
 * so this config is needed to run screenshot generation.
 *
 * Usage:
 *   npx playwright test --config=playwright-screenshots.config.ts --project=chromium
 *   npx playwright test --config=playwright-screenshots.config.ts --project=chromium --grep "report-access"
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/capture-screenshots.spec.ts'],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
