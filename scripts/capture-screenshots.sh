#!/usr/bin/env bash
# Capture help-site screenshots using Playwright.
#
# Usage:
#   scripts/capture-screenshots.sh                  # All screenshots
#   scripts/capture-screenshots.sh report-access    # Only matching tests
#   scripts/capture-screenshots.sh "report-access|report-wizard-entry"  # Multiple patterns

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$REPO_ROOT/packages/web"
HELP_DIR="$REPO_ROOT/help-site"
CONFIG="$WEB_DIR/playwright-screenshots.config.ts"

GREP_PATTERN="${1:-}"

# 1. Build the web app (screenshots run against the preview server)
echo "📦 Building web app..."
cd "$WEB_DIR"
pnpm run build

# 2. Run Playwright screenshot capture
echo ""
echo "📸 Capturing screenshots..."
PLAYWRIGHT_ARGS=(
  test
  "--config=$CONFIG"
  "--project=chromium"
)

if [ -n "$GREP_PATTERN" ]; then
  PLAYWRIGHT_ARGS+=("--grep" "$GREP_PATTERN")
fi

npx playwright "${PLAYWRIGHT_ARGS[@]}"

# 3. Build help-site to verify screenshots render correctly
echo ""
echo "🏗️  Building help-site..."
cd "$HELP_DIR"
pnpm run build

echo ""
echo "✅ Screenshots captured and help-site built successfully."
