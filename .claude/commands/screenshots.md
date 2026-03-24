# Help Site Screenshot Generation

Capture or regenerate help-site screenshots using Playwright.

## Arguments

```text
$ARGUMENTS
```

If arguments are provided, use them as a `--grep` filter to run only matching screenshot tests (e.g. `report-access`, `assignment-detail`). If no arguments are provided, regenerate all screenshots.

## Steps

1. **Build the web app** (screenshots run against the preview server):

```bash
cd packages/web && pnpm run build
```

2. **Run the screenshot capture** using the dedicated Playwright config that includes `capture-screenshots.spec.ts`:

```bash
cd packages/web && npx playwright test \
  --config=playwright-screenshots.config.ts \
  --project=chromium \
  [--grep "FILTER_PATTERN"]
```

The custom config (`packages/web/playwright-screenshots.config.ts`) overrides the default `testIgnore` so that `capture-screenshots.spec.ts` is included. If the config file does not exist, create it:

```typescript
/* eslint-disable @typescript-eslint/no-magic-numbers -- Config file */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/capture-screenshots.spec.ts'],
  timeout: 60000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', actionTimeout: 10000, navigationTimeout: 15000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 120000 },
})
```

3. **Report results**: Show which screenshots were captured or if any tests failed.

4. **Build help-site** to verify screenshots render correctly:

```bash
cd help-site && pnpm run build
```

Output: Summary of captured screenshots and any failures.
