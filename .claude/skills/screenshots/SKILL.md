---
name: screenshots
description: Capture or regenerate help-site screenshots using Playwright. Use when screenshots need to be created or updated for the help site.
argument-hint: "[grep-pattern, e.g. 'report-access', 'assignment-detail']"
allowed-tools: Bash, Read, Glob
---

# Help Site Screenshot Generation

Capture or regenerate help-site screenshots using Playwright.

## User Input

```text
$ARGUMENTS
```

If arguments are provided, use them as a grep filter pattern. If empty, regenerate all screenshots.

## Prerequisites

Playwright browsers must be installed before running. If not already installed, run:

```bash
cd packages/web && npx playwright install chromium
```

**Note**: This requires network access to `storage.googleapis.com`. If running in a restricted environment (e.g. Claude Code remote), the download may fail. In that case, run the screenshot capture locally instead.

## Run

Execute the capture script from the skill directory:

```bash
${CLAUDE_SKILL_DIR}/scripts/capture-screenshots.sh $ARGUMENTS
```

The script:
1. Builds the web app (screenshots run against the Vite preview server)
2. Runs Playwright with `packages/web/playwright-screenshots.config.ts` (includes `capture-screenshots.spec.ts` which is excluded by the default Playwright config)
3. Builds the help-site to verify screenshots render correctly

## Output

Report which screenshots were captured and whether any tests failed. If failures occur, show the error output.
