# Help Site Screenshot Generation

Capture or regenerate help-site screenshots using Playwright.

## Arguments

```text
$ARGUMENTS
```

If arguments are provided, use them as a `--grep` filter to run only matching screenshot tests (e.g. `report-access`, `assignment-detail`). If no arguments are provided, regenerate all screenshots.

## Run

Execute the capture script:

```bash
scripts/capture-screenshots.sh $ARGUMENTS
```

The script handles:
1. Building the web app (screenshots run against the preview server)
2. Running Playwright with `packages/web/playwright-screenshots.config.ts` (includes `capture-screenshots.spec.ts` which is excluded by the default Playwright config)
3. Building the help-site to verify screenshots render correctly

Report which screenshots were captured or if any tests failed.
