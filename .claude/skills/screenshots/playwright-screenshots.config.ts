/* eslint-disable @typescript-eslint/no-magic-numbers -- Config file with timeout/retry values */
import path from 'node:path'
import { execSync } from 'node:child_process'

import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for screenshot capture.
 * Lives in the /screenshots skill directory but resolves paths to packages/web/.
 *
 * Usage (via /screenshots skill):
 *   npx playwright test --config=.claude/skills/screenshots/playwright-screenshots.config.ts --project=chromium
 */
const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()
const webDir = path.join(repoRoot, 'packages', 'web')

export default defineConfig({
  testDir: path.join(webDir, 'e2e'),
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
    cwd: webDir,
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
